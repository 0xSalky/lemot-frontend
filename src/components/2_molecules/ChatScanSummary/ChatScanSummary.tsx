"use client";

import type { ScannerChatScanSummary } from "@/types/scannerChatTypes";
import { formatLevelPrice, scannerProfileLabel } from "@/services/scannerUtils";
import type { ThemeTokens } from "@/components/ui/theme-color";
import { Text } from "@chakra-ui/react";

function formatSummaryLine(row: ScannerChatScanSummary): string {
  const profile = scannerProfileLabel(row.profile);
  const bias = (row.bias ?? "—").toString().toUpperCase();
  const nearest = row.nearest_band;
  if (!nearest?.side) {
    return `${profile} · $${row.base} · ${bias} · no band`;
  }
  const dist =
    nearest.dist_pct != null && Number.isFinite(Number(nearest.dist_pct))
      ? `${Number(nearest.dist_pct).toFixed(2)}%`
      : "—";
  const low = nearest.price_low != null ? formatLevelPrice(Number(nearest.price_low)) : "—";
  const high = nearest.price_high != null ? formatLevelPrice(Number(nearest.price_high)) : "—";
  return `${profile} · $${row.base} · ${bias} · ${nearest.side} ${low}–${high} · dist ${dist}`;
}

type ChatScanSummaryProps = {
  summaries: ScannerChatScanSummary[];
  tokens: ThemeTokens;
};

const ChatScanSummary = ({ summaries, tokens }: ChatScanSummaryProps) => {
  if (!summaries.length) return null;

  return (
    <Text
      fontFamily="mono"
      fontSize="2xs"
      lineHeight="1.6"
      color={tokens.panelLabel}
      mb="2"
      whiteSpace="pre-wrap"
    >
      {summaries.map((row) => formatSummaryLine(row)).join("\n")}
    </Text>
  );
};

export default ChatScanSummary;
