"use client";

import BandLevelsTip, { BandLevelsInline } from "@/components/3_organisms/TradeJournalPanel/BandLevelsTip";
import { tradeOutcome } from "@/components/3_organisms/TradeJournalPanel/journalClosedStats";
import {
  formatPresetLabel,
  formatPrice,
  formatR,
  formatShortDate,
  formatShortDateTime,
} from "@/components/3_organisms/TradeJournalPanel/journalFormat";
import { ProfileLetter } from "@/components/3_organisms/TradeJournalPanel/profileBadge";
import type { ThemeTokens } from "@/components/ui/theme-color";
import type { TradeJournalRow } from "@/types/tradeJournalTypes";
import { Box, Flex, Grid, Stack, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useMemo, useState } from "react";

const scanLine = keyframes`
  0% { transform: translateX(-100%); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateX(200%); opacity: 0; }
`;

type SortKey = "date" | "r" | "symbol";

function rColor(tokens: ThemeTokens, value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return tokens.panelMuted;
  if (value > 0) return tokens.tagGreen.color;
  if (value < 0) return tokens.tagRed.color;
  return tokens.panelBody;
}

function outcomeStyle(
  outcome: ReturnType<typeof tradeOutcome>,
  tokens: ThemeTokens,
): { bg: string; color: string; border: string; label: string } {
  if (outcome === "win") return { ...tokens.tagGreen, label: "WIN" };
  if (outcome === "loss") return { ...tokens.tagRed, label: "LOSS" };
  if (outcome === "breakeven") return { ...tokens.tagNeutral, label: "BE" };
  return { ...tokens.tagBlue, label: "—" };
}

