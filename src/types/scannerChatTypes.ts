/** Scanner pair chat — mirrors `scanner_chat_threads` / `scanner_chat_messages`. */

export interface ScannerChatThreadRow {
  id: number;
  created_at: string;
  updated_at: string;
  title: string | null;
}

export interface ScannerChatMessageRow {
  id: number;
  thread_id: number;
  role: "user" | "assistant" | string;
  content: string;
  symbols?: string[] | null;
  context?: Record<string, unknown> | null;
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
  scanned_at?: string;
  thread: ScannerChatThreadRow;
  messages: ScannerChatMessageRow[];
}

export type ScannerChatSendResponse =
  | ScannerChatSendResult
  | { detail?: string; message?: string; error?: string };
