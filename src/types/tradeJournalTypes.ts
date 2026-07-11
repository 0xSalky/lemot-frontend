import type { TradeSetupContext } from "@/types/journalAnalyticsTypes";

export type TradeLifecycle = "open" | "closed" | "unknown";
export type TradeMatchMethod =
  | "order_id"
  | "position"
  | "price_time"
  | "journal_only"
  | "unmatched"
  | "exchange_only";

export type TradeJournalStats = {
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  win_rate_pct: number | null;
  realized_pnl_usd: number;
  unrealized_pnl_usd: number;
  total_pnl_usd: number;
  total_r: number;
  avg_r: number | null;
  best_r: number | null;
  worst_r: number | null;
};

export type TradeJournalBandLevel = {
  timeframe: string | null;
  level_type: string | null;
  price: number;
  weight?: number | null;
  is_anchor?: boolean;
};

export type TradeJournalRow = {
  journal_id: number | null;
  profile: string | null;
  symbol: string;
  base: string;
  side: string;
  source: string | null;
  timeframe: string | null;
  status: string | null;
  lifecycle: TradeLifecycle;
  match_method: TradeMatchMethod;
  exchange_matched: boolean;
  executed_at: string | null;
  closed_at: string | null;
  entry_price: number | null;
  exit_price: number | null;
  stop_loss_price: number | null;
  position_size: number | null;
  fractal_level: number | null;
  band_low: number | null;
  band_high: number | null;
  band_side: string | null;
  band_range: string | null;
  band_levels: TradeJournalBandLevel[];
  stop_preset: string | null;
  tp_strategy_id: string | null;
  main_order_id: string | null;
  sl_order_id: string | null;
  tp_order_ids: string[];
  advice_id: number | null;
  advice_verdict: string | null;
  advice_confidence: string | null;
  enter_probability_pct: number | null;
  setup_grade: string | null;
  realized_pnl_usd: number | null;
  unrealized_pnl_usd: number | null;
  r_multiple: number | null;
  pnl_pct: number | null;
  leverage: number | null;
  matched_order_id: string | null;
  position_id: string | null;
  setup_context: TradeSetupContext | null;
};

export type TradeJournalGrowthPoint = {
  time: string | null;
  trade_pnl_usd?: number | null;
  trade_r?: number | null;
  cumulative_pnl_usd: number;
  cumulative_r?: number | null;
  equity_usd?: number | null;
  mark?: string | null;
};

export type TradeJournalGrowth = {
  baseline_equity_usd: number | null;
  cumulative_trading_pnl_usd: number;
  open_unrealized_pnl_usd: number;
  points: TradeJournalGrowthPoint[];
};

export type TradeJournalPayload = {
  ready: boolean;
  fetched_at: string | null;
  exchange_available: boolean;
  exchange_error: string | null;
  equity_usd: number | null;
  r_definition: string | null;
  growth: TradeJournalGrowth;
  journal_count: number;
  closed_pnl_rows: number;
  overall: TradeJournalStats;
  profiles: Record<string, TradeJournalStats>;
  trades: TradeJournalRow[];
};

export const EMPTY_TRADE_JOURNAL_STATS: TradeJournalStats = {
  total_trades: 0,
  open_trades: 0,
  closed_trades: 0,
  wins: 0,
  losses: 0,
  breakeven: 0,
  win_rate_pct: null,
  realized_pnl_usd: 0,
  unrealized_pnl_usd: 0,
  total_pnl_usd: 0,
  total_r: 0,
  avg_r: null,
  best_r: null,
  worst_r: null,
};

export const EMPTY_TRADE_JOURNAL_GROWTH: TradeJournalGrowth = {
  baseline_equity_usd: null,
  cumulative_trading_pnl_usd: 0,
  open_unrealized_pnl_usd: 0,
  points: [],
};

