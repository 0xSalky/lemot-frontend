import { apiFetch } from "@/services/apiFetch";
import type {
  ScannerChatSendResponse,
  ScannerChatSendResult,
  ScannerChatThreadPayload,
  ScannerChatThreadsPayload,
} from "@/types/scannerChatTypes";

const DOLLAR_TICKER = /\$[A-Za-z0-9]+/;

export function messageHasDollarTicker(message: string): boolean {
  return DOLLAR_TICKER.test(message);
}

function apiErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
  }
  return `HTTP ${status}`;
}

export async function fetchScannerChatThreads(): Promise<ScannerChatThreadsPayload> {
  const res = await apiFetch("/api/scanner/chat/threads", { cache: "no-store" });
  const data: unknown = await res.json();
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, res.status));
  }
  return data as ScannerChatThreadsPayload;
}

export async function fetchScannerChatThread(
  threadId: number,
): Promise<ScannerChatThreadPayload> {
  const res = await apiFetch(
    `/api/scanner/chat/thread?thread_id=${encodeURIComponent(String(threadId))}`,
    { cache: "no-store" },
  );
  const data: unknown = await res.json();
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, res.status));
  }
  return data as ScannerChatThreadPayload;
}

export async function sendScannerChatMessage(
  message: string,
  threadId?: number | null,
): Promise<ScannerChatSendResult> {
  const res = await apiFetch("/api/scanner/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      thread_id: threadId ?? undefined,
    }),
  });
  const data = (await res.json()) as ScannerChatSendResponse;
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, res.status));
  }
  return data as ScannerChatSendResult;
}
