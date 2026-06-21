"use client";

import {
  SCANNER_CHART_TIMEFRAMES,
  type ScannerBandRow,
  type ScannerChartPayload,
  type ScannerChartTimeframe,
} from "@/types/scannerTypes";
import { fetchScannerChart, formatLevelPrice, SCANNER_CHART_REFRESH_MS } from "@/services/scannerUtils";
import type { ThemeTokens } from "@/components/ui/theme-color";
import { Box, Flex, NativeSelect, Text } from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";

const CHART_HEIGHT = 168;
const CHART_REFRESH_MS = SCANNER_CHART_REFRESH_MS;
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
};

function computeChartBounds(
  candles: ScannerChartPayload["candles"],
  spot: number,
): [number, number] {
  const closes = candles.map((c) => c.close);
  const rawMin = Math.min(...closes, spot);
  const rawMax = Math.max(...closes, spot);
  const span = Math.max(rawMax - rawMin, rawMin * 0.004, 1e-12);
  const pad = span * 0.04;
  return [rawMin - pad, rawMax + pad];
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

function formatRefreshCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ScannerSetupChart({
  symbol,
  price,
  bands,
  tokens,
  defaultTimeframe = "1h",
  embedded = false,
}: ScannerSetupChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nextRefreshAtRef = useRef(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [timeframe, setTimeframe] = useState<ScannerChartTimeframe>(defaultTimeframe);
  const [zoomStep, setZoomStep] = useState(0);
  const [refreshCountdownSec, setRefreshCountdownSec] = useState(
    Math.ceil(CHART_REFRESH_MS / 1000),
  );
  const [fetchState, setFetchState] = useState<ChartFetchState>({
    key: "",
    status: "error",
    chart: null,
    error: null,
  });

  const fetchKey = `${symbol}|${timeframe}`;
  const loading = fetchState.key !== fetchKey;
  const chart = fetchState.key === fetchKey ? fetchState.chart : null;
  const error = fetchState.key === fetchKey ? fetchState.error : null;

  useEffect(() => {
    setTimeframe(defaultTimeframe);
  }, [defaultTimeframe]);

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
    let cancelled = false;
    const totalSec = Math.ceil(CHART_REFRESH_MS / 1000);

    const resetRefreshDeadline = () => {
      nextRefreshAtRef.current = Date.now() + CHART_REFRESH_MS;
      setRefreshCountdownSec(totalSec);
    };

    resetRefreshDeadline();

    const loadChart = (background: boolean) => {
      void fetchScannerChart(symbol, timeframe, { bustCache: background })
        .then((payload) => {
          if (cancelled) return;
          if (!payload) {
            if (!background) {
              setFetchState({
                key: fetchKey,
                status: "error",
                chart: null,
                error: "Chart unavailable",
              });
            }
            return;
          }
          setFetchState({
            key: fetchKey,
            status: "ready",
            chart: payload,
            error: null,
          });
          resetRefreshDeadline();
        })
        .catch(() => {
          if (!cancelled && !background) {
            setFetchState({
              key: fetchKey,
              status: "error",
              chart: null,
              error: "Chart unavailable",
            });
          }
        });
    };

    loadChart(false);

    const refreshId = window.setInterval(() => {
      resetRefreshDeadline();
      loadChart(true);
    }, CHART_REFRESH_MS);

    const tickId = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((nextRefreshAtRef.current - Date.now()) / 1000),
      );
      setRefreshCountdownSec(remaining);
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshId);
      window.clearInterval(tickId);
    };
  }, [fetchKey, symbol, timeframe]);

  const chartWidth = Math.max(containerWidth, 280);

  const plot = useMemo(() => {
    if (!chart?.candles?.length || chartWidth <= 0) return null;

    const zoomScale = zoomScaleFromStep(zoomStep);
    const candles = chart.candles;
    const spotPrice = candles[candles.length - 1]?.close ?? price;
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

    const offscreenAbove = bands
      .filter((b) => Math.min(b.low, b.high) > maxPrice)
      .sort((a, b) => Math.min(a.low, a.high) - Math.min(b.low, b.high))
      .slice(0, 2);

    const offscreenBelow = bands
      .filter((b) => Math.max(b.low, b.high) < minPrice)
      .sort((a, b) => Math.max(b.low, b.high) - Math.max(a.low, a.high))
      .slice(0, 2);

    const spotY = yAt(spotPrice);
    const lastX = xAt(visibleCandles.length - 1);
    const lastY = yAt(spotPrice);

    return {
      closePoints,
      bandRects,
      offscreenAbove,
      offscreenBelow,
      spotY,
      spotPrice,
      innerW,
      lastX,
      lastY,
    };
  }, [bands, chart, chartWidth, price, zoomStep]);

  return (
    <Box
      mb={embedded ? 0 : "3"}
      mx={embedded ? 0 : "-3"}
      mt={embedded ? 0 : "-3"}
      borderBottomWidth={embedded ? 0 : "1px"}
      borderColor={tokens.panelBorder}
      overflow="hidden"
    >
      <Box px="3" py="2" borderBottomWidth="1px" borderColor={tokens.panelBorder}>
        <Flex align="center" justify="space-between" gap="2">
          <Text fontFamily="mono" fontSize="2xs" color={tokens.panelLabel}>
            {timeframe} close · nearby bands
          </Text>
          <Flex align="center" gap="1.5">
            <Text
              fontFamily="mono"
              fontSize="2xs"
              color={tokens.panelMuted}
              title="Next chart refresh"
            >
              {formatRefreshCountdown(refreshCountdownSec)}
            </Text>
            <NativeSelect.Root
              size="xs"
              width={{ base: "2.1rem", md: "2.5rem" }}
              minW={{ base: "2.1rem", md: "2.5rem" }}
            >
              <NativeSelect.Field
                className="chart-tf-select"
                value={timeframe}
                fontFamily="mono"
                fontSize={{ base: "10px", md: "2xs" }}
                h={{ base: "1.2rem", md: "1.35rem" }}
                minH={{ base: "1.2rem", md: "1.35rem" }}
                py="0"
                px="1"
                bg={tokens.panelBgUser}
                borderColor={tokens.panelBorder}
                onChange={(e) => {
                  const next = e.currentTarget.value;
                  if ((SCANNER_CHART_TIMEFRAMES as readonly string[]).includes(next)) {
                    setTimeframe(next as ScannerChartTimeframe);
                    setZoomStep(0);
                  }
                }}
              >
                {SCANNER_CHART_TIMEFRAMES.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
          </Flex>
        </Flex>
      </Box>

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
            <Flex
              position="absolute"
              top="2"
              left="2"
              zIndex={4}
              gap="1"
            >
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

            {plot.offscreenAbove.length > 0 ? (
              <Box
                position="absolute"
                top="1"
                right="2"
                zIndex={2}
                display="flex"
                flexDirection="column"
                alignItems="flex-end"
                gap="0.5"
                pointerEvents="none"
              >
                {plot.offscreenAbove.map((band) => (
                  <Text
                    key={`above-${band.low}-${band.high}`}
                    fontFamily="mono"
                    fontSize="2xs"
                    color={tokens.tagRed.color}
                  >
                    RES {formatLevelPrice(Math.min(band.low, band.high))}
                  </Text>
                ))}
              </Box>
            ) : null}

            {plot.offscreenBelow.length > 0 ? (
              <Box
                position="absolute"
                bottom="1"
                right="2"
                zIndex={2}
                display="flex"
                flexDirection="column"
                alignItems="flex-end"
                gap="0.5"
                pointerEvents="none"
              >
                {plot.offscreenBelow.map((band) => (
                  <Text
                    key={`below-${band.low}-${band.high}`}
                    fontFamily="mono"
                    fontSize="2xs"
                    color={tokens.tagGreen.color}
                  >
                    SUP {formatLevelPrice(Math.max(band.low, band.high))}
                  </Text>
                ))}
              </Box>
            ) : null}

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
                preserveAspectRatio="none"
                style={{
                  display: "block",
                  width: "100%",
                  height: CHART_HEIGHT,
                }}
                role="img"
                aria-label={`${timeframe} price chart for ${symbol} with HTF bands`}
              >
                <line
                  x1={PAD_X}
                  x2={chartWidth - PAD_X}
                  y1={plot.spotY}
                  y2={plot.spotY}
                  stroke="currentColor"
                  strokeWidth="0.75"
                  strokeDasharray="3 4"
                  opacity={0.45}
                />

                <polyline
                  points={plot.closePoints}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={0.95}
                />

                <circle
                  cx={plot.lastX}
                  cy={plot.lastY}
                  r="2.5"
                  fill="currentColor"
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
