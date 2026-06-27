export type RiskGateStatus = "ok" | "warn" | "block";

export type RiskGatesSummary = "clear" | "warn" | "blocked";

export interface RiskGate {
  id: string;
  label: string;
  short: string;
  status: RiskGateStatus;
  detail: string;
}

export interface RiskDeskPosition {
  symbol: string;
  side: string;
  leverage?: number;
  pnl_pct?: number;
  in_profit?: boolean;
  unrealized_pnl_usd?: number;
  r_multiple?: number;
}

export interface RiskSameSideStats {
  count: number;
  avg_r: number | null;
  worst_r: number | null;
  best_r: number | null;
}

export interface RiskNextPreview {
  side: string;
  avg_r: number | null;
  same_side_count: number;
  loss_penalty_pts: number;
  crowding_penalty_pts: number;
  total_penalty_pts: number;
  hard_block: string | null;
  note: string;
}

export interface RiskDeskEvent {
  kind: "opened" | "rejected" | "failed" | "portfolio_skip";
  event_type: string;
  profile: string | null;
  symbol: string | null;
  side: string | null;
  message: string | null;
  created_at: string | null;
}

export interface RiskDeskPayload {
  ready: boolean;
  fetched_at: string | null;
  positions_available: boolean;
  positions_error: string | null;
  equity_usd: number | null;
  risk_percent: number;
  risk_unit_usd: number | null;
  r_definition: string;
  max_open_trades: number;
  slots_used: number;
  slots_free: number | null;
  fill_ratio: number;
  net_side: string;
  book_state: string | null;
  gates_summary: RiskGatesSummary;
  gates: RiskGate[];
  same_side: RiskSameSideStats;
  limits: {
    avg_down_hard_reject_r: number;
    worst_leg_hard_reject_r: number;
  };
  positions: RiskDeskPosition[];
  next_same_side_preview: RiskNextPreview | null;
  recent_events: RiskDeskEvent[];
}

export const EMPTY_RISK_DESK: RiskDeskPayload = {
  ready: false,
  fetched_at: null,
  positions_available: false,
  positions_error: null,
  equity_usd: null,
  risk_percent: 1,
  risk_unit_usd: null,
  r_definition: "1R = 1% of account equity",
  max_open_trades: 0,
  slots_used: 0,
  slots_free: null,
  fill_ratio: 0,
  net_side: "flat",
  book_state: null,
  gates_summary: "clear",
  gates: [],
  same_side: { count: 0, avg_r: null, worst_r: null, best_r: null },
  limits: { avg_down_hard_reject_r: 1, worst_leg_hard_reject_r: 1.5 },
  positions: [],
  next_same_side_preview: null,
  recent_events: [],
};

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

export function normalizeRiskDesk(body: unknown): RiskDeskPayload {
  if (!body || typeof body !== "object") return { ...EMPTY_RISK_DESK };
  const raw = body as Record<string, unknown>;
  const gates = Array.isArray(raw.gates)
    ? raw.gates.map((g) => {
        const row = g as Record<string, unknown>;
        return {
          id: str(row.id) ?? "gate",
          label: str(row.label) ?? "Gate",
          short: str(row.short) ?? "G",
          status: (["ok", "warn", "block"].includes(String(row.status))
            ? row.status
            : "ok") as RiskGateStatus,
          detail: str(row.detail) ?? "",
        };
      })
    : [];

  const positions = Array.isArray(raw.positions)
    ? raw.positions.map((p) => {
        const row = p as Record<string, unknown>;
        return {
          symbol: str(row.symbol) ?? "?",
          side: str(row.side) ?? "unknown",
          leverage: num(row.leverage) ?? undefined,
          pnl_pct: num(row.pnl_pct) ?? undefined,
          in_profit: typeof row.in_profit === "boolean" ? row.in_profit : undefined,
          unrealized_pnl_usd: num(row.unrealized_pnl_usd) ?? undefined,
          r_multiple: num(row.r_multiple) ?? undefined,
        };
      })
    : [];

  const sameRaw = (raw.same_side ?? {}) as Record<string, unknown>;
  const limitsRaw = (raw.limits ?? {}) as Record<string, unknown>;
  const previewRaw = raw.next_same_side_preview as Record<string, unknown> | null;

  const events = Array.isArray(raw.recent_events)
    ? raw.recent_events.map((e) => {
        const row = e as Record<string, unknown>;
        const kind = str(row.kind) ?? "rejected";
        return {
          kind: (["opened", "rejected", "failed", "portfolio_skip"].includes(kind)
            ? kind
            : "rejected") as RiskDeskEvent["kind"],
          event_type: str(row.event_type) ?? "",
          profile: str(row.profile),
          symbol: str(row.symbol),
          side: str(row.side),
          message: str(row.message),
          created_at: str(row.created_at),
        };
      })
    : [];

  const summary = str(raw.gates_summary);
  const gatesSummary: RiskGatesSummary =
    summary === "blocked" || summary === "warn" ? summary : "clear";

  return {
    ready: Boolean(raw.ready),
    fetched_at: str(raw.fetched_at),
    positions_available: Boolean(raw.positions_available),
    positions_error: str(raw.positions_error),
    equity_usd: num(raw.equity_usd),
    risk_percent: num(raw.risk_percent) ?? 1,
    risk_unit_usd: num(raw.risk_unit_usd),
    r_definition: str(raw.r_definition) ?? EMPTY_RISK_DESK.r_definition,
    max_open_trades: num(raw.max_open_trades) ?? 0,
    slots_used: num(raw.slots_used) ?? 0,
    slots_free: num(raw.slots_free),
    fill_ratio: num(raw.fill_ratio) ?? 0,
    net_side: str(raw.net_side) ?? "flat",
    book_state: str(raw.book_state),
    gates_summary: gatesSummary,
    gates,
    same_side: {
      count: num(sameRaw.count) ?? 0,
      avg_r: num(sameRaw.avg_r),
      worst_r: num(sameRaw.worst_r),
      best_r: num(sameRaw.best_r),
    },
    limits: {
      avg_down_hard_reject_r: num(limitsRaw.avg_down_hard_reject_r) ?? 1,
      worst_leg_hard_reject_r: num(limitsRaw.worst_leg_hard_reject_r) ?? 1.5,
    },
    positions,
    next_same_side_preview: previewRaw
      ? {
          side: str(previewRaw.side) ?? "long",
          avg_r: num(previewRaw.avg_r),
          same_side_count: num(previewRaw.same_side_count) ?? 0,
          loss_penalty_pts: num(previewRaw.loss_penalty_pts) ?? 0,
          crowding_penalty_pts: num(previewRaw.crowding_penalty_pts) ?? 0,
          total_penalty_pts: num(previewRaw.total_penalty_pts) ?? 0,
          hard_block: str(previewRaw.hard_block),
          note: str(previewRaw.note) ?? "",
        }
      : null,
    recent_events: events,
  };
}
