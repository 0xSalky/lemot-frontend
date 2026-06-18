import { DEFAULT_TRADING_API_URL } from "@/services/config";

const STORAGE_KEY_URL = "lemot-trading-api-url";
const STORAGE_KEY_KEY = "lemot-trading-api-key";
export const TRADING_CREDENTIALS_INVALID_EVENT = "lemot-trading-credentials-invalid";
export const TRADING_CREDENTIALS_SAVED_EVENT = "lemot-trading-credentials-saved";

export type StoredTradingCredentials = {
  apiUrl: string;
  apiKey: string;
};

export function hasStoredTradingCredentials(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    localStorage.getItem(STORAGE_KEY_URL)?.trim() &&
      localStorage.getItem(STORAGE_KEY_KEY)?.trim(),
  );
}

export function getStoredTradingCredentials(): StoredTradingCredentials | null {
  if (typeof window === "undefined") return null;

  const apiUrl = localStorage.getItem(STORAGE_KEY_URL)?.trim();
  const apiKey = localStorage.getItem(STORAGE_KEY_KEY)?.trim();
  if (!apiUrl || !apiKey) return null;

  return { apiUrl, apiKey };
}

export function saveStoredTradingCredentials(creds: StoredTradingCredentials): void {
  localStorage.setItem(STORAGE_KEY_URL, creds.apiUrl.trim());
  localStorage.setItem(STORAGE_KEY_KEY, creds.apiKey.trim());
  window.dispatchEvent(new Event(TRADING_CREDENTIALS_SAVED_EVENT));
}

export function clearStoredTradingCredentials(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  window.dispatchEvent(new Event(TRADING_CREDENTIALS_INVALID_EVENT));
}

export function defaultTradingApiUrl(): string {
  return DEFAULT_TRADING_API_URL;
}
