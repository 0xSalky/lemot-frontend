"use client";

import type { ReactNode } from "react";
import type { TradeJournalBandLevel } from "@/types/tradeJournalTypes";
import type { ThemeTokens } from "@/components/ui/theme-color";
import { Box, Flex, Text } from "@chakra-ui/react";

function formatLevelTypeName(levelType: string | null | undefined): string {
  const raw = String(levelType ?? "level").trim();
  if (!raw) return "level";
  const lower = raw.toLowerCase();
  if (lower === "vwap") return "vWAP";
  if (lower.startsWith("vwap_")) return `vWAP_${lower.slice(5)}`;
  if (lower.startsWith("anchor_vwap")) return raw.replace(/vwap/i, "vWAP");
  return raw;
}

export function formatLevelLabel(level: TradeJournalBandLevel): string {
  const name = formatLevelTypeName(level.level_type);
  const tf = level.timeframe?.trim();
  return tf ? `${name} · ${tf}` : name;
}

export function formatLevelNameOnly(level: TradeJournalBandLevel): string {
  return formatLevelTypeName(level.level_type);
}

export function bandLevelsSummary(levels: TradeJournalBandLevel[] | undefined): string | null {
  if (!levels?.length) return null;
  return levels.map(formatLevelLabel).join(" · ");
}

export function BandLevelsInline({
  levels,
  tokens,
  maxItems = 8,
}: {
  levels?: TradeJournalBandLevel[];
  tokens: ThemeTokens;
  maxItems?: number;
}) {
  if (!levels?.length) return null;

  const shown = levels.slice(0, maxItems);
  const extra = levels.length - shown.length;
  const accent = tokens.tagAccent.color;

  return (
    <Flex gap="1" flexWrap="wrap" fontFamily="mono" fontSize="2xs" lineHeight="1.35">
      {shown.map((level, i) => (
        <Box
          as="span"
          key={`${level.level_type}-${level.timeframe}-${i}`}
          px="1.5"
          py="0.5"
          borderWidth="1px"
          borderColor={level.is_anchor ? `${accent}55` : tokens.panelBorder}
          bg={level.is_anchor ? `${accent}12` : tokens.blockquoteBg}
          rounded="sm"
          title={formatLevelLabel(level)}
        >
          <Box as="span" color={level.is_anchor ? accent : tokens.panelHeading} fontWeight="semibold">
            {formatLevelNameOnly(level)}
          </Box>
          {level.timeframe ? (
            <Box as="span" color={tokens.panelMuted} ml="1">
              {level.timeframe}
            </Box>
          ) : null}
        </Box>
      ))}
      {extra > 0 ? (
        <Box as="span" color={tokens.panelMuted} alignSelf="center">
          +{extra}
        </Box>
      ) : null}
    </Flex>
  );
}

export default function BandLevelsTip({
  levels,
  bandSide,
  bandRange,
  tokens,
  children,
}: {
  levels?: TradeJournalBandLevel[];
  bandSide?: string | null;
  bandRange?: string | null;
  tokens: ThemeTokens;
  children: ReactNode;
}) {
  const summary = bandLevelsSummary(levels);
  const title = summary
    ? `Band levels: ${summary}`
    : bandSide || bandRange
      ? `Band: ${bandSide ?? ""} ${bandRange ?? ""}`.trim()
      : undefined;

  if (!title) return <>{children}</>;

  return (
    <Box
      as="span"
      position="relative"
      display="inline-flex"
      alignItems="center"
      title={title}
      cursor="help"
      _hover={{ color: tokens.tagAccent.color }}
      transition="color 0.15s"
    >
      {children}
      {summary ? (
        <Box
          as="span"
          ml="1"
          fontSize="2xs"
          color={tokens.panelMuted}
          opacity={0.7}
        >
          ⓘ
        </Box>
      ) : null}
    </Box>
  );
}

export function BandLevelsExpanded({
  levels,
  tokens,
}: {
  levels?: TradeJournalBandLevel[];
  tokens: ThemeTokens;
}) {
  if (!levels?.length) return null;
  return (
    <Box
      mt="1"
      px="2"
      py="1.5"
      borderWidth="1px"
      borderColor={`${tokens.tagAccent.color}33`}
      bg={`${tokens.tagAccent.color}08`}
      rounded="sm"
    >
      <Text fontFamily="mono" fontSize="2xs" color={tokens.panelLabel} letterSpacing="0.1em" mb="1">
        BAND LEVELS
      </Text>
      <Box as="ul" listStyleType="none" m="0" p="0">
        {levels.map((level, i) => (
          <Text
            as="li"
            key={`${level.level_type}-${level.timeframe}-${i}`}
            fontFamily="mono"
            fontSize="2xs"
            color={tokens.panelBody}
            py="0.5"
          >
            <Box as="span" color={tokens.tagAccent.color} fontWeight="semibold">
              {formatLevelNameOnly(level)}
            </Box>
            {level.timeframe ? (
              <Box as="span" color={tokens.panelMuted} ml="1">
                {level.timeframe}
              </Box>
            ) : null}
            {level.is_anchor ? (
              <Box as="span" color={tokens.panelMuted} ml="1">
                anchor
              </Box>
            ) : null}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
