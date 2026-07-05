"use client";

import {
  computeClosedStats,
  type ClosedHistoryStats,
} from "@/components/3_organisms/TradeJournalPanel/journalClosedStats";
import type { ThemeTokens } from "@/components/ui/theme-color";
import type { TradeJournalRow } from "@/types/tradeJournalTypes";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useMemo } from "react";

const ringSpin = keyframes`
  from { transform: rotate(-90deg); }
  to { transform: rotate(270deg); }
`;

const flicker = keyframes`
  0%, 92%, 100% { opacity: 1; }
  93% { opacity: 0.4; }
  96% { opacity: 0.7; }
`;

const barGlow = keyframes`
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.35); }
`;

function formatR(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

function WinRing({
  pct,
  accent,
  size = 120,
  stroke = 6,
}: {
  pct: number | null;
  accent: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fill = pct != null ? Math.min(100, Math.max(0, pct)) : 0;
  const dash = (fill / 100) * c;

  return (
    <Box position="relative" w={`${size}px`} h={`${size}px`}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          opacity={0.12}
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
      <Flex
        position="absolute"
        inset="0"
        align="center"
        justify="center"
        direction="column"
        fontFamily="mono"
      >
        <Text fontSize="xl" fontWeight="bold" color={accent} lineHeight="1">
          {pct != null ? `${pct}%` : "—"}
        </Text>
        <Text fontSize="2xs" color="currentColor" opacity={0.55} letterSpacing="0.12em">
          WIN
        </Text>
      </Flex>
    </Box>
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
  if (total === 0) {
    return (
      <Box h="10px" bg={tokens.blockquoteBg} borderWidth="1px" borderColor={tokens.panelBorder} />
    );
  }

  const segments = [
    { key: "w", count: stats.wins, color: tokens.tagGreen.color },
    { key: "l", count: stats.losses, color: tokens.tagRed.color },
    { key: "be", count: stats.breakeven, color: tokens.panelMuted },
  ];

  return (
    <Flex
      h="10px"
      overflow="hidden"
      borderWidth="1px"
      borderColor={tokens.panelBorder}
      bg={tokens.blockquoteBg}
      animation={`${barGlow} 3s ease-in-out infinite`}
    >
      {segments.map((seg) =>
        seg.count > 0 ? (
          <Box
            key={seg.key}
            flex={`${seg.count} 0 0`}
            bg={seg.color}
            boxShadow={`0 0 10px ${seg.color}`}
            transition="flex 0.6s ease-out"
          />
        ) : null,
      )}
    </Flex>
  );
}

function ProfileNode({
  label,
  stats,
  accent,
  tokens,
}: {
  label: string;
  stats: ClosedHistoryStats;
  accent: string;
  tokens: ThemeTokens;
}) {
  return (
    <Stack
      align="center"
      gap="2"
      flex="1"
      minW={{ base: "7rem", md: "8rem" }}
      p="3"
      borderWidth="1px"
      borderColor={`${accent}66`}
      bg={`linear-gradient(180deg, ${tokens.blockquoteBg}88, transparent)`}
      position="relative"
      overflow="hidden"
    >
      <Box
        position="absolute"
        inset="0"
        pointerEvents="none"
        borderWidth="1px"
        borderColor={`${accent}22`}
        animation={`${ringSpin} 24s linear infinite`}
        transformOrigin="center"
        opacity={0.4}
      />
      <Text
        fontFamily="mono"
        fontSize="2xs"
        color={accent}
        letterSpacing="0.14em"
        textAlign="center"
      >
        {label}
      </Text>
      <Box color={tokens.panelMuted}>
        <WinRing pct={stats.win_rate_pct} accent={accent} size={88} stroke={5} />
      </Box>
      <Text fontFamily="mono" fontSize="xs" color={tokens.panelBody}>
        {stats.closed_trades} closed
      </Text>
      <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
        W{stats.wins} · L{stats.losses} · BE{stats.breakeven}
      </Text>
      <Text fontFamily="mono" fontSize="sm" fontWeight="bold" color={accent}>
        {formatR(stats.total_r)}
      </Text>
    </Stack>
  );
}

export default function JournalHistoryViz({
  trades,
  journalCount,
  closedPnlRows,
  openCount,
  tokens,
}: {
  trades: TradeJournalRow[];
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

  const alien = tokens.tagAccent.color;
  const rColor =
    overall.total_r > 0
      ? tokens.tagGreen.color
      : overall.total_r < 0
        ? tokens.tagRed.color
        : tokens.panelBody;

  const linkedClosed = trades.filter((t) => t.lifecycle === "closed" && t.journal_id != null).length;

  return (
    <Box
      position="relative"
      overflow="hidden"
      borderWidth="1px"
      borderColor={`${alien}55`}
      bg={`linear-gradient(135deg, ${tokens.blockquoteBg} 0%, ${tokens.panelBg} 50%, ${tokens.blockquoteBg} 100%)`}
      px={{ base: 4, md: 5 }}
      py={{ base: 5, md: 6 }}
      boxShadow={`inset 0 0 48px ${alien}08`}
    >
      <Box
        position="absolute"
        inset="0"
        pointerEvents="none"
        opacity={0.08}
        backgroundImage={`
          linear-gradient(${alien} 1px, transparent 1px),
          linear-gradient(90deg, ${alien} 1px, transparent 1px)
        `}
        backgroundSize="20px 20px"
      />

      <Stack gap="5" position="relative" zIndex={1}>
        <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap="4">
          <Stack gap="1">
            <Text
              fontFamily="mono"
              fontSize="2xs"
              color={alien}
              letterSpacing="0.24em"
              animation={`${flicker} 6s step-end infinite`}
            >
              ◈ CLOSED PERFORMANCE
            </Text>
            <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} letterSpacing="0.1em">
              history only · R-multiples · no open book
            </Text>
          </Stack>
          <Flex gap="6" align="center" flexWrap="wrap">
            <Stack align="center" gap="0">
              <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} letterSpacing="0.1em">
                ΣR
              </Text>
              <Text
                fontFamily="mono"
                fontSize="2xl"
                fontWeight="bold"
                color={rColor}
                textShadow={`0 0 16px ${rColor}88`}
              >
                {formatR(overall.total_r)}
              </Text>
            </Stack>
            <Stack align="center" gap="0">
              <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} letterSpacing="0.1em">
                AVG
              </Text>
              <Text fontFamily="mono" fontSize="lg" fontWeight="bold" color={tokens.panelBody}>
                {formatR(overall.avg_r)}
              </Text>
            </Stack>
            <Stack align="center" gap="0">
              <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
                BEST
              </Text>
              <Text fontFamily="mono" fontSize="sm" color={tokens.tagGreen.color}>
                {formatR(overall.best_r)}
              </Text>
            </Stack>
            <Stack align="center" gap="0">
              <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
                WORST
              </Text>
              <Text fontFamily="mono" fontSize="sm" color={tokens.tagRed.color}>
                {formatR(overall.worst_r)}
              </Text>
            </Stack>
          </Flex>
        </Flex>

        <Flex gap="5" align="center" flexWrap="wrap">
          <Box color={tokens.panelMuted}>
            <WinRing pct={overall.win_rate_pct} accent={tokens.title} size={132} stroke={7} />
          </Box>
          <Stack flex="1" minW="12rem" gap="2">
            <Flex justify="space-between" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
              <Text color={tokens.tagGreen.color}>W {overall.wins}</Text>
              <Text color={tokens.tagRed.color}>L {overall.losses}</Text>
              <Text>BE {overall.breakeven}</Text>
              <Text>{overall.closed_trades} closed</Text>
            </Flex>
            <OutcomeBar stats={overall} tokens={tokens} />
          </Stack>
        </Flex>

        <Flex gap="3" flexWrap="wrap" justify="center">
          <ProfileNode label="◇ PROFILE A" stats={profileA} accent={tokens.panelLabel} tokens={tokens} />
          <ProfileNode label="◇ PROFILE B" stats={profileB} accent={tokens.tagBlue.color} tokens={tokens} />
        </Flex>

        {overall.closed_trades === 0 ? (
          <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} textAlign="center" letterSpacing="0.08em">
            {journalCount > 0
              ? `${journalCount} journal entries · ${closedPnlRows} exchange closes — no matches yet`
              : "No journal entries yet"}
            {openCount > 0 ? ` · ${openCount} open on Risk Desk` : ""}
          </Text>
        ) : linkedClosed < journalCount ? (
          <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} textAlign="center" letterSpacing="0.08em">
            {linkedClosed} journal closes · {overall.closed_trades - linkedClosed} exchange-only
            {openCount > 0 ? ` · ${openCount} still open` : ""}
          </Text>
        ) : null}
      </Stack>
    </Box>
  );
}
