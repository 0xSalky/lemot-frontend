export const FOOTPRINT_SYMBOLS = ["BTC", "ETH", "SOL", "HYPE"] as const;
export type FootprintSymbol = (typeof FOOTPRINT_SYMBOLS)[number];

export const FOOTPRINT_TIMEFRAMES = ["5m", "15m", "30m", "1h", "2h", "4h"] as const;
export type FootprintTimeframe = (typeof FOOTPRINT_TIMEFRAMES)[number];

export type FootprintProfile = "swing" | "day";

export type FootprintSignalSeverity = "high" | "medium" | "low";

export interface FootprintSignal {
  id: string;
  severity: FootprintSignalSeverity;
  label: string;
  display?: boolean;
  bias_score?: number;
}

export interface FootprintRecentSummary {
  bars: number;
  price_trend: string;
  delta_sum: number | null;
  oi_change_pct: number | null;
}

export type FootprintBias = "bullish" | "bearish" | "neutral" | "mixed";

export interface FootprintAiAnalysis {
  symbol: string;
  base: string;
  timeframe: string;
  profile: string;
  bias: FootprintBias;
  bias_score: number;
  confidence: string;
  narrative: string;
  dimensions: Record<string, unknown>;
  signals_all: FootprintSignal[];
  signals_display: FootprintSignal[];
  signals_hidden: FootprintSignal[];
  recent?: FootprintRecentSummary | null;
  data_quality: {
    bars_with_flow: number;
    bars_total: number;
    gap_bars: number;
  };
}

export interface FootprintSummary {
  headline: string;
  price_trend: string;
  cvd_trend: string;
  flow_alignment: string;
  bias?: FootprintBias;
  bias_score?: number;
  confidence?: string;
  bias_rationale?: string[];
  bias_disclaimer?: string;
  units?: string;
  cvd_anchor?: string;
  tags: string[];
  signals?: FootprintSignal[];
  recent?: FootprintRecentSummary | null;
  last_delta?: number | null;
  last_cvd_window?: number | null;
  last_oi_change_pct?: number | null;
  window_oi_open?: number | null;
  window_oi_close?: number | null;
  window_oi_change?: number | null;
  window_oi_change_pct?: number | null;
  last_oi_close?: number | null;
  last_funding_rate?: number | null;
  last_vwap?: number | null;
  structure_timeframe?: string | null;
  structure_bias?: string | null;
  structure_signal?: string | null;
  structure_adx_regime?: string | null;
  structure_adx?: number | null;
  structure_read?: string | null;
  structure_summary?: string | null;
  structure_favored_side?: string | null;
  combined_read?: string | null;
  flow_bias?: FootprintBias;
  flow_bias_score?: number;
  flow_confidence?: string;
  flow_bias_rationale?: string[];
  flow_bias_disclaimer?: string;
}

export interface FootprintMergedBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  bucket_start: string | null;
  delta: number | null;
  delta_max: number | null;
  delta_min: number | null;
  delta_usd?: number | null;
  delta_max_usd?: number | null;
  delta_min_usd?: number | null;
  cvd_window: number | null;
  cvd_session: number | null;
  cvd_window_usd?: number | null;
  oi_open: number | null;
  oi_close: number | null;
  oi_change: number | null;
  oi_open_usd?: number | null;
  oi_close_usd?: number | null;
  oi_change_usd?: number | null;
  oi_change_pct: number | null;
  funding_rate: number | null;
  vwap: number | null;
  mark_open?: number | null;
  mark_close?: number | null;
  liq_long_notional: number | null;
  liq_short_notional: number | null;
  liq_count: number | null;
  source_gap: number | null;
}

export interface FootprintOrderflowBar {
  bucket_start: string;
  bucket_end: string;
  delta: number;
  delta_max: number;
  delta_min: number;
  cvd_window?: number;
  cvd_session?: number;
  cdv: number;
  oi_open?: number | null;
  oi_close?: number | null;
  oi_change_pct: number | null;
  liq_count: number;
  source_gap: number;
  trade_count: number;
}

export interface FootprintPairView {
  base: string;
  symbol: string;
  orderflow: {
    symbol: string;
    timeframe: string;
    stored_bucket_minutes: number;
    bars: FootprintOrderflowBar[];
  } | null;
  chart: {
    symbol: string;
    timeframe: string;
    candles: { time: number; open: number; high: number; low: number; close: number }[];
  } | null;
  merged: FootprintMergedBar[];
  summary: FootprintSummary;
  structure?: Record<string, unknown> | null;
  ai_analysis?: FootprintAiAnalysis;
}

export interface FootprintViewPayload {
  profile: FootprintProfile;
  timeframe: FootprintTimeframe;
  stored_bucket_minutes: number;
  bar_limit: number;
  cvd_anchor: string;
  health: Record<string, unknown> | null;
  pairs: Record<string, FootprintPairView>;
}

export const FOOTPRINT_PROFILE_DEFAULTS: Record<
  FootprintProfile,
  { label: string; defaultTimeframe: FootprintTimeframe }
> = {
  swing: { label: "Swing", defaultTimeframe: "4h" },
  day: { label: "Day", defaultTimeframe: "30m" },
};

export const FOOTPRINT_SIGNAL_SEVERITY_ORDER: Record<FootprintSignalSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};
