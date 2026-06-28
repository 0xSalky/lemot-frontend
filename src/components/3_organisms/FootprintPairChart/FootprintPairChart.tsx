"use client";

import type { ThemeTokens } from "@/components/ui/theme-color";
import {
  deltaTone,
  formatBarTime,
  formatFootprintDelta,
  formatFundingRate,
  formatOiChange,
  formatOiLevel,
} from "@/services/footprintUtils";
import { formatLevelPrice, formatRefreshCountdown, formatVolDollar } from "@/services/scannerUtils";
import type { FootprintMergedBar, FootprintTimeframe } from "@/types/footprintTypes";
import { FOOTPRINT_TIMEFRAMES } from "@/types/footprintTypes";
import type { ScannerBandRow } from "@/types/scannerTypes";
import { Box, Flex, NativeSelect, Stack, Text } from "@chakra-ui/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

const PRICE_HEIGHT = 200;
const DELTA_HEIGHT = 64;
const OI_HEIGHT = 56;
const LIQ_HEIGHT = 48;
const PAD_X = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 8;
const TOOLTIP_W = 220;
const TOOLTIP_GAP = 60;
const TOTAL_HEIGHT = PRICE_HEIGHT + DELTA_HEIGHT + OI_HEIGHT + LIQ_HEIGHT;

export { TOTAL_HEIGHT as FOOTPRINT_CHART_TOTAL_HEIGHT };
const ZOOM_FACTOR = 1.2;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 5;
const ZOOM_STEP_MIN = Math.ceil(Math.log(ZOOM_MIN) / Math.log(ZOOM_FACTOR));
const ZOOM_STEP_MAX = Math.floor(Math.log(ZOOM_MAX) / Math.log(ZOOM_FACTOR));

type FootprintPairChartProps = {
  bars: FootprintMergedBar[];
  timeframe: FootprintTimeframe;
  onTimeframeChange?: (timeframe: FootprintTimeframe) => void;
  loading?: boolean;
  refreshCountdownSec?: number;
  tokens: ThemeTokens;
  bands?: ScannerBandRow[];
  embedded?: boolean;
  symbol?: string;
  /** Live mark from scanner; drawn as dashed line when it differs from last bar close. */
  livePrice?: number;
};

function toneColor(tone: "buy" | "sell" | "neutral", tokens: ThemeTokens) {
  if (tone === "buy") return "var(--chakra-colors-green-400)";
  if (tone === "sell") return "var(--chakra-colors-red-400)";
  return tokens.panelMuted;
}

function formatTooltipLine(label: string, value: string) {
  return `${label} ${value}`;
}

function zoomScaleFromStep(step: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, ZOOM_FACTOR ** step));
}

function formatZoomLabel(step: number): string {
  if (step === 0) return "1x";
  return `${zoomScaleFromStep(step).toFixed(1)}x`;
}

function computeTooltipPlacement(hoverX: number, chartWidth: number): { left: number } {
  const minX = PAD_X;
  const maxX = chartWidth - PAD_X - TOOLTIP_W;

  const leftOfCursor = hoverX - TOOLTIP_W - TOOLTIP_GAP;
  const rightOfCursor = hoverX + TOOLTIP_GAP;

  const fitsLeft = leftOfCursor >= minX;
  const fitsRight = rightOfCursor <= maxX;

  if (fitsLeft) {
    return { left: leftOfCursor };
  }
  if (fitsRight) {
    return { left: rightOfCursor };
  }

  const spaceLeft = hoverX - minX - TOOLTIP_GAP;
  const spaceRight = chartWidth - PAD_X - hoverX - TOOLTIP_GAP;
  return { left: spaceLeft >= spaceRight ? minX : maxX };
}

function visibleBarsForZoom(bars: FootprintMergedBar[], zoomScale: number): FootprintMergedBar[] {
  const xWindow = Math.min(1, zoomScale);
  const visibleCount = Math.max(2, Math.round(bars.length * xWindow));
  return bars.slice(bars.length - visibleCount);
}

