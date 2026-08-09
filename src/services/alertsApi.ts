import { apiFetch } from "@/services/apiFetch";
import type {
  AlertWritePayload,
  AlertsHealth,
  AlertsListResponse,
  PriceAlert,
} from "@/types/alertsTypes";

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text) as { detail?: unknown; error?: unknown };
    if (typeof parsed.detail === "string" && parsed.detail.trim()) {
      return parsed.detail;
    }
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // plain text body
  }
  return text;
}

export async function fetchAlertsList(): Promise<AlertsListResponse> {
  const res = await apiFetch("/api/alerts");
  if (!res.ok) {
    throw new Error(`alerts list failed (${res.status})`);
  }
  return (await res.json()) as AlertsListResponse;
}

export async function fetchAlertsHealth(): Promise<AlertsHealth> {
  const res = await apiFetch("/api/alerts/health");
  if (!res.ok) {
    throw new Error(`alerts health failed (${res.status})`);
  }
  return (await res.json()) as AlertsHealth;
}

export async function createAlert(payload: AlertWritePayload): Promise<PriceAlert> {
  const res = await apiFetch("/api/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `create failed (${res.status})`));
  }
  return (await res.json()) as PriceAlert;
}

export async function updateAlert(
  id: number,
  payload: Partial<AlertWritePayload>,
): Promise<PriceAlert> {
  const res = await apiFetch(`/api/alerts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `update failed (${res.status})`));
  }
  return (await res.json()) as PriceAlert;
}

export async function deleteAlert(id: number): Promise<void> {
  const res = await apiFetch(`/api/alerts/${id}`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `delete failed (${res.status})`));
  }
}
