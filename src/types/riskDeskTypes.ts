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
  risk_mult?: number;
  risk_percent?: number;
  system_setup_grade?: string | null;
  /** Planned reward R from journal TP preset (e.g. 1.8 / 2 / 2.5). */
  target_tp_rr?: number | null;
  tp_strategy_id?: string | null;
  journal_id?: number | null;
  main_order_id?: string | null;
  profile?: string | null;
  band_side?: string | null;
  band_range?: string | null;
  entry_price?: number | null;
  stop_loss_price?: number | null;
  match_method?: string | null;
  position_id?: string | null;
  ccxt_symbol?: string | null;
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

export interface TradeMgmtLadderRung {
  trigger_r: number;
  lock_r: number;
}

export interface TradeMgmtProposal {
  kind: "sl" | "tp";
  price: number;
  price_display: string;
  reason: string;
  lock_r: number | null;
  would_notify: boolean;
  notify_skip_reason: string | null;
  action_label: string;
}

export interface TradeMgmtMilestone {
  id: string;
  label: string;
  r: number;
  pct: number;
  reached: boolean;
  kind: "tp" | "lock" | "trail";
  lock_r?: number;
}

export interface TradeMgmtProgress {
  scale_max_r: number;
  target_tp_rr: number | null;
  current_r: number | null;
  applied_lock_r: number | null;
  active_lock_trigger_r: number | null;
  active_lock_bank_r: number | null;
  current_pct: number;
  pct_to_target_tp: number | null;
  r_to_target_tp: number | null;
  next_lock_trigger_r: number | null;
  next_lock_bank_r: number | null;
  milestones: TradeMgmtMilestone[];
  phase: "winner" | "loser" | "flat";
}

export interface TradeMgmtPosition {
  symbol: string;
  ccxt_symbol: string;
  side: string;
  profile?: string | null;
  size: number;
  unrealized_pnl_usd?: number;
  on_watchlist: boolean;
  entry: number | null;
  mark: number | null;
  stop: number | null;
  take_profit: number | null;
  r_multiple: number | null;
  target_tp_rr: number | null;
  applied_lock_r: number | null;
  progress: TradeMgmtProgress | null;
  wait_detail: string;
  proposals: TradeMgmtProposal[];
}

export interface TradeMgmtDesk {
  enabled: boolean;
  auto_enabled: boolean;
  poll_seconds: number;
  profile: string;
  entry_tp_rr_levels: number[];
  lock_bank_offset_r: number;
  scale_max_r: number;
  extend_min_r: number;
  extend_min_rr: number;
  lock_ladder: TradeMgmtLadderRung[];
  status: string;
  status_detail: string;
  positions: TradeMgmtPosition[];
}

export interface RiskDeskBookView {
  max_open_trades: number;
  slots_used: number;
  slots_free: number | null;
  fill_ratio: number;
  net_side: string;
  book_state?: string | null;
  gates_summary: RiskGatesSummary;
  gates: RiskGate[];
  same_side: RiskSameSideStats;
  positions: RiskDeskPosition[];
  next_same_side_preview?: RiskNextPreview | null;
}

export interface RiskProfileDesk extends RiskDeskBookView {
  profile: string;
  trade_with_bias?: boolean;
  trade_with_btc_bias?: boolean;
  trade_with_trend?: boolean;
}

export interface RiskDeskGlobalView {
  max_open_trades: number;
  slots_used: number;
  slots_free: number | null;
  fill_ratio: number;
  net_side: string;
  gates_summary: RiskGatesSummary;
  gates: RiskGate[];
  unknown_count: number;
}

export interface RiskModeInfo {
  risk_desk_strict: boolean;
  mode: "strict" | "htf_filter" | string;
  label: string;
  summary: string;
}

