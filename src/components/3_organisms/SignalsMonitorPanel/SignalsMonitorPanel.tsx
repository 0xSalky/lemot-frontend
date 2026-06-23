"use client";

import { Tooltip } from "@/components/ui/tooltip";
import { useThemeColor, useThemeTokens, type ThemeTokens } from "@/components/ui/theme-color";
import { usePageVisible } from "@/hooks/usePageVisible";
import {
  fetchSignalsActivity,
  fetchSignalsHealth,
  fetchSignalsStats,
} from "@/services/signalsMonitor";
import type {
  SignalMonitorEvent,
  SignalsBandWatchEntry,
  SignalsMonitorHealth,
  SignalsMonitorStats,
  SignalsProfileHealth,
  SignalsServiceStatus,
} from "@/types/signalsMonitorTypes";
import { Box, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useEffect, useMemo, useState } from "react";

const TF_SECONDS: Record<string, number> = {
  "30m": 1800,
  "1h": 3600,
};

const pulse = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 8px currentColor; }
  50% { opacity: 0.45; box-shadow: 0 0 2px currentColor; }
`;

const scan = keyframes`
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
`;

const blink = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
`;

type EventStyle = { color: string; glyph: string; label: string };

function buildEventStyles(tokens: ThemeTokens): Record<string, EventStyle> {
  return {
    alert_sent: { color: tokens.tagGreen.color, glyph: "▶", label: "ALERT" },
    alert_skipped: { color: tokens.tagNeutral.color, glyph: "○", label: "SKIP" },
    bar_processed: { color: tokens.tagBlue.color, glyph: "·", label: "BAR" },
    advice_sent: { color: tokens.tagAccent.color, glyph: "◆", label: "AI" },
    advice_queued: { color: tokens.panelLabel, glyph: "◇", label: "AI·Q" },
    advice_failed: { color: tokens.tagRed.color, glyph: "✕", label: "AI·ERR" },
    telegram_failed: { color: tokens.warn, glyph: "!", label: "TG·ERR" },
    profile_error: { color: tokens.warn, glyph: "!", label: "ERR" },
    fractal_seen: { color: tokens.panelHeading, glyph: "△", label: "FRACTAL" },
    poll: { color: tokens.panelMuted, glyph: "•", label: "POLL" },
  };
}

function statusColor(
  tokens: ThemeTokens,
  status: SignalsServiceStatus,
): string {
  if (status === "live") return tokens.tagGreen.color;
  if (status === "stale") return tokens.panelHeading;
  return tokens.warn;
}

function formatCountdown(totalSec: number): string {
  const sec = Math.max(0, totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatAge(sec: number | null): string {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

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

function truncateText(text: string, max = 96): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function symbolBase(symbol: string | null): string {
  if (!symbol) return "SYS";
  return symbol.split("/")[0] ?? symbol;
}

function barCycleProgress(profile: SignalsProfileHealth): number {
  const total = TF_SECONDS[profile.timeframe] ?? 1800;
  const remaining = Math.max(0, profile.next_bar_close_in_sec);
  return Math.min(1, Math.max(0, 1 - remaining / total));
}

function profileAccent(tokens: ThemeTokens, profileKey: string): string {
  return profileKey === "swing" ? tokens.tagBlue.color : tokens.panelLabel;
}

function ProfilePulseCard({
  profileKey,
  profile,
  countdownSec,
  tokens,
}: {
  profileKey: string;
  profile: SignalsProfileHealth;
  countdownSec: number;
  tokens: ThemeTokens;
}) {
  const accent = profileAccent(tokens, profileKey);
  const progress = barCycleProgress({
    ...profile,
    next_bar_close_in_sec: countdownSec,
  });

  return (
    <Box
      flex="1"
      minW={{ base: "100%", md: "14rem" }}
      p="3"
      borderWidth="1px"
      borderColor={tokens.panelBorder}
      bg={tokens.panelBgUser}
      rounded="sm"
      position="relative"
      overflow="hidden"
    >
      <Box
        position="absolute"
        inset="0"
        opacity={0.08}
        bg={`linear-gradient(90deg, transparent, ${accent}, transparent)`}
        animation={`${scan} 4s linear infinite`}
        pointerEvents="none"
      />
      <Stack gap="2" position="relative">
        <Flex justify="space-between" align="center">
          <Text
            fontFamily="mono"
            fontSize="xs"
            fontWeight="bold"
            color={accent}
            letterSpacing="0.12em"
          >
            {profileKey.toUpperCase()}
          </Text>
          <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
            {profile.timeframe} · {profile.fractal_timing}
          </Text>
        </Flex>

        <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          next candle close
        </Text>
        <Text
          fontFamily="mono"
          fontSize="2xl"
          fontWeight="bold"
          color={tokens.title}
          letterSpacing="0.06em"
          lineHeight="1"
        >
          {formatCountdown(countdownSec)}
        </Text>

        <Box h="3px" bg={tokens.blockquoteBg} rounded="full" overflow="hidden">
          <Box
            h="100%"
            w={`${Math.round(progress * 100)}%`}
            bg={`linear-gradient(90deg, ${accent}, ${tokens.tagGreen.color})`}
            transition="width 1s linear"
          />
        </Box>

        <Flex gap="3" flexWrap="wrap" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
          <Text>watch {profile.symbols_watched}</Text>
          <Text>near band {profile.near_band_count}</Text>
          <Text>last bar {formatTime(profile.last_bar_processed_at)}</Text>
        </Flex>
      </Stack>
    </Box>
  );
}

function fmtPrice(value: unknown): string | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n) >= 1000) return n.toFixed(1);
  if (Math.abs(n) >= 10) return n.toFixed(2);
  return n.toFixed(3);
}

