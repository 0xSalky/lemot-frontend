"use client";

import { SignalConditionDots } from "@/components/3_organisms/SignalsMonitorPanel/SignalConditionDots";
import type { SignalCondition } from "@/components/3_organisms/SignalsMonitorPanel/signalConditions";
import { useThemeColor, useThemeTokens, type ThemeTokens } from "@/components/ui/theme-color";
import { usePageVisible } from "@/hooks/usePageVisible";
import { fetchRiskDesk } from "@/services/riskDesk";
import type {
  RiskDeskPayload,
  RiskDeskPosition,
  RiskGate,
  RiskGatesSummary,
} from "@/types/riskDeskTypes";
import { Box, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useEffect, useMemo, useState } from "react";

const pulse = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 8px currentColor; }
  50% { opacity: 0.45; box-shadow: 0 0 2px currentColor; }
`;

const blink = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
`;

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatR(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

function gateSummaryColor(tokens: ThemeTokens, summary: RiskGatesSummary): string {
  if (summary === "blocked") return tokens.tagRed.color;
  if (summary === "warn") return tokens.warn;
  return tokens.tagGreen.color;
}

function netSideColor(tokens: ThemeTokens, netSide: string): string {
  if (netSide === "long") return tokens.tagGreen.color;
  if (netSide === "short") return tokens.tagRed.color;
  if (netSide === "mixed") return tokens.warn;
  return tokens.panelMuted;
}

function gateToCondition(gate: RiskGate): SignalCondition {
  return {
    id: gate.id,
    label: gate.label,
    short: gate.short,
    detail: gate.detail,
    state: gate.status === "ok" ? "met" : gate.status === "block" ? "unmet" : "unknown",
  };
}

function EventTag({
  label,
  tone,
}: {
  label: string;
  tone: { bg: string; color: string; border: string };
}) {
  return (
    <Box
      as="span"
      display="inline-block"
      px="1.5"
      py="0.5"
      fontFamily="mono"
      fontSize="2xs"
      letterSpacing="0.08em"
      textTransform="uppercase"
      borderWidth="1px"
      borderColor={tone.border}
      bg={tone.bg}
      color={tone.color}
      rounded="sm"
    >
      {label}
    </Box>
  );
}

function CapacityGauge({
  desk,
  tokens,
}: {
  desk: RiskDeskPayload;
  tokens: ThemeTokens;
}) {
  const max = desk.max_open_trades;
  const slots = max > 0 ? max : Math.max(desk.slots_used, 3);

  return (
    <Stack gap="2">
      <Flex gap="2" flexWrap="wrap">
        {Array.from({ length: slots }).map((_, index) => {
          const pos = desk.positions[index];
          const filled = Boolean(pos);
          const side = pos?.side?.toLowerCase();
          const accent =
            side === "long"
              ? tokens.tagGreen.color
              : side === "short"
                ? tokens.tagRed.color
                : tokens.tagAccent.color;
          return (
            <Box
              key={`slot-${index}`}
              flex="1"
              minW="5rem"
              p="2"
              borderWidth="1px"
              borderColor={filled ? accent : tokens.panelBorder}
              borderStyle={filled ? "solid" : "dashed"}
              bg={filled ? tokens.panelBgUser : tokens.blockquoteBg}
              rounded="sm"
              boxShadow={filled ? tokens.panelGlow : undefined}
            >
              {filled && pos ? (
                <Stack gap="0.5">
                  <Text fontFamily="mono" fontSize="xs" fontWeight="bold" color={accent}>
                    {pos.symbol}
                  </Text>
                  <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
                    {side?.toUpperCase() ?? "—"}
                  </Text>
                  <Text fontFamily="mono" fontSize="2xs" color={tokens.panelBody}>
                    {formatR(pos.r_multiple)}
                  </Text>
                </Stack>
              ) : (
                <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} letterSpacing="0.08em">
                  EMPTY
                </Text>
              )}
            </Box>
          );
        })}
      </Flex>
      {max > 0 ? (
        <>
          <Box h="4px" bg={tokens.blockquoteBg} rounded="full" overflow="hidden">
            <Box
              h="100%"
              w={`${Math.min(100, Math.round(desk.fill_ratio * 100))}%`}
              bg={`linear-gradient(90deg, ${tokens.tagAccent.color}, ${tokens.tagGreen.color})`}
            />
          </Box>
          <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
            {desk.slots_used} / {max} slots · {desk.slots_free ?? 0} free
          </Text>
        </>
      ) : (
        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          max open trades unlimited · {desk.slots_used} open
        </Text>
      )}
    </Stack>
  );
}

