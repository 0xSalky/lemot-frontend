import type { SignalsBandWatchEntry, SignalEventType } from "@/types/signalsMonitorTypes";

export type SignalConditionState = "met" | "unmet" | "unknown";

export interface SignalCondition {
  id: string;
  short: string;
  label: string;
  state: SignalConditionState;
  detail?: string;
}

type RawCondition = {
  id?: unknown;
  short?: unknown;
  label?: unknown;
  met?: unknown;
  detail?: unknown;
};

function asBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function normalizeBackendConditions(raw: unknown): SignalCondition[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: SignalCondition[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as RawCondition;
    const met = asBool(row.met);
    if (met == null) continue;
    out.push({
      id: String(row.id ?? out.length),
      short: String(row.short ?? "?"),
      label: String(row.label ?? "—"),
      state: met ? "met" : "unmet",
      detail: typeof row.detail === "string" ? row.detail : undefined,
    });
  }
  return out.length > 0 ? out : null;
}

function reasonFails(reason: string, patterns: string[]): boolean {
  const lower = reason.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

function inferFromReason(
  reason: string,
  side: string | null,
): Partial<Record<string, SignalConditionState>> {
  const sideL = side?.toLowerCase();
  const states: Partial<Record<string, SignalConditionState>> = {};

  if (reasonFails(reason, ["needs sup", "needs res"])) states.band = "unmet";
  if (reasonFails(reason, ["fractal above band", "fractal below band"])) states.placement = "unmet";
  if (reasonFails(reason, ["confirm open"])) states.confirm_open = "unmet";
  if (reasonFails(reason, ["confirm close"])) states.confirm_close = "unmet";
  if (reasonFails(reason, ["price chase", "chase"])) states.chase = "unmet";

  if (sideL === "long" && reasonFails(reason, ["reclaim"])) states.trigger = "unmet";
  if (sideL === "short" && reasonFails(reason, ["reject"])) states.trigger = "unmet";

  return states;
}

function placementLabel(placement: string | null, side: string | null): string {
  if (placement === "in_band") return "In band";
  if (placement === "below_band") return "Below band";
  if (placement === "above_band") return "Above band";
  return side?.toLowerCase() === "long" ? "Fractal zone" : "Fractal zone";
}

function triggerLabel(trigger: string | null): string {
  if (trigger === "reclaim") return "Reclaim";
  if (trigger === "reject") return "Reject";
  if (trigger === "fractal") return "Fractal";
  return "Trigger";
}

function defaultSentState(eventType: SignalEventType): SignalConditionState {
  return eventType === "alert_sent" ? "met" : "unknown";
}

/** Derive the seven mechanical alert checks from event meta (fallback when API has no conditions[]). */
export function buildAlertConditions(
  meta: Record<string, unknown> | null,
  side: string | null,
  eventType: SignalEventType,
): SignalCondition[] | null {
  if (!meta) return null;
  if (meta.fractal_level == null && meta.band_low == null) return null;

  const fromApi = normalizeBackendConditions(meta.conditions);
  if (fromApi) {
    return fromApi.map((row) => ({
      ...row,
      state: row.state === "met" ? "met" : "unmet",
    }));
  }

  const reason = meta.reason != null ? String(meta.reason) : "";
  const reasonStates = reason ? inferFromReason(reason, side) : {};
  const sent = eventType === "alert_sent";
  const base = (id: string): SignalConditionState =>
    reasonStates[id] ?? (sent ? "met" : "unknown");

  const bandSide = meta.band_side != null ? String(meta.band_side) : null;
  const placement = meta.placement != null ? String(meta.placement) : null;
  const trigger = meta.trigger != null ? String(meta.trigger) : null;
  const sideL = side?.toLowerCase();
  const bandLabel =
    bandSide === "SUP" || bandSide === "RES"
      ? `${bandSide} band`
      : sideL === "long"
        ? "SUP band"
        : sideL === "short"
          ? "RES band"
          : "Band";

  const bandMet =
    reasonStates.band ??
    (sent
      ? (sideL === "long" && bandSide === "SUP") || (sideL === "short" && bandSide === "RES") || !bandSide
        ? "met"
        : "unknown"
      : "unknown");

  let placementMet: SignalConditionState = reasonStates.placement ?? (sent ? "met" : "unknown");
  if (placement && sideL === "long" && placement === "above_band") placementMet = "unmet";
  if (placement && sideL === "short" && placement === "below_band") placementMet = "unmet";

  const fractal = meta.fractal_level != null ? String(meta.fractal_level) : null;
  const band = fmtBandRange(meta.band_low, meta.band_high);

  return [
    {
      id: "fractal",
      short: "F",
      label: "Fractal",
      state: meta.fractal_level != null ? "met" : "unknown",
      detail: fractal ? `pivot @ ${fractal}` : undefined,
    },
    {
      id: "band",
      short: "B",
      label: bandLabel,
      state: bandMet,
      detail: band ?? undefined,
    },
    {
      id: "placement",
      short: "P",
      label: placementLabel(placement, side),
      state: placementMet,
      detail: placement ?? undefined,
    },
    {
      id: "confirm_open",
      short: "O",
      label: "Open held",
      state: base("confirm_open"),
      detail: sideL === "long" ? "confirm open ≥ band low" : "confirm open ≤ band high",
    },
    {
      id: "confirm_close",
      short: "C",
      label: "Close held",
      state: base("confirm_close"),
      detail: sideL === "long" ? "confirm close ≥ band low" : "confirm close ≤ band high",
    },
    {
      id: "trigger",
      short: "T",
      label: triggerLabel(trigger),
      state: reasonStates.trigger ?? (trigger && sent ? "met" : defaultSentState(eventType)),
      detail: trigger ?? undefined,
    },
    {
      id: "chase",
      short: "K",
      label: "Chase OK",
      state: base("chase"),
      detail: "signal close vs fractal level",
    },
  ];
}

function fmtBandRange(low: unknown, high: unknown): string | null {
  const lo = Number(low);
  const hi = Number(high);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return `${Math.min(lo, hi).toFixed(2)}–${Math.max(lo, hi).toFixed(2)}`;
}

/** Proximity checklist for watchlist rows. */
export function buildBandWatchConditions(entry: SignalsBandWatchEntry): SignalCondition[] {
  const side = entry.band_side;
  const position = entry.price_vs_band ?? "inside";
  const cap = entry.max_dist_pct ?? 2;
  const hasBand = entry.has_band !== false && entry.band_low != null && entry.band_high != null;
  const isNear =
    entry.near_band ??
    (entry.distance_pct != null ? entry.distance_pct <= cap : false);
  const intact =
    hasBand &&
    ((side === "SUP" && position !== "below") ||
      (side === "RES" && position !== "above") ||
      side === "AT");

  if (!hasBand) {
    return [
      {
        id: "near",
        short: "N",
        label: "Near band",
        state: "unmet",
        detail: "no actionable band",
      },
      {
        id: "inside",
        short: "I",
        label: "Inside",
        state: "unmet",
        detail: "no band tracked",
      },
      {
        id: "intact",
        short: "✓",
        label: "Intact",
        state: "unmet",
        detail: "no band tracked",
      },
      {
        id: "side",
        short: "·",
        label: "Side",
        state: "unknown",
        detail: "awaiting scanner bands",
      },
    ];
  }

  return [
    {
      id: "near",
      short: "N",
      label: "Near band",
      state: isNear ? "met" : "unmet",
      detail: isNear
        ? `within ${cap}%`
        : entry.distance_pct != null
          ? `${entry.distance_pct.toFixed(2)}% from edge (>${cap}%)`
          : `>${cap}% from edge`,
    },
    {
      id: "inside",
      short: "I",
      label: "Inside",
      state: entry.at_band ? "met" : "unmet",
      detail: entry.at_band ? "price inside band" : `price ${position} band`,
    },
    {
      id: "intact",
      short: "✓",
      label: "Intact",
      state: intact ? "met" : "unmet",
      detail:
        side === "SUP"
          ? "SUP not broken below"
          : side === "RES"
            ? "RES not broken above"
            : "actionable zone",
    },
    {
      id: "side",
      short: side === "SUP" ? "S" : side === "RES" ? "R" : "·",
      label: side,
      state: "met",
      detail: `w=${entry.band_weight}`,
    },
  ];
}

export function countMetConditions(conditions: SignalCondition[]): number {
  return conditions.filter((c) => c.state === "met").length;
}