function computePriceBounds(closes: number[], spot: number): [number, number] {
  const rawMin = Math.min(...closes, spot);
  const rawMax = Math.max(...closes, spot);
  const span = Math.max(rawMax - rawMin, rawMin * 0.002, 1e-12);
  const pad = span * 0.04;
  return [rawMin - pad, rawMax + pad];
}

function applyZoomBounds(
  baseMin: number,
  baseMax: number,
  zoomScale: number,
  spot: number,
): [number, number] {
  const baseSpan = Math.max(baseMax - baseMin, spot * 0.002, 1e-12);
  const halfSpan = (baseSpan / 2) * zoomScale;
  return [spot - halfSpan, spot + halfSpan];
}

function paddedValueRange(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const mid = (rawMin + rawMax) / 2;
  const span = Math.max(rawMax - rawMin, Math.abs(mid) * 0.002, 1e-12);
  const pad = span * 0.08;
  return [mid - span / 2 - pad, mid + span / 2 + pad];
}

export default function FootprintPairChart({
  bars,
  timeframe,
  onTimeframeChange,
  loading = false,
  refreshCountdownSec,
  tokens,
  bands = [],
  embedded = false,
  symbol,
  livePrice,
}: FootprintPairChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clipUid = useId().replace(/:/g, "");
  const [width, setWidth] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [zoomStep, setZoomStep] = useState(0);

  const viewKey = useMemo(
    () => `${timeframe}:${bars.length}:${bars.at(-1)?.time ?? 0}`,
    [timeframe, bars],
  );
  const [prevViewKey, setPrevViewKey] = useState(viewKey);
  if (viewKey !== prevViewKey) {
    setPrevViewKey(viewKey);
    setZoomStep(0);
    setHoverIndex(null);
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plot = useMemo(() => {
    const allVisible = bars.filter((b) => b.close > 0);
    if (allVisible.length < 2 || width <= 0) return null;

    const zoomScale = zoomScaleFromStep(zoomStep);
    const visible = visibleBarsForZoom(allVisible, zoomScale);
    const lastClose = visible[visible.length - 1]?.close ?? 0;
    const spotPrice =
      livePrice != null && Number.isFinite(livePrice) && livePrice > 0 ? livePrice : lastClose;
    const closes = visible.map((b) => b.close);
    const [baseMin, baseMax] = computePriceBounds(closes, spotPrice);
    const [minPrice, maxPrice] = applyZoomBounds(baseMin, baseMax, zoomScale, spotPrice);
    const priceSpan = Math.max(maxPrice - minPrice, 1e-12);

    const chartWidth = width;
    const innerW = chartWidth - PAD_X * 2;
    const priceInnerH = PRICE_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const plotBottom = PAD_TOP + priceInnerH;
    const deltaInnerH = DELTA_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const oiInnerH = OI_HEIGHT - PAD_TOP - PAD_BOTTOM;

    const deltas = visible.map((b) => b.delta_usd ?? b.delta ?? 0);
    const maxAbsDelta = Math.max(...deltas.map(Math.abs), 1e-12);

    const cvdValues = visible.map((b) => b.cvd_window_usd ?? b.cvd_window ?? 0);
    const [minCvd, maxCvd] = paddedValueRange(cvdValues);
    const cvdSpan = Math.max(maxCvd - minCvd, 1e-12);

    const oiCloses = visible
      .map((b) => b.oi_close_usd ?? b.oi_close)
      .filter((v): v is number => v != null && Number.isFinite(v));
    const [minOi, maxOi] = paddedValueRange(oiCloses);
    const oiSpan = Math.max(maxOi - minOi, 1e-12);

    const oiPcts = visible.map((b) => b.oi_change_pct ?? 0);
    const maxAbsOiPct = Math.max(...oiPcts.map(Math.abs), 0.01);

    const liqLongs = visible.map((b) => b.liq_long_notional ?? 0);
    const liqShorts = visible.map((b) => b.liq_short_notional ?? 0);
    const maxAbsLiq = Math.max(
      ...liqLongs.map((v, i) => Math.max(v, liqShorts[i] ?? 0)),
      1e-12,
    );

    const xAt = (index: number) =>
      PAD_X + (index / Math.max(visible.length - 1, 1)) * innerW;

    const yPrice = (price: number) =>
      PAD_TOP + ((maxPrice - price) / priceSpan) * priceInnerH;

    const clampYPrice = (price: number) =>
      Math.min(Math.max(yPrice(price), PAD_TOP), plotBottom);

    const deltaTop = PRICE_HEIGHT;
    const deltaMidY = deltaTop + PAD_TOP + deltaInnerH / 2;
    const yDeltaTop = (delta: number) =>
      deltaMidY - (delta / maxAbsDelta) * (deltaInnerH / 2 - 2);

    const yCvd = (value: number) =>
      deltaTop + PAD_TOP + ((maxCvd - value) / cvdSpan) * deltaInnerH;

    const oiTop = PRICE_HEIGHT + DELTA_HEIGHT;
    const oiMidY = oiTop + PAD_TOP + oiInnerH / 2;
    const yOiLevel = (value: number) =>
      oiTop + PAD_TOP + ((maxOi - value) / oiSpan) * oiInnerH;

    const yOiPctTop = (pct: number) =>
      oiMidY - (pct / maxAbsOiPct) * (oiInnerH / 2 - 2);

    const liqTop = PRICE_HEIGHT + DELTA_HEIGHT + OI_HEIGHT;
    const liqInnerH = LIQ_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const liqMidY = liqTop + PAD_TOP + liqInnerH / 2;
    const yLiqLong = (notional: number) =>
      liqMidY + (notional / maxAbsLiq) * (liqInnerH / 2 - 2);
    const yLiqShort = (notional: number) =>
      liqMidY - (notional / maxAbsLiq) * (liqInnerH / 2 - 2);

    const closePoints = visible
      .map((bar, i) => `${xAt(i).toFixed(1)},${clampYPrice(bar.close).toFixed(1)}`)
      .concat(
        Math.abs(spotPrice - lastClose) > 1e-9
          ? [`${xAt(visible.length - 1).toFixed(1)},${clampYPrice(spotPrice).toFixed(1)}`]
          : [],
      )
      .join(" ");

    const cvdPoints = visible
      .map((bar, i) => {
        const cvd = bar.cvd_window_usd ?? bar.cvd_window ?? 0;
        return `${xAt(i).toFixed(1)},${yCvd(cvd).toFixed(1)}`;
      })
      .join(" ");

    const oiPoints = visible
      .map((bar, i) => {
        const oiClose = bar.oi_close_usd ?? bar.oi_close;
        if (oiClose == null) return null;
        return `${xAt(i).toFixed(1)},${yOiLevel(oiClose).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(" ");

    const barWidth = Math.max(2, innerW / Math.max(visible.length, 1) - 1);

    const bandRects = bands.flatMap((band, i) => {
      const low = Math.min(band.low, band.high);
      const high = Math.max(band.low, band.high);
      if (high < minPrice || low > maxPrice) return [];

      const yTop = Math.max(yPrice(high), PAD_TOP);
      const yBottom = Math.min(yPrice(low), plotBottom);
      return [
        {
          key: `${band.side}-${low}-${high}-${i}`,
          left: PAD_X,
          top: yTop,
          width: innerW,
          height: Math.max(yBottom - yTop, 2),
          side: band.side,
        },
      ];
    });

    return {
      chartWidth,
      visible,
      closePoints,
      cvdPoints,
      oiPoints,
      bandRects,
      xAt,
      yPrice,
      yDeltaTop,
      yOiPctTop,
      deltaMidY,
      oiMidY,
      oiTop,
      deltaTop,
      liqTop,
      liqMidY,
      yLiqLong,
      yLiqShort,
      maxAbsLiq,
      barWidth,
      spotPrice,
      spotY: clampYPrice(spotPrice),
      lastX: xAt(visible.length - 1),
      clipIds: {
        price: `${clipUid}-price`,
        delta: `${clipUid}-delta`,
        oi: `${clipUid}-oi`,
        liq: `${clipUid}-liq`,
      },
    };
  }, [bands, bars, clipUid, livePrice, width, zoomStep]);

  const hoverBar = hoverIndex != null && plot ? plot.visible[hoverIndex] : null;
  const tooltipPlacement =
    hoverIndex != null && plot
      ? computeTooltipPlacement(plot.xAt(hoverIndex), plot.chartWidth)
      : null;

  if (!bars.length && !loading) {
    return (
      <Box py="6" textAlign="center">
        <Text fontSize="xs" fontFamily="mono" color={tokens.panelMuted}>
          No chart data
        </Text>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      w="100%"
      borderWidth={embedded ? 0 : "1px"}
      borderColor={tokens.panelBorder}
      rounded={embedded ? 0 : "md"}
      overflow="hidden"
      bg={embedded ? "transparent" : tokens.panelBg}
    >
      <Box position="relative" h={`${TOTAL_HEIGHT}px`} overflow="hidden">
        <Flex position="absolute" top="2" left="2" zIndex={5} gap="1" align="center">
          <Box
            as="button"
            aria-label="Zoom in"
            onClick={() => setZoomStep((s) => Math.max(ZOOM_STEP_MIN, s - 1))}
            fontFamily="mono"
            fontSize="2xs"
            lineHeight="1"
            w="1.5rem"
            h="1.5rem"
            minW="1.5rem"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg={tokens.panelBgUser}
            borderWidth="1px"
            borderColor={tokens.panelBorder}
            color={tokens.panelHeading}
            rounded="sm"
            cursor="pointer"
            _hover={{ bg: tokens.panelBg }}
          >
            +
          </Box>
          <Box
            as="button"
            aria-label="Zoom out"
            onClick={() => setZoomStep((s) => Math.min(ZOOM_STEP_MAX, s + 1))}
            fontFamily="mono"
            fontSize="2xs"
            lineHeight="1"
            w="1.5rem"
            h="1.5rem"
            minW="1.5rem"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg={tokens.panelBgUser}
            borderWidth="1px"
            borderColor={tokens.panelBorder}
            color={tokens.panelHeading}
            rounded="sm"
            cursor="pointer"
            _hover={{ bg: tokens.panelBg }}
          >
            −
          </Box>
          <Text
            fontFamily="mono"
            fontSize="9px"
            lineHeight="1.5rem"
            color={tokens.panelMuted}
            minW="1.75rem"
            textAlign="center"
          >
            {formatZoomLabel(zoomStep)}
          </Text>
        </Flex>

        {(onTimeframeChange != null || refreshCountdownSec != null) ? (
          <Flex
            position="absolute"
            top="2"
            right="2"
            zIndex={5}
            align="center"
            gap="1.5"
          >
            {refreshCountdownSec != null ? (
              <Text
                fontFamily="mono"
                fontSize="2xs"
                lineHeight="1.5rem"
                color={tokens.panelMuted}
                title="Next chart refresh"
              >
                {formatRefreshCountdown(refreshCountdownSec)}
              </Text>
            ) : null}
            {onTimeframeChange ? (
              <NativeSelect.Root size="xs" width={{ base: "2.25rem", md: "3rem" }} maxW={{ base: "2.25rem", md: "3rem" }}>
                <NativeSelect.Field
                  className="chart-tf-select"
                  value={timeframe}
                  fontFamily="mono"
                  fontSize={{ base: "10px", md: "2xs" }}
                  h="1.5rem"
                  minH="1.5rem"
                  maxH="1.5rem"
                  py="0"
                  px="0.5"
                  bg={tokens.panelBgUser}
                  borderColor={tokens.panelBorder}
                  onChange={(e) => {
                    const next = e.currentTarget.value;
                    if ((FOOTPRINT_TIMEFRAMES as readonly string[]).includes(next)) {
                      onTimeframeChange(next as FootprintTimeframe);
                    }
                  }}
                >
                  {FOOTPRINT_TIMEFRAMES.map((tf) => (
                    <option key={tf} value={tf}>
                      {tf}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            ) : null}
          </Flex>
        ) : null}

        {loading || !plot ? (
          <Box h="100%" display="flex" alignItems="center" justifyContent="center">
            <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
              {loading ? "Loading footprint…" : "Loading chart…"}
            </Text>
          </Box>
        ) : (
          <>
            <svg
              width="100%"
              height={TOTAL_HEIGHT}
              viewBox={`0 0 ${plot.chartWidth} ${TOTAL_HEIGHT}`}
              preserveAspectRatio="none"
              aria-label={`${timeframe} footprint chart${symbol ? ` for ${symbol}` : ""}`}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <clipPath id={plot.clipIds.price}>
                  <rect x={0} y={0} width={plot.chartWidth} height={PRICE_HEIGHT} />
                </clipPath>
                <clipPath id={plot.clipIds.delta}>
                  <rect x={0} y={PRICE_HEIGHT} width={plot.chartWidth} height={DELTA_HEIGHT} />
                </clipPath>
                <clipPath id={plot.clipIds.oi}>
                  <rect
                    x={0}
                    y={PRICE_HEIGHT + DELTA_HEIGHT}
                    width={plot.chartWidth}
                    height={OI_HEIGHT}
                  />
                </clipPath>
                <clipPath id={plot.clipIds.liq}>
                  <rect
                    x={0}
                    y={PRICE_HEIGHT + DELTA_HEIGHT + OI_HEIGHT}
                    width={plot.chartWidth}
                    height={LIQ_HEIGHT}
                  />
                </clipPath>
              </defs>

              <line
                x1={PAD_X}
                x2={plot.chartWidth - PAD_X}
                y1={plot.deltaTop}
                y2={plot.deltaTop}
                stroke={tokens.panelBorder}
                strokeWidth={1}
              />
              <line
                x1={PAD_X}
                x2={plot.chartWidth - PAD_X}
                y1={plot.oiTop}
                y2={plot.oiTop}
                stroke={tokens.panelBorder}
                strokeWidth={1}
              />
              <line
                x1={PAD_X}
                x2={plot.chartWidth - PAD_X}
                y1={plot.deltaMidY}
                y2={plot.deltaMidY}
                stroke={tokens.panelBorder}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <line
                x1={PAD_X}
                x2={plot.chartWidth - PAD_X}
                y1={plot.oiMidY}
                y2={plot.oiMidY}
                stroke={tokens.panelBorder}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <line
                x1={PAD_X}
                x2={plot.chartWidth - PAD_X}
                y1={plot.liqTop}
                y2={plot.liqTop}
                stroke={tokens.panelBorder}
                strokeWidth={1}
              />
              <line
                x1={PAD_X}
                x2={plot.chartWidth - PAD_X}
                y1={plot.liqMidY}
                y2={plot.liqMidY}
                stroke={tokens.panelBorder}
                strokeWidth={1}
                strokeDasharray="3 3"
              />

              <g clipPath={`url(#${plot.clipIds.price})`}>
                {plot.bandRects.map((rect) => (
                  <rect
                    key={rect.key}
                    x={rect.left}
                    y={rect.top}
                    width={rect.width}
                    height={rect.height}
                    fill={
                      rect.side === "SUP"
                        ? "var(--chakra-colors-green-500)"
                        : "var(--chakra-colors-red-500)"
                    }
                    opacity={0.15}
                  />
                ))}

                <polyline
                  fill="none"
                  stroke={tokens.panelHeading}
                  strokeWidth={1.5}
                  points={plot.closePoints}
                />

                <line
                  x1={PAD_X}
                  x2={plot.chartWidth - PAD_X}
                  y1={plot.spotY}
                  y2={plot.spotY}
                  stroke={tokens.panelHeading}
                  strokeWidth={0.5}
                  strokeDasharray="4 4"
                  opacity={0.5}
                />
                <circle
                  cx={plot.lastX}
                  cy={plot.spotY}
                  r={2}
                  fill={tokens.panelHeading}
                  opacity={0.5}
                />
              </g>

              <g clipPath={`url(#${plot.clipIds.delta})`}>
                {plot.visible.map((bar, i) => {
                  const delta = bar.delta_usd ?? bar.delta;
                  if (delta == null) return null;
                  const tone = deltaTone(delta);
                  const x = plot.xAt(i) - plot.barWidth / 2;
                  const y0 = plot.deltaMidY;
                  const y1 = plot.yDeltaTop(delta);
                  const top = Math.min(y0, y1);
                  const height = Math.max(Math.abs(y1 - y0), 2);
                  return (
                    <rect
                      key={`delta-${bar.time}`}
                      x={x}
                      y={top}
                      width={plot.barWidth}
                      height={height}
                      fill={toneColor(tone, tokens)}
                      opacity={bar.source_gap ? 0.35 : 0.85}
                    />
                  );
                })}

                <polyline
                  fill="none"
                  stroke="var(--chakra-colors-yellow-400)"
                  strokeWidth={1.25}
                  points={plot.cvdPoints}
                  opacity={0.9}
                />
              </g>

              <g clipPath={`url(#${plot.clipIds.oi})`}>
                {plot.visible.map((bar, i) => {
                  if (bar.oi_change_pct == null) return null;
                  const tone = deltaTone(bar.oi_change_pct);
                  const x = plot.xAt(i) - plot.barWidth / 2;
                  const y0 = plot.oiMidY;
                  const y1 = plot.yOiPctTop(bar.oi_change_pct);
                  const top = Math.min(y0, y1);
                  const height = Math.max(Math.abs(y1 - y0), 1.5);
                  return (
                    <rect
                      key={`oi-${bar.time}`}
                      x={x}
                      y={top}
                      width={plot.barWidth}
                      height={height}
                      fill={toneColor(tone, tokens)}
                      opacity={0.35}
                    />
                  );
                })}

                {plot.oiPoints ? (
                  <polyline
                    fill="none"
                    stroke="var(--chakra-colors-cyan-400)"
                    strokeWidth={1.25}
                    points={plot.oiPoints}
                    opacity={0.95}
                  />
                ) : null}
              </g>

              <g clipPath={`url(#${plot.clipIds.liq})`}>
                {plot.visible.flatMap((bar, i) => {
                  const longLiq = bar.liq_long_notional ?? 0;
                  const shortLiq = bar.liq_short_notional ?? 0;
                  if (longLiq <= 0 && shortLiq <= 0) return [];
                  const x = plot.xAt(i) - plot.barWidth / 2;
                  const halfW = plot.barWidth / 2 - 0.5;
                  const nodes = [];
                  if (longLiq > 0) {
                    const y0 = plot.liqMidY;
                    const y1 = plot.yLiqLong(longLiq);
                    nodes.push(
                      <rect
                        key={`liq-long-${bar.time}`}
                        x={x}
                        y={y0}
                        width={halfW}
                        height={Math.max(y1 - y0, 2)}
                        fill={toneColor("sell", tokens)}
                        opacity={0.85}
                      />,
                    );
                  }
                  if (shortLiq > 0) {
                    const y0 = plot.liqMidY;
                    const y1 = plot.yLiqShort(shortLiq);
                    nodes.push(
                      <rect
                        key={`liq-short-${bar.time}`}
                        x={x + halfW + 1}
                        y={y1}
                        width={halfW}
                        height={Math.max(y0 - y1, 2)}
                        fill={toneColor("buy", tokens)}
                        opacity={0.85}
                      />,
                    );
                  }
                  return nodes;
                })}
              </g>

              {plot.visible.map((bar, i) => (
                <rect
                  key={`hit-${bar.time}`}
                  x={plot.xAt(i) - plot.barWidth / 2 - 1}
                  y={0}
                  width={plot.barWidth + 2}
                  height={TOTAL_HEIGHT}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(i)}
                />
              ))}

              {hoverIndex != null ? (
                <line
                  x1={plot.xAt(hoverIndex)}
                  x2={plot.xAt(hoverIndex)}
                  y1={PAD_TOP}
                  y2={TOTAL_HEIGHT - PAD_BOTTOM}
                  stroke={tokens.panelBorder}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.8}
                />
              ) : null}
            </svg>

            <Box
              position="absolute"
              left={`${PAD_X}px`}
              top={`${Math.min(Math.max(plot.spotY - 11, 4), PRICE_HEIGHT - 26)}px`}
              zIndex={3}
              px="2"
              py="0.5"
              bg={tokens.panelBgUser}
              borderWidth="1px"
              borderColor={tokens.panelBorder}
              rounded="sm"
              boxShadow="sm"
              pointerEvents="none"
            >
              <Text
                fontFamily="mono"
                fontSize="2xs"
                fontWeight="semibold"
                color={tokens.panelHeading}
                lineHeight="1.2"
              >
                {formatLevelPrice(plot.spotPrice)}
              </Text>
            </Box>

            {hoverBar && tooltipPlacement ? (
              <Box
                position="absolute"
                left={`${tooltipPlacement.left}px`}
                top="28px"
                zIndex={6}
                w={`${TOOLTIP_W}px`}
                px="2"
                py="1.5"
                bg={tokens.panelBgUser}
                borderWidth="1px"
                borderColor={tokens.panelBorder}
                rounded="sm"
                boxShadow="sm"
                pointerEvents="none"
              >
                <Stack gap="0.5">
                  <Text fontFamily="mono" fontSize="2xs" fontWeight="semibold" color={tokens.panelHeading}>
                    {formatBarTime(hoverBar.time)}
                    {hoverBar.source_gap ? " · gap" : ""}
                  </Text>
                  <Text fontFamily="mono" fontSize="2xs" color={tokens.panelBody} lineHeight="1.4">
                    {formatTooltipLine("Close", hoverBar.close.toFixed(2))}
                    {" · "}
                    {formatTooltipLine("Δ", formatFootprintDelta(hoverBar.delta_usd ?? hoverBar.delta))}
                  </Text>
                  <Text fontFamily="mono" fontSize="2xs" color={tokens.panelBody} lineHeight="1.4">
                    {formatTooltipLine("Δmax", formatFootprintDelta(hoverBar.delta_max_usd ?? hoverBar.delta_max))}
                    {" · "}
                    {formatTooltipLine("Δmin", formatFootprintDelta(hoverBar.delta_min_usd ?? hoverBar.delta_min))}
                    {" · "}
                    {formatTooltipLine("CVD", formatFootprintDelta(hoverBar.cvd_window_usd ?? hoverBar.cvd_window))}
                  </Text>
                  <Text fontFamily="mono" fontSize="2xs" color={tokens.panelBody} lineHeight="1.4">
                    {formatTooltipLine("OI", formatOiLevel(hoverBar.oi_close_usd ?? hoverBar.oi_close))}
                    {" · "}
                    {formatTooltipLine("ΔOI", formatOiChange(hoverBar.oi_change_pct))}
                  </Text>
                  <Text fontFamily="mono" fontSize="2xs" color={tokens.panelBody} lineHeight="1.4">
                    {formatTooltipLine("Funding", formatFundingRate(hoverBar.funding_rate))}
                  </Text>
                  {(hoverBar.liq_count ?? 0) > 0 ? (
                    <Text fontFamily="mono" fontSize="2xs" color={tokens.panelBody} lineHeight="1.4">
                      {formatTooltipLine(
                        "Liq long",
                        formatVolDollar(hoverBar.liq_long_notional ?? 0),
                      )}
                      {" · "}
                      {formatTooltipLine(
                        "Liq short",
                        formatVolDollar(hoverBar.liq_short_notional ?? 0),
                      )}
                      {" · "}
                      {formatTooltipLine("Events", String(hoverBar.liq_count ?? 0))}
                    </Text>
                  ) : null}
                </Stack>
              </Box>
            ) : null}
          </>
        )}
      </Box>
    </Box>
  );
}