function fmtBand(low: unknown, high: unknown): string | null {
  const lo = Number(low);
  const hi = Number(high);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  const top = fmtPrice(Math.max(lo, hi));
  const bottom = fmtPrice(Math.min(lo, hi));
  if (top == null || bottom == null) return null;
  return `${top}–${bottom}`;
}

function fmtPriceBandLine(price: unknown, low: unknown, high: unknown): string | null {
  const p = fmtPrice(price);
  const band = fmtBand(low, high);
  if (p == null || band == null) return null;
  return `${p} | ${band}`;
}

function EventTag({
  label,
  tone,
  block = false,
}: {
  label: string;
  tone: { bg: string; color: string; border: string };
  block?: boolean;
}) {
  return (
    <Box
      as="span"
      display={block ? "block" : "inline-block"}
      w={block ? "100%" : undefined}
      textAlign={block ? "center" : undefined}
      px="1.5"
      py="0"
      rounded="sm"
      fontFamily="mono"
      fontSize="2xs"
      fontWeight="medium"
      letterSpacing="0.04em"
      lineHeight="1.5"
      bg={tone.bg}
      color={tone.color}
      borderWidth="1px"
      borderColor={tone.border}
      whiteSpace="nowrap"
      overflow="hidden"
      textOverflow="ellipsis"
    >
      {label}
    </Box>
  );
}

function TagGrid({
  tags,
  minColWidth = "4.75rem",
  layout = "full",
}: {
  tags: Array<{ label: string; tone: { bg: string; color: string; border: string } } | null>;
  minColWidth?: string;
  layout?: "full" | "compact";
}) {
  const cells = [...tags.slice(0, 3)];
  while (cells.length < 3) cells.push(null);

  return (
    <Box
      display="grid"
      gridTemplateColumns={`repeat(3, minmax(${minColWidth}, 1fr))`}
      gap="1.5"
      w={layout === "full" ? { base: "100%", md: "15rem" } : "auto"}
      flexShrink={0}
    >
      {cells.map((tag, index) => (
        <Box key={index} minW="0">
          {tag ? <EventTag label={tag.label} tone={tag.tone} block /> : <Box h="1.35rem" />}
        </Box>
      ))}
    </Box>
  );
}

