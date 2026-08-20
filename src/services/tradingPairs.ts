/** Normalize user input to a base symbol (e.g. btcusdt → BTC). */
export function normalizeTradingPairSymbol(raw: string): string | null {
  let symbol = raw.trim().toUpperCase();
  if (!symbol) return null;

  symbol = symbol.replace(/:USDT$/i, "");
  if (symbol.includes("/")) {
    symbol = symbol.split("/")[0] ?? "";
  }
  symbol = symbol.replace(/USDT$/i, "");

  if (!/^[A-Z0-9]{1,24}$/.test(symbol)) return null;
  return symbol;
}

const PINNED_TRADING_PAIRS = ["BTC", "ETH", "SOL", "HYPE"] as const;

export function sortTradingPairs(pairs: readonly string[]): string[] {
  const unique = [...new Set(pairs)];
  const pinned = PINNED_TRADING_PAIRS.filter((pair) => unique.includes(pair));
  const rest = unique
    .filter((pair) => !PINNED_TRADING_PAIRS.includes(pair as (typeof PINNED_TRADING_PAIRS)[number]))
    .sort((a, b) => a.localeCompare(b));
  return [...pinned, ...rest];
}
