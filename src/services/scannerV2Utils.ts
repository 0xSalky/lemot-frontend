import type {
  ScannerV2BandRow,
  ScannerV2LatestBatchFetchResult,
  ScannerV2SetupRow,
} from "@/types/scannerV2Types";
import { scannerSymbolToBase } from "@/services/scannerUtils";

export { scannerSymbolToBase };

export async function fetchLatestScannerV2Batch(): Promise<ScannerV2LatestBatchFetchResult> {
  const res = await fetch("/api/scanner-v2/latest-batch", { cache: "no-store" });
  const raw = await res.text();
  try {
    return (raw ? JSON.parse(raw) : {}) as ScannerV2LatestBatchFetchResult;
  } catch {
    return { message: raw || String(res.status) };
  }
}

export function formatLevelPrice(price: number): string {
  const v = Number(price);
  if (!Number.isFinite(v)) return "—";
  if (v >= 1000) {
    return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  if (v >= 1) {
    return v.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
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

export function formatSetupHeaderLine1(setup: ScannerV2SetupRow): string {
  const signalPart = setup.signal ? ` | ${formatSignalLabel(setup.signal)}` : "";
  return (
    `#${setup.rank} | ${setup.symbol} | score=${setup.score.toFixed(1)} | ` +
    `${formatBiasLabel(setup.bias)}${signalPart} | ${formatAdxLine(setup.adx, setup.adx_regime)} | ` +
    `price=${formatLevelPrice(setup.price)} | 24h vol=${formatVolDollar(setup.quote_volume_24h)}`
  );
}

export function formatSetupHeader(setup: ScannerV2SetupRow): string {
  return formatSetupHeaderLine1(setup);
}

export function formatBandLine(band: ScannerV2BandRow): string {
  const side = band.side;
  const dist = band.distance_pct ?? 0;
  let marker = "  ";
  let distText = "at price";
  if (side === "RES") {
    marker = "🔴";
    distText = `${dist.toFixed(2)}% above`;
  } else if (side === "SUP") {
    marker = "🟢";
    distText = `${dist.toFixed(2)}% below`;
  }
  return (
    `${marker} ${formatLevelPrice(band.low)} – ${formatLevelPrice(band.high)}  ` +
    `w=${band.total_weight}  ${distText}`
  );
}

export function formatCompactLevel(level: {
  timeframe: string;
  level_type: string;
  level: number;
  anchor_date?: string;
}): string {
  const base = `${level.timeframe} ${level.level_type} ${formatLevelPrice(level.level)}`;
  return level.anchor_date ? `${base} ${level.anchor_date}` : base;
}

/** RES first, then SUP (matches scanner console output). */
export function orderedBands(bands: ScannerV2BandRow[]): ScannerV2BandRow[] {
  const res = bands.filter((b) => b.side === "RES");
  const sup = bands.filter((b) => b.side === "SUP");
  const rest = bands.filter((b) => b.side !== "RES" && b.side !== "SUP");
  return [...res, ...sup, ...rest];
}

export function bandBySide(
  bands: ScannerV2BandRow[],
  side: "RES" | "SUP",
): ScannerV2BandRow | undefined {
  return bands.find((b) => b.side === side);
}

export function levelLabel(level: { timeframe: string; level_type: string }): string {
  return `${level.timeframe} ${level.level_type.replace(/_/g, " ")}`;
}

export function setupsFromBatch(
  latestBatch: ScannerV2LatestBatchFetchResult | null,
): ScannerV2SetupRow[] {
  if (latestBatch == null || "message" in latestBatch) return [];
  return [...latestBatch.setups].sort((a, b) => a.rank - b.rank);
}