function BandWatchRow({
  entry,
  profileKey,
  tokens,
}: {
  entry: SignalsBandWatchEntry;
  profileKey: string;
  tokens: ThemeTokens;
}) {
  const base = symbolBase(entry.symbol);
  const priceBand = fmtPriceBandLine(entry.price, entry.band_low, entry.band_high);
  const accent = profileAccent(tokens, profileKey);
  const distLabel = entry.at_band ? "IN" : `${entry.distance_pct.toFixed(2)}%`;
  const weightLabel = `w=${entry.band_weight}`;
  const sideTone =
    entry.band_side === "SUP"
      ? tokens.tagGreen
      : entry.band_side === "RES"
        ? tokens.tagRed
        : tokens.tagBlue;

  return (
    <Stack
      gap="1"
      py="2"
      px="3"
      borderLeftWidth="2px"
      borderLeftColor={accent}
      _hover={{ bg: tokens.blockquoteBg }}
      fontFamily="mono"
      fontSize="xs"
    >
      <Flex gap="2" align="center" justify="space-between" minW="0">
        <Flex gap="3" align="center" minW="0">
          <Text color={tokens.panelLabel} fontSize="2xs" flexShrink={0}>
            {profileKey.toUpperCase()}
          </Text>
          <Text color={tokens.inlineStrong} fontWeight="bold" fontSize="sm" flexShrink={0}>
            {base}
          </Text>
        </Flex>
        <Tooltip
          showArrow
          openDelay={200}
          content={
            <Box
              bg={tokens.panelBgUser}
              borderWidth="1px"
              borderColor={tokens.panelBorder}
              rounded="md"
              p="2"
              fontFamily="mono"
              fontSize="2xs"
              color={tokens.panelBody}
            >
              Band confluence weight (same as scanner w=)
            </Box>
          }
          contentProps={{ bg: "transparent", border: "none", p: 0 }}
        >
          <Box flexShrink={0}>
            <TagGrid
              layout="compact"
              minColWidth="3.25rem"
              tags={[
                { label: entry.band_side, tone: sideTone },
                {
                  label: distLabel,
                  tone: entry.at_band ? tokens.tagGreen : tokens.tagAccent,
                },
                { label: weightLabel, tone: tokens.tagBlue },
              ]}
            />
          </Box>
        </Tooltip>
      </Flex>
      {priceBand ? (
        <Text
          color={tokens.panelBody}
          fontSize="xs"
          whiteSpace="nowrap"
          overflowX="auto"
          lineHeight="1.4"
          css={{ WebkitOverflowScrolling: "touch" }}
        >
          {priceBand}
        </Text>
      ) : null}
    </Stack>
  );
}

function metaString(meta: Record<string, unknown> | null, key: string): string | null {
  if (!meta) return null;
  const value = meta[key];
  return value != null ? String(value) : null;
}

function hasAiTooltip(meta: Record<string, unknown> | null): boolean {
  return Boolean(meta?.ai_message && String(meta.ai_message).trim());
}

function AiTooltipContent({
  meta,
  tokens,
}: {
  meta: Record<string, unknown>;
  tokens: ThemeTokens;
}) {
  const verdict = metaString(meta, "verdict") ?? "—";
  const grade = metaString(meta, "setup_grade");
  const prob = meta.enter_probability_pct;
  const base = meta.system_base_probability_pct;
  const adj = meta.ai_adjustment_pts;
  const risk = metaString(meta, "risk");
  const confidence = metaString(meta, "confidence");
  const message = String(meta.ai_message ?? "");

  return (
    <Box
      maxW={{ base: "18rem", md: "24rem" }}
      p="2"
      fontFamily="mono"
      fontSize="2xs"
      lineHeight="1.5"
    >
      <Text color={tokens.title} fontWeight="bold" letterSpacing="0.1em" mb="1">
        AI ENTRY READ
      </Text>
      <Flex gap="2" flexWrap="wrap" mb="2" color={tokens.tagAccent.color}>
        <Text>{verdict}</Text>
        {grade ? <Text>grade {grade}</Text> : null}
        {prob != null ? <Text>{String(prob)}%</Text> : null}
        {base != null && adj != null ? (
          <Text>
            {String(base)}→{String(prob)} ({Number(adj) >= 0 ? "+" : ""}
            {String(adj)})
          </Text>
        ) : null}
        {confidence ? <Text>{confidence} conf</Text> : null}
        {risk ? <Text>{risk} risk</Text> : null}
      </Flex>
      <Box
        p="2"
        rounded="sm"
        bg={tokens.panelBg}
        borderWidth="1px"
        borderColor={tokens.tagAccent.border}
        color={tokens.panelBody}
        whiteSpace="pre-wrap"
        maxH="14rem"
        overflowY="auto"
      >
        {message}
      </Box>
    </Box>
  );
}