export const EMPTY_TRADE_JOURNAL: TradeJournalPayload = {
  ready: false,
  fetched_at: null,
  exchange_available: false,
  exchange_error: null,
  equity_usd: null,
  r_definition: null,
  growth: { ...EMPTY_TRADE_JOURNAL_GROWTH },
  journal_count: 0,
  closed_pnl_rows: 0,
  overall: { ...EMPTY_TRADE_JOURNAL_STATS },
  profiles: {
    a: { ...EMPTY_TRADE_JOURNAL_STATS },
    b: { ...EMPTY_TRADE_JOURNAL_STATS },
  },
  trades: [],
};

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeStats(raw: unknown): TradeJournalStats {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    total_trades: num(row.total_trades) ?? 0,
    open_trades: num(row.open_trades) ?? 0,
    closed_trades: num(row.closed_trades) ?? 0,
    wins: num(row.wins) ?? 0,
    losses: num(row.losses) ?? 0,
    breakeven: num(row.breakeven) ?? 0,
    win_rate_pct: num(row.win_rate_pct),
    realized_pnl_usd: num(row.realized_pnl_usd) ?? 0,
    unrealized_pnl_usd: num(row.unrealized_pnl_usd) ?? 0,
    total_pnl_usd: num(row.total_pnl_usd) ?? 0,
    total_r: num(row.total_r) ?? 0,
    avg_r: num(row.avg_r),
    best_r: num(row.best_r),
    worst_r: num(row.worst_r),
  };
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeSetupContext(raw: unknown): TradeSetupContext {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    has_snapshot: Boolean(row.has_snapshot),
    proposed_side: str(row.proposed_side),
    band_side: str(row.band_side),
    band_total_weight: num(row.band_total_weight),
    band_anchor_count: num(row.band_anchor_count),
    band_span_pct: num(row.band_span_pct),
    band_level_keys: strList(row.band_level_keys),
    band_level_families: strList(row.band_level_families),
    band_anchor_level_keys: strList(row.band_anchor_level_keys),
    htf_setup_bias: str(row.htf_setup_bias),
    htf_adx_regime: str(row.htf_adx_regime),
    htf_composite_read: str(row.htf_composite_read),
    htf_favored_side: str(row.htf_favored_side),
    htf_aligned: row.htf_aligned == null ? null : Boolean(row.htf_aligned),
    htf_adx: num(row.htf_adx),
    btc_available: Boolean(row.btc_available),
    btc_htf_setup_bias: str(row.btc_htf_setup_bias),
    btc_htf_adx_regime: str(row.btc_htf_adx_regime),
    btc_htf_aligned: row.btc_htf_aligned == null ? null : Boolean(row.btc_htf_aligned),
    btc_flow_bias: str(row.btc_flow_bias),
    btc_flow_aligned: row.btc_flow_aligned == null ? null : Boolean(row.btc_flow_aligned),
    flow_alignment: str(row.flow_alignment),
    flow_bias: str(row.flow_bias),
    flow_confidence: str(row.flow_confidence),
    flow_aligned: row.flow_aligned == null ? null : Boolean(row.flow_aligned),
    flow_tags: strList(row.flow_tags),
    flow_headline: str(row.flow_headline),
    trapped_at_fractal: Boolean(row.trapped_at_fractal),
    sequence_acceptance: str(row.sequence_acceptance),
    auction_flags: strList(row.auction_flags),
    confirm_opposes_trade:
      row.confirm_opposes_trade == null ? null : Boolean(row.confirm_opposes_trade),
    trigger: str(row.trigger),
    placement: str(row.placement),
    res_short_rejection: Boolean(row.res_short_rejection),
    sup_long_reclaim: Boolean(row.sup_long_reclaim),
    base_probability_pct: num(row.base_probability_pct),
    setup_grade: str(row.setup_grade),
    enter_probability_pct: num(row.enter_probability_pct),
    setup_factors: strList(row.setup_factors),
    fractal_volume_vs_median: num(row.fractal_volume_vs_median),
    confirm_volume_vs_median: num(row.confirm_volume_vs_median),
    entry_dow: num(row.entry_dow),
    entry_hour: num(row.entry_hour),
    entry_utc_session: str(row.entry_utc_session),
  };
}

