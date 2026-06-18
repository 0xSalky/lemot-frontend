import {
  clearStoredTradingCredentials,
  getStoredTradingCredentials,
  TRADING_CREDENTIALS_INVALID_EVENT,
} from "@/services/tradingCredentials";

const CLIENT_KEY_HEADER = "X-Client-Trading-Api-Key";
const CLIENT_URL_HEADER = "X-Client-Trading-Api-Url";

function withClientTradingHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  const stored = getStoredTradingCredentials();
  if (stored) {
    headers.set(CLIENT_KEY_HEADER, stored.apiKey);
    headers.set(CLIENT_URL_HEADER, stored.apiUrl);
  }
  return { ...init, headers };
}

export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, withClientTradingHeaders(init));

  if (res.status === 401 && getStoredTradingCredentials()) {
    clearStoredTradingCredentials();
    window.dispatchEvent(new Event(TRADING_CREDENTIALS_INVALID_EVENT));
  }

  return res;
}