function eventTypeTone(
  eventType: string,
  tokens: ThemeTokens,
): { bg: string; color: string; border: string } {
  switch (eventType) {
    case "alert_sent":
      return tokens.tagGreen;
    case "alert_skipped":
      return tokens.tagNeutral;
    case "advice_sent":
    case "advice_queued":
      return tokens.tagAccent;
    case "advice_failed":
    case "telegram_failed":
    case "profile_error":
      return tokens.tagRed;
    default:
      return tokens.tagBlue;
  }
}

function buildDetailLine(
  event: SignalMonitorEvent,
  meta: Record<string, unknown> | null,
): string | null {
  const parts: string[] = [];
  const bandSide = meta?.band_side != null ? String(meta.band_side) : null;
  const band = fmtBand(meta?.band_low, meta?.band_high);
  const fractal = fmtPrice(meta?.fractal_level);

  if (fractal) parts.push(`fractal @ ${fractal}`);
  if (bandSide && band) parts.push(`${bandSide} ${band}`);
  else if (band) parts.push(`band ${band}`);
  if (meta?.trigger != null) parts.push(String(meta.trigger));
  if (meta?.placement != null) parts.push(String(meta.placement));
  if (meta?.enter_probability_pct != null) parts.push(`${String(meta.enter_probability_pct)}%`);
  if (event.timeframe) parts.push(event.timeframe);

  if (parts.length === 0) return event.message;
  return parts.join(" · ");
}

function TerminalLine({
  event,
  tokens,
  eventStyles,
}: {
  event: SignalMonitorEvent;
  tokens: ThemeTokens;
  eventStyles: Record<string, EventStyle>;
}) {
  const style =
    eventStyles[event.event_type] ?? {
      color: tokens.panelMuted,
      glyph: "·",
      label: event.event_type.toUpperCase(),
    };
  const base = symbolBase(event.symbol);
  const side = event.side?.toLowerCase();
  const meta = event.meta;
  const isArchive = meta?.imported === true;
  const showAiHint = hasAiTooltip(meta);
  const profileLabel = (event.profile ?? "—").toUpperCase();
  const tf = event.timeframe ?? (event.profile === "day" ? "30m" : event.profile === "swing" ? "1h" : null);
  const detail = buildDetailLine(event, meta);
  const detailShort = detail ? truncateText(detail, 110) : null;

  const headerTags = (
    <TagGrid
      tags={[
        { label: style.label, tone: eventTypeTone(event.event_type, tokens) },
        side === "long" || side === "short"
          ? {
              label: side.toUpperCase(),
              tone: side === "long" ? tokens.tagGreen : tokens.tagRed,
            }
          : null,
        isArchive
          ? { label: "hist", tone: tokens.tagBlue }
          : meta?.band_side != null
            ? { label: String(meta.band_side), tone: tokens.tagBlue }
            : showAiHint
              ? { label: "AI read", tone: tokens.tagAccent }
              : meta?.verdict != null
                ? { label: String(meta.verdict), tone: tokens.tagAccent }
                : null,
      ]}
    />
  );

  const row = (
    <Stack
      gap="1"
      py="2"
      px="3"
      _hover={{ bg: tokens.blockquoteBg }}
      borderLeftWidth="2px"
      borderLeftColor={style.color}
      fontFamily="mono"
      fontSize="xs"
      lineHeight="1.45"
      transition="background 0.15s ease"
    >
      <Flex
        gap="3"
        align="center"
        flexWrap="wrap"
        justifyContent="space-between"
      >
        <Flex gap="3" align="center" flexWrap="wrap" minW="0">
          <Text color={tokens.panelMuted} flexShrink={0} fontSize="2xs" minW="8.5rem">
            {formatDateTime(event.created_at)}
          </Text>
          <Text color={tokens.panelLabel} flexShrink={0} fontSize="2xs" fontWeight="medium">
            {profileLabel}
          </Text>
          {tf ? (
            <Text color={tokens.panelMuted} flexShrink={0} fontSize="2xs">
              {tf}
            </Text>
          ) : null}
          <Text color={tokens.inlineStrong} flexShrink={0} fontWeight="bold" fontSize="sm">
            {base}
          </Text>
        </Flex>
        {headerTags}
      </Flex>
      {detailShort ? (
        <Text color={tokens.panelBody} fontSize="2xs" pl="0.5" lineHeight="1.5">
          {detailShort}
        </Text>
      ) : null}
    </Stack>
  );

  if (showAiHint && meta) {
    return (
      <Tooltip
        showArrow
        openDelay={200}
        content={
          <Box
            bg={tokens.panelBgUser}
            borderWidth="1px"
            borderColor={tokens.panelBorder}
            rounded="md"
            boxShadow={`0 0 24px ${tokens.panelBorder}`}
          >
            <AiTooltipContent meta={meta} tokens={tokens} />
          </Box>
        }
        contentProps={{ bg: "transparent", border: "none", p: 0 }}
      >
        <Box cursor="help">{row}</Box>
      </Tooltip>
    );
  }

  return row;
}

