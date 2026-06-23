import { apiFetch } from "@/services/apiFetch";
import {
  normalizeSignalsActivity,
  normalizeSignalsHealth,
  normalizeSignalsStats,
  EMPTY_SIGNALS_HEALTH,
  type SignalsMonitorActivity,
  type SignalsMonitorHealth,
  type SignalsMonitorStats,
} from "@/types/signalsMonitorTypes";

export async function fetchSignalsHealth(): Promise<SignalsMonitorHealth> {
  try {
    const res = await apiFetch("/api/signals/health");
    if (!res.ok) return { ...EMPTY_SIGNALS_HEALTH };
    const body = await res.json().catch(() => null);
    return normalizeSignalsHealth(body);
  } catch {
    return { ...EMPTY_SIGNALS_HEALTH };
  }
}

export async function fetchSignalsActivity(limit = 120): Promise<SignalsMonitorActivity> {
  try {
    const res = await apiFetch(`/api/signals/activity?limit=${limit}`);
    if (!res.ok) return { live_events: [], history_events: [], events: [], profiles: [] };
    const body = await res.json().catch(() => null);
    return normalizeSignalsActivity(body);
  } catch {
    return { live_events: [], history_events: [], events: [], profiles: [] };
  }
}

export async function fetchSignalsStats(hours = 24): Promise<SignalsMonitorStats> {
  try {
    const res = await apiFetch(`/api/signals/stats?hours=${hours}`);
    if (!res.ok) {
      return normalizeSignalsStats(null);
    }
    const body = await res.json().catch(() => null);
    return normalizeSignalsStats(body);
  } catch {
    return normalizeSignalsStats(null);
  }
}
