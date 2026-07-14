export type AccountBalanceSnapshot = {
  total_equity: number;
  available_balance: number;
  total_unrealized_pnl: number;
  usdt_balance: number;
};

export type AccountBalanceAccountPayload = {
  configured: boolean;
  account: string;
  balance: AccountBalanceSnapshot;
  success: boolean;
  reason?: string;
};

export type AccountBalanceResponse = {
  success: boolean;
  accounts: {
    /** Profile A auto-trade account */
    a: AccountBalanceAccountPayload;
    /** Profile B auto-trade account */
    b: AccountBalanceAccountPayload;
    /** Manual /trade account */
    manual: AccountBalanceAccountPayload;
    /** Legacy alias — kept for backward compat */
    signals?: AccountBalanceAccountPayload;
  };
  reason?: string;
  hint?: string;
};

export type ManualAccountConnectionState =
  | "loading"
  | "connected"
  | "not_configured"
  | "balance_unavailable"
  | "disconnected";

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeBalanceRow(raw: unknown): AccountBalanceSnapshot {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    total_equity: num(row.total_equity),
    available_balance: num(row.available_balance),
    total_unrealized_pnl: num(row.total_unrealized_pnl),
    usdt_balance: num(row.usdt_balance),
  };
}

function normalizeAccountPayload(raw: unknown, fallbackAccount: string): AccountBalanceAccountPayload {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    configured: Boolean(row.configured),
    account: typeof row.account === "string" ? row.account : fallbackAccount,
    balance: normalizeBalanceRow(row.balance),
    success: Boolean(row.success),
    reason: typeof row.reason === "string" ? row.reason : undefined,
  };
}

export function normalizeAccountBalanceResponse(raw: unknown): AccountBalanceResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const accounts =
    body.accounts && typeof body.accounts === "object"
      ? (body.accounts as Record<string, unknown>)
      : {};

  // Backend sends 'a'/'b'/'manual'. Legacy shape sent 'signals'/'manual'.
  const profileA = accounts.a ?? accounts.signals;
  const profileB = accounts.b;
  return {
    success: Boolean(body.success),
    accounts: {
      a: normalizeAccountPayload(profileA, "a"),
      b: normalizeAccountPayload(profileB, "b"),
      manual: normalizeAccountPayload(accounts.manual, "manual"),
      signals: normalizeAccountPayload(profileA, "signals"),
    },
    reason: typeof body.reason === "string" ? body.reason : undefined,
    hint: typeof body.hint === "string" ? body.hint : undefined,
  };
}

export function resolveManualConnectionState(
  payload: AccountBalanceResponse | null,
  fetchError: string | null,
): ManualAccountConnectionState {
  if (fetchError) return "disconnected";
  if (!payload) return "disconnected";

  const manual = payload.accounts.manual;
  if (!manual.configured) return "not_configured";
  if (!manual.success || manual.balance.total_equity <= 0) return "balance_unavailable";
  return "connected";
}
