export const TRADING_PAIRS = [
  "BTC",
  "ETH",
  "SOL",
  "1000PEPE",
  "HYPE",
  "DOGE",
  "BNB",
];

export const TP_PRESETS = {
  "2": [{ rr: 2, tp_percent: 100 }],
  "3": [{ rr: 3, tp_percent: 100 }],
  "4": [{ rr: 4, tp_percent: 100 }],
  "8": [{ rr: 8, tp_percent: 100 }],
  A: [
    { rr: 1, tp_percent: 10 },
    { rr: 2, tp_percent: 20 },
  ],
  B: [
    { rr: 1, tp_percent: 15 },
    { rr: 3, tp_percent: 25 },
  ],
  C: [
    { rr: 1, tp_percent: 20 },
    { rr: 4, tp_percent: 20 },
  ],
};

export const DEFAULT_TP_PRESET = "2";
export const DEFAULT_RISK = "1";
export const DEFAULT_STOP_LOSS = "price";

export const DEFAULT_TRADING_API_URL = "http://127.0.0.1:8000";

export const NATR_MULTIPLIER = "1.5";

/** Main content column: full width on small screens, max half viewport on large. */
export const CONTENT_MAX_WIDTH = { base: "100%", lg: "50vw" } as const;