export interface RiskDeskSignalsRuntime {
  signals_enabled: boolean;
  a_enabled: boolean;
  b_enabled: boolean;
  risk_desk_strict?: boolean;
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
  unknown_positions: RiskDeskPosition[];
  profiles: Record<string, RiskProfileDesk>;
  global: RiskDeskGlobalView | null;
  next_same_side_preview: RiskNextPreview | null;
  recent_events: RiskDeskEvent[];
  trade_mgmt: TradeMgmtDesk | null;
  risk_mode: RiskModeInfo | null;
  signals_runtime: RiskDeskSignalsRuntime | null;
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
  unknown_positions: [],
  profiles: {},
  global: null,
  next_same_side_preview: null,
  recent_events: [],
  trade_mgmt: null,
  risk_mode: null,
  signals_runtime: null,
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

function normalizeBookView(raw: Record<string, unknown>): RiskDeskBookView {
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
  const sameRaw = (raw.same_side ?? {}) as Record<string, unknown>;
  const previewRaw = raw.next_same_side_preview as Record<string, unknown> | null;
  const positions = normalizePositions(raw.positions);
  const summary = str(raw.gates_summary);
  const gatesSummary: RiskGatesSummary =
    summary === "blocked" || summary === "warn" ? summary : "clear";

  return {
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
  };
}

function normalizePositions(value: unknown): RiskDeskPosition[] {
  if (!Array.isArray(value)) return [];
  return value.map((p) => {
    const row = p as Record<string, unknown>;
    return {
      symbol: str(row.symbol) ?? "?",
      side: str(row.side) ?? "unknown",
      leverage: num(row.leverage) ?? undefined,
      pnl_pct: num(row.pnl_pct) ?? undefined,
      in_profit: typeof row.in_profit === "boolean" ? row.in_profit : undefined,
      unrealized_pnl_usd: num(row.unrealized_pnl_usd) ?? undefined,
      r_multiple: num(row.r_multiple) ?? undefined,
      risk_mult: num(row.risk_mult) ?? undefined,
      risk_percent: num(row.risk_percent) ?? undefined,
      system_setup_grade: str(row.system_setup_grade),
      target_tp_rr: num(row.target_tp_rr),
      tp_strategy_id: str(row.tp_strategy_id),
      journal_id: num(row.journal_id),
      main_order_id: str(row.main_order_id),
      profile: str(row.profile),
      band_side: str(row.band_side),
      band_range: str(row.band_range),
      entry_price: num(row.entry_price),
      stop_loss_price: num(row.stop_loss_price),
      match_method: str(row.match_method),
      position_id: str(row.position_id),
      ccxt_symbol: str(row.ccxt_symbol),
    };
  });
}

export function normalizeRiskDesk(body: unknown): RiskDeskPayload {
  if (!body || typeof body !== "object") return { ...EMPTY_RISK_DESK };
  const raw = body as Record<string, unknown>;
  const accountView = normalizeBookView(raw);
  const gates = accountView.gates;
  const positions = accountView.positions;

  const limitsRaw = (raw.limits ?? {}) as Record<string, unknown>;
  const globalRaw = raw.global as Record<string, unknown> | null;
  const profilesRaw = raw.profiles as Record<string, unknown> | null;
  const profiles: Record<string, RiskProfileDesk> = {};
  if (profilesRaw && typeof profilesRaw === "object") {
    for (const [key, value] of Object.entries(profilesRaw)) {
      if (!value || typeof value !== "object") continue;
      const book = normalizeBookView(value as Record<string, unknown>);
      const row = value as Record<string, unknown>;
      profiles[key] = {
        ...book,
        profile: str(row.profile) ?? key,
        trade_with_bias: row.trade_with_bias === true,
        trade_with_btc_bias: row.trade_with_btc_bias === true,
        trade_with_trend: row.trade_with_trend === true,
      };
    }
  }

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
  const tradeMgmtRaw = raw.trade_mgmt as Record<string, unknown> | null;
  const previewRaw = raw.next_same_side_preview as Record<string, unknown> | null;
  const runtimeRaw = raw.signals_runtime as Record<string, unknown> | null;
  const riskModeRaw = raw.risk_mode as Record<string, unknown> | null;

  return {
    ready: Boolean(raw.ready),
    fetched_at: str(raw.fetched_at),
    positions_available: Boolean(raw.positions_available),
    positions_error: str(raw.positions_error),
    equity_usd: num(raw.equity_usd),
    risk_percent: num(raw.risk_percent) ?? 1,
    risk_unit_usd: num(raw.risk_unit_usd),
    r_definition: str(raw.r_definition) ?? EMPTY_RISK_DESK.r_definition,
    max_open_trades: accountView.max_open_trades,
    slots_used: accountView.slots_used,
    slots_free: accountView.slots_free,
    fill_ratio: accountView.fill_ratio,
    net_side: accountView.net_side,
    book_state: accountView.book_state ?? null,
    gates_summary: gatesSummary,
    gates,
    same_side: accountView.same_side,
    limits: {
      avg_down_hard_reject_r: num(limitsRaw.avg_down_hard_reject_r) ?? 1,
      worst_leg_hard_reject_r: num(limitsRaw.worst_leg_hard_reject_r) ?? 1.5,
    },
    positions,
    unknown_positions: normalizePositions(raw.unknown_positions),
    profiles,
    global: globalRaw
      ? {
          max_open_trades: num(globalRaw.max_open_trades) ?? accountView.max_open_trades,
          slots_used: num(globalRaw.slots_used) ?? accountView.slots_used,
          slots_free: num(globalRaw.slots_free),
          fill_ratio: num(globalRaw.fill_ratio) ?? accountView.fill_ratio,
          net_side: str(globalRaw.net_side) ?? accountView.net_side,
          gates_summary: (["blocked", "warn"].includes(String(globalRaw.gates_summary))
            ? globalRaw.gates_summary
            : "clear") as RiskGatesSummary,
          gates: Array.isArray(globalRaw.gates)
            ? globalRaw.gates.map((g) => {
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
            : [],
          unknown_count: num(globalRaw.unknown_count) ?? 0,
        }
      : null,
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
    trade_mgmt: tradeMgmtRaw ? normalizeTradeMgmtDesk(tradeMgmtRaw) : null,
    risk_mode: riskModeRaw
      ? {
          risk_desk_strict:
            riskModeRaw.risk_desk_strict !== undefined
              ? Boolean(riskModeRaw.risk_desk_strict)
              : riskModeRaw.risk_desk_htf_bias !== false,
          mode: str(riskModeRaw.mode) ?? "strict",
          label: str(riskModeRaw.label) ?? "Strict",
          summary: str(riskModeRaw.summary) ?? "",
        }
      : null,
    signals_runtime: runtimeRaw
      ? {
          signals_enabled: Boolean(runtimeRaw.signals_enabled),
          a_enabled: Boolean(runtimeRaw.a_enabled),
          b_enabled: Boolean(runtimeRaw.b_enabled),
          risk_desk_strict:
            runtimeRaw.risk_desk_strict !== undefined
              ? runtimeRaw.risk_desk_strict !== false
              : runtimeRaw.risk_desk_htf_bias !== false,
        }
      : null,
  };
}

function normalizeTradeMgmtProgress(raw: Record<string, unknown> | null): TradeMgmtProgress | null {
  if (!raw) return null;
  const milestones = Array.isArray(raw.milestones)
    ? raw.milestones.map((m) => {
        const row = m as Record<string, unknown>;
        const kind = str(row.kind);
        return {
          id: str(row.id) ?? "m",
          label: str(row.label) ?? "",
          r: num(row.r) ?? 0,
          pct: num(row.pct) ?? 0,
          reached: Boolean(row.reached),
          kind: (kind === "tp" ? "tp" : kind === "trail" ? "trail" : "lock") as TradeMgmtMilestone["kind"],
          lock_r: num(row.lock_r) ?? undefined,
        };
      })
    : [];
  const phase = str(raw.phase);
  return {
    scale_max_r: num(raw.scale_max_r) ?? 3,
    target_tp_rr: num(raw.target_tp_rr),
    current_r: num(raw.current_r),
    applied_lock_r: num(raw.applied_lock_r),
    active_lock_trigger_r: num(raw.active_lock_trigger_r),
    active_lock_bank_r: num(raw.active_lock_bank_r),
    current_pct: num(raw.current_pct) ?? 0,
    pct_to_target_tp: num(raw.pct_to_target_tp),
    r_to_target_tp: num(raw.r_to_target_tp),
    next_lock_trigger_r: num(raw.next_lock_trigger_r),
    next_lock_bank_r: num(raw.next_lock_bank_r),
    milestones,
    phase: phase === "winner" || phase === "loser" ? phase : "flat",
  };
}

function normalizeTradeMgmtDesk(raw: Record<string, unknown>): TradeMgmtDesk {
  const ladder = Array.isArray(raw.lock_ladder)
    ? raw.lock_ladder.map((rung) => {
        const row = rung as Record<string, unknown>;
        return {
          trigger_r: num(row.trigger_r) ?? 0,
          lock_r: num(row.lock_r) ?? 0,
        };
      })
    : [];

  const positions = Array.isArray(raw.positions)
    ? raw.positions.map((p) => {
        const row = p as Record<string, unknown>;
        const proposals = Array.isArray(row.proposals)
          ? row.proposals.map((prop) => {
              const pr = prop as Record<string, unknown>;
              const kind = str(pr.kind);
              return {
                kind: (kind === "tp" ? "tp" : "sl") as TradeMgmtProposal["kind"],
                price: num(pr.price) ?? 0,
                price_display: str(pr.price_display) ?? "—",
                reason: str(pr.reason) ?? "",
                lock_r: num(pr.lock_r),
                would_notify: Boolean(pr.would_notify),
                notify_skip_reason: str(pr.notify_skip_reason),
                action_label: str(pr.action_label) ?? "",
              };
            })
          : [];
        return {
          symbol: str(row.symbol) ?? "?",
          ccxt_symbol: str(row.ccxt_symbol) ?? "",
          side: str(row.side) ?? "unknown",
          profile: str(row.profile),
          size: num(row.size) ?? 0,
          unrealized_pnl_usd: num(row.unrealized_pnl_usd) ?? undefined,
          on_watchlist: Boolean(row.on_watchlist),
          entry: num(row.entry),
          mark: num(row.mark),
          stop: num(row.stop),
          take_profit: num(row.take_profit),
          r_multiple: num(row.r_multiple),
          target_tp_rr: num(row.target_tp_rr),
          applied_lock_r: num(row.applied_lock_r),
          progress: normalizeTradeMgmtProgress(
            (row.progress as Record<string, unknown>) ?? null,
          ),
          wait_detail: str(row.wait_detail) ?? "",
          proposals,
        };
      })
    : [];

  return {
    enabled: Boolean(raw.enabled),
    auto_enabled: Boolean(raw.auto_enabled),
    poll_seconds: num(raw.poll_seconds) ?? 300,
    profile: str(raw.profile) ?? "a",
    entry_tp_rr_levels: Array.isArray(raw.entry_tp_rr_levels)
      ? raw.entry_tp_rr_levels.map((v) => num(v) ?? 0).filter((v) => v > 0)
      : [],
    lock_bank_offset_r: num(raw.lock_bank_offset_r) ?? 1,
    scale_max_r: num(raw.scale_max_r) ?? 3,
    extend_min_r: num(raw.extend_min_r) ?? 2,
    extend_min_rr: num(raw.extend_min_rr) ?? 2,
    lock_ladder: ladder,
    status: str(raw.status) ?? "unknown",
    status_detail: str(raw.status_detail) ?? "",
    positions,
  };
}
