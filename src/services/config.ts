export const TRADING_PAIRS = [
  "BTC",
  "ETH",
  "SOL",
  "TAO",
  "HYPE",
  "DOGE",
  "1000PEPE",
];

export const TP_PRESETS = {
  "2": [{ rr: 2, tp_percent: 100 }],
  "3": [{ rr: 3, tp_percent: 100 }],
  "4": [{ rr: 4, tp_percent: 100 }],
  "1-3 25": [
    { rr: 1, tp_percent: 25 },
    { rr: 3, tp_percent: 75 },
  ],
  "1-3 50": [
    { rr: 1, tp_percent: 50 },
    { rr: 3, tp_percent: 50 },
  ],
  "2-4 25": [
    { rr: 2, tp_percent: 25 },
    { rr: 4, tp_percent: 75 },
  ],
};

export const DEFAULT_TP_PRESET = "1-3 50";
export const DEFAULT_RISK = "1";
export const DEFAULT_STOP_LOSS = "natr";

export const DEFAULT_TRADING_API_URL = "http://161.97.72.180:8000";
