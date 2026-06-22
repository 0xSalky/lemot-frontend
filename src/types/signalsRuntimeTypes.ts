export interface SignalsRuntimeControls {
  signals_enabled: boolean;
  entry_advice_enabled: boolean;
  day_enabled: boolean;
  swing_enabled: boolean;
  updated_at: string | null;
  summary: string;
  ready: boolean;
}

export interface SignalsRuntimeUpdate {
  signals_enabled?: boolean;
  entry_advice_enabled?: boolean;
  day_enabled?: boolean;
  swing_enabled?: boolean;
  notify_telegram?: boolean;
}

export interface SignalsRuntimePatchResult extends SignalsRuntimeControls {
  telegram_notified: boolean;
}

/** Shown when runtime DB/table is not ready — all off, disabled in UI. */
export const UNAVAILABLE_SIGNALS_RUNTIME: SignalsRuntimeControls = {
  signals_enabled: false,
  entry_advice_enabled: false,
  day_enabled: false,
  swing_enabled: false,
  updated_at: null,
  summary: "Unavailable",
  ready: false,
};

export function normalizeSignalsRuntime(raw: unknown): SignalsRuntimeControls {
  if (!raw || typeof raw !== "object") {
    return { ...UNAVAILABLE_SIGNALS_RUNTIME };
  }

  const data = raw as Record<string, unknown>;
  const ready =
    typeof data.ready === "boolean" ? data.ready : Boolean(data.updated_at);

  if (!ready) {
    return { ...UNAVAILABLE_SIGNALS_RUNTIME };
  }

  return {
    signals_enabled: Boolean(data.signals_enabled),
    entry_advice_enabled: Boolean(data.entry_advice_enabled),
    day_enabled: Boolean(data.day_enabled),
    swing_enabled: Boolean(data.swing_enabled),
    updated_at: typeof data.updated_at === "string" ? data.updated_at : null,
    summary:
      typeof data.summary === "string" ? data.summary : "Signals active",
    ready: true,
  };
}
