"use client";

import CapacityGaugeCore from "@/components/3_organisms/RiskDeskPanel/CapacityGaugeCore";
import { RiskGateList, RiskModeBanner } from "@/components/3_organisms/RiskDeskPanel/RiskGateList";
import { ProfileBadge } from "@/components/3_organisms/TradeJournalPanel/profileBadge";
import TradeMgmtCore from "@/components/3_organisms/RiskDeskPanel/TradeMgmtCore";
import RPerformanceCore from "@/components/3_organisms/RiskDeskPanel/RPerformanceCore";
import ProfileSubTabs, { type ProfileFilter } from "@/components/2_molecules/ProfileSubTabs/ProfileSubTabs";
import ProfileBalancesStrip from "@/components/2_molecules/ProfileBalancesStrip/ProfileBalancesStrip";
import { useThemeColor, useThemeTokens, type ThemeTokens } from "@/components/ui/theme-color";
import { usePageVisible } from "@/hooks/usePageVisible";
import { useProfileBalances } from "@/hooks/useProfileBalances";
import { fetchRiskDesk } from "@/services/riskDesk";
import { activeSignalsProfiles } from "@/services/config";
import type {
  RiskDeskPayload,
  RiskDeskPosition,
  RiskGatesSummary,
  RiskProfileDesk,
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
  const linked = pos.match_method === "order_id" && pos.journal_id != null;
  const riskMult =
    pos.risk_mult != null && Number.isFinite(pos.risk_mult) ? pos.risk_mult : null;

  return (
    <Box
      px="3"
      py="2.5"
      borderLeftWidth="2px"
      borderLeftColor={accent}
      bg={stripe}
      fontFamily="mono"
      fontSize="xs"
    >
      <Flex gap="3" flexWrap="wrap" align="center" mb={linked ? "1.5" : "0"}>
        <Text fontWeight="bold" color={tokens.title} minW="3rem">
          {pos.symbol}
        </Text>
        <Text color={accent} minW="3rem">
          {side.toUpperCase()}
        </Text>
        {pos.profile ? (
          <ProfileBadge profile={pos.profile} tokens={tokens} />
        ) : null}
        <Text color={tokens.panelBody}>{formatR(pos.r_multiple)}</Text>
        {linked && riskMult != null ? (
          <Text color={tokens.panelMuted}>{`×${riskMult.toFixed(2)}`}</Text>
        ) : null}
        {pos.target_tp_rr != null ? (
          <Text color={tokens.tagAccent.color} title={pos.tp_strategy_id ?? undefined}>
            → {pos.target_tp_rr}R
          </Text>
        ) : null}
        <Text color={tokens.panelMuted}>{formatUsd(pos.unrealized_pnl_usd)}</Text>
        {pos.leverage != null ? (
          <Text color={tokens.panelMuted}>{pos.leverage}x</Text>
        ) : null}
        {linked ? (
          <Text color={tokens.tagGreen.color} fontSize="2xs" letterSpacing="0.08em">
            order-id link
          </Text>
        ) : (
          <Text color={tokens.panelMuted} fontSize="2xs">
            no journal link
          </Text>
        )}
      </Flex>
      {linked ? (
        <Flex gap="4" flexWrap="wrap" color={tokens.panelMuted} fontSize="2xs">
          <Text>
            band{" "}
            <Box as="span" color={tokens.tagAccent.color}>
              {pos.band_side ?? "—"} {pos.band_range ?? "—"}
            </Box>
          </Text>
          {pos.entry_price != null ? (
            <Text>
              entry <Box as="span" color={tokens.panelBody}>{pos.entry_price}</Box>
            </Text>
          ) : null}
          {pos.stop_loss_price != null ? (
            <Text>
              stop <Box as="span">{pos.stop_loss_price}</Box>
            </Text>
          ) : null}
          {riskMult != null ? (
            <Text>
              risk <Box as="span">{`×${riskMult.toFixed(2)}`}</Box>
              {pos.system_setup_grade ? (
                <Box as="span" color={tokens.panelLabel}>{` · ${pos.system_setup_grade}`}</Box>
              ) : null}
            </Text>
          ) : null}
          {pos.target_tp_rr != null ? (
            <Text title={pos.tp_strategy_id ?? undefined}>
              target{" "}
              <Box as="span" color={tokens.tagAccent.color}>
                {pos.target_tp_rr}R
              </Box>
            </Text>
          ) : null}
          {pos.main_order_id ? (
            <Text title={pos.main_order_id} color={tokens.panelLabel}>
              order …{pos.main_order_id.slice(-8)}
            </Text>
          ) : null}
        </Flex>
      ) : null}
    </Box>
  );
}

