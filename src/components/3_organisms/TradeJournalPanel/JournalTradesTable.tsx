"use client";

import { tradeOutcome } from "@/components/3_organisms/TradeJournalPanel/journalClosedStats";
import type { ThemeTokens } from "@/components/ui/theme-color";
import type { TradeJournalRow } from "@/types/tradeJournalTypes";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";

const rowReveal = keyframes`
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
`;

function formatR(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function outcomeTone(
  outcome: ReturnType<typeof tradeOutcome>,
  tokens: ThemeTokens,
): { bg: string; color: string; border: string; label: string } {
  if (outcome === "win") {
    return { ...tokens.tagGreen, label: "WIN" };
  }
  if (outcome === "loss") {
    return { ...tokens.tagRed, label: "LOSS" };
  }
  if (outcome === "breakeven") {
    return { ...tokens.tagNeutral, label: "BE" };
  }
  return { ...tokens.tagBlue, label: "?" };
}

function rColor(tokens: ThemeTokens, value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return tokens.panelMuted;
  if (value > 0) return tokens.tagGreen.color;
  if (value < 0) return tokens.tagRed.color;
  return tokens.panelBody;
}

function matchColor(method: string, tokens: ThemeTokens): string {
  if (method === "order_id") return tokens.tagGreen.color;
  if (method === "exchange_only") return tokens.panelLabel;
  if (method === "price_time") return tokens.tagBlue.color;
  return tokens.panelMuted;
}

function TradeRow({
  trade,
  index,
  tokens,
}: {
  trade: TradeJournalRow;
  index: number;
  tokens: ThemeTokens;
}) {
  const side = trade.side.toLowerCase();
  const sideColor = side === "long" ? tokens.tagGreen.color : tokens.tagRed.color;
  const stripe = index % 2 === 1 ? tokens.blockquoteBg : "transparent";
  const outcome = outcomeTone(tradeOutcome(trade), tokens);

  return (
    <Box
      px="3"
      py="2.5"
      borderLeftWidth="2px"
      borderLeftColor={sideColor}
      bg={stripe}
      fontFamily="mono"
      fontSize="xs"
      animation={`${rowReveal} 0.45s ease-out both`}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      _hover={{
        bg: tokens.blockquoteBg,
        boxShadow: `inset 0 0 24px ${tokens.tagAccent.color}11`,
      }}
      transition="background 0.2s, box-shadow 0.2s"
    >
      <Flex gap="2" flexWrap="wrap" align="center" mb="1.5">
        <Text color={tokens.title} fontWeight="bold" minW="3rem" letterSpacing="0.06em">
          {trade.base}
        </Text>
        <Text color={sideColor} textTransform="uppercase" letterSpacing="0.1em">
          {side}
        </Text>
        <Box
          as="span"
          px="1.5"
          py="0.5"
          fontSize="2xs"
          borderWidth="1px"
          borderColor={tokens.tagBlue.border}
          bg={tokens.tagBlue.bg}
          color={tokens.tagBlue.color}
          rounded="sm"
        >
          {trade.profile?.toUpperCase() ?? "EXCH"}
        </Box>
        <Box
          as="span"
          px="1.5"
          py="0.5"
          fontSize="2xs"
          borderWidth="1px"
          borderColor={outcome.border}
          bg={outcome.bg}
          color={outcome.color}
          rounded="sm"
        >
          {outcome.label}
        </Box>
        {trade.setup_grade ? (
          <Text color={tokens.tagAccent.color} fontSize="2xs">
            grade {trade.setup_grade}
          </Text>
        ) : null}
        <Text
          color={matchColor(trade.match_method, tokens)}
          fontSize="2xs"
          letterSpacing="0.08em"
        >
          {trade.match_method.replace(/_/g, " ")}
        </Text>
      </Flex>

      <Flex gap="4" flexWrap="wrap" color={tokens.panelBody} mb="1">
        <Text>
          entry <Box as="span" color={tokens.panelHeading}>{trade.entry_price ?? "—"}</Box>
        </Text>
        <Text>
          stop <Box as="span">{trade.stop_loss_price ?? "—"}</Box>
        </Text>
        {trade.exit_price != null ? (
          <Text>
            exit <Box as="span">{trade.exit_price}</Box>
          </Text>
        ) : null}
        <Text color={rColor(tokens, trade.r_multiple)} fontWeight="bold" fontSize="sm">
          {formatR(trade.r_multiple)}
        </Text>
      </Flex>

      <Flex gap="4" flexWrap="wrap" color={tokens.panelMuted} fontSize="2xs">
        <Text>
          band {trade.band_side ?? "—"} {trade.band_range ?? "—"}
        </Text>
        {trade.fractal_level != null ? <Text>fractal {trade.fractal_level}</Text> : null}
        <Text>
          {trade.stop_preset ?? "—"} / {trade.tp_strategy_id ?? "—"}
        </Text>
        <Text>opened {formatTime(trade.executed_at)}</Text>
        {trade.closed_at ? <Text>closed {formatTime(trade.closed_at)}</Text> : null}
        <Text>{trade.source ?? "—"} · {trade.timeframe ?? "—"}</Text>
        {trade.matched_order_id ? (
          <Text title={trade.matched_order_id} color={tokens.tagGreen.color}>
            linked …{trade.matched_order_id.slice(-6)}
          </Text>
        ) : null}
      </Flex>
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
  if (trades.length === 0) {
    return (
      <Text fontFamily="mono" fontSize="sm" color={tokens.panelMuted} py="6" textAlign="center">
        {pendingCount > 0
          ? `No closed matches yet — ${pendingCount} open or pending entries are on Risk Desk.`
          : "No closed trades yet — finished positions will appear here."}
      </Text>
    );
  }

  return (
    <Stack gap="0">
      <Flex
        px="3"
        py="2"
        borderBottomWidth="1px"
        borderColor={tokens.panelBorder}
        fontFamily="mono"
        fontSize="2xs"
        color={tokens.tagAccent.color}
        letterSpacing="0.14em"
        justify="space-between"
      >
        <Text>◈ CLOSED LOG</Text>
        <Text color={tokens.panelMuted}>{trades.length} rows</Text>
      </Flex>
      {trades.map((trade, index) => (
        <TradeRow key={trade.journal_id ?? index} trade={trade} index={index} tokens={tokens} />
      ))}
    </Stack>
  );
}
