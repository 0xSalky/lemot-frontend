import type { ScannerLatestBatchFetchResult } from "@/types/scannerTypes";

/** CCXT-style unified symbol, e.g. `BTC/USDT:USDT` → base `BTC`. */
export function scannerSymbolToBase(symbol: string): string {
    const i = symbol.indexOf("/");
    if (i === -1) return symbol.trim();
    return symbol.slice(0, i).trim();
}

const usDecimal = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

/** Thousands separators + up to 2 fraction digits (e.g. `1771923663.48` → `1,771,923,663.48`). */
export function formatUsDecimal(value: number): string {
    return usDecimal.format(value);
}

export async function fetchLatestScannerBatch(): Promise<ScannerLatestBatchFetchResult> {
  const res = await fetch("/api/scanner/latest-batch", { cache: "no-store" });
  const raw = await res.text();
  try {
    return (raw ? JSON.parse(raw) : {}) as ScannerLatestBatchFetchResult;
  } catch {
    return { message: raw || String(res.status) };
  }
}
