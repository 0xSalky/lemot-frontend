"use client";

import { computeClosedStats } from "@/components/3_organisms/TradeJournalPanel/journalClosedStats";
import { formatR } from "@/components/3_organisms/TradeJournalPanel/journalFormat";
import type { ThemeTokens } from "@/components/ui/theme-color";
import type { TradeJournalRow } from "@/types/tradeJournalTypes";
import { Box, Flex, Text } from "@chakra-ui/react";

type JournalStatsBarProps = {
  total: number;
  filtered: TradeJournalRow[];
  hasFilters: boolean;
  tokens: ThemeTokens;
};

function pnlUsd(trades: TradeJournalRow[]): number {
  return trades.reduce((sum, trade) => sum + (trade.realized_pnl_usd ?? 0), 0);
}

function avgMarkovPosterior(trades: TradeJournalRow[]): number | null {
  const vals = trades
    .map((t) => t.setup_context?.markov_posterior_pct)
    .filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

function Stat({
  label,
  value,
  tokens,
  accent,
}: {
  label: string;
  value: string;
  tokens: ThemeTokens;
  accent?: string;
}) {
  return (
    <Box textAlign="center" px={{ base: "2", md: "4" }}>
      <Text fontSize="2xs" color={tokens.panelMuted} mb="0.5">
        {label}
      </Text>
      <Text
        fontFamily="mono"
        fontSize={{ base: "md", md: "lg" }}
        fontWeight="semibold"
        color={accent ?? tokens.panelBody}
      >
        {value}
      </Text>
    </Box>
  );
}

export default function JournalStatsBar({
  total,
  filtered,
  hasFilters,
  tokens,
}: JournalStatsBarProps) {
  const stats = computeClosedStats(filtered);
  const pnl = pnlUsd(filtered);
  const avgPosterior = avgMarkovPosterior(filtered);
  const pnlColor =
    pnl > 0 ? tokens.tagGreen.color : pnl < 0 ? tokens.tagRed.color : tokens.panelBody;
  const lowSample = stats.closed_trades > 0 && stats.closed_trades < 20;

  return (
    <Box px="4" py="4" borderBottomWidth="1px" borderColor={tokens.panelBorder}>
      <Flex justify="space-between" align="center" mb="3" flexWrap="wrap" gap="2">
        <Text fontSize="sm" color={tokens.panelHeading}>
          {hasFilters ? (
            <>
              Showing <strong>{stats.closed_trades}</strong> of {total} trades
            </>
          ) : (
            <>
              All <strong>{stats.closed_trades}</strong> trades with setup data
            </>
          )}
        </Text>
        {lowSample ? (
          <Text fontSize="2xs" color={tokens.warn}>
            Small sample — results may not be reliable yet
          </Text>
        ) : null}
      </Flex>

      <Flex
        justify="space-around"
        flexWrap="wrap"
        gap="3"
        py="2"
        rounded="md"
        bg={tokens.blockquoteBg}
        borderWidth="1px"
        borderColor={tokens.panelBorder}
      >
        <Stat label="Trades" value={String(stats.closed_trades)} tokens={tokens} />
        <Stat
          label="Win rate"
          value={stats.win_rate_pct != null ? `${stats.win_rate_pct}%` : "—"}
          tokens={tokens}
        />
        <Stat label="Avg R" value={formatR(stats.avg_r)} tokens={tokens} />
        <Stat label="Total R" value={formatR(stats.total_r)} tokens={tokens} />
        <Stat
          label="PnL"
          value={`$${pnl.toFixed(2)}`}
          tokens={tokens}
          accent={pnlColor}
        />
        {avgPosterior != null ? (
          <Stat
            label="Avg posterior"
            value={`${avgPosterior}%`}
            tokens={tokens}
          />
        ) : null}
      </Flex>
    </Box>
  );
}
