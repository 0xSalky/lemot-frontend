import { apiFetch } from "@/services/apiFetch";
import { IS_PROFILE_B_ACTIVE } from "@/services/config";
import type {
  ScannerBandRow,
  ScannerAiBatchSummary,
  ScannerChartPayload,
  ScannerChartTimeframe,
  ScannerLatestBatchFetchResult,
  ScannerLatestBatchPayload,
  ScannerViewFetchResult,
  ScannerViewPayload,
  ScannerLevelRow,
  ScannerSetupRow,
} from "@/types/scannerTypes";

/** Auto-refresh interval for scanner/footprint charts (5 minutes). */
export const SCANNER_CHART_REFRESH_MS = 5 * 60 * 1000;

const CHART_CLIENT_CACHE_TTL_MS = 300_000;

export function formatRefreshCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** CCXT-style unified symbol, e.g. `BTC/USDT:USDT` → base `BTC`. */
export function scannerSymbolToBase(symbol: string): string {
  const i = symbol.indexOf("/");
  if (i === -1) return symbol.trim();
  return symbol.slice(0, i).trim();
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

function apiErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
  }
  return `HTTP ${status}`;
}

/** Scanner profiles supported by the backend. */
export type ScannerProfile = "a" | "b";
export const SCANNER_PROFILES: readonly ScannerProfile[] = IS_PROFILE_B_ACTIVE
  ? ["b", "a"]
  : ["a"];

export const DEFAULT_SCANNER_PROFILE: ScannerProfile = SCANNER_PROFILES[0];

/** @deprecated use DEFAULT_SCANNER_PROFILE or pass profile explicitly */
export const SCANNER_PROFILE = DEFAULT_SCANNER_PROFILE;

export function scannerProfileLabel(profile: ScannerProfile): string {
  return profile === "a" ? "A" : "B";
}

/** @deprecated use scannerProfileLabel(profile) */
export const SCANNER_PROFILE_LABEL = scannerProfileLabel(
  DEFAULT_SCANNER_PROFILE,
);

export const SCANNER_PROFILE_CHART_TIMEFRAME: Record<
  ScannerProfile,
  ScannerChartTimeframe
> = {
  b: "5m",
  a: "30m",
};

export async function fetchLatestScannerBatch(
  profile: ScannerProfile = DEFAULT_SCANNER_PROFILE,
): Promise<ScannerLatestBatchFetchResult> {
  const params = new URLSearchParams({ profile });
  const res = await apiFetch(`/api/scanner/latest-batch?${params.toString()}`, {
    cache: "no-store",
  });
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
    setups: Array.isArray(payload.setups) ? payload.setups : [],
  };
}

const scannerViewInflight = new Map<
  ScannerProfile,
  Promise<ScannerViewFetchResult>
>();

