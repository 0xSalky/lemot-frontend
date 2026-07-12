import { apiFetch } from "@/services/apiFetch";
import { formatVolDollar, scannerSymbolToBase } from "@/services/scannerUtils";
import type {
  FootprintMergedBar,
  FootprintMetaPayload,
  FootprintPairView,
  FootprintProfile,
  FootprintSignalSeverity,
  FootprintSummary,
  FootprintTimeframe,
  FootprintViewPayload,
} from "@/types/footprintTypes";
import { FOOTPRINT_TIMEFRAMES } from "@/types/footprintTypes";

const footprintViewCache = new Map<string, Promise<FootprintViewPayload>>();
let footprintMetaCache: Promise<FootprintMetaPayload> | null = null;

export function normalizeFootprintTimeframe(
  value: string | null | undefined,
  fallback: FootprintTimeframe,
): FootprintTimeframe {
  const raw = (value ?? fallback).trim();
  return (FOOTPRINT_TIMEFRAMES as readonly string[]).includes(raw)
    ? (raw as FootprintTimeframe)
    : fallback;
}

/** Bybit linear symbol → base (e.g. 1000PEPEUSDT → 1000PEPE). */
export function bybitLinearSymbolToBase(symbol: string): string {
  const s = symbol.toUpperCase().trim();
  if (s.endsWith("USDT")) return s.slice(0, -4);
  return s;
}

/** Resolve collector watchlist bases from API payload or health.symbols_json. */
export function footprintWatchlistBases(options?: {
  watchlist?: readonly string[] | null;
  health?: Record<string, unknown> | null;
}): string[] {
  if (options?.watchlist?.length) {
    return [...new Set(options.watchlist.map((base) => base.toUpperCase()))];
  }

  const raw = options?.health?.symbols_json;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return [
          ...new Set(parsed.map((item) => bybitLinearSymbolToBase(String(item))).filter(Boolean)),
        ];
      }
    } catch {
      /* ignore malformed health payload */
    }
  }

  return [];
}

export function isFootprintWatchSymbol(
  base: string,
  watchlistBases: readonly string[],
): boolean {
  if (watchlistBases.length === 0) return true;
  return watchlistBases.includes(base.toUpperCase());
}

export function footprintBasesForSetups(
  setups: readonly { symbol: string }[],
  watchlistBases: readonly string[],
): string[] {
  const bases = [...new Set(setups.map((setup) => scannerSymbolToBase(setup.symbol)))];
  if (watchlistBases.length === 0) return bases;
  const watchlist = new Set(watchlistBases.map((base) => base.toUpperCase()));
  return bases.filter((base) => watchlist.has(base));
}

export async function fetchFootprintMeta(options?: {
  bustCache?: boolean;
}): Promise<FootprintMetaPayload> {
  if (options?.bustCache) {
    footprintMetaCache = null;
  }

  if (!footprintMetaCache) {
    footprintMetaCache = (async () => {
      const res = await apiFetch("/api/footprint/meta", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(body.detail ?? `Footprint meta request failed (${res.status})`);
      }
      return (await res.json()) as FootprintMetaPayload;
    })();
    void footprintMetaCache.finally(() => {
      window.setTimeout(() => {
        footprintMetaCache = null;
      }, 30_000);
    });
  }

  return footprintMetaCache;
}

