"use client";

import FootprintPairChart from "@/components/3_organisms/FootprintPairChart/FootprintPairChart";
import ScannerSetupChart from "@/components/3_organisms/ScannerSetupChart/ScannerSetupChart";
import type { ThemeTokens } from "@/components/ui/theme-color";
import {
  biasPalette,
  displaySignals,
  expectsFootprintSymbol,
  fetchFootprintView,
  formatFlowBiasLabel,
  formatStructureBiasLabel,
  hasFootprintData,
  signalSeverityPalette,
  structureBiasPalette,
} from "@/services/footprintUtils";
import { scannerSymbolToBase } from "@/services/scannerUtils";
import type { FootprintPairView, FootprintTimeframe } from "@/types/footprintTypes";
import { FOOTPRINT_SIGNAL_SEVERITY_ORDER } from "@/types/footprintTypes";
import type { ScannerBandRow, ScannerChartTimeframe } from "@/types/scannerTypes";
import { Badge, Box, Flex, Skeleton, Spinner, Stack, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type DaySetupChartProps = {
  symbol: string;
  price: number;
  bands: ScannerBandRow[];
  tokens: ThemeTokens;
  footprintPair?: FootprintPairView | null;
  footprintLoading?: boolean;
  defaultChartTimeframe?: ScannerChartTimeframe;
};

const FOOTPRINT_LOADING_HEIGHTS = [120, 64, 56] as const;

function DayChartBleed({
  children,
  footer,
  tokens,
}: {
  children: ReactNode;
  footer: string;
  tokens: ThemeTokens;
}) {
  return (
    <Box
      mb="3"
      mx="-3"
      mt="-3"
      borderBottomWidth="1px"
      borderColor={tokens.panelBorder}
      overflow="hidden"
    >
      {children}
      <Text px="3" py="2" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
        {footer}
      </Text>
    </Box>
  );
}

function FootprintChartLoading({ base, tokens }: { base: string; tokens: ThemeTokens }) {
  return (
    <DayChartBleed tokens={tokens} footer="30m footprint · loading orderflow…">
      <Flex
        align="center"
        gap="2"
        px="3"
        py="2"
        borderBottomWidth="1px"
        borderColor={tokens.panelBorder}
      >
        <Spinner size="sm" color={tokens.panelHeading} />
        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          Loading {base} footprint chart…
        </Text>
      </Flex>
      <Stack gap="0">
        {FOOTPRINT_LOADING_HEIGHTS.map((height, index) => (
          <Skeleton
            key={height}
            height={`${height}px`}
            rounded="0"
            opacity={0.35 - index * 0.05}
          />
        ))}
      </Stack>
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
}: DaySetupChartProps) {
  const base = scannerSymbolToBase(symbol);
  const expectsFootprint = expectsFootprintSymbol(base);
  const [fpTimeframe, setFpTimeframe] = useState<FootprintTimeframe>("30m");
  const [fpPair, setFpPair] = useState<FootprintPairView | null | undefined>(footprintPair);
  const [fpLoading, setFpLoading] = useState(false);

  useEffect(() => {
    if (fpTimeframe === "30m") {
      setFpPair(footprintPair);
    }
  }, [footprintPair, fpTimeframe]);

  const handleFootprintTimeframeChange = useCallback(
    (next: FootprintTimeframe) => {
      setFpTimeframe(next);
      setFpLoading(true);
      void fetchFootprintView([base], { profile: "day", timeframe: next })
        .then((data) => {
          setFpPair(data.pairs[base] ?? null);
        })
        .catch(() => {
          setFpPair(null);
        })
        .finally(() => {
          setFpLoading(false);
        });
    },
    [base],
  );

  const pairForDisplay = footprintPair ?? fpPair;

  if (expectsFootprint && footprintLoading && !hasFootprintData(pairForDisplay)) {
    return <FootprintChartLoading base={base} tokens={tokens} />;
  }

  if (hasFootprintData(fpPair)) {
    const summary = fpPair!.summary;
    const signals = [...displaySignals(summary)]
      .sort(
        (a, b) =>
          FOOTPRINT_SIGNAL_SEVERITY_ORDER[a.severity] -
          FOOTPRINT_SIGNAL_SEVERITY_ORDER[b.severity],
      )
      .slice(0, 3);

    return (
      <DayChartBleed tokens={tokens} footer={`${fpTimeframe} footprint · orderflow live`}>
        <Flex gap="2" flexWrap="wrap" px="3" py="2">
          <Badge
            colorPalette={structureBiasPalette(summary.structure_bias)}
            variant="solid"
            fontFamily="mono"
            fontSize="2xs"
          >
            {formatStructureBiasLabel(summary.structure_bias, summary.structure_timeframe)}
          </Badge>
          <Badge
            colorPalette={biasPalette(summary.flow_bias ?? summary.bias)}
            variant="outline"
            fontFamily="mono"
            fontSize="2xs"
          >
            {formatFlowBiasLabel(summary.flow_bias ?? summary.bias)}
          </Badge>
          {signals.map((signal) => (
            <Badge
              key={signal.id}
              colorPalette={signalSeverityPalette(signal.severity)}
              variant="subtle"
              fontFamily="mono"
              fontSize="2xs"
            >
              {signal.label}
            </Badge>
          ))}
        </Flex>
        <FootprintPairChart
          bars={fpPair!.merged}
          timeframe={fpTimeframe}
          onTimeframeChange={handleFootprintTimeframeChange}
          loading={fpLoading}
          tokens={tokens}
          bands={bands}
          embedded
          symbol={symbol}
        />
      </DayChartBleed>
    );
  }

  return (
    <DayChartBleed
      tokens={tokens}
      footer={`${defaultChartTimeframe} chart · no footprint data`}
    >
      <ScannerSetupChart
        symbol={symbol}
        price={price}
        bands={bands}
        tokens={tokens}
        defaultTimeframe={defaultChartTimeframe}
        embedded
      />
    </DayChartBleed>
  );
}
