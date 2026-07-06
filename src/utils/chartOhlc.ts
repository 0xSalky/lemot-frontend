import type { ThemeTokens } from "@/components/ui/theme-color";

export type ChartPriceMode = "candle" | "line";

export type ChartCandleStyle = {
  fill: string;
  stroke: string;
  wick: string;
  fillOpacity: number;
  strokeWidth: number;
};

export type ChartCandleTheme = {
  bull: ChartCandleStyle;
  bear: ChartCandleStyle;
};

/** Theme-native OHLC colors — bright heading for up, neon title for down (no PnL green/red). */
export function chartCandleTheme(tokens: ThemeTokens): ChartCandleTheme {
  return {
    bull: {
      fill: tokens.panelHeading,
      stroke: tokens.tagAccent.border,
      wick: tokens.panelHeading,
      fillOpacity: 0.92,
      strokeWidth: 0.6,
    },
    bear: {
      fill: tokens.title,
      stroke: tokens.listBullet,
      wick: tokens.listBullet,
      fillOpacity: 0.92,
      strokeWidth: 0.6,
    },
  };
}

export type OhlcBar = {
  open: number;
  high: number;
  low: number;
  close: number;
};

export function computeOhlcBounds(
  bars: OhlcBar[],
  spot: number,
  padRatio = 0.04,
  minSpanRatio = 0.004,
): [number, number] {
  if (bars.length === 0) {
    const pad = Math.max(Math.abs(spot) * minSpanRatio, 1e-12);
    return [spot - pad, spot + pad];
  }
  const lows = bars.map((b) => Math.min(b.low, b.open, b.close));
  const highs = bars.map((b) => Math.max(b.high, b.open, b.close));
  const rawMin = Math.min(...lows, spot);
  const rawMax = Math.max(...highs, spot);
  const span = Math.max(rawMax - rawMin, rawMin * minSpanRatio, 1e-12);
  const pad = span * padRatio;
  return [rawMin - pad, rawMax + pad];
}

export type CandleGeometry = {
  key: string;
  bodyX: number;
  bodyY: number;
  bodyW: number;
  bodyH: number;
  wickX: number;
  wickW: number;
  wickY1: number;
  wickY2: number;
  bullish: boolean;
};

export function candleGeometries(
  bars: OhlcBar[],
  xAt: (index: number) => number,
  yAt: (price: number) => number,
  innerW: number,
  plotInnerH: number,
): CandleGeometry[] {
  const slotW = innerW / Math.max(bars.length, 1);
  const bodyW = Math.max(2.5, Math.min(slotW * 0.7, 14));
  const minBodyH = Math.max(2.5, plotInnerH * 0.01);

  return bars.map((bar, i) => {
    const cx = xAt(i);
    const openY = yAt(bar.open);
    const closeY = yAt(bar.close);
    const highY = yAt(bar.high);
    const lowY = yAt(bar.low);
    const bullish = bar.close >= bar.open;
    const bodyH = Math.max(Math.abs(closeY - openY), minBodyH);
    const bodyY = (openY + closeY) / 2 - bodyH / 2;

    return {
      key: `candle-${i}-${bar.close}`,
      bodyX: cx - bodyW / 2,
      bodyY,
      bodyW,
      bodyH,
      wickX: cx,
      wickW: 1,
      wickY1: highY,
      wickY2: lowY,
      bullish,
    };
  });
}