function ProfileBookSection({
  profileDesk,
  tokens,
  PositionRowComponent,
}: {
  profileDesk: RiskProfileDesk;
  tokens: ThemeTokens;
  PositionRowComponent: typeof PositionRow;
}) {
  const summaryLabel = profileDesk.gates_summary.toUpperCase();

  return (
    <Box borderBottomWidth="1px" borderColor={tokens.panelBorder}>
      <Flex
        px="4"
        pt="3"
        pb="2"
        align="center"
        justify="space-between"
        flexWrap="wrap"
        gap="2"
      >
        <Text
          fontFamily="mono"
          fontSize="xs"
          fontWeight="bold"
          color={tokens.title}
          letterSpacing="0.14em"
        >
          PROFILE {profileDesk.profile.toUpperCase()}
        </Text>
        <Flex gap="2" flexWrap="wrap">
          <EventTag
            label={`NET ${profileDesk.net_side.toUpperCase()}`}
            tone={{
              bg: tokens.blockquoteBg,
              color: netSideColor(tokens, profileDesk.net_side),
              border: netSideColor(tokens, profileDesk.net_side),
            }}
          />
          <EventTag
            label={`GATES ${summaryLabel}`}
            tone={{
              bg: tokens.blockquoteBg,
              color: gateSummaryColor(tokens, profileDesk.gates_summary),
              border: gateSummaryColor(tokens, profileDesk.gates_summary),
            }}
          />
        </Flex>
      </Flex>

      <Box px="4" pb="3">
        <CapacityGaugeCore
          book={profileDesk}
          tokens={tokens}
          title={`Profile ${profileDesk.profile.toUpperCase()} · ${profileDesk.slots_used}/${profileDesk.max_open_trades} slots`}
        />
      </Box>

      <Box px="4" pb="4">
        <Text
          fontFamily="mono"
          fontSize="2xs"
          color={tokens.panelLabel}
          letterSpacing="0.12em"
          mb="2"
        >
          ENTRY GATES
        </Text>
        <RiskGateList gates={profileDesk.gates} tokens={tokens} />
      </Box>

      {profileDesk.positions.length > 0 ? (
        <Box>
          {profileDesk.positions.map((pos, index) => (
            <PositionRowComponent
              key={`${profileDesk.profile}-${pos.symbol}-${index}`}
              pos={pos}
              index={index}
              tokens={tokens}
            />
          ))}
        </Box>
      ) : (
        <Box px="4" pb="3">
          <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
            {`// flat — ${profileDesk.slots_free ?? profileDesk.max_open_trades} profile slot(s) free`}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default function RiskDeskPanel({
  active,
  refreshKey = 0,
}: {
  active: boolean;
  refreshKey?: number;
}) {
  const { palette } = useThemeColor();
  const tokens = useThemeTokens(palette);
  const pageVisible = usePageVisible();
  const [desk, setDesk] = useState<RiskDeskPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("all");
  const { balances, loading: balancesLoading } = useProfileBalances(active, refreshKey);

  useEffect(() => {
    if (!active || !pageVisible) return;
    let cancelled = false;
    setLoading(true);

    const poll = () => {
      void fetchRiskDesk().then((deskData) => {
        if (cancelled) return;
        setDesk(deskData);
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
  }, [active, pageVisible, refreshKey]);

  const allProfileDesks = useMemo(() => {
    if (!desk?.profiles) return [] as RiskProfileDesk[];
    return activeSignalsProfiles()
      .map((key) => desk.profiles[key])
      .filter(
        (p): p is RiskProfileDesk =>
          Boolean(p) && (p.max_open_trades ?? 0) > 0,
      );
  }, [desk]);

  const profileDesks = useMemo(() => {
    if (profileFilter === "all") return allProfileDesks;
    return allProfileDesks.filter((p) => p.profile === profileFilter);
  }, [allProfileDesks, profileFilter]);

  const liveColor =
    loading && !desk
      ? tokens.panelMuted
      : desk?.positions_available
        ? tokens.tagGreen.color
        : tokens.warn;

  const summaryLabel = (desk?.global?.gates_summary ?? desk?.gates_summary)?.toUpperCase() ?? "—";

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
          <Flex gap="3" align="center" flexWrap="wrap" justify="flex-end">
            <Flex gap="4" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} flexWrap="wrap" align="center">
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
            <ProfileSubTabs value={profileFilter} onChange={setProfileFilter} />
          </Flex>
        </Flex>

        <Box
          px="4"
          py="3"
          borderBottomWidth="1px"
          borderColor={tokens.panelBorder}
          bg={tokens.blockquoteBg}
        >
          <ProfileBalancesStrip
            balances={balances}
            profileFilter={profileFilter}
            riskPercent={desk?.risk_percent}
            loading={balancesLoading}
            tokens={tokens}
          />
        </Box>

        {loading && !desk ? (
          <Flex py="12" justify="center">
            <Spinner size="sm" color={tokens.tagAccent.color} />
          </Flex>
        ) : desk ? (
          <Stack gap="0" position="relative">
            <Box px="4" pt="4" pb="3" borderBottomWidth="1px" borderColor={tokens.panelBorder}>
              <RiskModeBanner mode={desk.risk_mode} tokens={tokens} />
            </Box>

            {profileFilter === "all" ? (
              <Box px="4" pt="4" pb="0">
                <RPerformanceCore desk={desk} tokens={tokens} />
              </Box>
            ) : null}

            {profileFilter === "all" ? (
              <Box px="4" py="4" borderBottomWidth="1px" borderColor={tokens.panelBorder}>
                <CapacityGaugeCore
                  book={desk}
                  tokens={tokens}
                  title={`Account slots · ${desk.slots_used}/${desk.max_open_trades}`}
                />
              </Box>
            ) : null}

            {desk.trade_mgmt ? (
              <Box px="4" py="4" borderBottomWidth="1px" borderColor={tokens.panelBorder}>
                <TradeMgmtCore tradeMgmt={desk.trade_mgmt} tokens={tokens} />
              </Box>
            ) : null}

            <Box px="4" py="3" borderBottomWidth="1px" borderColor={tokens.panelBorder}>
              <Flex gap="2" flexWrap="wrap" mb="2">
                <EventTag
                  label={`NET ${desk.net_side.toUpperCase()}`}
                  tone={{
                    bg: tokens.blockquoteBg,
                    color: netSideColor(tokens, desk.net_side),
                    border: netSideColor(tokens, desk.net_side),
                  }}
                />
                {desk.book_state ? (
                  <EventTag label={desk.book_state.toUpperCase()} tone={tokens.tagNeutral} />
                ) : null}
                <EventTag
                  label={`GATES ${summaryLabel}`}
                  tone={{
                    bg: tokens.blockquoteBg,
                    color: gateSummaryColor(
                      tokens,
                      desk.global?.gates_summary ?? desk.gates_summary,
                    ),
                    border: gateSummaryColor(
                      tokens,
                      desk.global?.gates_summary ?? desk.gates_summary,
                    ),
                  }}
                />
              </Flex>
              <RiskGateList
                gates={desk.global?.gates ?? desk.gates}
                tokens={tokens}
                compact
              />
            </Box>

            {profileDesks.map((profileDesk) => (
              <ProfileBookSection
                key={profileDesk.profile}
                profileDesk={profileDesk}
                tokens={tokens}
                PositionRowComponent={PositionRow}
              />
            ))}

            {desk.unknown_positions.length > 0 ? (
              <Box borderBottomWidth="1px" borderColor={tokens.panelBorder}>
                <Text
                  px="4"
                  pt="3"
                  pb="1"
                  fontFamily="mono"
                  fontSize="2xs"
                  color={tokens.warn}
                  letterSpacing="0.12em"
                >
                  UNLINKED POSITIONS
                </Text>
                {desk.unknown_positions.map((pos, index) => (
                  <PositionRow key={`unknown-${pos.symbol}-${index}`} pos={pos} index={index} tokens={tokens} />
                ))}
              </Box>
            ) : null}

            {desk.positions.length === 0 && profileDesks.every((p) => p.positions.length === 0) ? (
              <Box px="4" py="3" borderBottomWidth="1px" borderColor={tokens.panelBorder}>
                <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
                  {"// flat account — profiles have free slots"}
                </Text>
              </Box>
            ) : null}

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
                  {"// no recent trade blocks or opens"}
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
