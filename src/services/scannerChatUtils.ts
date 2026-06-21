import { apiFetch } from "@/services/apiFetch";
import type { ScannerProfile } from "@/services/scannerUtils";
import type {
  ScannerChatSendResult,
  ScannerChatStreamHandlers,
  ScannerChatThreadPayload,
  ScannerChatThreadsPayload,
} from "@/types/scannerChatTypes";

const DOLLAR_TICKER = /\$[A-Za-z0-9]+/;
const PROFILE_TAG = /#(swing|day)\b/gi;

export function messageHasDollarTicker(message: string): boolean {
  return DOLLAR_TICKER.test(message);
}

export function parseProfileTags(message: string): ScannerProfile[] {
  const seen = new Set<ScannerProfile>();
  const out: ScannerProfile[] = [];
  for (const match of message.matchAll(PROFILE_TAG)) {
    const tag = match[1]?.toLowerCase();
    if ((tag === "swing" || tag === "day") && !seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}

export function profileTagConflict(message: string): string | null {
  const tags = parseProfileTags(message);
  if (tags.length > 1) {
    return "Use only one profile tag per message (#day or #swing, not both).";
  }
  return null;
}

export function threadProfileConflict(
  message: string,
  lockedProfile: ScannerProfile | null | undefined,
): string | null {
  const tags = parseProfileTags(message);
  if (!lockedProfile || tags.length === 0) return null;
  if (tags[0] !== lockedProfile) {
    return `This thread is locked to #${lockedProfile}. Start a new chat to use #${tags[0]}.`;
  }
  return null;
}

export function draftValidationError(
  message: string,
  lockedProfile?: ScannerProfile | null,
): string | null {
  return (
    profileTagConflict(message) ?? threadProfileConflict(message, lockedProfile)
  );
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
  const res = await apiFetch("/api/scanner/chat/threads", {
    cache: "no-store",
  });
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

function parseSseChunk(
  chunk: string,
  handlers: ScannerChatStreamHandlers,
): ScannerChatSendResult | null {
  let doneResult: ScannerChatSendResult | null = null;

  for (const block of chunk.split("\n\n")) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    let eventType = "message";
    let dataLine = "";
    for (const line of trimmed.split("\n")) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLine += line.slice(5).trim();
      }
    }
    if (!dataLine) continue;

    const payload = JSON.parse(dataLine) as Record<string, unknown>;
    if (eventType === "progress") {
      const stage = String(payload.stage ?? "");
      handlers.onProgress?.(stage as never, payload);
    } else if (eventType === "delta") {
      handlers.onDelta?.(String(payload.text ?? ""));
    } else if (eventType === "done") {
      doneResult = payload as unknown as ScannerChatSendResult;
    } else if (eventType === "error") {
      throw new Error(String(payload.message ?? "Chat failed"));
    }
  }

  return doneResult;
}

export function scannerChatDisplayTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export async function sendScannerChatMessageStream(
  message: string,
  threadId?: number | null,
  handlers: ScannerChatStreamHandlers = {},
): Promise<ScannerChatSendResult> {
  const res = await apiFetch("/api/scanner/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      thread_id: threadId ?? undefined,
      display_timezone: scannerChatDisplayTimezone(),
    }),
  });

  if (!res.ok) {
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    throw new Error(apiErrorMessage(data, res.status));
  }

  if (!res.body) {
    throw new Error("Chat stream unavailable");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ScannerChatSendResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const parsed = parseSseChunk(`${block}\n\n`, handlers);
      if (parsed) result = parsed;
    }
  }

  if (buffer.trim()) {
    const parsed = parseSseChunk(`${buffer}\n\n`, handlers);
    if (parsed) result = parsed;
  }

  if (!result) {
    throw new Error("Chat stream ended without a result.");
  }
  return result;
}

/** @deprecated use sendScannerChatMessageStream */
export async function sendScannerChatMessage(
  message: string,
  threadId?: number | null,
): Promise<ScannerChatSendResult> {
  return sendScannerChatMessageStream(message, threadId);
}

export function progressLabel(
  stage: string,
  data: Record<string, unknown>,
): string {
  if (stage === "validating") return "Validating pairs…";
  if (stage === "scanning") {
    const base = data.base ?? data.symbol;
    return base ? `Scanning $${String(base).replace(/^\$/, "")}…` : "Scanning…";
  }
  if (stage === "fetching_funding") return "Fetching funding & OI…";
  if (stage === "thinking") return "Thinking…";
  return "Working…";
}
