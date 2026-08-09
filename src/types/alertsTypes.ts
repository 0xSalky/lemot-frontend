export interface PriceAlert {
  id: number;
  symbol: string;
  base: string;
  price: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface AlertsListResponse {
  timeframe: string;
  alerts: PriceAlert[];
  count: number;
}

export interface AlertsHealth {
  ready: boolean;
  enabled: boolean;
  timeframe: string;
  poll_seconds: number;
  telegram_configured: boolean;
  telegram_hint?: string | null;
  alert_count: number;
  last_poll_at: string | null;
}

export type AlertWritePayload = {
  symbol: string;
  price: number;
  comment?: string;
};
