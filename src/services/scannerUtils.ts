import type {
  ScannerBatchRow,
  ScannerLatestBatchFetchResult,
  ScannerLatestBatchPayload,
  ScannerMatchRow,
} from "@/types/scannerTypes";

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
const usCompact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
});

/** Thousands separators + up to 2 fraction digits (e.g. `1771923663.48` → `1,771,923,663.48`). */
export function formatUsDecimal(value: number): string {
    return usDecimal.format(value);
}

/** Compact US format (e.g. `100000` → `100K`, `1771923663.48` → `1.8B`). */
export function formatUsCompact(value: number): string {
    return usCompact.format(value);
}

export function formatLevelPrice(price: number | null | undefined): string {
    const v = Number(price);
    if (!Number.isFinite(v)) return "—";
    if (v >= 1000) {
        return v.toLocaleString("en-US", {
            maximumFractionDigits: 2,
            useGrouping: false,
        });
    }
    if (v >= 1) {
        return v.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
            useGrouping: false,
        });
    }
    const s = v.toPrecision(4);
    return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

export function formatVolDollar(value: number): string {
    const v = Math.abs(Number(value));
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
    return `$${Math.round(v)}`;
}

/** UTC ISO timestamp from the API → `YYYY-MM-DD HH:MM:SS TZ` in local time. */
export function formatUtcIsoLocal(iso: string): string {
    const trimmed = iso.trim();
    const normalized =
        trimmed.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(trimmed)
            ? trimmed
            : `${trimmed.slice(0, 19)}Z`;
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) {
        return trimmed.slice(0, 19).replace("T", " ");
    }
    const tz =
        new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
            .formatToParts(d)
            .find((p) => p.type === "timeZoneName")?.value ?? "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
        (tz ? ` ${tz}` : "")
    );
}

export function formatBiasLabel(bias: string | null | undefined): string {
    const b = (bias ?? "").toUpperCase();
    if (b === "BULLISH") return "🟢 BULLISH";
    if (b === "BEARISH") return "🔴 BEARISH";
    return bias ?? "—";
}

export function formatSignalLabel(signal: string | null | undefined): string {
    const s = (signal ?? "").toUpperCase();
    if (s === "IN_RANGE") return "🟡 IN RANGE";
    if (s === "OUT_OF_RANGE") return "⚫ OUT OF RANGE";
    return signal ?? "—";
}

export function formatAdxTrendLine(
    adx: number | null | undefined,
    threshold: number,
): string {
    if (adx == null || !Number.isFinite(adx)) return "ADX —";
    const trending = adx >= threshold;
    const tag = trending ? "⬆ TRENDING" : "↔ BELOW THRESHOLD";
    return `ADX ${adx.toFixed(1)} ${tag} (≥${threshold})`;
}

export function formatMatchHeaderLine1(match: ScannerMatchRow, rank: number): string {
    return (
        `#${rank} | ${match.symbol} | ${formatBiasLabel(match.bias)} | ` +
        `${formatSignalLabel(match.signal)}`
    );
}

export function formatMatchHeaderLine2(match: ScannerMatchRow): string {
    return (
        `price=${formatLevelPrice(match.close_last)} | ` +
        `24h vol=${formatVolDollar(match.quote_volume_24h)}`
    );
}

export function formatMatchDetailLines(
    match: ScannerMatchRow,
    batch: ScannerBatchRow,
): string[] {
    const lines: string[] = [
        formatAdxTrendLine(match.adx_last, batch.adx_trend_threshold),
    ];

    const signal = (match.signal ?? "").toUpperCase();
    if (signal === "IN_RANGE") {
        lines.push("zone     close between fast & slow EMA");
    } else if (signal === "OUT_OF_RANGE") {
        lines.push("zone     close outside EMA band");
    }

    lines.push(
        `scan     ${match.timeframe} · ${match.candle_limit} candles · ` +
            `EMA ${batch.ma_len1}/${batch.ma_len2} cross`,
    );
    lines.push(
        `filter   ADX≥${batch.adx_trend_threshold} · vol≥${formatVolDollar(match.min_quote_volume_usdt_24h)}`,
    );
    lines.push(`scanned  ${match.scanned_at.slice(0, 19).replace("T", " ")} UTC`);

    return lines;
}

export function formatBatchMetaLine(batch: ScannerBatchRow): string {
    return (
        `Batch #${batch.id} · ${batch.timeframe} · ${batch.match_count} matches · ` +
        `${batch.high_volume_candidates} candidates · ` +
        formatUtcIsoLocal(batch.created_at)
    );
}

export function matchesFromBatch(
    latestBatch: ScannerLatestBatchFetchResult | null,
): ScannerMatchRow[] {
    if (latestBatch == null || "message" in latestBatch) return [];
    return Array.isArray(latestBatch.matches) ? [...latestBatch.matches] : [];
}

function apiErrorMessage(data: unknown, status: number): string {
    if (data && typeof data === "object") {
        const record = data as Record<string, unknown>;
        if (typeof record.detail === "string") return record.detail;
        if (typeof record.message === "string") return record.message;
        if (typeof record.error === "string") return record.error;
    }
    return `HTTP ${status}`;
}

export async function fetchLatestScannerBatch(): Promise<ScannerLatestBatchFetchResult> {
  const res = await fetch("/api/scanner/latest-batch", { cache: "no-store" });
  const raw = await res.text();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return { message: raw || String(res.status) };
  }

  if (!res.ok) {
    return { message: apiErrorMessage(data, res.status) };
  }

  const payload = data as Partial<ScannerLatestBatchPayload>;
  if (!payload.batch) {
    return { message: "Invalid scanner response" };
  }

  return {
    batch: payload.batch,
    matches: Array.isArray(payload.matches) ? payload.matches : [],
  };
}

export type ScannerRunResult =
  | { success: true; match_count?: number }
  | { success: false; message: string };

export async function runScanner(): Promise<ScannerRunResult> {
  const res = await fetch("/api/scanner/run", { method: "POST" });
  const raw = await res.text();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return { success: false, message: raw || String(res.status) };
  }

  if (!res.ok) {
    return { success: false, message: apiErrorMessage(data, res.status) };
  }

  const record = data as { success?: boolean; match_count?: number };
  if (record.success !== true) {
    return { success: false, message: apiErrorMessage(data, res.status) };
  }
  return {
    success: true,
    match_count: record.match_count,
  };
}
