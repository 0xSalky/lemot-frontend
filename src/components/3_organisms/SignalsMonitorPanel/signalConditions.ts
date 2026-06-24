import type {
  SignalMonitorEvent,
  SignalsBandWatchEntry,
  SignalEventType,
} from "@/types/signalsMonitorTypes";

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

function placementShort(placement: string | null): string {
  if (placement === "in_band") return "ZONE";
  if (placement === "below_band") return "BELOW";
  if (placement === "above_band") return "ABOVE";
  return "ZONE";
}

function placementLabel(placement: string | null): string {
  if (placement === "in_band") return "Fractal in band";
  if (placement === "below_band") return "Fractal below band";
  if (placement === "above_band") return "Fractal above band";
  return "Fractal zone";
}

function triggerShort(trigger: string | null): string {
  if (trigger === "reclaim") return "RCLM";
  if (trigger === "reject") return "REJ";
  if (trigger === "fractal") return "CLEAN";
  return "TRIG";
}

function triggerLabel(trigger: string | null): string {
  if (trigger === "reclaim") return "Reclaim above band";
  if (trigger === "reject") return "Reject below band";
  if (trigger === "fractal") return "Clean fractal in zone";
  return "Trigger";
}

function defaultSentState(eventType: SignalEventType): SignalConditionState {
  return eventType === "alert_sent" ? "met" : "unknown";
}

/** Derive mechanical alert checks from event meta (fallback when API has no conditions[]). */
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
  const bandShort =
    bandSide === "SUP" || bandSide === "RES"
      ? bandSide
      : sideL === "long"
        ? "SUP"
        : sideL === "short"
          ? "RES"
          : "BAND";
  const bandLabel =
    bandShort === "SUP"
      ? "Support band match"
      : bandShort === "RES"
        ? "Resistance band match"
        : "Band match";

  const bandMet =
    reasonStates.band ??
    (sent
      ? (sideL === "long" && bandSide === "SUP") ||
        (sideL === "short" && bandSide === "RES") ||
        !bandSide
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
      short: "FRAC",
      label: "Fractal pivot",
      state: meta.fractal_level != null ? "met" : "unknown",
      detail: fractal ? `pivot @ ${fractal}` : undefined,
    },
    {
      id: "band",
      short: bandShort,
      label: bandLabel,
      state: bandMet,
      detail: band ?? undefined,
    },
    {
      id: "placement",
      short: placementShort(placement),
      label: placementLabel(placement),
      state: placementMet,
      detail: placement ?? undefined,
    },
    {
      id: "confirm_open",
      short: "OPEN",
      label: "Confirm open held",
      state: base("confirm_open"),
      detail: sideL === "long" ? "open stays ≥ band low" : "open stays ≤ band high",
    },
    {
      id: "confirm_close",
      short: "CLOSE",
      label: "Confirm close held",
      state: base("confirm_close"),
      detail: sideL === "long" ? "close stays ≥ band low" : "close stays ≤ band high",
    },
    {
      id: "trigger",
      short: triggerShort(trigger),
      label: triggerLabel(trigger),
      state: reasonStates.trigger ?? (trigger && sent ? "met" : defaultSentState(eventType)),
      detail: trigger ?? undefined,
    },
    {
      id: "chase",
      short: "CHASE",
      label: "Chase within limit",
      state: base("chase"),
      detail: "signal close not too far from fractal",
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
  const sideShort = side === "SUP" ? "SUP" : side === "RES" ? "RES" : "BAND";
  const sideLabel =
    side === "SUP" ? "Support band" : side === "RES" ? "Resistance band" : "Band role";

  if (!hasBand) {
    return [
      {
        id: "near",
        short: "NEAR",
        label: "Near band edge",
        state: "unmet",
        detail: "no actionable band from scanner",
      },
      {
        id: "inside",
        short: "ZONE",
        label: "Inside band",
        state: "unmet",
        detail: "price not in a tracked zone",
      },
      {
        id: "side",
        short: "BAND",
        label: "Band role",
        state: "unknown",
        detail: "awaiting scanner bands",
      },
      {
        id: "intact",
        short: "HOLD",
        label: "Band still valid",
        state: "unmet",
        detail: "no band to validate",
      },
      {
        id: "dist",
        short: "DIST",
        label: "Distance",
        state: "unknown",
        detail: "—",
      },
    ];
  }

  const distDetail =
    entry.distance_pct != null
      ? `${entry.distance_pct.toFixed(2)}% from nearest edge`
      : "at band edge";

  return [
    {
      id: "near",
      short: "NEAR",
      label: "Near band edge",
      state: isNear ? "met" : "unmet",
      detail: isNear ? `within ${cap}% threshold` : `${distDetail} (>${cap}%)`,
    },
    {
      id: "inside",
      short: "ZONE",
      label: "Inside band",
      state: entry.at_band ? "met" : "unmet",
      detail: entry.at_band ? "price inside SUP/RES zone" : `price ${position} the zone`,
    },
    {
      id: "side",
      short: sideShort,
      label: sideLabel,
      state: "met",
      detail: `${side} · weight ${entry.band_weight}`,
    },
    {
      id: "intact",
      short: "HOLD",
      label: "Band still valid",
      state: intact ? "met" : "unmet",
      detail:
        side === "SUP"
          ? "SUP not broken — price still ≥ band low"
          : side === "RES"
            ? "RES not broken — price still ≤ band high"
            : "actionable zone",
    },
    {
      id: "dist",
      short: "DIST",
      label: "Distance to edge",
      state: entry.distance_pct === 0 || entry.at_band ? "met" : isNear ? "met" : "unmet",
      detail: distDetail,
    },
  ];
}

export function countMetConditions(conditions: SignalCondition[]): number {
  return conditions.filter((c) => c.state === "met").length;
}

function alertIdentityKey(event: SignalMonitorEvent): string {
  const meta = event.meta ?? {};
  return [
    event.profile ?? "",
    event.symbol ?? "",
    event.side ?? "",
    meta.center_bar_ts ?? "",
    meta.band_low ?? "",
    meta.band_high ?? "",
    event.created_at ?? "",
  ].join("|");
}

/** Merge live + history alert rows (ALERT+AI) for the Historic tab. */
export function mergeHistoricSignalEvents(
  live: SignalMonitorEvent[],
  history: SignalMonitorEvent[],
): SignalMonitorEvent[] {
  const seen = new Set<string>();
  const out: SignalMonitorEvent[] = [];

  for (const event of [...live, ...history]) {
    if (event.event_type !== "alert_sent") continue;
    const key = alertIdentityKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(event);
  }

  out.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return out;
}
