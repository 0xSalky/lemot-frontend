"use client";

import type { ThemeTokens } from "@/components/ui/theme-color";
import {
  biasPalette,
  displaySignals,
  formatFlowBiasLabel,
  formatStructureBiasLabel,
  signalSeverityPalette,
  structureBiasPalette,
} from "@/services/footprintUtils";
import type { FootprintPairView } from "@/types/footprintTypes";
import { FOOTPRINT_SIGNAL_SEVERITY_ORDER } from "@/types/footprintTypes";
import { Badge, Flex } from "@chakra-ui/react";

type FootprintOrderflowTagsProps = {
  summary: FootprintPairView["summary"];
  tokens: ThemeTokens;
};

export default function FootprintOrderflowTags({ summary, tokens }: FootprintOrderflowTagsProps) {
  const signals = [...displaySignals(summary)]
    .sort(
      (a, b) =>
        FOOTPRINT_SIGNAL_SEVERITY_ORDER[a.severity] - FOOTPRINT_SIGNAL_SEVERITY_ORDER[b.severity],
    )
    .slice(0, 3);

  return (
    <Flex
      gap="2"
      flexWrap="wrap"
      px="3"
      py="2"
      mx="-3"
      borderBottomWidth="1px"
      borderColor={tokens.panelBorder}
    >
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
  );
}