function RScaleBar({
  avgR,
  limits,
  tokens,
}: {
  avgR: number | null;
  limits: RiskDeskPayload["limits"];
  tokens: ThemeTokens;
}) {
  const hard = -limits.avg_down_hard_reject_r;
  const min = -limits.worst_leg_hard_reject_r;
  const max = 0.5;
  const value = avgR ?? 0;
  const span = max - min;
  const pct = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 50;

  return (
    <Stack gap="1">
      <Flex justify="space-between" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
        <Text>{min}R</Text>
        <Text>{hard}R</Text>
        <Text>0R</Text>
      </Flex>
      <Box h="6px" bg={tokens.blockquoteBg} rounded="full" position="relative">
        <Box
          position="absolute"
          top="-2px"
          left={`${pct}%`}
          w="10px"
          h="10px"
          rounded="full"
          bg={value <= hard ? tokens.tagRed.color : value < 0 ? tokens.warn : tokens.tagGreen.color}
          transform="translateX(-50%)"
          boxShadow={tokens.panelGlow}
        />
      </Box>
      <Text fontFamily="mono" fontSize="2xs" color={tokens.panelBody}>
        book avg {formatR(avgR)} · hard block ≤ {hard}R
      </Text>
    </Stack>
  );
}

function PositionRow({
  pos,
  index,
  tokens,
}: {
  pos: RiskDeskPosition;
  index: number;
  tokens: ThemeTokens;
}) {
  const side = pos.side.toLowerCase();
  const accent = side === "long" ? tokens.tagGreen.color : tokens.tagRed.color;
  const stripe = index % 2 === 1 ? tokens.blockquoteBg : "transparent";

  return (
    <Flex
      px="3"
      py="2"
      borderLeftWidth="2px"
      borderLeftColor={accent}
      bg={stripe}
      gap="3"
      flexWrap="wrap"
      align="center"
      fontFamily="mono"
      fontSize="xs"
    >
      <Text fontWeight="bold" color={tokens.title} minW="3rem">
        {pos.symbol}
      </Text>
      <Text color={accent} minW="3rem">
        {side.toUpperCase()}
      </Text>
      <Text color={tokens.panelBody}>{formatR(pos.r_multiple)}</Text>
      <Text color={tokens.panelMuted}>{formatUsd(pos.unrealized_pnl_usd)}</Text>
      {pos.leverage != null ? (
        <Text color={tokens.panelMuted}>{pos.leverage}x</Text>
      ) : null}
    </Flex>
  );
}