function normalizeTrade(raw: unknown): TradeJournalRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const lifecycle = str(row.lifecycle);
  const matchMethod = str(row.match_method);
  return {
    journal_id: num(row.journal_id),
    profile: str(row.profile),
    symbol: str(row.symbol) ?? "—",
    base: str(row.base) ?? "?",
    side: str(row.side) ?? "—",
    source: str(row.source),
    timeframe: str(row.timeframe),
    status: str(row.status),
    lifecycle:
      lifecycle === "open" || lifecycle === "closed" || lifecycle === "unknown"
        ? lifecycle
        : "unknown",
    match_method:
      matchMethod === "order_id" ||
      matchMethod === "position" ||
      matchMethod === "price_time" ||
      matchMethod === "journal_only" ||
      matchMethod === "unmatched" ||
      matchMethod === "exchange_only"
        ? matchMethod
        : "journal_only",
    exchange_matched: Boolean(row.exchange_matched),
    executed_at: str(row.executed_at),
    closed_at: str(row.closed_at),
    entry_price: num(row.entry_price),
    exit_price: num(row.exit_price),
    stop_loss_price: num(row.stop_loss_price),
    position_size: num(row.position_size),
    fractal_level: num(row.fractal_level),
    band_low: num(row.band_low),
    band_high: num(row.band_high),
    band_side: str(row.band_side),
    band_range: str(row.band_range),
    band_levels: Array.isArray(row.band_levels)
      ? row.band_levels
          .map((lvl) => {
            const level = lvl as Record<string, unknown>;
            const price = num(level.price) ?? num(level.level);
            if (price == null) return null;
            return {
              timeframe: str(level.timeframe),
              level_type: str(level.level_type),
              price,
              weight: num(level.weight),
              is_anchor: Boolean(level.is_anchor),
            } as TradeJournalBandLevel;
          })
          .filter((lvl): lvl is TradeJournalBandLevel => lvl != null)
      : [],
    stop_preset: str(row.stop_preset),
    tp_strategy_id: str(row.tp_strategy_id),
    main_order_id: str(row.main_order_id),
    sl_order_id: str(row.sl_order_id),
    tp_order_ids: Array.isArray(row.tp_order_ids)
      ? row.tp_order_ids.map((item) => String(item))
      : [],
    advice_id: num(row.advice_id),
    advice_verdict: str(row.advice_verdict),
    advice_confidence: str(row.advice_confidence),
    enter_probability_pct: num(row.enter_probability_pct),
    setup_grade: str(row.setup_grade),
    realized_pnl_usd: num(row.realized_pnl_usd),
    unrealized_pnl_usd: num(row.unrealized_pnl_usd),
    r_multiple: num(row.r_multiple),
    pnl_pct: num(row.pnl_pct),
    leverage: num(row.leverage),
    matched_order_id: str(row.matched_order_id),
    position_id: str(row.position_id),
    setup_context: normalizeSetupContext(row.setup_context),
  };
}

function normalizeGrowth(raw: unknown): TradeJournalGrowth {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const pointsRaw = Array.isArray(row.points) ? row.points : [];
  return {
    baseline_equity_usd: num(row.baseline_equity_usd),
    cumulative_trading_pnl_usd: num(row.cumulative_trading_pnl_usd) ?? 0,
    open_unrealized_pnl_usd: num(row.open_unrealized_pnl_usd) ?? 0,
    points: pointsRaw
      .map((point) => {
        if (!point || typeof point !== "object") return null;
        const p = point as Record<string, unknown>;
        const cumulative = num(p.cumulative_pnl_usd);
        if (cumulative == null) return null;
        return {
          time: str(p.time),
          trade_pnl_usd: num(p.trade_pnl_usd),
          trade_r: num(p.trade_r),
          cumulative_pnl_usd: cumulative,
          cumulative_r: num(p.cumulative_r),
          equity_usd: num(p.equity_usd),
          mark: str(p.mark),
        } as TradeJournalGrowthPoint;
      })
      .filter((p): p is TradeJournalGrowthPoint => p != null),
  };
}

export function normalizeTradeJournal(raw: unknown): TradeJournalPayload {
  if (!raw || typeof raw !== "object") return { ...EMPTY_TRADE_JOURNAL };
  const body = raw as Record<string, unknown>;
  const profilesRaw =
    body.profiles && typeof body.profiles === "object"
      ? (body.profiles as Record<string, unknown>)
      : {};
  const tradesRaw = Array.isArray(body.trades) ? body.trades : [];
  return {
    ready: Boolean(body.ready),
    fetched_at: str(body.fetched_at),
    exchange_available: Boolean(body.exchange_available),
    exchange_error: str(body.exchange_error),
    equity_usd: num(body.equity_usd),
    r_definition: str(body.r_definition),
    growth: normalizeGrowth(body.growth),
    journal_count: num(body.journal_count) ?? 0,
    closed_pnl_rows: num(body.closed_pnl_rows) ?? 0,
    overall: normalizeStats(body.overall),
    profiles: {
      a: normalizeStats(profilesRaw.a),
      b: normalizeStats(profilesRaw.b),
    },
    trades: tradesRaw
      .map((row) => normalizeTrade(row))
      .filter((row): row is TradeJournalRow => row != null),
  };
}
