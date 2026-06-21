import { apiFetch } from "@/services/apiFetch";
import { formatVolDollar } from "@/services/scannerUtils";
import type {
  FootprintPairView,
  FootprintProfile,
  FootprintSignalSeverity,
  FootprintSummary,
  FootprintTimeframe,
  FootprintViewPayload,
} from "@/types/footprintTypes";
import { FOOTPRINT_SYMBOLS } from "@/types/footprintTypes";

export async function fetchFootprintView(
  symbols: readonly string[] = FOOTPRINT_SYMBOLS,
  options?: {
    timeframe?: FootprintTimeframe;
    profile?: FootprintProfile;
  },
): Promise<FootprintViewPayload> {
  const params = new URLSearchParams({
    symbols: symbols.join(","),
  });
  if (options?.timeframe) {
    params.set("timeframe", options.timeframe);
  }
  if (options?.profile) {
    params.set("profile", options.profile);
  }

  const res = await apiFetch(`/api/footprint/view?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail ?? `Footprint request failed (${res.status})`);
  }

  return (await res.json()) as FootprintViewPayload;
}

export function hasFootprintData(pair?: FootprintPairView | null): boolean {
  if (!pair) return false;
  if (pair.orderflow?.bars?.length) return true;
  return pair.merged?.some((bar) => bar.close > 0) ?? false;
}

/** Symbols tracked by the footprint collector (day scan shows loading, not REST chart, while fetching). */
export function expectsFootprintSymbol(base: string): boolean {
  return (FOOTPRINT_SYMBOLS as readonly string[]).includes(base.toUpperCase());
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