function StatsStrip({
  stats,
  tokens,
}: {
  stats: SignalsMonitorStats;
  tokens: ThemeTokens;
}) {
  const maxHour = Math.max(1, ...stats.alerts_by_hour.map((h) => h.count));

  return (
    <Flex
      gap="4"
      flexWrap="wrap"
      p="3"
      borderTopWidth="1px"
      borderColor={tokens.panelBorder}
      fontFamily="mono"
      fontSize="2xs"
      color={tokens.panelMuted}
    >
      <Text>
        <Box as="span" color={tokens.tagGreen.color}>
          {stats.alerts_sent}
        </Box>{" "}
        alerts
      </Text>
      <Text>
        <Box as="span" color={tokens.tagAccent.color}>
          {stats.advice_sent}
        </Box>{" "}
        AI ok
      </Text>
      <Text>
        <Box as="span" color={tokens.warn}>
          {stats.advice_failed + stats.telegram_failed}
        </Box>{" "}
        errors
      </Text>
      <Flex align="flex-end" gap="0.5" ml="auto" minH="1.5rem">
        {stats.alerts_by_hour.map((bucket) => (
          <Box
            key={bucket.hour}
            title={`${bucket.hour}: ${bucket.count}`}
            w="0.45rem"
            h={`${Math.max(2, (bucket.count / maxHour) * 20)}px`}
            bg={tokens.tagGreen.color}
            opacity={0.65}
            rounded="sm"
          />
        ))}
      </Flex>
    </Flex>
  );
}

type SignalsMonitorPanelProps = {
  active?: boolean;
};

async function fetchMonitorSnapshot() {
  const [healthData, activityData, statsData] = await Promise.all([
    fetchSignalsHealth(),
    fetchSignalsActivity(120),
    fetchSignalsStats(24),
  ]);
  const countdownBase: Record<string, number> = {};
  for (const [key, profile] of Object.entries(healthData.profiles)) {
    countdownBase[key] = profile.next_bar_close_in_sec;
  }
  return {
    health: healthData,
    liveEvents: activityData.live_events,
    historyEvents: activityData.history_events,
    stats: statsData,
    countdownBase,
  };
}

