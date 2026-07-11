import { apiFetch } from "@/services/apiFetch";
import {
  normalizeAccountBalanceResponse,
  type AccountBalanceResponse,
} from "@/types/accountBalanceTypes";

export type AccountBalanceFetchResult = {
  data: AccountBalanceResponse | null;
  error: string | null;
  status: number | null;
};

function formatFetchError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    if (typeof record.hint === "string") return record.hint;
    if (typeof record.reason === "string") return record.reason;
    if (typeof record.error === "string") return record.error;
  }
  if (status === 401) return "Trading API credentials required";
  return `Request failed (HTTP ${status})`;
}

export async function fetchAccountBalance(options?: {
  refresh?: boolean;
}): Promise<AccountBalanceFetchResult> {
  const qs = options?.refresh ? "?refresh=true" : "";
  try {
    const res = await apiFetch(`/api/account/balance${qs}`, { cache: "no-store" });
    const body: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        data: normalizeAccountBalanceResponse(body),
        error: formatFetchError(body, res.status),
        status: res.status,
      };
    }

    return {
      data: normalizeAccountBalanceResponse(body),
      error: null,
      status: res.status,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Network error",
      status: null,
    };
  }
}