export async function fetchFootprintView(
  symbols: readonly string[],
  options?: {
    timeframe?: FootprintTimeframe;
    profile?: FootprintProfile;
    bustCache?: boolean;
  },
): Promise<FootprintViewPayload> {
  const unique = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
  if (unique.length === 0) {
    throw new Error("fetchFootprintView requires at least one symbol.");
  }

  const key = [
    options?.profile ?? "a",
    options?.timeframe ?? "30m",
    unique.slice().sort().join(","),
  ].join("|");

  if (options?.bustCache) {
    footprintViewCache.delete(key);
  }

  let pending = footprintViewCache.get(key);
  if (!pending) {
    pending = (async () => {
      const params = new URLSearchParams({
        symbols: unique.join(","),
      });
      if (options?.timeframe) {
        params.set("timeframe", options.timeframe);
      }
      if (options?.profile) {
        params.set("profile", options.profile);
      }
      if (options?.bustCache) {
        params.set("fresh", "true");
      }

      const res = await apiFetch(`/api/footprint/view?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(body.detail ?? `Footprint request failed (${res.status})`);
      }

      return (await res.json()) as FootprintViewPayload;
    })();
    footprintViewCache.set(key, pending);
    void pending.finally(() => {
      window.setTimeout(() => footprintViewCache.delete(key), 30_000);
    });
  }

  return pending;
}

export function hasFootprintData(pair?: FootprintPairView | null): boolean {
  return Boolean(pair?.orderflow?.bars?.length);
}

/** True when a bar has exchange-grade OHLC (not a flat mark-price dot). */
export function hasRealOhlc(bar: {
  high?: number | null;
  low?: number | null;
  open?: number | null;
  close?: number | null;
}): boolean {
  const high = bar.high ?? 0;
  const low = bar.low ?? 0;
  const open = bar.open ?? 0;
  const close = bar.close ?? 0;
  if (high <= 0 || low <= 0) return false;
  return Math.abs(high - low) > 1e-9 || Math.abs(open - close) > 1e-9;
}

const COLLECTOR_STALE_MS = 5 * 60 * 1000;

/** Online when WS flag is set, or collector wrote a recent message / has live orderflow. */
export function isFootprintCollectorOnline(
  health?: Record<string, unknown> | null,
  pairsByBase?: Record<string, FootprintPairView>,
): boolean {
  if (health && Number(health.ws_connected) === 1) return true;

  const lastMessageAt = health?.last_message_at;
  if (typeof lastMessageAt === "string" && lastMessageAt) {
    const ageMs = Date.now() - Date.parse(lastMessageAt);
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < COLLECTOR_STALE_MS) {
      return true;
    }
  }

  if (pairsByBase) {
    return Object.values(pairsByBase).some((pair) => hasFootprintData(pair));
  }
  return false;
}

/** True when merged bars or chart payload include real OHLC range (not flat mark-only dots). */
export function hasFootprintChartCandles(pair?: FootprintPairView | null): boolean {
  const merged = pair?.merged ?? [];
  if (merged.some(hasRealOhlc)) return true;
  return (pair?.chart?.candles ?? []).some(hasRealOhlc);
}

/** True when WS orderflow bars exist — gates footprint chart + orderflow tags in day scan UI. */
export function hasOrderflowData(pair?: FootprintPairView | null): boolean {
  return hasFootprintData(pair);
}

/** True when symbol is on the collector watchlist (from API — never a hardcoded frontend list). */
export function isFootprintWatchSymbolOnPayload(
  base: string,
  payload?: { watchlist?: readonly string[] | null; health?: Record<string, unknown> | null } | null,
): boolean {
  return isFootprintWatchSymbol(base, footprintWatchlistBases(payload ?? undefined));
}

export function formatFootprintUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatVolDollar(Math.abs(value))}`;
}

export function formatFootprintDelta(value: number | null | undefined): string {
  return formatFootprintUsd(value);
}

export function deltaTone(value: number | null | undefined): "buy" | "sell" | "neutral" {
  if (value == null || value === 0) return "neutral";
  return value > 0 ? "buy" : "sell";
}

export function trendEmoji(trend: string): string {
  if (trend === "up") return "🟢";
  if (trend === "down") return "🔴";
  if (trend === "flat") return "⚪";
  return "❔";
}

export function formatBarTime(unixSec: number): string {
  return new Date(unixSec * 1000).toISOString().slice(11, 16);
}

export function formatOiLevel(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return formatVolDollar(value);
}

export function formatOiChange(pct: number | null | undefined): string {
  if (pct == null || Number.isNaN(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatFundingRate(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return "—";
  return `${(rate * 100).toFixed(4)}%`;
}

export function signalSeverityPalette(severity: FootprintSignalSeverity): string {
  if (severity === "high") return "red";
  if (severity === "medium") return "orange";
  return "gray";
}

export function biasPalette(bias: string | undefined): string {
  if (bias === "bullish") return "green";
  if (bias === "bearish") return "red";
  if (bias === "mixed") return "orange";
  return "gray";
}

export function formatFlowBiasLabel(bias: string | undefined): string {
  if (!bias || bias === "neutral") return "flow neutral";
  return `flow ${bias}`;
}

export function formatStructureBiasLabel(
  bias: string | null | undefined,
  timeframe: string | null | undefined,
): string {
  if (!bias) return "HTF —";
  return `HTF ${bias}${timeframe ? ` (${timeframe})` : ""}`;
}

export function structureBiasPalette(bias: string | null | undefined): string {
  const value = (bias ?? "").toUpperCase();
  if (value === "BULLISH") return "green";
  if (value === "BEARISH") return "red";
  return "gray";
}

export function formatFootprintStatsLine(summary: FootprintSummary): string {
  const parts: string[] = [];

  parts.push(`Last Δ ${formatFootprintUsd(summary.last_delta ?? null)}`);
  parts.push(`CVD ${formatFootprintUsd(summary.last_cvd_window ?? null)}`);

  const oiClose = summary.window_oi_close ?? summary.last_oi_close ?? null;
  const oiWindowPct = summary.window_oi_change_pct ?? null;
  if (oiClose != null) {
    let oiPart = `OI ${formatOiLevel(oiClose)}`;
    if (oiWindowPct != null) {
      oiPart += ` (${formatOiChange(oiWindowPct)} window)`;
    }
    parts.push(oiPart);
  }

  if (summary.last_funding_rate != null) {
    parts.push(`Funding ${formatFundingRate(summary.last_funding_rate)}`);
  }

  return parts.join(" · ");
}

export function formatFootprintLiqLine(
  summary: FootprintSummary,
  merged: {
    liq_long_notional?: number | null;
    liq_short_notional?: number | null;
    liq_count?: number | null;
  }[],
): string | null {
  void summary;
  let longTotal = 0;
  let shortTotal = 0;
  let liqBars = 0;

  for (const bar of merged) {
    if ((bar.liq_count ?? 0) > 0) liqBars += 1;
    longTotal += bar.liq_long_notional ?? 0;
    shortTotal += bar.liq_short_notional ?? 0;
  }

  if (longTotal === 0 && shortTotal === 0) return null;

  if (shortTotal > longTotal) {
    return `Liq ${formatVolDollar(shortTotal)} shorts (${liqBars} bars)`;
  }
  if (longTotal > shortTotal) {
    return `Liq ${formatVolDollar(longTotal)} longs (${liqBars} bars)`;
  }
  return `Liq ${formatVolDollar(longTotal + shortTotal)} (${liqBars} bars)`;
}

export function displaySignals(summary: FootprintSummary) {
  const raw = summary.signals?.length
    ? summary.signals
    : summary.tags.map((id) => ({
        id,
        severity: "medium" as FootprintSignalSeverity,
        label: id.replace(/_/g, " "),
        display: true,
      }));
  return raw.filter((signal) => signal.display !== false);
}
