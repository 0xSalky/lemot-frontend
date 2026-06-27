"use client";

import FootprintPairChart, {
  FOOTPRINT_CHART_TOTAL_HEIGHT,
} from "@/components/3_organisms/FootprintPairChart/FootprintPairChart";
import ScannerSetupChart, {
  SETUP_CHART_HEIGHT,
} from "@/components/3_organisms/ScannerSetupChart/ScannerSetupChart";
import type { ThemeTokens } from "@/components/ui/theme-color";
import {
  expectsFootprintSymbol,
  fetchFootprintView,
  hasOrderflowData,
} from "@/services/footprintUtils";
import { scannerSymbolToBase } from "@/services/scannerUtils";
import type { FootprintPairView, FootprintTimeframe } from "@/types/footprintTypes";
import type { ScannerBandRow, ScannerChartPayload, ScannerChartTimeframe } from "@/types/scannerTypes";
import { Box, Text } from "@chakra-ui/react";
import { useCallback, useState, type ReactNode } from "react";

type DaySetupChartProps = {
  symbol: string;
  price: number;
  bands: ScannerBandRow[];
  tokens: ThemeTokens;
  footprintPair?: FootprintPairView | null;
  footprintLoading?: boolean;
  defaultChartTimeframe?: ScannerChartTimeframe;
  /** Day scan only — swing always uses the simple REST chart layout. */
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
  const [fpTimeframe, setFpTimeframe] = useState<FootprintTimeframe>("30m");
  const [altTimeframePair, setAltTimeframePair] = useState<FootprintPairView | null>(null);
  const [fpLoading, setFpLoading] = useState(false);

  const handleFootprintTimeframeChange = useCallback(
    (next: FootprintTimeframe) => {
      setFpTimeframe(next);
      if (next === "30m") {
        setAltTimeframePair(null);
        return;
      }
      setFpLoading(true);
      void fetchFootprintView([base], { profile: "day", timeframe: next })
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
    [base],
  );

  const pairForDisplay = fpTimeframe === "30m" ? footprintPair : altTimeframePair;
  const showOrderflow = hasOrderflowData(pairForDisplay);
  const showFootprintLoading = expectsFootprint && footprintLoading && !showOrderflow;

  if (showFootprintLoading) {
    return <FootprintChartLoading tokens={tokens} />;
  }

  if (showOrderflow && pairForDisplay) {
    return (
      <DayChartBleed tokens={tokens} minHeight={FOOTPRINT_CHART_HEIGHT}>
        <FootprintPairChart
          bars={pairForDisplay.merged}
          timeframe={fpTimeframe}
          onTimeframeChange={handleFootprintTimeframeChange}
          loading={fpLoading}
          refreshCountdownSec={footprintRefreshCountdownSec}
          tokens={tokens}
          bands={bands}
          embedded
          symbol={symbol}
          livePrice={price}
        />
      </DayChartBleed>
    );
  }

  return (
    <DayChartBleed tokens={tokens} minHeight={SIMPLE_CHART_HEIGHT}>
      <ScannerSetupChart
        symbol={symbol}
        price={price}
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