export async function fetchScannerView(
  profile: ScannerProfile = DEFAULT_SCANNER_PROFILE,
  options?: { fresh?: boolean; reload?: boolean },
): Promise<ScannerViewFetchResult> {
  if (!options?.fresh) {
    const pending = scannerViewInflight.get(profile);
    if (pending) return pending;
  }

  const params = new URLSearchParams({ profile });
  if (options?.fresh) params.set("fresh", "1");
  if (options?.reload) params.set("reload", "1");

  const promise = (async (): Promise<ScannerViewFetchResult> => {
    const res = await apiFetch(`/api/scanner/view?${params.toString()}`, {
      cache: "no-store",
    });
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

    const payload = data as Partial<ScannerViewPayload>;
    if (!payload.batch) {
      return { message: "Invalid scanner view response" };
    }

    return {
      profile: String(payload.profile ?? profile),
      batch: payload.batch,
      setups: Array.isArray(payload.setups) ? payload.setups : [],
      charts:
        payload.charts && typeof payload.charts === "object"
          ? {
              timeframe: String(payload.charts.timeframe ?? SCANNER_PROFILE_CHART_TIMEFRAME[profile]),
              by_symbol:
                payload.charts.by_symbol && typeof payload.charts.by_symbol === "object"
                  ? (payload.charts.by_symbol as Record<string, ScannerChartPayload | null>)
                  : {},
            }
          : {
              timeframe: SCANNER_PROFILE_CHART_TIMEFRAME[profile],
              by_symbol: {},
            },
      footprint:
        payload.footprint && typeof payload.footprint === "object"
          ? {
              timeframe: String(payload.footprint.timeframe ?? SCANNER_PROFILE_CHART_TIMEFRAME[profile]),
              health:
                payload.footprint.health && typeof payload.footprint.health === "object"
                  ? payload.footprint.health
                  : null,
              pairs_by_base:
                payload.footprint.pairs_by_base && typeof payload.footprint.pairs_by_base === "object"
                  ? payload.footprint.pairs_by_base
                  : {},
            }
          : {
              timeframe: SCANNER_PROFILE_CHART_TIMEFRAME[profile],
              health: null,
              pairs_by_base: {},
            },
      sections:
        payload.sections && typeof payload.sections === "object"
          ? payload.sections
          : {
              batch: { ok: true },
              charts: { ok: true },
              footprint: { ok: true },
            },
    };
  })();

  if (!options?.fresh) {
    scannerViewInflight.set(profile, promise);
    void promise.finally(() => {
      if (scannerViewInflight.get(profile) === promise) {
        scannerViewInflight.delete(profile);
      }
    });
  }

  return promise;
}

const chartPayloadCache = new Map<
  string,
  { expiresAt: number; promise: Promise<ScannerChartPayload | null> }
>();

/** Prefer fresh chart mark/close over stale scanner-batch setup price. */
export function chartSpotPrice(
  chart: ScannerChartPayload | null | undefined,
  fallbackPrice?: number,
): number {
  const mark = chart?.last;
  if (mark != null && Number.isFinite(mark) && mark > 0) return mark;
  const close = chart?.candles?.at(-1)?.close;
  if (close != null && Number.isFinite(close) && close > 0) return close;
  if (fallbackPrice != null && Number.isFinite(fallbackPrice) && fallbackPrice > 0) {
    return fallbackPrice;
  }
  return 0;
}

export async function fetchScannerChart(
  symbol: string,
  timeframe: ScannerChartTimeframe = "1h",
  options?: { bustCache?: boolean },
): Promise<ScannerChartPayload | null> {
  const key = `${symbol.trim()}|${timeframe}`;
  if (!symbol.trim()) return null;

  if (options?.bustCache) {
    chartPayloadCache.delete(key);
  } else {
    const cached = chartPayloadCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.promise;
    }
  }

  const promise = (async () => {
    const params = new URLSearchParams({
      symbol: symbol.trim(),
      timeframe,
    });
    if (options?.bustCache) {
      params.set("fresh", "1");
    }
    const res = await apiFetch(`/api/scanner/chart?${params.toString()}`, {
      cache: "no-store",
    });
    const raw = await res.text();
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      console.warn("[scanner chart] non-JSON response", { symbol, timeframe, raw });
      return null;
    }
    if (!res.ok) {
      console.warn("[scanner chart] request failed", { symbol, timeframe, status: res.status, data });
      return null;
    }
    const payload = data as Partial<ScannerChartPayload>;
    if (!Array.isArray(payload.candles) || payload.candles.length === 0) {
      return null;
    }
    return {
      symbol: payload.symbol ?? symbol.trim(),
      timeframe: payload.timeframe ?? timeframe,
      last: typeof payload.last === "number" ? payload.last : undefined,
      candles: payload.candles,
    };
  })();

  chartPayloadCache.set(key, {
    expiresAt: Date.now() + CHART_CLIENT_CACHE_TTL_MS,
    promise,
  });

  return promise;
}

