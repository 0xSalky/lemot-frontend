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
