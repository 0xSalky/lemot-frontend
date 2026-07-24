"use client";

import FootprintPairChart, {
  FOOTPRINT_CHART_TOTAL_HEIGHT,
} from "@/components/3_organisms/FootprintPairChart/FootprintPairChart";
import ScannerSetupChart, {
  SETUP_CHART_HEIGHT,
} from "@/components/3_organisms/ScannerSetupChart/ScannerSetupChart";
import type { ThemeTokens } from "@/components/ui/theme-color";
import { hasOrderflowData, hasRealOhlc } from "@/services/footprintUtils";
import { chartRevisionKey, type ScannerProfile } from "@/services/scannerUtils";
import {
  FOOTPRINT_PROFILE_DEFAULTS,
  resolveFootprintProfile,
  type FootprintPairView,
  type FootprintTimeframe,
} from "@/types/footprintTypes";
import type { ScannerBandRow, ScannerChartPayload, ScannerChartTimeframe } from "@/types/scannerTypes";
import { Box, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

type DaySetupChartProps = {
  symbol: string;
  price: number;
  bands: ScannerBandRow[];
  tokens: ThemeTokens;
  profile?: ScannerProfile;
  footprintPair?: FootprintPairView | null;
  footprintLoading?: boolean;
  defaultChartTimeframe?: ScannerChartTimeframe;
  defaultFootprintTimeframe?: FootprintTimeframe;
  footprintEnabled?: boolean;
  managedChart?: ScannerChartPayload | null;
  managedChartLoading?: boolean;
  chartRevisionKey?: string;
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
  defaultFootprintTimeframe,
  footprintEnabled = true,
  managedChart,
  managedChartLoading,
  chartRevisionKey: chartRevisionKeyProp,
}: DaySetupChartProps) {
  const footprintTimeframe =
    defaultFootprintTimeframe ??
    (footprintPair?.chart?.timeframe as FootprintTimeframe | undefined) ??
    FOOTPRINT_PROFILE_DEFAULTS[resolveFootprintProfile(profile)].defaultTimeframe;

  const displayBars = footprintPair?.merged ?? [];
  const resolvedChartRevisionKey =
    chartRevisionKeyProp ?? chartRevisionKey(managedChart);

  const showOrderflow =
    hasOrderflowData(footprintPair) &&
    displayBars.filter(hasRealOhlc).length >= 2;
  const showFootprintLoading = footprintEnabled && footprintLoading;

  if (showFootprintLoading) {
    return <FootprintChartLoading tokens={tokens} />;
  }

  if (showOrderflow && footprintPair) {
    return (
      <DayChartBleed tokens={tokens} minHeight={FOOTPRINT_CHART_HEIGHT}>
        <FootprintPairChart
          bars={displayBars}
          timeframe={footprintTimeframe}
          tokens={tokens}
          bands={bands}
          embedded
          symbol={symbol}
          chartRevisionKey={resolvedChartRevisionKey}
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
        chartRevisionKey={resolvedChartRevisionKey}
      />
    </DayChartBleed>
  );
}