/** One HTTP round-trip for all setup cards — backend fetches Bybit in parallel. */
export async function prefetchScannerCharts(
  symbols: readonly string[],
  timeframe: ScannerChartTimeframe,
  options?: { bustCache?: boolean },
): Promise<Record<string, ScannerChartPayload | null>> {
  const unique = [...new Set(symbols.map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) return {};

  if (unique.length === 1) {
    const symbol = unique[0];
    const chart = await fetchScannerChart(symbol, timeframe, options);
    return { [symbol]: chart };
  }

  if (options?.bustCache) {
    for (const symbol of unique) {
      chartPayloadCache.delete(`${symbol}|${timeframe}`);
    }
  } else {
    const allCached = unique.every((symbol) => {
      const cached = chartPayloadCache.get(`${symbol}|${timeframe}`);
      return cached && Date.now() < cached.expiresAt;
    });
    if (allCached) {
      const entries = await Promise.all(
        unique.map(
          async (symbol) =>
            [symbol, await fetchScannerChart(symbol, timeframe)] as const,
        ),
      );
      return Object.fromEntries(entries);
    }
  }

  const params = new URLSearchParams({
    symbols: unique.join(","),
    timeframe,
  });
  if (options?.bustCache) {
    params.set("fresh", "1");
  }
  const res = await apiFetch(`/api/scanner/charts?${params.toString()}`, {
    cache: "no-store",
  });
  const raw = await res.text();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    console.warn("[scanner charts] non-JSON response", {
      symbols: unique,
      timeframe,
      raw,
    });
    return Object.fromEntries(unique.map((symbol) => [symbol, null]));
  }
  if (!res.ok) {
    console.warn("[scanner charts] request failed", {
      symbols: unique,
      timeframe,
      status: res.status,
      data,
    });
    return Object.fromEntries(unique.map((symbol) => [symbol, null]));
  }

  const record = data as {
    charts?: Record<string, ScannerChartPayload | null>;
  };
  const charts = record.charts ?? {};
  const out: Record<string, ScannerChartPayload | null> = {};
  for (const symbol of unique) {
    const payload = charts[symbol] ?? null;
    out[symbol] = payload;
    if (
      payload &&
      Array.isArray(payload.candles) &&
      payload.candles.length > 0
    ) {
      chartPayloadCache.set(`${symbol}|${timeframe}`, {
        expiresAt: Date.now() + CHART_CLIENT_CACHE_TTL_MS,
        promise: Promise.resolve(payload),
      });
    }
  }
  return out;
}

export type ScannerRunResult =
  | {
      success: true;
      setup_count?: number;
      ai_ran?: boolean;
      ai_error?: string;
      ai_skip_reason?: string;
      btc_read?: string;
    }
  | { success: false; message: string };

export type ScannerAnalyzeResult =
  | {
      success: true;
      batch_id?: number;
      setup_count?: number;
      btc_read?: string;
      batch_rankings?: ScannerAiBatchSummary["batch_rankings"];
    }
  | { success: false; message: string };

export async function runScanner(
  profile: ScannerProfile = DEFAULT_SCANNER_PROFILE,
  options?: { analyze?: boolean },
): Promise<ScannerRunResult> {
  const params = new URLSearchParams({ profile });
  if (options?.analyze === false) {
    params.set("analyze", "false");
  } else if (options?.analyze === true) {
    params.set("analyze", "true");
  }
  const res = await apiFetch(`/api/scanner/run?${params.toString()}`, {
    method: "POST",
  });
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

  const record = data as {
    success?: boolean;
    setup_count?: number;
    ai_ran?: boolean;
    ai_error?: string;
    ai_skip_reason?: string;
    btc_read?: string;
  };
  if (record.success !== true) {
    return { success: false, message: apiErrorMessage(data, res.status) };
  }
  return {
    success: true,
    setup_count: record.setup_count,
    ai_ran: record.ai_ran,
    ai_error: record.ai_error,
    ai_skip_reason: record.ai_skip_reason,
    btc_read: record.btc_read,
  };
}

