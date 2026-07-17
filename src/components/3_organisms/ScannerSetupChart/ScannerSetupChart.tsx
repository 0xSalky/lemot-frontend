"use client";

import {
  type ScannerBandRow,
  type ScannerChartPayload,
  type ScannerChartTimeframe,
} from "@/types/scannerTypes";
import { fetchScannerChart, chartSpotPrice, formatLevelPrice } from "@/services/scannerUtils";
import ChartPriceModeToggle from "@/components/2_molecules/ChartPriceModeToggle/ChartPriceModeToggle";
import { ChartCandleSvg } from "@/components/2_molecules/ChartCandleSvg/ChartCandleSvg";
import { usePageVisible } from "@/hooks/usePageVisible";
import type { ThemeTokens } from "@/components/ui/theme-color";
import {
  candleGeometries,
  chartCandleTheme,
  computeOhlcBounds,
  type ChartPriceMode,
} from "@/utils/chartOhlc";
import { Box, Flex, Text } from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";

const CHART_HEIGHT = 250;

export { CHART_HEIGHT as SETUP_CHART_HEIGHT };
const ZOOM_FACTOR = 1.2;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 5;
const ZOOM_STEP_MIN = Math.ceil(Math.log(ZOOM_MIN) / Math.log(ZOOM_FACTOR));
const ZOOM_STEP_MAX = Math.floor(Math.log(ZOOM_MAX) / Math.log(ZOOM_FACTOR));
const PAD_X = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 14;

type ChartFetchState = {
  key: string;
  status: "ready" | "error";
  chart: ScannerChartPayload | null;
  error: string | null;
};

type ScannerSetupChartProps = {
  symbol: string;
  price: number;
  bands: ScannerBandRow[];
  tokens: ThemeTokens;
  defaultTimeframe?: ScannerChartTimeframe;
  /** When true, outer bleed margins are omitted (parent card handles layout). */
  embedded?: boolean;
  /** Batched chart from ScannerResults. */
  managedChart?: ScannerChartPayload | null;
  managedChartLoading?: boolean;
  chartRevisionKey?: string;
  /** Trading-TF NATR percentile (0–10), shown on the chart chrome. */
  volScore?: number | null;
};

function computeChartBounds(
  candles: ScannerChartPayload["candles"],
  spot: number,
): [number, number] {
  return computeOhlcBounds(candles, spot);
}

function visibleCandlesForZoom(
  candles: ScannerChartPayload["candles"],
  zoomScale: number,
): ScannerChartPayload["candles"] {
  const xWindow = Math.min(1, zoomScale);
  const visibleCount = Math.max(2, Math.round(candles.length * xWindow));
  return candles.slice(candles.length - visibleCount);
}

function applyZoomBounds(
  baseMin: number,
  baseMax: number,
  zoomScale: number,
  spot: number,
): [number, number] {
  const baseSpan = Math.max(baseMax - baseMin, spot * 0.004, 1e-12);
  const halfSpan = (baseSpan / 2) * zoomScale;
  return [spot - halfSpan, spot + halfSpan];
}

function zoomScaleFromStep(step: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, ZOOM_FACTOR ** step));
}

function formatZoomLabel(step: number): string {
  if (step === 0) return "1x";
  return `${zoomScaleFromStep(step).toFixed(1)}x`;
}

