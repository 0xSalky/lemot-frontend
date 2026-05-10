export const TRADING_PAIRS = [
  "BTC",
  "ETH",
  "SOL",
  "TAO",
  "1000PEPE",
  "HYPE",
  "DOGE",
];

export const TP_PRESETS = {
  "2": [{ rr: 2, tp_percent: 100 }],
  "3": [{ rr: 3, tp_percent: 100 }],
  "4": [{ rr: 4, tp_percent: 100 }],
  "6": [{ rr: 6, tp_percent: 100 }],
  "8": [{ rr: 8, tp_percent: 100 }],
  run40: [
    { rr: 1, tp_percent: 10 },
    { rr: 3, tp_percent: 30 },
  ],
  run60: [
    { rr: 1, tp_percent: 20 },
    { rr: 3, tp_percent: 40 },
  ],
};

export const DEFAULT_TP_PRESET = "run40";
export const DEFAULT_RISK = "1";
export const DEFAULT_STOP_LOSS = "price";

export const DEFAULT_TRADING_API_URL = "http://127.0.0.1:8000";
