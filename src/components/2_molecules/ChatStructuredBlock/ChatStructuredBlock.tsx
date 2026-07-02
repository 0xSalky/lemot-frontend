"use client";

import type { ScannerChatStructuredBlock } from "@/types/scannerChatTypes";
import { formatLevelPrice, scannerSymbolToBase } from "@/services/scannerUtils";
import type { ThemeTokens } from "@/components/ui/theme-color";
import { Box, Stack, Text } from "@chakra-ui/react";

const MONO = {
  fontFamily: "mono",
  fontSize: "2xs",
  lineHeight: "1.65",
} as const;

type ChatStructuredBlockProps = {
  structured: ScannerChatStructuredBlock | null | undefined;
  tokens: ThemeTokens;
  profile?: "a" | "b" | null;
};

const ChatStructuredBlock = ({ structured, tokens, profile }: ChatStructuredBlockProps) => {
  const setups = structured?.setups;
  if (!Array.isArray(setups) || setups.length === 0) return null;

  const edgeLabel = profile === "a" ? "Orderflow read" : "Funding edge";

  return (
    <Stack gap="2" mb="3">
      {setups.map((setup, idx) => {
        const base = setup.symbol ? scannerSymbolToBase(setup.symbol) : `#${idx + 1}`;
        const band = setup.ai_best_band;
        const bandLine =
          band?.side && band.price_low != null && band.price_high != null
            ? `${band.side} ${formatLevelPrice(Number(band.price_high))}–${formatLevelPrice(Number(band.price_low))}` +
              (band.dist_pct != null ? ` · dist ${Number(band.dist_pct).toFixed(2)}%` : "")
            : null;

        return (
          <Box
            key={`${base}-${idx}`}
            px="2.5"
            py="2"
            rounded="sm"
            borderWidth="1px"
            borderColor={tokens.panelBorder}
            bg={tokens.blockquoteBg}
          >
            <Text {...MONO} color={tokens.panelHeading} fontWeight="semibold" mb="1">
              ${base} · structured
            </Text>
            {bandLine ? (
              <Text {...MONO} color={tokens.panelBody} mb="1">
                Nearest band: {bandLine}
              </Text>
            ) : null}
            {setup.ai_opportunity_notes ? (
              <Text {...MONO} color={tokens.panelBody} mb="1">
                {edgeLabel}: {setup.ai_opportunity_notes}
              </Text>
            ) : null}
            {setup.ai_invalidation ? (
              <Text {...MONO} color={tokens.panelMuted}>
                Invalidation: {setup.ai_invalidation}
              </Text>
            ) : null}
          </Box>
        );
      })}
    </Stack>
  );
};

export default ChatStructuredBlock;
