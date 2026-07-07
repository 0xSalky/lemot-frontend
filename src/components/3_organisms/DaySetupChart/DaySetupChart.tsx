"use client";

import FootprintPairChart, {
  FOOTPRINT_CHART_TOTAL_HEIGHT,
} from "@/components/3_organisms/FootprintPairChart/FootprintPairChart";
import ScannerSetupChart, {
  SETUP_CHART_HEIGHT,
} from "@/components/3_organisms/ScannerSetupChart/ScannerSetupChart";
import type { ThemeTokens } from "@/components/ui/theme-color";
import {
  applyLivePriceToMergedBars,
  expectsFootprintSymbol,
  fetchFootprintView,
  hasOrderflowData,
  hasRealOhlc,
  overlayExchangeOhlcOnMerged,
} from "@/services/footprintUtils";
import { scannerSymbolToBase, chartSpotPrice, type ScannerProfile } from "@/services/scannerUtils";
import {
  FOOTPRINT_PROFILE_DEFAULTS,
  type FootprintPairView,
  type FootprintTimeframe,
} from "@/types/footprintTypes";
import type { ScannerBandRow, ScannerChartPayload, ScannerChartTimeframe } from "@/types/scannerTypes";
import { Box, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

type DaySetupChartProps = {
  symbol: string;
  price: number;
  bands: ScannerBandRow[];
  tokens: ThemeTokens;
  profile?: ScannerProfile;
  footprintPair?: FootprintPairView | null;
  footprintLoading?: boolean;
  defaultChartTimeframe?: ScannerChartTimeframe;
  /** When true, try footprint/orderflow chart first for tracked symbols (day + swing). */
  footprintEnabled?: boolean;
  footprintRefreshCountdownSec?: number;
  managedChart?: ScannerChartPayload | null;
  managedChartLoading?: boolean;
  managedRefreshCountdownSec?: number;
};

const FOOTPRINT_CHART_HEIGHT = FOOTPRINT_CHART_TOTAL_HEIGHT;
const SIMPLE_CHART_HEIGHT = SETUP_CHART_HEIGHT;

function DayChartBleed({
  children,
  tokens,
  minHeight,
}: {
  children: ReactNode;
  tokens: ThemeTokens;
  minHeight?: number;
}) {
  return (
    <Box
      mb="3"
      mx="-3"
      borderBottomWidth="1px"
      borderColor={tokens.panelBorder}
      overflow="hidden"
      minH={minHeight != null ? `${minHeight}px` : undefined}
    >
      {children}
    </Box>
  );
}

function FootprintChartLoading({ tokens }: { tokens: ThemeTokens }) {
  return (
    <DayChartBleed tokens={tokens} minHeight={FOOTPRINT_CHART_HEIGHT}>
      <Box
        h={`${FOOTPRINT_CHART_HEIGHT}px`}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          Loading footprint…
        </Text>
      </Box>
    </DayChartBleed>
  );
}

export default function DaySetupChart({
  symbol,
  price,
  bands,
  tokens,
  profile = "a",
  footprintPair,
  footprintLoading = false,
  defaultChartTimeframe = "30m",
  footprintEnabled = true,
  footprintRefreshCountdownSec,
  managedChart,
  managedChartLoading,
  managedRefreshCountdownSec,
}: DaySetupChartProps) {
  const base = scannerSymbolToBase(symbol);
  const expectsFootprint = footprintEnabled && expectsFootprintSymbol(base);
  const defaultFootprintTimeframe = FOOTPRINT_PROFILE_DEFAULTS[profile].defaultTimeframe;
  const [fpTimeframe, setFpTimeframe] = useState<FootprintTimeframe>(defaultFootprintTimeframe);
  const [altTimeframePair, setAltTimeframePair] = useState<FootprintPairView | null>(null);
  const [fpLoading, setFpLoading] = useState(false);

  useEffect(() => {
    setFpTimeframe(defaultFootprintTimeframe);
    setAltTimeframePair(null);
  }, [defaultFootprintTimeframe, symbol]);

  const handleFootprintTimeframeChange = useCallback(
    (next: FootprintTimeframe) => {
      setFpTimeframe(next);
      if (next === defaultFootprintTimeframe) {
        setAltTimeframePair(null);
        return;
      }
      setFpLoading(true);
      void fetchFootprintView([base], { profile, timeframe: next })
        .then((data) => {
          setAltTimeframePair(data.pairs[base] ?? null);
        })
        .catch(() => {
          setAltTimeframePair(null);
        })
        .finally(() => {
          setFpLoading(false);
        });
    },
    [base, defaultFootprintTimeframe, profile],
  );

  const pairForDisplay =
    fpTimeframe === defaultFootprintTimeframe ? footprintPair : altTimeframePair;

  const liveChart = managedChart ?? pairForDisplay?.chart ?? null;
  const exchangeCandles = managedChart?.candles ?? pairForDisplay?.chart?.candles ?? [];

  const displayBars = useMemo(() => {
    const overlaid = overlayExchangeOhlcOnMerged(
      pairForDisplay?.merged ?? [],
      exchangeCandles,
      fpTimeframe,
    );
    const spot = chartSpotPrice(liveChart, price);
    return applyLivePriceToMergedBars(overlaid, spot);
  }, [exchangeCandles, fpTimeframe, liveChart, pairForDisplay?.merged, price]);

  const showOrderflow =
    hasOrderflowData(pairForDisplay) &&
    displayBars.filter(hasRealOhlc).length >= 2;
  const showFootprintLoading = expectsFootprint && footprintLoading && !showOrderflow;
  const footprintSpotPrice = chartSpotPrice(liveChart, price);
  const restSpotPrice = chartSpotPrice(managedChart, price);

  if (showFootprintLoading) {
    return <FootprintChartLoading tokens={tokens} />;
  }

  if (showOrderflow && pairForDisplay) {
    return (
      <DayChartBleed tokens={tokens} minHeight={FOOTPRINT_CHART_HEIGHT}>
        <FootprintPairChart
          bars={displayBars}
          timeframe={fpTimeframe}
          onTimeframeChange={handleFootprintTimeframeChange}
          loading={fpLoading}
          refreshCountdownSec={footprintRefreshCountdownSec}
          tokens={tokens}
          bands={bands}
          embedded
          symbol={symbol}
          livePrice={footprintSpotPrice}
        />
      </DayChartBleed>
    );
  }

  return (
    <DayChartBleed tokens={tokens} minHeight={SIMPLE_CHART_HEIGHT}>
      <ScannerSetupChart
        symbol={symbol}
        price={restSpotPrice}
        bands={bands}
        tokens={tokens}
        defaultTimeframe={defaultChartTimeframe}
        embedded
        managedChart={managedChart}
        managedChartLoading={managedChartLoading}
        managedRefreshCountdownSec={managedRefreshCountdownSec}
      />
    </DayChartBleed>
  );
}
