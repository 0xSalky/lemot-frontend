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

export function sortTradingPairs(pairs: readonly string[]): string[] {
  const unique = [...new Set(pairs)];
  const rest = unique.filter((pair) => pair !== "BTC").sort((a, b) => a.localeCompare(b));
  return unique.includes("BTC") ? ["BTC", ...rest] : rest;
}
