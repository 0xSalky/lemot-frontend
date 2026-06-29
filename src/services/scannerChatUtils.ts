import { apiFetch } from "@/services/apiFetch";
import type { ScannerProfile } from "@/services/scannerUtils";
import type {
  ScannerChatModel,
  ScannerChatSendOptions,
  ScannerChatSendResult,
  ScannerChatStreamHandlers,
  ScannerChatThreadPayload,
  ScannerChatThreadsPayload,
} from "@/types/scannerChatTypes";

const PROFILE_TAG = /#(swing|day)\b/gi;

const CHAT_MODEL_STORAGE_KEY = "lemot.chat.model";

export function loadChatModelPreference(): ScannerChatModel {
  if (typeof window === "undefined") return "haiku";
  const stored = window.localStorage.getItem(CHAT_MODEL_STORAGE_KEY);
  return stored === "sonnet" ? "sonnet" : "haiku";
}

export function saveChatModelPreference(model: ScannerChatModel): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAT_MODEL_STORAGE_KEY, model);
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
    return `This thread is locked to ${lockedProfile}. Start a new chat to switch profile.`;
  }
  return null;
}

export function draftValidationError(
  message: string,
  lockedProfile?: ScannerProfile | null,
  selectedProfile?: ScannerProfile | null,
): string | null {
  const tagConflict = profileTagConflict(message);
  if (tagConflict) return tagConflict;
  const threadConflict = threadProfileConflict(message, lockedProfile);
  if (threadConflict) return threadConflict;
  if (
    lockedProfile &&
    selectedProfile &&
    lockedProfile !== selectedProfile
  ) {
    return `This thread is locked to ${lockedProfile}. Start a new chat to switch profile.`;
  }
  return null;
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
  profile?: ScannerProfile | null,
): Promise<ScannerChatThreadPayload> {
  const params = new URLSearchParams({ thread_id: String(threadId) });
  if (profile) params.set("profile", profile);
  const res = await apiFetch(`/api/scanner/chat/thread?${params.toString()}`, {
    cache: "no-store",
  });
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
  options: ScannerChatSendOptions = {},
): Promise<ScannerChatSendResult> {
  const res = await apiFetch("/api/scanner/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      thread_id: threadId ?? undefined,
      profile: options.profile,
      model: options.model ?? "haiku",
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
  options: ScannerChatSendOptions = {},
): Promise<ScannerChatSendResult> {
  return sendScannerChatMessageStream(message, threadId, {}, options);
}

export function progressLabel(
  stage: string,
  data: Record<string, unknown>,
): string {
  if (stage === "tool") {
    const label = data.label ?? data.name;
    return label ? `Reading ${String(label)}…` : "Reading system data…";
  }
  if (stage === "scanning") {
    const base = data.base ?? data.symbol;
    return base ? `Scanning $${String(base).replace(/^\$/, "")}…` : "Scanning…";
  }
  if (stage === "thinking") return "Thinking…";
  return "Working…";
}

export function formatRelativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function chatModelLabel(model: ScannerChatModel): string {
  return model === "haiku" ? "Haiku" : "Sonnet";
}

export function toolLabel(name: string): string {
  return name.replace(/^get_/, "").replaceAll("_", " ");
}
