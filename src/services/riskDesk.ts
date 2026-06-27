import { apiFetch } from "@/services/apiFetch";
import { EMPTY_RISK_DESK, normalizeRiskDesk, type RiskDeskPayload } from "@/types/riskDeskTypes";

export async function fetchRiskDesk(): Promise<RiskDeskPayload> {
  try {
    const res = await apiFetch("/api/signals/risk-desk");
    if (!res.ok) return { ...EMPTY_RISK_DESK };
    const body = await res.json().catch(() => null);
    return normalizeRiskDesk(body);
  } catch {
    return { ...EMPTY_RISK_DESK };
  }
}
