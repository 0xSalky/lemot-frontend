/**
 * Mirrors `scanner_v2_batches` / `scanner_v2_setups` from the Python backend.
 */

export interface ScannerLevelRow {
  timeframe: string;
  level_type: string;
  level: number;
  weight?: number;
  /** Session open date from API (MM-DD-YY); use formatLevelDateDisplay in UI. */
  level_date?: string;
}

export interface ScannerBandRow {
  side: "RES" | "SUP" | "AT" | string | null;
  low: number;
  high: number;
  total_weight: number;
  distance_pct?: number | null;
  /** Percent from lowest to highest level in the band. */
  span_pct?: number | null;
  level_count?: number;
  levels: ScannerLevelRow[];
}

export interface ScannerBatchRow {
  id: number;
  created_at: string;
  mode: string;
  min_quote_volume_usdt_24h: number;
  cluster_pct: number;
  min_band_weight: number;
  min_band_levels: number;
  high_volume_candidates: number;
  scanned_count: number;
  match_count: number;
  ai_model?: string | null;
  ai_generated_at?: string | null;
  ai_status?: string | null;
  ai_summary?: ScannerAiBatchSummary | null;
  ai_btc_context?: Record<string, unknown> | null;
}

export interface ScannerAiSetupAnalysis {
  symbol: string;
  ai_action?: string;
  ai_opportunity_type?: string;
  ai_risk_level?: string;
  ai_confidence?: number;
  ai_btc_alignment?: string;
  ai_rank_in_batch?: number;
  ai_best_band?: {
    side?: string;
    price_high?: number;
    price_low?: number;
    total_weight?: number;
  };
  ai_entry_zone?: string;
  ai_stop?: string;
  ai_targets?: string[];
  ai_thesis?: string;
  ai_opportunity_notes?: string;
  ai_risks?: string[];
  fractal_vwap_notes?: string;
}

export interface ScannerAiBatchSummary {
  btc_read?: string;
  batch_rankings?: {
    best_with_trend?: string[];
    best_counter_trend_bounce?: string[];
    best_fade_resistance?: string[];
    best_buy_support?: string[];
    skip_or_map_only?: string[];
  };
}

export interface ScannerSetupRow {
  id: number;
  batch_id: number;
  scanned_at: string;
  rank: number;
  symbol: string;
  score: number;
  bias: string;
  signal?: string | null;
  adx: number;
  adx_regime: string;
  price: number;
  quote_volume_24h: number;
  bands: ScannerBandRow[];
  ai?: ScannerAiSetupAnalysis | null;
  ai_action?: string | null;
  ai_confidence?: number | null;
  ai_rank?: number | null;
  ai_status?: string | null;
}

export interface ScannerLatestBatchPayload {
  batch: ScannerBatchRow;
  setups: ScannerSetupRow[];
}

export type ScannerLatestBatchFetchResult =
  | ScannerLatestBatchPayload
  | { message: string };

export interface ScannerChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ScannerChartPayload {
  symbol: string;
  timeframe: string;
  candles: ScannerChartCandle[];
}

export const SCANNER_CHART_TIMEFRAMES = ["1h", "2h", "4h", "1d"] as const;
export type ScannerChartTimeframe = (typeof SCANNER_CHART_TIMEFRAMES)[number];
