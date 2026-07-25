import { apiFetch } from "@/services/apiFetch";
import {
  EMPTY_TRADE_JOURNAL,
  normalizeTradeJournal,
  type TradeJournalPayload,
} from "@/types/tradeJournalTypes";

export async function fetchTradeJournal(): Promise<TradeJournalPayload> {
  try {
    const res = await apiFetch("/api/signals/journal");
    if (!res.ok) return { ...EMPTY_TRADE_JOURNAL };
    const body = await res.json().catch(() => null);
    return normalizeTradeJournal(body);
  } catch {
    return { ...EMPTY_TRADE_JOURNAL };
  }
}

export type ClosedPnlSyncResult = {
  error?: string | null;
  force_full?: boolean;
  profiles?: Record<
    string,
    {
      fetched?: number;
      upserted?: number;
      linked?: number;
      mode?: string;
      lookback_days?: number;
      error?: string | null;
    }
  >;
};

/** Full (or incremental) Bybit closed-PnL → DB sync. Optional profile = a|b. */
export async function syncClosedPnlJournal(options?: {
  full?: boolean;
  profile?: "a" | "b";
}): Promise<ClosedPnlSyncResult> {
  const params = new URLSearchParams();
  if (options?.full) params.set("full", "true");
  if (options?.profile) params.set("profile", options.profile);
  const qs = params.toString();
  const res = await apiFetch(`/api/signals/journal/sync${qs ? `?${qs}` : ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const body = (await res.json().catch(() => null)) as ClosedPnlSyncResult | null;
  if (!res.ok) {
    const detail =
      body && typeof body === "object" && "detail" in body
        ? String((body as { detail?: unknown }).detail)
        : `Sync failed (${res.status})`;
    throw new Error(detail);
  }
  return body ?? {};
}
