"use client";

import JournalGrowthChart from "@/components/3_organisms/TradeJournalPanel/JournalGrowthChart";
import {
  computeClosedStats,
  type ClosedHistoryStats,
} from "@/components/3_organisms/TradeJournalPanel/journalClosedStats";
import { formatR } from "@/components/3_organisms/TradeJournalPanel/journalFormat";
import { PairLabel } from "@/components/3_organisms/TradeJournalPanel/profileBadge";
import type { ThemeTokens } from "@/components/ui/theme-color";
import type { TradeJournalGrowth, TradeJournalRow } from "@/types/tradeJournalTypes";
import { Box, Flex, Grid, Stack, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useMemo } from "react";

const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

function WinRing({
  pct,
  accent,
  mutedColor,
  size = 140,
  stroke = 7,
  label = "WIN RATE",
}: {
  pct: number | null;
  accent: string;
  mutedColor: string;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fill = pct != null ? Math.min(100, Math.max(0, pct)) : 0;
  const dash = (fill / 100) * c;
  const pctFontSize = size >= 130 ? "4xl" : size >= 90 ? "xl" : "md";

  return (
    <Stack align="center" gap="1.5" flexShrink={0}>
      <Box position="relative" w={`${size}px`} h={`${size}px`}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={mutedColor}
            strokeWidth={stroke}
            opacity={0.15}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            style={{
              filter: `drop-shadow(0 0 6px ${accent})`,
              transition: "stroke-dasharray 0.8s ease-out",
            }}
          />
        </svg>
        <Flex position="absolute" inset="0" align="center" justify="center">
          <Text
            fontFamily="mono"
            fontSize={pctFontSize}
            fontWeight="bold"
            color={accent}
            lineHeight="1"
            letterSpacing="-0.02em"
          >
            {pct != null ? `${pct}%` : "—"}
          </Text>
        </Flex>
      </Box>
      {label ? (
        <Text
          fontFamily="mono"
          fontSize="2xs"
          color={mutedColor}
          letterSpacing="0.16em"
          textAlign="center"
          lineHeight="1"
        >
          {label}
        </Text>
      ) : null}
    </Stack>
  );
}

function OutcomeBar({
  stats,
  tokens,
}: {
  stats: ClosedHistoryStats;
  tokens: ThemeTokens;
}) {
  const total = stats.wins + stats.losses + stats.breakeven;
  if (total === 0) return null;
  const winPct = (stats.wins / total) * 100;
  const lossPct = (stats.losses / total) * 100;
  const bePct = (stats.breakeven / total) * 100;

  return (
    <Stack gap="2" flex="1" minW="10rem">
      <Flex justify="space-between" fontFamily="mono" fontSize="2xs">
        <Text color={tokens.tagGreen.color}>W {stats.wins}</Text>
        <Text color={tokens.tagRed.color}>L {stats.losses}</Text>
        <Text color={tokens.panelMuted}>BE {stats.breakeven}</Text>
      </Flex>
      <Flex h="6px" overflow="hidden" rounded="full" bg={tokens.blockquoteBg} borderWidth="1px" borderColor={tokens.panelBorder}>
        {winPct > 0 ? <Box flex={`${winPct} 0 0`} bg={tokens.tagGreen.color} /> : null}
        {bePct > 0 ? <Box flex={`${bePct} 0 0`} bg={tokens.panelMuted} /> : null}
        {lossPct > 0 ? <Box flex={`${lossPct} 0 0`} bg={tokens.tagRed.color} /> : null}
      </Flex>
    </Stack>
  );
}

function ProfileStrip({
  profile,
  stats,
  tokens,
}: {
  profile: "a" | "b";
  stats: ClosedHistoryStats;
  tokens: ThemeTokens;
}) {
  const ringAccent = profile === "a" ? tokens.tagAccent.color : tokens.panelHeading;

  return (
    <Flex
      flex="1"
      minW={{ base: "100%", sm: "12rem" }}
      align="center"
      gap="3"
      px="3"
      py="3"
      borderWidth="1px"
      borderColor={tokens.panelBorder}
      rounded="sm"
      bg={tokens.blockquoteBg}
    >
      <WinRing
        pct={stats.win_rate_pct}
        accent={ringAccent}
        mutedColor={tokens.panelMuted}
        size={64}
        stroke={4}
        label="WIN"
      />
      <Stack gap="1" flex="1" minW="0">
        <PairLabel profile={profile} base="PROFILE" tokens={tokens} size="xs" />
        <Text fontFamily="mono" fontSize="xs" color={tokens.panelBody}>
          {stats.closed_trades} closed · W{stats.wins} L{stats.losses}
        </Text>
        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          ΣR {formatR(stats.total_r)}
        </Text>
      </Stack>
    </Flex>
  );
}

export default function JournalHistoryViz({
  trades,
  growth,
  journalCount,
  closedPnlRows,
  openCount,
  tokens,
}: {
  trades: TradeJournalRow[];
  growth: TradeJournalGrowth;
  journalCount: number;
  closedPnlRows: number;
  openCount: number;
  tokens: ThemeTokens;
}) {
  const overall = useMemo(() => computeClosedStats(trades), [trades]);
  const profileA = useMemo(
    () => computeClosedStats(trades.filter((t) => t.profile === "a")),
    [trades],
  );
  const profileB = useMemo(
    () => computeClosedStats(trades.filter((t) => t.profile === "b")),
    [trades],
  );
  const hasProfileBTrades = useMemo(
    () => trades.some((t) => t.profile === "b"),
    [trades],
  );

  const alien = tokens.tagAccent.color;
  const linkedClosed = trades.filter((t) => t.lifecycle === "closed" && t.journal_id != null).length;
  const winAccent =
    (overall.win_rate_pct ?? 0) >= 50 ? tokens.tagGreen.color : tokens.title;

  return (
    <Box
      position="relative"
      overflow="hidden"
      borderWidth="1px"
      borderColor={`${alien}44`}
      rounded="sm"
      px={{ base: 3, md: 4 }}
      py={{ base: 4, md: 5 }}
      bg={`linear-gradient(135deg, ${tokens.blockquoteBg} 0%, ${tokens.panelBg} 60%, ${tokens.blockquoteBg} 100%)`}
    >
      <Stack gap="4" position="relative" zIndex={1}>
        <JournalGrowthChart growth={growth} tokens={tokens} />

        <Text
          fontFamily="mono"
          fontSize="2xs"
          color={alien}
          letterSpacing="0.2em"
          animation={`${pulse} 4s ease-in-out infinite`}
        >
          ◈ PERFORMANCE
        </Text>

        <Flex gap="5" align="flex-start" flexWrap="wrap">
          <WinRing
            pct={overall.win_rate_pct}
            accent={winAccent}
            mutedColor={tokens.panelMuted}
            size={132}
            stroke={7}
          />
          <Stack flex="1" minW="12rem" gap="3">
            <OutcomeBar stats={overall} tokens={tokens} />
            <Grid templateColumns="repeat(3, 1fr)" gap="2" fontFamily="mono" fontSize="2xs">
              <Box>
                <Text color={tokens.panelMuted} letterSpacing="0.08em">ΣR</Text>
                <Text color={tokens.panelBody} fontSize="sm">{formatR(overall.total_r)}</Text>
              </Box>
              <Box>
                <Text color={tokens.panelMuted} letterSpacing="0.08em">AVG</Text>
                <Text color={tokens.panelBody} fontSize="sm">{formatR(overall.avg_r)}</Text>
              </Box>
              <Box>
                <Text color={tokens.panelMuted} letterSpacing="0.08em">CLOSED</Text>
                <Text color={tokens.panelBody} fontSize="sm">{overall.closed_trades}</Text>
              </Box>
            </Grid>
          </Stack>
        </Flex>

        {hasProfileBTrades ? (
          <Flex gap="3" flexWrap="wrap">
            <ProfileStrip profile="a" stats={profileA} tokens={tokens} />
            <ProfileStrip profile="b" stats={profileB} tokens={tokens} />
          </Flex>
        ) : null}

        {overall.closed_trades === 0 ? (
          <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} textAlign="center">
            {journalCount > 0
              ? `${journalCount} journal entries · ${closedPnlRows} exchange closes — awaiting matches`
              : "No journal entries yet"}
            {openCount > 0 ? ` · ${openCount} open on Risk Desk` : ""}
          </Text>
        ) : (
          <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} textAlign="center">
            {linkedClosed} journal closes
            {overall.closed_trades - linkedClosed > 0
              ? ` · ${overall.closed_trades - linkedClosed} exchange-only`
              : ""}
            {openCount > 0 ? ` · ${openCount} still open` : ""}
          </Text>
        )}
      </Stack>
    </Box>
  );
}