function TradeCard({
  trade,
  index,
  tokens,
  expanded,
  onToggle,
}: {
  trade: TradeJournalRow;
  index: number;
  tokens: ThemeTokens;
  expanded: boolean;
  onToggle: () => void;
}) {
  const side = trade.side.toLowerCase();
  const sideColor = side === "long" ? tokens.tagGreen.color : tokens.tagRed.color;
  const outcome = outcomeStyle(tradeOutcome(trade), tokens);
  const rVal = trade.r_multiple;
  const alien = tokens.tagAccent.color;
  const riskPctLabel =
    trade.risk_percent != null && Number.isFinite(trade.risk_percent)
      ? `${Number(trade.risk_percent.toFixed(2))}%`
      : null;

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      position="relative"
      overflow="hidden"
      borderWidth="1px"
      borderColor={expanded ? `${outcome.color}88` : tokens.panelBorder}
      bg={index % 2 === 0 ? "transparent" : tokens.blockquoteBg}
      rounded="sm"
      cursor="pointer"
      transition="border-color 0.2s, box-shadow 0.2s"
      _hover={{
        borderColor: `${alien}66`,
        boxShadow: `inset 0 0 32px ${alien}0a`,
      }}
    >
      {expanded ? (
        <Box
          position="absolute"
          top="0"
          left="0"
          w="50%"
          h="1px"
          bg={`linear-gradient(90deg, transparent, ${alien}, transparent)`}
          animation={`${scanLine} 2.5s ease-in-out infinite`}
          pointerEvents="none"
        />
      ) : null}

      <Box display={{ base: "block", md: "none" }}>
        <Stack
          gap="2"
          px="3"
          py="3"
          borderLeftWidth="3px"
          borderLeftColor={sideColor}
        >
          <Flex align="flex-start" justify="space-between" gap="3">
            <Stack gap="0.5" minW="0" flex="1">
              <Flex align="center" gap="2" minW="0">
                <ProfileLetter profile={trade.profile} tokens={tokens} size="xs" />
                <Text
                  fontFamily="mono"
                  fontSize="sm"
                  fontWeight="bold"
                  color={tokens.title}
                  letterSpacing="0.04em"
                  lineHeight="1.2"
                >
                  {trade.base}
                </Text>
                <Text
                  fontFamily="mono"
                  fontSize="2xs"
                  color={sideColor}
                  fontWeight="bold"
                  letterSpacing="0.08em"
                  flexShrink={0}
                >
                  {side.toUpperCase()}
                </Text>
              </Flex>
              <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
                {formatShortDate(trade.closed_at ?? trade.executed_at)}
              </Text>
            </Stack>
            <Stack align="flex-end" gap="1" flexShrink={0}>
              <Text
                fontFamily="mono"
                fontSize="lg"
                fontWeight="bold"
                color={rColor(tokens, rVal)}
                lineHeight="1"
              >
                {formatR(rVal)}
              </Text>
              <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} lineHeight="1">
                {riskPctLabel ? `risk ${riskPctLabel}` : "risk"}
              </Text>
              <Box
                px="1.5"
                py="0.5"
                fontFamily="mono"
                fontSize="2xs"
                fontWeight="bold"
                letterSpacing="0.08em"
                borderWidth="1px"
                borderColor={outcome.border}
                color={outcome.color}
                bg={outcome.bg}
                rounded="sm"
              >
                {outcome.label}
              </Box>
            </Stack>
          </Flex>
          <Flex align="center" gap="1.5" flexWrap="wrap" fontFamily="mono" fontSize="xs">
            <Text color={tokens.panelBody}>{formatPrice(trade.entry_price)}</Text>
            <Text color={tokens.panelMuted} fontSize="2xs">
              →
            </Text>
            <Text color={tokens.panelHeading} fontWeight="semibold">
              {formatPrice(trade.exit_price)}
            </Text>
          </Flex>
          {trade.band_range ? (
            <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} lineClamp={2}>
              <Box as="span" color={alien} fontWeight="semibold">
                {trade.band_side ?? "—"}
              </Box>{" "}
              {trade.band_range}
            </Text>
          ) : null}
        </Stack>
      </Box>

      <Grid
        display={{ base: "none", md: "grid" }}
        templateColumns="minmax(1.75rem,0.2fr) minmax(4.5rem,0.6fr) minmax(3.5rem,0.45fr) minmax(4.5rem,0.55fr) 1fr minmax(3.5rem,0.5fr) minmax(4rem,0.45fr)"
        gap={3}
        alignItems="center"
        px={4}
        py={3}
        borderLeftWidth="3px"
        borderLeftColor={sideColor}
      >
        {/* Profile */}
        <Box textAlign="center">
          <ProfileLetter profile={trade.profile} tokens={tokens} />
        </Box>

        {/* Pair */}
        <Text
          fontFamily="mono"
          fontSize="sm"
          fontWeight="bold"
          color={tokens.title}
          letterSpacing="0.04em"
          lineHeight="1.2"
        >
          {trade.base}
        </Text>

        {/* Side */}
        <Text
          fontFamily="mono"
          fontSize="2xs"
          fontWeight="bold"
          color={sideColor}
          letterSpacing="0.12em"
        >
          {side.toUpperCase()}
        </Text>

        {/* Outcome pill */}
        <Box>
          <Box
            as="span"
            display="inline-block"
            px="2"
            py="0.5"
            fontFamily="mono"
            fontSize="2xs"
            fontWeight="bold"
            letterSpacing="0.1em"
            borderWidth="1px"
            borderColor={outcome.border}
            bg={outcome.bg}
            color={outcome.color}
            rounded="sm"
          >
            {outcome.label}
          </Box>
        </Box>

        {/* Price journey */}
        <Stack gap="0.5" minW="0">
          <Flex align="center" gap="2" flexWrap="wrap">
            <Text fontFamily="mono" fontSize="xs" color={tokens.panelBody}>
              {formatPrice(trade.entry_price)}
            </Text>
            <Text color={tokens.panelMuted} fontSize="2xs">
              →
            </Text>
            <Text fontFamily="mono" fontSize="xs" color={tokens.panelHeading} fontWeight="semibold">
              {formatPrice(trade.exit_price)}
            </Text>
          </Flex>
          {trade.band_range ? (
            <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
              <Box as="span" color={alien} fontWeight="semibold">
                {trade.band_side ?? "—"}
              </Box>{" "}
              {trade.band_range}
            </Text>
          ) : null}
        </Stack>

        {/* R */}
        <Stack gap="0.5" align="center">
          <Text
            fontFamily="mono"
            fontSize="sm"
            fontWeight="semibold"
            color={rColor(tokens, rVal)}
            lineHeight="1"
            textAlign="center"
          >
            {formatR(rVal)}
          </Text>
          <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} lineHeight="1">
            {riskPctLabel ?? "—"}
          </Text>
        </Stack>

        {/* Date */}
        <Text
          fontFamily="mono"
          fontSize="2xs"
          color={tokens.panelMuted}
          textAlign="right"
          whiteSpace="nowrap"
        >
          {formatShortDate(trade.closed_at ?? trade.executed_at)}
        </Text>
      </Grid>

      {expanded ? (
        <Box
          px="4"
          pb="3"
          pt="0"
          borderTopWidth="1px"
          borderColor={`${tokens.panelBorder}`}
          mt="0"
          ml="3"
          fontFamily="mono"
          fontSize="2xs"
          color={tokens.panelMuted}
        >
          <Grid
            templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }}
            gap="3"
            py="2"
          >
            <Stack gap="0">
              <Text color={tokens.panelLabel} letterSpacing="0.08em">STOP</Text>
              <Text color={tokens.panelBody}>{formatPrice(trade.stop_loss_price)}</Text>
            </Stack>
            <Stack gap="0">
              <Text color={tokens.panelLabel} letterSpacing="0.08em">BAND</Text>
              <BandLevelsTip
                levels={trade.band_levels}
                bandSide={trade.band_side}
                bandRange={trade.band_range}
                tokens={tokens}
              >
                <Text color={tokens.panelBody}>
                  {trade.band_side ?? "—"} {trade.band_range ?? "—"}
                </Text>
              </BandLevelsTip>
            </Stack>
            <Stack gap="0">
              <Text color={tokens.panelLabel} letterSpacing="0.08em">PLAN</Text>
              <Text color={tokens.panelBody}>
                {formatPresetLabel(trade.stop_preset)} / {formatPresetLabel(trade.tp_strategy_id)}
              </Text>
            </Stack>
            <Stack gap="0">
              <Text color={tokens.panelLabel} letterSpacing="0.08em">MATCH</Text>
              <Text
                color={
                  trade.match_method === "order_id"
                    ? tokens.tagGreen.color
                    : tokens.panelBody
                }
              >
                {trade.match_method.replace(/_/g, " ")}
              </Text>
            </Stack>
            {trade.setup_grade ? (
              <Stack gap="0">
                <Text color={tokens.panelLabel} letterSpacing="0.08em">GRADE</Text>
                <Text color={alien}>{trade.setup_grade}</Text>
              </Stack>
            ) : null}
            <Stack gap="0">
              <Text color={tokens.panelLabel} letterSpacing="0.08em">RISK</Text>
              <Text color={tokens.panelBody}>
                {riskPctLabel ?? "—"}
                {trade.system_setup_grade
                  ? ` · sys ${trade.system_setup_grade}`
                  : ""}
              </Text>
            </Stack>
            {trade.fractal_level != null ? (
              <Stack gap="0">
                <Text color={tokens.panelLabel} letterSpacing="0.08em">FRACTAL</Text>
                <Text color={tokens.panelBody}>{formatPrice(trade.fractal_level)}</Text>
              </Stack>
            ) : null}
            <Stack gap="0">
              <Text color={tokens.panelLabel} letterSpacing="0.08em">OPENED</Text>
              <Text color={tokens.panelBody}>{formatShortDateTime(trade.executed_at)}</Text>
            </Stack>
            <Stack gap="0">
              <Text color={tokens.panelLabel} letterSpacing="0.08em">CLOSED</Text>
              <Text color={tokens.panelBody}>{formatShortDateTime(trade.closed_at)}</Text>
            </Stack>
          </Grid>
          {trade.band_levels?.length ? (
            <Box mt="2">
              <Text
                fontFamily="mono"
                fontSize="2xs"
                color={tokens.panelLabel}
                letterSpacing="0.1em"
                mb="1.5"
              >
                BAND LEVELS
              </Text>
              <BandLevelsInline levels={trade.band_levels} tokens={tokens} />
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}

export default function JournalTradesTable({
  trades,
  pendingCount = 0,
  tokens,
}: {
  trades: TradeJournalRow[];
  pendingCount?: number;
  tokens: ThemeTokens;
}) {
  const [sort, setSort] = useState<SortKey>("date");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const alien = tokens.tagAccent.color;

  const sorted = useMemo(() => {
    const rows = [...trades];
    if (sort === "r") {
      rows.sort((a, b) => (b.r_multiple ?? -999) - (a.r_multiple ?? -999));
    } else if (sort === "symbol") {
      rows.sort((a, b) => a.base.localeCompare(b.base));
    } else {
      rows.sort((a, b) => {
        const ta = new Date(a.closed_at ?? a.executed_at ?? 0).getTime();
        const tb = new Date(b.closed_at ?? b.executed_at ?? 0).getTime();
        return tb - ta;
      });
    }
    return rows;
  }, [trades, sort]);

  if (trades.length === 0) {
    return (
      <Flex py="10" justify="center" direction="column" align="center" gap="2">
        <Text fontFamily="mono" fontSize="sm" color={tokens.panelMuted}>
          {pendingCount > 0
            ? `No closed trades yet — ${pendingCount} open on Risk Desk.`
            : "No closed trades in journal."}
        </Text>
      </Flex>
    );
  }

  const sortBtn = (key: SortKey, label: string) => (
    <Box
      as="button"
      fontFamily="mono"
      fontSize="2xs"
      letterSpacing="0.1em"
      color={sort === key ? alien : tokens.panelMuted}
      borderBottomWidth={sort === key ? "1px" : "0"}
      borderColor={alien}
      pb="0.5"
      cursor="pointer"
      bg="transparent"
      borderTop="none"
      borderLeft="none"
      borderRight="none"
      onClick={() => setSort(key)}
      _hover={{ color: tokens.panelBody }}
    >
      {label}
    </Box>
  );

  return (
    <Stack gap="0" position="relative">
      <Flex
        px={{ base: 3, md: 4 }}
        py="3"
        borderBottomWidth="1px"
        borderColor={tokens.panelBorder}
        align="center"
        justify="space-between"
        flexWrap="wrap"
        gap="2"
        bg={tokens.tableHeaderBg}
      >
        <Text fontFamily="mono" fontSize="2xs" color={alien} letterSpacing="0.16em">
          ◈ TRADE LOG
        </Text>
        <Flex gap={{ base: 3, md: 4 }}>
          {sortBtn("date", "RECENT")}
          {sortBtn("r", "BY R")}
          {sortBtn("symbol", "A→Z")}
        </Flex>
        <Text
          fontFamily="mono"
          fontSize="2xs"
          color={tokens.panelMuted}
          display={{ base: "none", sm: "block" }}
        >
          {trades.length} closed · tap row for detail
        </Text>
      </Flex>

      <Grid
        display={{ base: "none", md: "grid" }}
        templateColumns="minmax(1.75rem,0.2fr) minmax(4.5rem,0.6fr) minmax(3.5rem,0.45fr) minmax(4.5rem,0.55fr) 1fr minmax(3.5rem,0.5fr) minmax(4rem,0.45fr)"
        gap="3"
        px="4"
        py="2"
        borderBottomWidth="1px"
        borderColor={tokens.panelBorder}
        fontFamily="mono"
        fontSize="2xs"
        color={tokens.tableHeaderColor}
        letterSpacing="0.12em"
      >
        <Text textAlign="center"></Text>
        <Text>PAIR</Text>
        <Text>SIDE</Text>
        <Text>RESULT</Text>
        <Text>ENTRY → EXIT</Text>
        <Text textAlign="center">R</Text>
        <Text textAlign="right">DATE</Text>
      </Grid>

      <Stack gap="1" px={{ base: 1, md: 2 }} py="2">
        {sorted.map((trade, index) => {
          const rowKey = `${trade.journal_id ?? "x"}-${trade.base}-${trade.closed_at ?? index}`;
          return (
            <TradeCard
              key={rowKey}
              trade={trade}
              index={index}
              tokens={tokens}
              expanded={expandedKey === rowKey}
              onToggle={() =>
                setExpandedKey((prev) => (prev === rowKey ? null : rowKey))
              }
            />
          );
        })}
      </Stack>
    </Stack>
  );
}
