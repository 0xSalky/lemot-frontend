import { apiFetch } from "@/services/apiFetch";
import {
  normalizeSignalsRuntime,
  UNAVAILABLE_SIGNALS_RUNTIME,
  type SignalsRuntimeControls,
  type SignalsRuntimePatchResult,
  type SignalsRuntimeUpdate,
} from "@/types/signalsRuntimeTypes";

export async function fetchSignalsRuntime(): Promise<SignalsRuntimeControls> {
  try {
    const res = await apiFetch("/api/signals/runtime");
    if (!res.ok) {
      return { ...UNAVAILABLE_SIGNALS_RUNTIME };
    }
    const body = await res.json().catch(() => null);
    return normalizeSignalsRuntime(body);
  } catch {
    return { ...UNAVAILABLE_SIGNALS_RUNTIME };
  }
}

export async function patchSignalsRuntime(
  update: SignalsRuntimeUpdate,
): Promise<SignalsRuntimePatchResult> {
  const res = await apiFetch("/api/signals/runtime", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notify_telegram: true, ...update }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : Array.isArray(body.detail)
          ? body.detail
              .map((item: { msg?: string }) => item?.msg)
              .filter(Boolean)
              .join("; ")
          : "";
    throw new Error(
      detail || `Failed to update signals runtime (HTTP ${res.status})`,
    );
  }
  const body = await res.json().catch(() => ({}));
  return {
    ...normalizeSignalsRuntime(body),
    telegram_notified: Boolean(
      (body as { telegram_notified?: boolean }).telegram_notified,
    ),
  };
}