export default function SignalsMonitorPanel({ active = true }: SignalsMonitorPanelProps) {
  const { palette } = useThemeColor();
  const tokens = useThemeTokens(palette);
  const eventStyles = useMemo(() => buildEventStyles(tokens), [tokens]);
  const pageVisible = usePageVisible();
  const [health, setHealth] = useState<SignalsMonitorHealth | null>(null);
  const [liveEvents, setLiveEvents] = useState<SignalMonitorEvent[]>([]);
  const [historyEvents, setHistoryEvents] = useState<SignalMonitorEvent[]>([]);
  const [stats, setStats] = useState<SignalsMonitorStats | null>(null);
  const [countdownBase, setCountdownBase] = useState<Record<string, number>>({});
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!active || !pageVisible) return;

    let cancelled = false;

    const poll = () => {
      void (async () => {
        const data = await fetchMonitorSnapshot();
        if (cancelled) return;
        setHealth(data.health);
        setLiveEvents(data.liveEvents);
        setHistoryEvents(data.historyEvents);
        setStats(data.stats);
        setCountdownBase(data.countdownBase);
        setTick(0);
        setLoading(false);
      })();
    };

    const initial = window.setTimeout(poll, 0);
    const id = window.setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(id);
    };
  }, [active, pageVisible]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const profileEntries = useMemo(() => {
    if (!health) return [];
    return Object.entries(health.profiles);
  }, [health]);

  const liveStatusColor = loading && !health
    ? tokens.panelMuted
    : health
      ? statusColor(tokens, health.service_status)
      : tokens.warn;

  const bandWatchEntries = useMemo(() => {
    const rows: Array<{ profileKey: string; entry: SignalsBandWatchEntry }> = [];
    for (const [key, profile] of profileEntries) {
      for (const entry of profile.band_watch ?? []) {
        rows.push({ profileKey: key, entry });
      }
    }
    rows.sort((a, b) => a.entry.distance_pct - b.entry.distance_pct);
    return rows;
  }, [profileEntries]);

  const archiveTotal = useMemo(
    () => profileEntries.reduce((sum, [, profile]) => sum + profile.alerts_total, 0),
    [profileEntries],
  );

  const nearBandMaxPct = health?.monitor_near_band_max_dist_pct ?? 2;
  const showPaused = Boolean(health && (health.paused || !health.signals_enabled));
  const noProfiles = !loading && profileEntries.length === 0;
  const statusLabel = loading && !health
    ? "LOADING"
    : (health?.service_status?.toUpperCase() ?? "—");

  return (
    <Box mt="2">
      <Box
        borderWidth="1px"
        borderColor={tokens.panelBorder}
        bg={tokens.panelBg}
        rounded="md"
        overflow="hidden"
        position="relative"
        boxShadow={`0 0 40px ${tokens.panelBorder}`}
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
              bg={liveStatusColor}
              color={liveStatusColor}
              animation={health?.service_status === "live" ? `${pulse} 2s ease-in-out infinite` : undefined}
            />
            <Stack gap="0">
              <Text
                fontFamily="mono"
                fontSize="sm"
                fontWeight="bold"
                color={tokens.title}
                letterSpacing="0.14em"
              >
                SIGNALS_TERMINAL
              </Text>
              <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
                poll {health?.poll_interval_sec ?? 30}s · near band ≤{nearBandMaxPct}% · {statusLabel}
              </Text>
            </Stack>
          </Flex>

          <Flex gap="4" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} flexWrap="wrap">
            <Text>
              last poll{" "}
              <Box as="span" color={tokens.panelBody}>
                {formatAge(health?.last_poll_age_sec ?? null)} ago
              </Box>
            </Text>
            {health?.last_poll_duration_ms != null ? (
              <Text>
                cycle{" "}
                <Box as="span" color={tokens.panelBody}>
                  {health.last_poll_duration_ms}ms
                </Box>
              </Text>
            ) : null}
            <Text>
              telegram{" "}
              <Box as="span" color={health?.telegram_configured ? tokens.tagGreen.color : tokens.warn}>
                {health?.telegram_configured ? "armed" : "off"}
              </Box>
            </Text>
            <Text>
              AI{" "}
              <Box
                as="span"
                color={health?.entry_advice_enabled ? tokens.tagAccent.color : tokens.panelMuted}
              >
                {health?.entry_advice_enabled ? "on" : "off"}
              </Box>
            </Text>
            <Text animation={`${blink} 1.2s step-end infinite`} color={tokens.title}>
              _
            </Text>
          </Flex>
        </Flex>

        {showPaused ? (
          <Box
            px="4"
            py="2"
            bg={tokens.blockquoteBg}
            borderBottomWidth="1px"
            borderColor={tokens.panelBorder}
          >
            <Text fontFamily="mono" fontSize="xs" color={tokens.panelHeading}>
              {"// signals paused — runner idle, no profile evaluation"}
            </Text>
          </Box>
        ) : null}

        {!showPaused && noProfiles && !loading ? (
          <Box
            px="4"
            py="2"
            bg={tokens.blockquoteBg}
            borderBottomWidth="1px"
            borderColor={tokens.panelBorder}
          >
            <Text fontFamily="mono" fontSize="xs" color={tokens.panelMuted}>
              {"// no active profiles — enable day or swing in Config"}
            </Text>
          </Box>
        ) : null}

        {profileEntries.length > 0 ? (
          <Flex p="4" gap="3" flexWrap="wrap" borderBottomWidth="1px" borderColor={tokens.panelBorder}>
            {profileEntries.map(([key, profile]) => {
              const countdown = Math.max(0, (countdownBase[key] ?? profile.next_bar_close_in_sec) - tick);
              return (
                <ProfilePulseCard
                  key={key}
                  profileKey={key}
                  profile={profile}
                  countdownSec={countdown}
                  tokens={tokens}
                />
              );
            })}
          </Flex>
        ) : null}

        <Box
          maxH={{ base: "22rem", md: "28rem" }}
          overflowY="auto"
          position="relative"
          css={{
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-thumb": {
              background: tokens.panelBorder,
              borderRadius: "3px",
            },
          }}
        >
          {bandWatchEntries.length > 0 ? (
            <Box borderBottomWidth="1px" borderColor={tokens.panelBorder}>
              <Text
                px="3"
                py="2"
                fontFamily="mono"
                fontSize="2xs"
                color={tokens.panelHeading}
                letterSpacing="0.1em"
                bg={tokens.blockquoteBg}
              >
                NEAR BAND · {bandWatchEntries.length} live
              </Text>
              {bandWatchEntries.map(({ profileKey, entry }) => (
                <BandWatchRow
                  key={`${profileKey}-${entry.symbol}-${entry.band_low}-${entry.band_high}`}
                  entry={entry}
                  profileKey={profileKey}
                  tokens={tokens}
                />
              ))}
            </Box>
          ) : null}

          {liveEvents.length > 0 ? (
            <Box borderBottomWidth={historyEvents.length > 0 ? "1px" : undefined} borderColor={tokens.panelBorder}>
              <Text
                px="3"
                py="2"
                fontFamily="mono"
                fontSize="2xs"
                color={tokens.panelHeading}
                letterSpacing="0.1em"
                bg={tokens.blockquoteBg}
                borderBottomWidth="1px"
                borderColor={tokens.panelBorder}
              >
                SIGNAL ACTIVITY · {liveEvents.length} live
              </Text>
              {liveEvents.map((event) => (
                <TerminalLine
                  key={`live-${event.id}-${event.created_at}-${event.symbol ?? ""}`}
                  event={event}
                  tokens={tokens}
                  eventStyles={eventStyles}
                />
              ))}
            </Box>
          ) : null}

          {historyEvents.length > 0 ? (
            <Box>
              <Text
                px="3"
                py="2"
                fontFamily="mono"
                fontSize="2xs"
                color={tokens.panelHeading}
                letterSpacing="0.1em"
                bg={tokens.blockquoteBg}
                borderBottomWidth="1px"
                borderColor={tokens.panelBorder}
              >
                HISTORY · {historyEvents.length} shown ({archiveTotal} total alerts)
              </Text>
              {historyEvents.map((event) => (
                <TerminalLine
                  key={`hist-${event.id}-${event.created_at}-${event.symbol ?? ""}`}
                  event={event}
                  tokens={tokens}
                  eventStyles={eventStyles}
                />
              ))}
            </Box>
          ) : null}

          {loading &&
          bandWatchEntries.length === 0 &&
          liveEvents.length === 0 &&
          historyEvents.length === 0 ? (
            <Flex p="6" gap="3" align="center" justify="center" color={tokens.panelMuted}>
              <Spinner size="sm" color={tokens.panelHeading} />
              <Text fontFamily="mono" fontSize="xs">
                Loading signals monitor…
              </Text>
            </Flex>
          ) : null}

          {!loading &&
          bandWatchEntries.length === 0 &&
          liveEvents.length === 0 &&
          historyEvents.length === 0 ? (
            <Text p="4" fontFamily="mono" fontSize="xs" color={tokens.panelMuted} lineHeight="1.6">
              {`// quiet — no symbols within ${nearBandMaxPct}% of an HTF band.`}
              <br />
              {"// past alerts appear in history when available."}
            </Text>
          ) : null}
        </Box>

        {stats ? <StatsStrip stats={stats} tokens={tokens} /> : null}
      </Box>

      <Text mt="2" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
        Near band = live actionable levels only (SUP not broken below, RES not broken above).
      </Text>
    </Box>
  );
}
