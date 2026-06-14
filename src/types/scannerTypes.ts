/**
 * Mirrors `scanner_batches` / `scanner_matches` from the scanner SQLite schema (Python backend).
 * JSON keys use the same snake_case as column names.
 */

export interface ScannerBatchRow {
  id: number;
  created_at: string;
  timeframe: string;
  candle_limit: number;
  min_quote_volume_usdt_24h: number;
  ma_len1: number;
  ma_len2: number;
  ma_len3: number;
  adx_trend_threshold: number;
  high_volume_candidates: number;
  match_count: number;
}

export interface ScannerMatchRow {
  id: number;
  /** Nullable for legacy rows before `batch_id` migration. */
  batch_id: number | null;
  scanned_at: string;
  symbol: string;
  quote_volume_24h: number;
  timeframe: string;
  candle_limit: number;
  min_quote_volume_usdt_24h: number;
  bias: string | null;
  signal: string | null;
  close_last: number | null;
  adx_last: number | null;
  /**
   * JSON array of OHLCV + indicator row objects (`orient="records"`).
   * Omitted when the API strips heavy payloads (same as `include_dataframe=False` in Python).
   */
  dataframe_json?: string;
}

/**
 * Expected envelope for `GET /scanner/latest-batch`.
 * Adjust if your FastAPI route uses a different shape (e.g. only `matches`).
 */
export interface ScannerLatestBatchPayload {
  batch: ScannerBatchRow;
  matches: ScannerMatchRow[];
}

export type ScannerLatestBatchFetchResult =
  | ScannerLatestBatchPayload
  | { message: string };