export async function runScannerAnalyze(
  batchId?: number,
  profile: ScannerProfile = DEFAULT_SCANNER_PROFILE,
): Promise<ScannerAnalyzeResult> {
  const params = new URLSearchParams({ profile });
  if (batchId != null) {
    params.set("batch_id", String(batchId));
  }
  const res = await apiFetch(`/api/scanner/analyze?${params.toString()}`, {
    method: "POST",
  });
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

  const record = data as {
    success?: boolean;
    batch_id?: number;
    setup_count?: number;
    btc_read?: string;
    batch_rankings?: ScannerAiBatchSummary["batch_rankings"];
  };
  if (record.success !== true) {
    return { success: false, message: apiErrorMessage(data, res.status) };
  }
  return {
    success: true,
    batch_id: record.batch_id,
    setup_count: record.setup_count,
    btc_read: record.btc_read,
    batch_rankings: record.batch_rankings,
  };
}

export function formatLevelPrice(price: number): string {
  const v = Number(price);
  if (!Number.isFinite(v)) return "—";
  if (v >= 1000) {
    return v.toFixed(2);
  }
  if (v >= 1) {
    return v.toFixed(4);
  }
  const s = v.toPrecision(4);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

export function biasIcon(bias: string): string {
  return bias.toUpperCase() === "BULLISH" ? "🟢" : "🔴";
}

export function adxRegimeIcon(regime: string): string {
  const r = regime.toUpperCase();
  if (r.includes("STRONG")) return "⬆";
  if (r.includes("RANGING")) return "↔";
  if (r.includes("TREND")) return "↗";
  return "";
}

export function adxRegimeShort(regime: string): string {
  if (regime.toUpperCase().includes("STRONG")) return "STRONG";
  if (regime.toUpperCase().includes("RANGING")) return "RANGING";
  if (regime.toUpperCase().includes("TREND")) return "TRENDING";
  return regime;
}

export function formatAdxLine(adx: number, regime: string): string {
  return `ADX ${adx.toFixed(1)} ${adxRegimeIcon(regime)} ${adxRegimeShort(regime)}`;
}

export function formatBiasLabel(bias: string): string {
  const b = bias.toUpperCase();
  if (b === "BULLISH") return "🟢 BULLISH";
  if (b === "BEARISH") return "🔴 BEARISH";
  return bias;
}

export function formatVolDollar(value: number): string {
  const v = Math.abs(Number(value));
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${Math.round(v)}`;
}

export function formatSignalLabel(signal: string | null | undefined): string {
  const s = (signal ?? "").toUpperCase();
  if (s === "IN_RANGE") return "🟡 IN RANGE";
  if (s === "OUT_OF_RANGE") return "⚫ OUT OF RANGE";
  return signal ?? "—";
}

export function formatSetupHeaderLine1(setup: ScannerSetupRow): string {
  const signalPart = setup.signal
    ? ` | ${formatSignalLabel(setup.signal)}`
    : "";
  return (
    `#${setup.rank} | ${setup.symbol} | score=${setup.score.toFixed(1)} | ` +
    `${formatBiasLabel(setup.bias)}${signalPart} | ${formatAdxLine(setup.adx, setup.adx_regime)} | ` +
    `price=${formatLevelPrice(setup.price)} | 24h vol=${formatVolDollar(setup.quote_volume_24h)}`
  );
}

export function formatSetupHeader(setup: ScannerSetupRow): string {
  return formatSetupHeaderLine1(setup);
}

const BAND_LINE_SEP = " · ";

export interface BandLineSection {
  text: string;
  emphasis?: boolean;
}

export function bandLineMarker(side: ScannerBandRow["side"]): string {
  if (side === "RES") return "🔴";
  if (side === "SUP") return "🟢";
  return "  ";
}

const ANCHOR_LEVEL_TYPES = new Set([
  "htf_level",
  "htf_fractal_up",
  "htf_fractal_down",
  "vwap",
  "anchor_vwap_up",
  "anchor_vwap_down",
  "sma_50",
  "sma_100",
  "sma_200",
]);

export function isLevelAnchor(level: ScannerLevelRow): boolean {
  if (level.is_anchor === true) return true;
  if (level.is_anchor === false) return false;
  return ANCHOR_LEVEL_TYPES.has(level.level_type);
}

