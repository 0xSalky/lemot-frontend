"use client";

import type { ThemeTokens } from "@/components/ui/theme-color";
import type { RiskDeskBookView, RiskDeskPayload } from "@/types/riskDeskTypes";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";

function formatR(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

function slotColor(tokens: ThemeTokens, side: string | undefined, filled: boolean): string {
  if (!filled) return tokens.panelBorder;
  if (side === "long") return tokens.tagGreen.color;
  if (side === "short") return tokens.tagRed.color;
  return tokens.tagAccent.color;
}

export default function CapacityGaugeCore({
  book,
  tokens,
  title = "Slot occupancy",
}: {
  book: RiskDeskBookView | RiskDeskPayload;
  tokens: ThemeTokens;
  title?: string;
}) {
  const max = book.max_open_trades;
  const slots = max > 0 ? max : Math.max(book.slots_used, 3);
  const alien = tokens.tagAccent.color;
  const fillPct = max > 0 ? Math.min(100, Math.round(book.fill_ratio * 100)) : 0;
  const accent =
    book.slots_used >= max && max > 0 ? tokens.tagRed.color : tokens.tagGreen.color;

  return (
    <Box
      position="relative"
      overflow="hidden"
      borderWidth="1px"
      borderColor={tokens.panelBorder}
      bg={`linear-gradient(180deg, ${tokens.blockquoteBg} 0%, ${tokens.panelBg} 100%)`}
      rounded="sm"
      px="3"
      py="3"
      boxShadow={`0 0 16px ${accent}18`}
    >
      <Box
        position="absolute"
        inset="0"
        pointerEvents="none"
        opacity={0.05}
        backgroundImage={`linear-gradient(${alien}33 1px, transparent 1px), linear-gradient(90deg, ${alien}33 1px, transparent 1px)`}
        backgroundSize="18px 18px"
      />

      <Stack gap="3" position="relative" zIndex={1}>
        <Flex justify="space-between" align="center" fontFamily="mono" fontSize="2xs" flexWrap="wrap" gap="2">
          <Text color={tokens.panelLabel} letterSpacing="0.12em" textTransform="uppercase">
            {title}
          </Text>
          <Text color={accent} fontWeight="bold">
            {book.slots_used}/{max > 0 ? max : "∞"}
          </Text>
        </Flex>

        <Flex gap="2px" h="4px" rounded="full" overflow="hidden" bg={tokens.blockquoteBg}>
          {Array.from({ length: slots }).map((_, index) => {
            const pos = book.positions[index];
            const filled = Boolean(pos);
            const side = pos?.side?.toLowerCase();
            const color = slotColor(tokens, side, filled);
            return (
              <Box
                key={`cap-seg-${index}`}
                flex="1"
                bg={filled ? color : tokens.panelBorder}
                opacity={filled ? 0.95 : 0.3}
                boxShadow={filled ? `0 0 6px ${color}` : undefined}
              />
            );
          })}
        </Flex>

        <Flex gap="2" flexWrap="wrap">
          {Array.from({ length: slots }).map((_, index) => {
            const pos = book.positions[index];
            const filled = Boolean(pos);
            const side = pos?.side?.toLowerCase();
            const color = slotColor(tokens, side, filled);
            return (
              <Flex
                key={`cap-slot-${index}`}
                flex="1"
                minW="5.5rem"
                align="center"
                gap="2"
                px="2"
                py="1.5"
                borderWidth="1px"
                borderColor={filled ? color : tokens.panelBorder}
                borderStyle={filled ? "solid" : "dashed"}
                rounded="sm"
                bg={filled ? `${color}12` : "transparent"}
                fontFamily="mono"
                fontSize="2xs"
              >
                <Box
                  w="0.45rem"
                  h="0.45rem"
                  rounded="full"
                  bg={filled ? color : "transparent"}
                  borderWidth="1px"
                  borderColor={color}
                  boxShadow={filled ? `0 0 6px ${color}` : undefined}
                  flexShrink={0}
                />
                {filled && pos ? (
                  <Stack gap="0" minW="0">
                    <Text color={color} fontWeight="bold" lineHeight="1.2" truncate>
                      {pos.symbol}
                    </Text>
                    <Text color={tokens.panelMuted} lineHeight="1.2">
                      {side?.toUpperCase() ?? "—"} · {formatR(pos.r_multiple)}
                      {pos.target_tp_rr != null ? ` → ${pos.target_tp_rr}R` : ""}
                    </Text>
                  </Stack>
                ) : (
                  <Text color={tokens.panelMuted} letterSpacing="0.08em">
                    EMPTY
                  </Text>
                )}
              </Flex>
            );
          })}
        </Flex>

        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          {max > 0 ? (
            <>
              {book.slots_used} / {max} slots · {book.slots_free ?? 0} free · {fillPct}% load
            </>
          ) : (
            <>unlimited capacity · {book.slots_used} open</>
          )}
        </Text>
      </Stack>
    </Box>
  );
}
