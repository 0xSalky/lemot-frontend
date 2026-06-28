export interface SignalsRuntimeControls {
  signals_enabled: boolean;
  day_entry_advice_enabled: boolean;
  swing_entry_advice_enabled: boolean;
  day_enabled: boolean;
  swing_enabled: boolean;
  day_auto_trade_enabled: boolean;
  swing_auto_trade_enabled: boolean;
  trade_mgmt_enabled: boolean;
  trade_mgmt_auto_enabled: boolean;
  updated_at: string | null;
  summary: string;
  ready: boolean;
}

export interface SignalsRuntimeUpdate {
  signals_enabled?: boolean;
  day_entry_advice_enabled?: boolean;
  swing_entry_advice_enabled?: boolean;
  day_enabled?: boolean;
  swing_enabled?: boolean;
  day_auto_trade_enabled?: boolean;
  swing_auto_trade_enabled?: boolean;
  trade_mgmt_enabled?: boolean;
  trade_mgmt_auto_enabled?: boolean;
  notify_telegram?: boolean;
}

export interface SignalsRuntimePatchResult extends SignalsRuntimeControls {
  telegram_notified: boolean;
}

/** Shown when runtime DB/table is not ready — all off, disabled in UI. */
export const UNAVAILABLE_SIGNALS_RUNTIME: SignalsRuntimeControls = {
  signals_enabled: false,
  day_entry_advice_enabled: false,
  swing_entry_advice_enabled: false,
  day_enabled: false,
  swing_enabled: false,
  day_auto_trade_enabled: false,
  swing_auto_trade_enabled: false,
  trade_mgmt_enabled: false,
  trade_mgmt_auto_enabled: false,
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
    day_entry_advice_enabled: Boolean(data.day_entry_advice_enabled),
    swing_entry_advice_enabled: Boolean(data.swing_entry_advice_enabled),
    day_enabled: Boolean(data.day_enabled),
    swing_enabled: Boolean(data.swing_enabled),
    day_auto_trade_enabled: Boolean(data.day_auto_trade_enabled),
    swing_auto_trade_enabled: Boolean(data.swing_auto_trade_enabled),
    trade_mgmt_enabled: Boolean(data.trade_mgmt_enabled),
    trade_mgmt_auto_enabled: Boolean(data.trade_mgmt_auto_enabled),
    updated_at: typeof data.updated_at === "string" ? data.updated_at : null,
    summary:
      typeof data.summary === "string" ? data.summary : "Signals active",
    ready: true,
  };
}
