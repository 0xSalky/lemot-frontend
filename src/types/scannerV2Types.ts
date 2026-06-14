/**
 * Mirrors `scanner_v2_batches` / `scanner_v2_setups` from the Python backend.
 */

export interface ScannerV2LevelRow {
  timeframe: string;
  level_type: string;
  level: number;
  weight?: number;
  /** Session open date from API (MM-DD-YY); use formatLevelDateDisplay in UI. */
  level_date?: string;
}

export interface ScannerV2BandRow {
  side: "RES" | "SUP" | "AT" | string | null;
  low: number;
  high: number;
  total_weight: number;
  distance_pct?: number | null;
  level_count?: number;
  levels: ScannerV2LevelRow[];
}

export interface ScannerV2BatchRow {
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
}

export interface ScannerV2SetupRow {
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
  bands: ScannerV2BandRow[];
}

export interface ScannerV2LatestBatchPayload {
  batch: ScannerV2BatchRow;
  setups: ScannerV2SetupRow[];
}

export type ScannerV2LatestBatchFetchResult =
  | ScannerV2LatestBatchPayload
  | { message: string };
