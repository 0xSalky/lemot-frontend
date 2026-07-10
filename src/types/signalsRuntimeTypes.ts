export interface SignalsRuntimeControls {
  signals_enabled: boolean;
  a_entry_advice_enabled: boolean;
  b_entry_advice_enabled: boolean;
  a_enabled: boolean;
  b_enabled: boolean;
  a_auto_trade_enabled: boolean;
  b_auto_trade_enabled: boolean;
  a_trade_mgmt_enabled: boolean;
  b_trade_mgmt_enabled: boolean;
  a_trade_mgmt_auto_enabled: boolean;
  b_trade_mgmt_auto_enabled: boolean;
  risk_desk_strict: boolean;
  updated_at: string | null;
  summary: string;
  ready: boolean;
}

export interface SignalsRuntimeUpdate {
  signals_enabled?: boolean;
  a_entry_advice_enabled?: boolean;
  b_entry_advice_enabled?: boolean;
  a_enabled?: boolean;
  b_enabled?: boolean;
  a_auto_trade_enabled?: boolean;
  b_auto_trade_enabled?: boolean;
  a_trade_mgmt_enabled?: boolean;
  b_trade_mgmt_enabled?: boolean;
  a_trade_mgmt_auto_enabled?: boolean;
  b_trade_mgmt_auto_enabled?: boolean;
  risk_desk_strict?: boolean;
  notify_telegram?: boolean;
}

export interface SignalsRuntimePatchResult extends SignalsRuntimeControls {
  telegram_notified: boolean;
}

/** Shown when runtime DB/table is not ready — all off, disabled in UI. */
export const UNAVAILABLE_SIGNALS_RUNTIME: SignalsRuntimeControls = {
  signals_enabled: false,
  a_entry_advice_enabled: false,
  b_entry_advice_enabled: false,
  a_enabled: false,
  b_enabled: false,
  a_auto_trade_enabled: false,
  b_auto_trade_enabled: false,
  a_trade_mgmt_enabled: false,
  b_trade_mgmt_enabled: false,
  a_trade_mgmt_auto_enabled: false,
  b_trade_mgmt_auto_enabled: false,
  risk_desk_strict: true,
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
    a_entry_advice_enabled: Boolean(data.a_entry_advice_enabled),
    b_entry_advice_enabled: Boolean(data.b_entry_advice_enabled),
    a_enabled: Boolean(data.a_enabled),
    b_enabled: Boolean(data.b_enabled),
    a_auto_trade_enabled: Boolean(data.a_auto_trade_enabled),
    b_auto_trade_enabled: Boolean(data.b_auto_trade_enabled),
    a_trade_mgmt_enabled: Boolean(data.a_trade_mgmt_enabled),
    b_trade_mgmt_enabled: Boolean(data.b_trade_mgmt_enabled),
    a_trade_mgmt_auto_enabled: Boolean(data.a_trade_mgmt_auto_enabled),
    b_trade_mgmt_auto_enabled: Boolean(data.b_trade_mgmt_auto_enabled),
    risk_desk_strict:
      data.risk_desk_strict !== undefined
        ? data.risk_desk_strict !== false
        : data.risk_desk_htf_bias !== false,
    updated_at: typeof data.updated_at === "string" ? data.updated_at : null,
    summary:
      typeof data.summary === "string" ? data.summary : "Signals active",
    ready: true,
  };
}
