/** Scanner pair chat — mirrors `scanner_chat_threads` / `scanner_chat_messages`. */

import type { ScannerProfile } from "@/services/scannerUtils";

export interface ScannerChatThreadRow {
  id: number;
  created_at: string;
  updated_at: string;
  title: string | null;
  profile?: ScannerProfile | null;
}

export interface ScannerChatScanSummary {
  symbol: string;
  base: string;
  profile: ScannerProfile;
  bias?: string | null;
  price?: number | null;
  nearest_band?: {
    side?: string | null;
    dist_pct?: number | null;
    price_high?: number | null;
    price_low?: number | null;
    kind?: string | null;
  } | null;
}

export interface ScannerChatStructuredSetup {
  symbol?: string;
  ai_best_band?: {
    side?: string | null;
    price_high?: number | null;
    price_low?: number | null;
    dist_pct?: number | null;
  } | null;
  ai_opportunity_notes?: string | null;
  ai_invalidation?: string | null;
}

export interface ScannerChatStructuredBlock {
  setups?: ScannerChatStructuredSetup[];
}

export interface ScannerChatMessageRow {
  id: number;
  thread_id: number;
  role: "user" | "assistant" | string;
  content: string;
  symbols?: string[] | null;
  profile?: ScannerProfile | null;
  context?: {
    scan_summaries?: ScannerChatScanSummary[];
    structured?: ScannerChatStructuredBlock | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
}

export interface ScannerChatThreadsPayload {
  threads: ScannerChatThreadRow[];
}

export interface ScannerChatThreadPayload {
  thread: ScannerChatThreadRow;
  messages: ScannerChatMessageRow[];
}

export interface ScannerChatSendResult {
  success: boolean;
  thread_id: number;
  reply: string;
  symbols: string[];
  profile?: ScannerProfile;
  scanned_at?: string;
  scan_summaries?: ScannerChatScanSummary[];
  structured?: ScannerChatStructuredBlock | null;
  thread: ScannerChatThreadRow;
  messages: ScannerChatMessageRow[];
}

export type ScannerChatSendResponse =
  | ScannerChatSendResult
  | { detail?: string; message?: string; error?: string };

export type ScannerChatProgressStage =
  | "validating"
  | "scanning"
  | "fetching_funding"
  | "thinking";

export interface ScannerChatStreamHandlers {
  onProgress?: (stage: ScannerChatProgressStage, data: Record<string, unknown>) => void;
  onDelta?: (text: string) => void;
}
