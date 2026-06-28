"use client";

import type { ThemeTokens } from "@/components/ui/theme-color";
import type {
  TradeMgmtDesk,
  TradeMgmtMilestone,
  TradeMgmtPosition,
  TradeMgmtProposal,
} from "@/types/riskDeskTypes";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";

const breathe = keyframes`
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
`;

const corePulse = keyframes`
  0%, 100% { box-shadow: 0 0 12px currentColor, 0 0 24px currentColor; }
  50% { box-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
`;

const flicker = keyframes`
  0%, 92%, 100% { opacity: 1; }
  94% { opacity: 0.5; }
`;

function formatR(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "−";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function milestoneColor(tokens: ThemeTokens, m: TradeMgmtMilestone, accent: string): string {
  if (m.reached) return tokens.tagGreen.color;
  if (m.kind === "tp") return tokens.tagAccent.color;
  return accent;
}

function ExitChip({
  label,
  value,
  color,
  tokens,
}: {
  label: string;
  value: string;
  color: string;
  tokens: ThemeTokens;
}) {
  return (
    <Box
      px="2"
      py="1"
      borderWidth="1px"
      borderColor={`${color}88`}
      bg={`${color}11`}
      rounded="sm"
      minW="4.5rem"
    >
      <Text fontFamily="mono" fontSize="0.5rem" color={tokens.panelMuted} letterSpacing="0.1em">
        {label}
      </Text>
      <Text fontFamily="mono" fontSize="2xs" color={color} fontWeight="bold">
        {value}
      </Text>
    </Box>
  );
}

function RRail({
  pos,
  tokens,
  accent,
  alien,
}: {
  pos: TradeMgmtPosition;
  tokens: ThemeTokens;
  accent: string;
  alien: string;
}) {
  const progress = pos.progress;
  if (!progress) return null;

  const scale = progress.scale_max_r;
  const currentPct = progress.current_pct;
  const tpPct =
    progress.target_tp_rr != null ? Math.min(100, (progress.target_tp_rr / scale) * 100) : null;

  return (
    <Box position="relative" h="3.5rem" mt="2" mb="1">
      <Box
        position="absolute"
        left="0"
        right="0"
        top="50%"
        h="3px"
        transform="translateY(-50%)"
        bg={tokens.panelBorder}
        rounded="full"
      />
      {tpPct != null ? (
        <Box
          position="absolute"
          left="0"
          top="50%"
          h="6px"
          w={`${tpPct}%`}
          transform="translateY(-50%)"
          borderRadius="full"
          bg={`linear-gradient(90deg, ${alien}44, ${tokens.tagAccent.color}88)`}
          animation={`${breathe} 3s ease-in-out infinite`}
        />
      ) : null}
      <Box
        position="absolute"
        left="0"
        top="50%"
        h="8px"
        w={`${currentPct}%`}
        maxW="100%"
        transform="translateY(-50%)"
        borderRadius="full"
        bg={`linear-gradient(90deg, ${accent}66, ${accent})`}
        boxShadow={`0 0 12px ${accent}`}
      />
      {progress.milestones.map((m) => (
        <Box
          key={m.id}
          position="absolute"
          left={`${m.pct}%`}
          top="50%"
          transform="translate(-50%, -50%)"
          zIndex={2}
        >
          <Box
            w={m.kind === "tp" ? "10px" : "8px"}
            h={m.kind === "tp" ? "10px" : "8px"}
            rounded="full"
            borderWidth="2px"
            borderColor={milestoneColor(tokens, m, accent)}
            bg={m.reached ? milestoneColor(tokens, m, accent) : tokens.panelBg}
            boxShadow={m.reached ? `0 0 10px ${milestoneColor(tokens, m, accent)}` : undefined}
          />
          <Text
            position="absolute"
            top="-1.1rem"
            left="50%"
            transform="translateX(-50%)"
            fontFamily="mono"
            fontSize="0.45rem"
            color={milestoneColor(tokens, m, accent)}
            whiteSpace="nowrap"
            letterSpacing="0.06em"
          >
            {m.kind === "tp" ? `TP ${m.r}R` : m.label}
          </Text>
        </Box>
      ))}
      <Box
        position="absolute"
        left={`${currentPct}%`}
        top="50%"
        w="14px"
        h="14px"
        rounded="full"
        bg={accent}
        color={accent}
        transform="translate(-50%, -50%)"
        zIndex={3}
        animation={`${corePulse} 2.2s ease-in-out infinite`}
      />
      <Flex justify="space-between" position="absolute" bottom="-0.1rem" left="0" right="0">
        <Text fontFamily="mono" fontSize="0.45rem" color={tokens.panelMuted}>
          0R
        </Text>
        <Text fontFamily="mono" fontSize="0.45rem" color={alien}>
          {scale}R max
        </Text>
      </Flex>
    </Box>
  );
}

function ProposalStrip({
  proposal,
  tokens,
}: {
  proposal: TradeMgmtProposal;
  tokens: ThemeTokens;
}) {
  const isSl = proposal.kind === "sl";
  const color = isSl ? tokens.tagRed.color : tokens.tagAccent.color;
  return (
    <Flex
      gap="2"
      align="center"
      flexWrap="wrap"
      px="2"
      py="1.5"
      borderWidth="1px"
      borderColor={`${color}55`}
      bg={`${color}0d`}
      rounded="sm"
      fontFamily="mono"
      fontSize="2xs"
    >
      <Text color={color}>{isSl ? "◆ LOCK" : "◇ EXTEND"}</Text>
      <Text color={tokens.panelBody}>{proposal.price_display}</Text>
      <Text color={tokens.panelMuted}>{proposal.action_label}</Text>
      {proposal.would_notify ? (
        <Text color={tokens.tagGreen.color} animation={`${flicker} 4s step-end infinite`}>
          ◉ PING
        </Text>
      ) : (
        <Text color={tokens.panelMuted}>held</Text>
      )}
    </Flex>
  );
}

function PositionMgmtCard({
  pos,
  tokens,
}: {
  pos: TradeMgmtPosition;
  tokens: ThemeTokens;
}) {
  const side = pos.side.toLowerCase();
  const accent = side === "long" ? tokens.tagGreen.color : tokens.tagRed.color;
  const alien = tokens.tagAccent.color;
  const progress = pos.progress;
  const phase = progress?.phase ?? "flat";
  const win = phase === "winner";

  if (!pos.on_watchlist) {
    return (
      <Box
        borderWidth="1px"
        borderColor={tokens.warn}
        borderStyle="dashed"
        px="3"
        py="2"
        rounded="sm"
        fontFamily="mono"
        fontSize="2xs"
        color={tokens.warn}
      >
        {pos.symbol} · {pos.wait_detail}
      </Box>
    );
  }

  return (
    <Box
      position="relative"
      overflow="hidden"
      borderWidth="1px"
      borderColor={accent}
      bg={`linear-gradient(135deg, ${tokens.blockquoteBg} 0%, ${tokens.panelBg} 50%, ${tokens.blockquoteBg} 100%)`}
      boxShadow={`0 0 28px ${accent}22, inset 0 0 40px ${alien}08`}
      rounded="md"
      px={{ base: 3, md: 4 }}
      py="3"
    >
      <Box
        position="absolute"
        inset="0"
        pointerEvents="none"
        opacity={0.1}
        backgroundImage={`linear-gradient(${alien}33 1px, transparent 1px), linear-gradient(90deg, ${alien}33 1px, transparent 1px)`}
        backgroundSize="14px 14px"
      />

      <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap="2" position="relative">
        <Stack gap="0">
          <Text
            fontFamily="mono"
            fontSize="xs"
            fontWeight="bold"
            color={tokens.title}
            letterSpacing="0.2em"
          >
            {pos.symbol}
          </Text>
          <Text fontFamily="mono" fontSize="0.5rem" color={accent} letterSpacing="0.16em">
            {side.toUpperCase()} NODE
          </Text>
        </Stack>
        <Stack align="flex-end" gap="0">
          <Text
            fontFamily="mono"
            fontSize="xl"
            fontWeight="bold"
            color={accent}
            lineHeight="1"
            textShadow={`0 0 16px ${accent}`}
          >
            {formatR(pos.r_multiple)}
          </Text>
          <Text fontFamily="mono" fontSize="2xs" color={tokens.panelBody}>
            {formatUsd(pos.unrealized_pnl_usd)}
          </Text>
        </Stack>
      </Flex>

      <Flex gap="2" flexWrap="wrap" mt="3" position="relative">
        <ExitChip label="ENTRY" value={formatPrice(pos.entry)} color={alien} tokens={tokens} />
        <ExitChip label="MARK" value={formatPrice(pos.mark)} color={tokens.panelBody} tokens={tokens} />
        <ExitChip label="SL" value={formatPrice(pos.stop)} color={tokens.tagRed.color} tokens={tokens} />
        <ExitChip label="TP" value={formatPrice(pos.take_profit)} color={tokens.tagGreen.color} tokens={tokens} />
        {pos.target_tp_rr != null ? (
          <ExitChip
            label="TP R"
            value={`${pos.target_tp_rr}R`}
            color={tokens.tagAccent.color}
            tokens={tokens}
          />
        ) : null}
      </Flex>

      <RRail pos={pos} tokens={tokens} accent={accent} alien={alien} />

      <Flex justify="space-between" align="center" flexWrap="wrap" gap="2" mt="2" position="relative">
        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelBody} maxW="70%">
          {pos.wait_detail}
        </Text>
        <Text
          fontFamily="mono"
          fontSize="0.5rem"
          color={win ? tokens.tagGreen.color : tokens.panelMuted}
          letterSpacing="0.12em"
        >
          {win ? "▲ RUNNING" : progress?.pct_to_target_tp != null ? "◎ TRACKING" : "—"}
          {progress?.pct_to_target_tp != null ? ` ${progress.pct_to_target_tp}%` : ""}
        </Text>
      </Flex>

      {pos.proposals.length > 0 ? (
        <Stack gap="1.5" mt="3" position="relative">
          {pos.proposals.map((p, i) => (
            <ProposalStrip key={`${p.kind}-${p.price}-${i}`} proposal={p} tokens={tokens} />
          ))}
        </Stack>
      ) : (
        <Text mt="2" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} position="relative">
          // holding pattern — no SL/TP change
        </Text>
      )}
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
  const alien = tokens.tagAccent.color;
  const ladderText = tradeMgmt.lock_ladder
    .map((r) => `${r.trigger_r}R→+${r.lock_r}R`)
    .join(" · ");
  const tpLevels = tradeMgmt.entry_tp_rr_levels.join(" / ") || "—";

  return (
    <Stack gap="3">
      <Flex align="center" justify="space-between" flexWrap="wrap" gap="2">
        <Text
          fontFamily="mono"
          fontSize="2xs"
          color={alien}
          letterSpacing="0.28em"
          textTransform="uppercase"
          animation={`${flicker} 6s step-end infinite`}
        >
          ◈ Trade mgmt field
        </Text>
        <Flex gap="2" fontFamily="mono" fontSize="2xs" flexWrap="wrap">
          <Text color={tradeMgmt.enabled ? tokens.tagGreen.color : tokens.panelMuted}>
            {tradeMgmt.enabled ? "ARMED" : "OFF"}
          </Text>
          <Text color={tokens.panelMuted}>·</Text>
          <Text color={tradeMgmt.auto_enabled ? alien : tokens.panelMuted}>
            auto {tradeMgmt.auto_enabled ? "ON" : "OFF"}
          </Text>
          <Text color={tokens.panelMuted}>· {tradeMgmt.poll_seconds}s</Text>
        </Flex>
      </Flex>

      <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
        entry TP {tpLevels}R · lock offset −{tradeMgmt.lock_bank_offset_r}R · extend ≥
        {tradeMgmt.extend_min_r}R · {ladderText}
      </Text>

      <Text fontFamily="mono" fontSize="2xs" color={tokens.panelBody}>
        {tradeMgmt.status_detail}
      </Text>

      {tradeMgmt.positions.length === 0 ? (
        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          // no positions in mgmt scope
        </Text>
      ) : (
        <Stack gap="3">
          {tradeMgmt.positions.map((pos) => (
            <PositionMgmtCard key={pos.symbol} pos={pos} tokens={tokens} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
