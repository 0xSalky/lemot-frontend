"use client";

import type { ThemeTokens } from "@/components/ui/theme-color";
import {
  displaySignals,
  signalSeverityPalette,
} from "@/services/footprintUtils";
import type { FootprintPairView } from "@/types/footprintTypes";
import { FOOTPRINT_SIGNAL_SEVERITY_ORDER } from "@/types/footprintTypes";
import { Badge, Flex } from "@chakra-ui/react";

type FootprintOrderflowTagsProps = {
  summary: FootprintPairView["summary"];
  tokens: ThemeTokens;
};

function isRedundantHtfSignal(label: string): boolean {
  const lower = label.trim().toLowerCase();
  return lower.includes("htf") && (lower.includes("bullish") || lower.includes("bearish"));
}

export default function FootprintOrderflowTags({ summary, tokens }: FootprintOrderflowTagsProps) {
  const signals = [...displaySignals(summary)]
    .filter((signal) => !isRedundantHtfSignal(signal.label))
    .sort(
      (a, b) =>
        FOOTPRINT_SIGNAL_SEVERITY_ORDER[a.severity] - FOOTPRINT_SIGNAL_SEVERITY_ORDER[b.severity],
    )
    .slice(0, 3);

  if (signals.length === 0) {
    return null;
  }

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