export function levelsHighToLow(levels: ScannerLevelRow[]): ScannerLevelRow[] {
  return [...levels].sort((a, b) => b.level - a.level);
}

function formatCompactPct(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function formatBandSpanPct(spanPct: number): string {
  return `sp=${formatCompactPct(spanPct)}%`;
}

export function formatBandDistancePct(
  side: ScannerBandRow["side"],
  dist: number,
): string {
  const n = formatCompactPct(dist);
  if (side === "RES") return `+${n}%`;
  if (side === "SUP") return `-${n}%`;
  return "0%";
}

export function bandLineSections(band: ScannerBandRow): BandLineSection[] {
  const dist = band.distance_pct ?? 0;

  const high = Math.max(band.low, band.high);
  const low = Math.min(band.low, band.high);

  const sections: BandLineSection[] = [
    {
      text: `${formatLevelPrice(high)}–${formatLevelPrice(low)}`,
      emphasis: true,
    },
    { text: `w=${band.total_weight}` },
  ];

  if (band.span_pct != null && Number.isFinite(band.span_pct)) {
    sections.push({ text: formatBandSpanPct(band.span_pct) });
  }

  sections.push({ text: formatBandDistancePct(band.side, dist) });
  return sections;
}

export function formatBandLine(band: ScannerBandRow): string {
  const marker = bandLineMarker(band.side);
  const body = bandLineSections(band)
    .map((section) => section.text)
    .join(BAND_LINE_SEP);
  return `${marker} ${body}`;
}

const LEVEL_DATE_MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

/** Backend sends DD-MM-YY (European); display as DD-mon-YY (e.g. ``05-jun-26``). */
export function formatLevelDateDisplay(levelDate?: string | null): string {
  if (!levelDate) return "";
  const match = /^(\d{2})-(\d{2})-(\d{2})$/.exec(levelDate.trim());
  if (!match) return levelDate;
  const day = match[1];
  const month = Number(match[2]);
  const year = match[3];
  const monthLabel = LEVEL_DATE_MONTHS[month - 1];
  if (!monthLabel) return levelDate;
  return `${day}-${monthLabel}-${year}`;
}

export function formatCompactLevel(level: {
  timeframe: string;
  level_type: string;
  level: number;
  level_date?: string;
}): string {
  const base = `${level.timeframe} ${level.level_type} ${formatLevelPrice(level.level)}`;
  const date = formatLevelDateDisplay(level.level_date);
  return date ? `${base} - ${date}` : base;
}

/** RES first, then SUP; within each side, highest band price first. */
export function orderedBands(bands: ScannerBandRow[]): ScannerBandRow[] {
  const res = bands.filter((b) => b.side === "RES");
  const sup = bands.filter((b) => b.side === "SUP");
  const rest = bands.filter((b) => b.side !== "RES" && b.side !== "SUP");
  const byHighDesc = (a: ScannerBandRow, b: ScannerBandRow) => b.high - a.high;
  return [...res.sort(byHighDesc), ...sup.sort(byHighDesc), ...rest];
}

export function bandBySide(
  bands: ScannerBandRow[],
  side: "RES" | "SUP",
): ScannerBandRow | undefined {
  return bands.find((b) => b.side === side);
}

export function levelLabel(level: {
  timeframe: string;
  level_type: string;
}): string {
  return `${level.timeframe} ${level.level_type.replace(/_/g, " ")}`;
}

export function setupsFromBatch(
  latestBatch: ScannerLatestBatchFetchResult | null,
): ScannerSetupRow[] {
  if (latestBatch == null || "message" in latestBatch) return [];
  const setups = latestBatch.setups;
  if (!Array.isArray(setups)) return [];
  return [...setups].sort((a, b) => a.rank - b.rank);
}

export function setupsFromScannerView(
  scannerView: ScannerViewFetchResult | null,
): ScannerSetupRow[] {
  if (scannerView == null || "message" in scannerView) return [];
  const setups = scannerView.setups;
  if (!Array.isArray(setups)) return [];
  return [...setups].sort((a, b) => a.rank - b.rank);
}
