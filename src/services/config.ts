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
  "1.5": [{ rr: 1.5, tp_percent: 100 }],
  "2": [{ rr: 2, tp_percent: 100 }],
  "2.5": [{ rr: 2.5, tp_percent: 100 }],
  "3": [{ rr: 3, tp_percent: 100 }],
  "4": [{ rr: 4, tp_percent: 100 }],
  "6": [{ rr: 6, tp_percent: 100 }],
  A: [
    { rr: 1, tp_percent: 10 },
    { rr: 2, tp_percent: 20 },
    { runner: true, tp_percent: 70 },
  ],
  B: [
    { rr: 1, tp_percent: 15 },
    { rr: 3, tp_percent: 25 },
    { runner: true, tp_percent: 60 },
  ],
  C: [
    { rr: 1, tp_percent: 20 },
    { rr: 4, tp_percent: 20 },
    { runner: true, tp_percent: 60 },
  ],
} as const;

export const DEFAULT_TP_PRESET = "2";
export const DEFAULT_RISK = "1";
export const DEFAULT_STOP_LOSS = "price";

export const DEFAULT_TRADING_API_URL = "http://127.0.0.1:8000";

export const NATR_MULTIPLIER = "2.5";

/** Main content column: full width on small screens, max half viewport on large. */
export const CONTENT_MAX_WIDTH = { base: "100%", lg: "55vw" } as const;

/** Feature flags — when false, hide that profile everywhere (tabs, signals, PnL, journal, config). */
export const IS_PROFILE_B_ACTIVE = true;
export const IS_PROFILE_C_ACTIVE = true;

export type AppProfile = "a" | "b" | "c";

/** Live signals / risk / journal trading profiles (C is scanner-only). */
export type SignalsProfile = "a" | "b";

export function isProfileActive(profile: AppProfile): boolean {
  if (profile === "b") return IS_PROFILE_B_ACTIVE;
  if (profile === "c") return IS_PROFILE_C_ACTIVE;
  return true;
}

export function activeSignalsProfiles(): SignalsProfile[] {
  const profiles: SignalsProfile[] = ["a"];
  if (IS_PROFILE_B_ACTIVE) profiles.push("b");
  return profiles;
}