function ScannerSetupChart({
  symbol,
  price,
  bands,
  tokens,
  defaultTimeframe = "1h",
  embedded = false,
  managedChart,
  managedChartLoading = false,
  chartRevisionKey,
  volScore = null,
}: ScannerSetupChartProps) {
  const pageVisible = usePageVisible();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const timeframe = defaultTimeframe;
  const [priceMode, setPriceMode] = useState<ChartPriceMode>("candle");
  const candleTheme = useMemo(() => chartCandleTheme(tokens), [tokens]);
  const [zoomStep, setZoomStep] = useState(0);
  const [fetchState, setFetchState] = useState<ChartFetchState>({
    key: "",
    status: "error",
    chart: null,
    error: null,
  });

  const useManagedChart =
    managedChart !== undefined &&
    (managedChart == null || managedChart.timeframe === timeframe);
  const fetchKey = `${symbol}|${timeframe}`;
  const loading = useManagedChart
    ? managedChartLoading
    : fetchState.key !== fetchKey;
  const chart = useManagedChart
    ? managedChart
    : fetchState.key === fetchKey
      ? fetchState.chart
      : null;
  const error = useManagedChart
    ? null
    : fetchState.key === fetchKey
      ? fetchState.error
      : null;
  const vol =
    volScore == null || Number.isNaN(Number(volScore))
      ? null
      : Math.max(0, Math.min(10, Math.round(Number(volScore))));
  const volColor =
    vol == null
      ? tokens.panelMuted
      : vol >= 7
        ? tokens.warn
        : vol >= 3
          ? tokens.tagAccent.color
          : tokens.panelMuted;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setContainerWidth(w);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (useManagedChart || !pageVisible) return;

    let cancelled = false;

    const loadChart = (): Promise<void> =>
      fetchScannerChart(symbol, timeframe)
        .then((payload) => {
          if (cancelled) return;
          if (!payload) {
            setFetchState({
              key: fetchKey,
              status: "error",
              chart: null,
              error: "Chart unavailable",
            });
            return;
          }
          setFetchState({
            key: fetchKey,
            status: "ready",
            chart: payload,
            error: null,
          });
        })
        .catch(() => {
          if (!cancelled) {
            setFetchState({
              key: fetchKey,
              status: "error",
              chart: null,
              error: "Chart unavailable",
            });
          }
        });

    void loadChart();

    return () => {
      cancelled = true;
    };
  }, [fetchKey, pageVisible, symbol, timeframe, useManagedChart]);

  const chartWidth = Math.max(containerWidth, 280);

  const plot = useMemo(() => {
    if (!chart?.candles?.length || chartWidth <= 0) return null;

    const zoomScale = zoomScaleFromStep(zoomStep);
    const candles = chart.candles;
    const lastClose = candles[candles.length - 1]?.close;
    const spotPrice = chartSpotPrice(chart, price > 0 ? price : lastClose);
    const visibleCandles = visibleCandlesForZoom(candles, zoomScale);
    const [baseMin, baseMax] = computeChartBounds(visibleCandles, spotPrice);
    const [minPrice, maxPrice] = applyZoomBounds(baseMin, baseMax, zoomScale, spotPrice);
    const innerW = chartWidth - PAD_X * 2;
    const innerH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const priceSpan = maxPrice - minPrice;
    const plotBottom = PAD_TOP + innerH;

    const xAt = (index: number) =>
      PAD_X + (index / Math.max(visibleCandles.length - 1, 1)) * innerW;

    const yAt = (level: number) =>
      PAD_TOP + ((maxPrice - level) / priceSpan) * innerH;

    const lastX = xAt(visibleCandles.length - 1);
    const closePoints = visibleCandles
      .map((candle, i) => `${xAt(i).toFixed(1)},${yAt(candle.close).toFixed(1)}`)
      .join(" ");

    const bandRects = bands.flatMap((band, i) => {
      const low = Math.min(band.low, band.high);
      const high = Math.max(band.low, band.high);
      if (high < minPrice || low > maxPrice) return [];

      const yTop = Math.max(yAt(high), PAD_TOP);
      const yBottom = Math.min(yAt(low), plotBottom);
      return [{
        key: `${band.side}-${low}-${high}-${i}`,
        left: PAD_X,
        top: yTop,
        width: innerW,
        height: Math.max(yBottom - yTop, 2),
        side: band.side,
      }];
    });

    const spotY = yAt(spotPrice);
    const lastY = yAt(spotPrice);
    const candleShapes = candleGeometries(visibleCandles, xAt, yAt, innerW, innerH);

    return {
      closePoints,
      candleShapes,
      bandRects,
      spotY,
      spotPrice,
      innerW,
      lastX,
      lastY,
    };
  }, [bands, chart, chartRevisionKey, chartWidth, price, zoomStep]);

  return (
    <Box
      mb={embedded ? 0 : "3"}
      mx={embedded ? 0 : "-3"}
      mt={embedded ? 0 : "-3"}
      borderBottomWidth={embedded ? 0 : "1px"}
      borderColor={tokens.panelBorder}
      overflow="hidden"
    >
      <Box
        ref={containerRef}
        w="100%"
        h={`${CHART_HEIGHT}px`}
        position="relative"
      >
        {loading ? (
          <Box
            h="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
              Loading chart…
            </Text>
          </Box>
        ) : error || !plot ? (
          <Box
            h="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
              {error ?? "No chart data"}
            </Text>
          </Box>
        ) : (
          <>
            <Flex position="absolute" top="2" left="2" zIndex={5} gap="1" align="center" flexWrap="wrap">
              {vol != null ? (
                <Box
                  px="1.5"
                  py="0.5"
                  bg={tokens.panelBgUser}
                  borderWidth="1px"
                  borderColor={tokens.panelBorder}
                  rounded="sm"
                  pointerEvents="none"
                  title={`${timeframe} NATR vol score`}
                >
                  <Text
                    fontFamily="mono"
                    fontSize="9px"
                    lineHeight="1.5rem"
                    color={volColor}
                    fontWeight="semibold"
                  >
                    VOL {vol}/10
                  </Text>
                </Box>
              ) : null}
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
                title="Zoom level"
              >
                {formatZoomLabel(zoomStep)}
              </Text>
              <ChartPriceModeToggle
                mode={priceMode}
                onChange={setPriceMode}
                tokens={tokens}
              />
            </Flex>

            {plot.bandRects.map((band) => (
              <Box
                key={band.key}
                position="absolute"
                left={`${band.left}px`}
                top={`${band.top}px`}
                w={`${band.width}px`}
                h={`${band.height}px`}
                bg={band.side === "SUP" ? tokens.tagGreen.bg : tokens.tagRed.bg}
                borderWidth="1px"
                borderColor={
                  band.side === "SUP" ? tokens.tagGreen.border : tokens.tagRed.border
                }
                opacity={0.72}
                zIndex={1}
                pointerEvents="none"
              />
            ))}

            <Box
              color={tokens.panelHeading}
              w="100%"
              lineHeight={0}
              position="relative"
              zIndex={2}
              pointerEvents="none"
            >
              <svg
                width={chartWidth}
                height={CHART_HEIGHT}
                viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
                preserveAspectRatio={priceMode === "candle" ? "xMidYMid meet" : "none"}
                style={{
                  display: "block",
                  width: "100%",
                  height: CHART_HEIGHT,
                }}
                role="img"
                aria-label={`${timeframe} ${priceMode} price chart for ${symbol} with HTF bands`}
              >
                {priceMode === "candle" ? (
                  <ChartCandleSvg candles={plot.candleShapes} theme={candleTheme} />
                ) : (
                    <polyline
                      points={plot.closePoints}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity={0.95}
                    />
                  )}

                <line
                  x1={PAD_X}
                  x2={chartWidth - PAD_X}
                  y1={plot.spotY}
                  y2={plot.spotY}
                  stroke="currentColor"
                  strokeWidth={0.5}
                  strokeDasharray="4 4"
                  opacity={0.5}
                />

                <circle
                  cx={plot.lastX}
                  cy={plot.lastY}
                  r="2"
                  fill="currentColor"
                  opacity={0.5}
                />
              </svg>
            </Box>

            <Box
              position="absolute"
              left={`${PAD_X}px`}
              top={`${Math.min(Math.max(plot.spotY - 11, 4), CHART_HEIGHT - 26)}px`}
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
          </>
        )}
      </Box>
    </Box>
  );
}

export default ScannerSetupChart;
