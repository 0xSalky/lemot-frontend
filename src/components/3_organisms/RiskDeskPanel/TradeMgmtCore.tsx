"use client";

import type { ThemeTokens } from "@/components/ui/theme-color";
import type { TradeMgmtDesk, TradeMgmtPosition, TradeMgmtProposal } from "@/types/riskDeskTypes";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";

function formatR(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function statusColor(tokens: ThemeTokens, status: string): string {
  if (status === "ready") return tokens.tagGreen.color;
  if (status === "disabled" || status === "unavailable") return tokens.panelMuted;
  if (status === "watching") return tokens.tagAccent.color;
  return tokens.panelBody;
}

function proposalIcon(kind: TradeMgmtProposal["kind"]): string {
  return kind === "sl" ? "🛑" : "🎯";
}

function PositionMgmtRow({
  pos,
  tokens,
}: {
  pos: TradeMgmtPosition;
  tokens: ThemeTokens;
}) {
  const side = pos.side.toLowerCase();
  const accent = side === "long" ? tokens.tagGreen.color : tokens.tagRed.color;

  return (
    <Box
      borderWidth="1px"
      borderColor={tokens.panelBorder}
      bg={tokens.blockquoteBg}
      rounded="sm"
      overflow="hidden"
    >
      <Flex
        px="3"
        py="2"
        gap="2"
        flexWrap="wrap"
        align="center"
        borderBottomWidth="1px"
        borderColor={tokens.panelBorder}
        fontFamily="mono"
        fontSize="xs"
      >
        <Text fontWeight="bold" color={tokens.title}>
          {pos.symbol}
        </Text>
        <Text color={accent}>{side.toUpperCase()}</Text>
        <Text color={tokens.panelBody}>{formatR(pos.r_multiple)}</Text>
        <Text color={tokens.panelMuted}>{formatUsd(pos.unrealized_pnl_usd)}</Text>
        {!pos.on_watchlist ? (
          <Text color={tokens.warn} fontSize="2xs">
            off watchlist
          </Text>
        ) : null}
      </Flex>

      {pos.on_watchlist ? (
        <Stack gap="1" px="3" py="2" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          <Text>
            entry {formatPrice(pos.entry)} · mark {formatPrice(pos.mark)} · SL {formatPrice(pos.stop)}{" "}
            · TP {formatPrice(pos.take_profit)}
          </Text>
          <Text color={tokens.panelBody}>{pos.wait_detail}</Text>
        </Stack>
      ) : (
        <Text px="3" py="2" fontFamily="mono" fontSize="2xs" color={tokens.warn}>
          {pos.wait_detail}
        </Text>
      )}

      {pos.proposals.length > 0 ? (
        <Stack gap="0" borderTopWidth="1px" borderColor={tokens.panelBorder}>
          {pos.proposals.map((proposal, index) => (
            <Flex
              key={`${proposal.kind}-${proposal.price}-${index}`}
              px="3"
              py="2"
              gap="2"
              flexWrap="wrap"
              align="center"
              fontFamily="mono"
              fontSize="2xs"
              bg={index % 2 === 1 ? tokens.panelBg : "transparent"}
            >
              <Text>{proposalIcon(proposal.kind)}</Text>
              <Text color={tokens.panelLabel} minW="1.5rem">
                {proposal.kind.toUpperCase()}
              </Text>
              <Text color={tokens.panelBody}>
                → {proposal.price_display}
              </Text>
              <Text color={tokens.panelMuted}>{proposal.action_label}</Text>
              {proposal.would_notify ? (
                <Text color={tokens.tagGreen.color}>would ping</Text>
              ) : (
                <Text color={tokens.panelMuted}>
                  held · {proposal.notify_skip_reason ?? "no notify"}
                </Text>
              )}
            </Flex>
          ))}
        </Stack>
      ) : pos.on_watchlist ? (
        <Text px="3" py="2" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          // no SL/TP change proposed
        </Text>
      ) : null}
    </Box>
  );
}

export default function TradeMgmtCore({
  tradeMgmt,
  tokens,
}: {
  tradeMgmt: TradeMgmtDesk;
  tokens: ThemeTokens;
}) {
  const ladderText = tradeMgmt.lock_ladder
    .map((r) => `≥${r.trigger_r}R→+${r.lock_r}R`)
    .join(" · ");

  return (
    <Stack gap="3">
      <Flex align="center" justify="space-between" flexWrap="wrap" gap="2">
        <Text
          fontFamily="mono"
          fontSize="2xs"
          color={tokens.panelLabel}
          letterSpacing="0.12em"
        >
          TRADE MGMT · READ ONLY
        </Text>
        <Flex gap="2" flexWrap="wrap" fontFamily="mono" fontSize="2xs">
          <Text color={tradeMgmt.enabled ? tokens.tagGreen.color : tokens.panelMuted}>
            {tradeMgmt.enabled ? "ON" : "OFF"}
          </Text>
          <Text color={tokens.panelMuted}>·</Text>
          <Text color={tradeMgmt.auto_enabled ? tokens.tagAccent.color : tokens.panelMuted}>
            auto {tradeMgmt.auto_enabled ? "ON" : "OFF"}
          </Text>
          <Text color={tokens.panelMuted}>· poll {tradeMgmt.poll_seconds}s</Text>
        </Flex>
      </Flex>

      <Text fontFamily="mono" fontSize="2xs" color={statusColor(tokens, tradeMgmt.status)}>
        {tradeMgmt.status_detail}
      </Text>

      <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
        {tradeMgmt.profile} profile · TP extend ≥{tradeMgmt.extend_min_r}R @ {tradeMgmt.extend_min_rr}
        :1 RR · ladder {ladderText || "—"}
      </Text>

      {tradeMgmt.positions.length === 0 ? (
        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          // no positions to manage
        </Text>
      ) : (
        <Stack gap="2">
          {tradeMgmt.positions.map((pos) => (
            <PositionMgmtRow key={pos.symbol} pos={pos} tokens={tokens} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