export default function RiskDeskPanel({ active }: { active: boolean }) {
  const { palette } = useThemeColor();
  const tokens = useThemeTokens(palette);
  const pageVisible = usePageVisible();
  const [desk, setDesk] = useState<RiskDeskPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!active || !pageVisible) return;
    let cancelled = false;

    const poll = () => {
      void fetchRiskDesk().then((data) => {
        if (cancelled) return;
        setDesk(data);
        setLoading(false);
      });
    };

    const initial = window.setTimeout(poll, 0);
    const id = window.setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(id);
    };
  }, [active, pageVisible]);

  const gateConditions = useMemo(
    () => (desk?.gates ?? []).map(gateToCondition),
    [desk?.gates],
  );

  const liveColor =
    loading && !desk
      ? tokens.panelMuted
      : desk?.positions_available
        ? tokens.tagGreen.color
        : tokens.warn;

  const summaryLabel = desk?.gates_summary?.toUpperCase() ?? "—";

  return (
    <Box>
      <Box
        borderWidth="1px"
        borderColor={tokens.panelBorder}
        bg={tokens.panelBg}
        rounded="md"
        overflow="hidden"
        position="relative"
        boxShadow={tokens.panelGlowStrong}
      >
        <Box
          position="absolute"
          inset="0"
          pointerEvents="none"
          opacity={0.04}
          backgroundImage={`repeating-linear-gradient(0deg, transparent, transparent 2px, ${tokens.title} 3px)`}
        />

        <Flex
          px="4"
          py="3"
          borderBottomWidth="1px"
          borderColor={tokens.panelBorder}
          align="center"
          justify="space-between"
          flexWrap="wrap"
          gap="2"
          position="relative"
        >
          <Flex align="center" gap="3">
            <Box
              w="2.5"
              h="2.5"
              rounded="full"
              bg={liveColor}
              color={liveColor}
              animation={desk?.positions_available ? `${pulse} 2s ease-in-out infinite` : undefined}
            />
            <Stack gap="0">
              <Text
                fontFamily="mono"
                fontSize="sm"
                fontWeight="bold"
                color={tokens.title}
                letterSpacing="0.14em"
              >
                RISK_DESK
              </Text>
              <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
                portfolio gates · poll 15s · gates {summaryLabel}
              </Text>
            </Stack>
          </Flex>
          <Flex gap="4" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} flexWrap="wrap">
            <Text>
              equity{" "}
              <Box as="span" color={tokens.panelBody}>
                {formatUsd(desk?.equity_usd)}
              </Box>
            </Text>
            <Text>
              1R{" "}
              <Box as="span" color={tokens.panelBody}>
                {formatUsd(desk?.risk_unit_usd)} ({desk?.risk_percent ?? 1}%)
              </Box>
            </Text>
            <Text>
              book{" "}
              <Box as="span" color={netSideColor(tokens, desk?.net_side ?? "flat")}>
                {(desk?.net_side ?? "—").toUpperCase()}
              </Box>
            </Text>
            <Text animation={`${blink} 1.2s step-end infinite`} color={tokens.title}>
              _
            </Text>
          </Flex>
        </Flex>

        {loading && !desk ? (
          <Flex py="12" justify="center">
            <Spinner size="sm" color={tokens.tagAccent.color} />
          </Flex>
        ) : desk ? (
          <Stack gap="0" position="relative">
            <Box px="4" py="4" borderBottomWidth="1px" borderColor={tokens.panelBorder}>
              <Text
                fontFamily="mono"
                fontSize="2xs"
                color={tokens.panelLabel}
                letterSpacing="0.12em"
                mb="2"
              >
                CAPACITY
              </Text>
              <CapacityGauge desk={desk} tokens={tokens} />
            </Box>

            <Flex
              direction={{ base: "column", md: "row" }}
              borderBottomWidth="1px"
              borderColor={tokens.panelBorder}
            >
              <Box flex="1" px="4" py="4" borderRightWidth={{ md: "1px" }} borderColor={tokens.panelBorder}>
                <Text
                  fontFamily="mono"
                  fontSize="2xs"
                  color={tokens.panelLabel}
                  letterSpacing="0.12em"
                  mb="2"
                >
                  BOOK EXPOSURE
                </Text>
                <Flex align="center" gap="3" mb="3" flexWrap="wrap">
                  <EventTag
                    label={`NET ${desk.net_side.toUpperCase()}`}
                    tone={{
                      bg: tokens.blockquoteBg,
                      color: netSideColor(tokens, desk.net_side),
                      border: netSideColor(tokens, desk.net_side),
                    }}
                  />
                  {desk.book_state ? (
                    <EventTag
                      label={desk.book_state.toUpperCase()}
                      tone={tokens.tagNeutral}
                    />
                  ) : null}
                  <EventTag
                    label={`GATES ${summaryLabel}`}
                    tone={{
                      bg: tokens.blockquoteBg,
                      color: gateSummaryColor(tokens, desk.gates_summary),
                      border: gateSummaryColor(tokens, desk.gates_summary),
                    }}
                  />
                </Flex>
                <RScaleBar avgR={desk.same_side.avg_r} limits={desk.limits} tokens={tokens} />
                <Flex gap="4" mt="3" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} flexWrap="wrap">
                  <Text>avg {formatR(desk.same_side.avg_r)}</Text>
                  <Text>worst {formatR(desk.same_side.worst_r)}</Text>
                  <Text>best {formatR(desk.same_side.best_r)}</Text>
                </Flex>
              </Box>

              <Box flex="1" px="4" py="4">
                <Text
                  fontFamily="mono"
                  fontSize="2xs"
                  color={tokens.panelLabel}
                  letterSpacing="0.12em"
                  mb="2"
                >
                  GATE MATRIX
                </Text>
                <SignalConditionDots conditions={gateConditions} tokens={tokens} variant="watch" />
              </Box>
            </Flex>

            {desk.positions.length > 0 ? (
              <Box borderBottomWidth="1px" borderColor={tokens.panelBorder}>
                <Text
                  px="4"
                  pt="3"
                  pb="1"
                  fontFamily="mono"
                  fontSize="2xs"
                  color={tokens.panelLabel}
                  letterSpacing="0.12em"
                >
                  OPEN POSITIONS
                </Text>
                {desk.positions.map((pos, index) => (
                  <PositionRow key={`${pos.symbol}-${index}`} pos={pos} index={index} tokens={tokens} />
                ))}
              </Box>
            ) : (
              <Box px="4" py="3" borderBottomWidth="1px" borderColor={tokens.panelBorder}>
                <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
                  // flat book — all gates green, slots available
                </Text>
              </Box>
            )}

            {desk.next_same_side_preview ? (
              <Box px="4" py="4" borderBottomWidth="1px" borderColor={tokens.panelBorder}>
                <Text
                  fontFamily="mono"
                  fontSize="2xs"
                  color={tokens.panelLabel}
                  letterSpacing="0.12em"
                  mb="2"
                >
                  NEXT {desk.next_same_side_preview.side.toUpperCase()} ADD (CODE PREVIEW)
                </Text>
                <Stack gap="1" fontFamily="mono" fontSize="2xs" color={tokens.panelBody}>
                  <Text>
                    loss tier avg {formatR(desk.next_same_side_preview.avg_r)} → −
                    {desk.next_same_side_preview.loss_penalty_pts} pts
                  </Text>
                  <Text>
                    crowding {desk.next_same_side_preview.same_side_count}/{desk.max_open_trades} → −
                    {desk.next_same_side_preview.crowding_penalty_pts} pts
                  </Text>
                  <Text color={tokens.tagAccent.color}>
                    total code penalty −{desk.next_same_side_preview.total_penalty_pts} pts
                  </Text>
                  {desk.next_same_side_preview.hard_block ? (
                    <Text color={tokens.tagRed.color}>
                      hard block: {desk.next_same_side_preview.hard_block}
                    </Text>
                  ) : null}
                </Stack>
              </Box>
            ) : null}

            <Box px="4" py="4">
              <Text
                fontFamily="mono"
                fontSize="2xs"
                color={tokens.panelLabel}
                letterSpacing="0.12em"
                mb="2"
              >
                RECENT RISK EVENTS
              </Text>
              {desk.recent_events.length === 0 ? (
                <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
                  // no recent trade blocks or opens
                </Text>
              ) : (
                <Stack gap="1">
                  {desk.recent_events.map((event, index) => {
                    const kindColor =
                      event.kind === "opened"
                        ? tokens.tagGreen.color
                        : event.kind === "portfolio_skip"
                          ? tokens.warn
                          : tokens.tagRed.color;
                    return (
                      <Flex
                        key={`${event.created_at}-${index}`}
                        gap="2"
                        fontFamily="mono"
                        fontSize="2xs"
                        color={tokens.panelBody}
                        flexWrap="wrap"
                      >
                        <Text color={tokens.panelMuted} minW="4.5rem">
                          {formatTime(event.created_at)}
                        </Text>
                        <Text color={kindColor} minW="4rem">
                          {event.kind.toUpperCase()}
                        </Text>
                        <Text color={tokens.panelLabel}>
                          {event.profile?.toUpperCase() ?? "—"}{" "}
                          {event.symbol?.split("/")[0] ?? "—"}{" "}
                          {event.side?.toUpperCase() ?? ""}
                        </Text>
                        <Text color={tokens.panelMuted}>{event.message ?? ""}</Text>
                      </Flex>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
}
