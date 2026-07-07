"use client";

import ThemeTabTrigger from "@/components/2_molecules/ThemeTabTrigger/ThemeTabTrigger";
import { Tooltip } from "@/components/ui/tooltip";
import { useThemeColor, useThemeTokens, type ThemeTokens } from "@/components/ui/theme-color";
import { usePageVisible } from "@/hooks/usePageVisible";
import {
  fetchSignalsActivity,
  fetchSignalsHealth,
  fetchSignalsStats,
} from "@/services/signalsMonitor";
import ProfileCountdownCore from "./ProfileCountdownCore";
import { SignalConditionDots } from "./SignalConditionDots";
import { buildAlertConditions, buildBandWatchConditions, mergeHistoricSignalEvents } from "./signalConditions";
import type {
  SignalMonitorEvent,
  SignalsBandWatchEntry,
  SignalsMonitorHealth,
  SignalsMonitorStats,
  SignalsProfileHealth,
  SignalsServiceStatus,
} from "@/types/signalsMonitorTypes";
import { Box, Flex, Spinner, Stack, Tabs, Text } from "@chakra-ui/react";
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

function profileAccent(tokens: ThemeTokens, profileKey: string): string {
  return profileKey === "b" ? tokens.tagBlue.color : tokens.panelLabel;
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

function rowStripeBg(tokens: ThemeTokens, index: number, active = false): string {
  if (active) return tokens.panelBgUser;
  return index % 2 === 1 ? tokens.blockquoteBg : "transparent";
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
      py="0.5"
      rounded="sm"
      fontFamily="mono"
      fontSize="2xs"
      fontWeight="semibold"
      letterSpacing="0.05em"
      lineHeight="1.4"
      bg={tone.bg}
      color={tone.color}
      borderWidth="1px"
      borderColor={tone.border}
      whiteSpace="nowrap"
      overflow="hidden"
      textOverflow="ellipsis"
      transition="box-shadow 0.15s ease"
      _hover={{ boxShadow: `0 0 10px ${tone.border}` }}
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
  rowIndex = 0,
}: {
  entry: SignalsBandWatchEntry;
  profileKey: string;
  tokens: ThemeTokens;
  rowIndex?: number;
}) {
  const base = symbolBase(entry.symbol);
  const priceBand = fmtPriceBandLine(entry.price, entry.band_low, entry.band_high);
  const accent = profileAccent(tokens, profileKey);
  const distLabel =
    entry.at_band
      ? "IN"
      : entry.distance_pct != null
        ? `${entry.distance_pct.toFixed(2)}%`
        : "—";
  const weightLabel = entry.band_weight > 0 ? `w=${entry.band_weight}` : "—";
  const isNear = entry.near_band === true;
  const sideTone =
    entry.band_side === "SUP"
      ? tokens.tagGreen
      : entry.band_side === "RES"
        ? tokens.tagRed
        : tokens.tagBlue;
  const watchConditions = buildBandWatchConditions(entry);

  return (
    <Stack
      gap="1"
      py="2.5"
      px="3"
      borderLeftWidth="2px"
      borderLeftColor={isNear ? accent : tokens.panelBorder}
      borderBottomWidth="1px"
      borderBottomColor={tokens.panelBorder}
      bg={rowStripeBg(tokens, rowIndex)}
      opacity={isNear ? 1 : 0.82}
      _hover={{ bg: tokens.panelBgUser, opacity: 1 }}
      transition="background 0.15s ease, opacity 0.15s ease"
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
                  tone: entry.at_band
                    ? tokens.tagGreen
                    : isNear
                      ? tokens.tagAccent
                      : tokens.tagNeutral,
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
          pl="0.5"
          fontVariantNumeric="tabular-nums"
          css={{ WebkitOverflowScrolling: "touch" }}
        >
          {priceBand}
        </Text>
      ) : null}
      <SignalConditionDots
        conditions={watchConditions}
        tokens={tokens}
        variant="watch"
        compact
      />
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
  if (meta?.verdict != null) parts.push(String(meta.verdict));
  if (meta?.setup_grade != null) parts.push(`grade ${String(meta.setup_grade)}`);
  if (event.timeframe) parts.push(event.timeframe);

  if (parts.length === 0) return event.message;
  return parts.join(" · ");
}

function TerminalLine({
  event,
  tokens,
  eventStyles,
  rowIndex = 0,
  live = false,
  showConditionDots = true,
}: {
  event: SignalMonitorEvent;
  tokens: ThemeTokens;
  eventStyles: Record<string, EventStyle>;
  rowIndex?: number;
  live?: boolean;
  showConditionDots?: boolean;
}) {
  const [aiOpen, setAiOpen] = useState(false);
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
  const hasAdvice =
    event.event_type === "alert_sent" &&
    (meta?.ai_message != null || meta?.verdict != null);
  const showAiHint = hasAiTooltip(meta);
  const profileLabel = (event.profile ?? "—").toUpperCase();
  const tf = event.timeframe ?? (event.profile === "a" ? "30m" : event.profile === "b" ? "4h" : null);
  const detail = buildDetailLine(event, meta);
  const detailShort = detail ? truncateText(detail, 110) : null;
  const alertConditions =
    event.event_type === "alert_sent" || event.event_type === "alert_skipped"
      ? buildAlertConditions(meta, side ?? null, event.event_type)
      : null;

  const headerTags = (
    <TagGrid
      tags={[
        {
          label: hasAdvice ? "ALERT+AI" : style.label,
          tone: eventTypeTone(event.event_type, tokens),
        },
        side === "long" || side === "short"
          ? {
            label: side.toUpperCase(),
            tone: side === "long" ? tokens.tagGreen : tokens.tagRed,
          }
          : null,
        isArchive
          ? { label: "hist", tone: tokens.tagBlue }
          : meta?.verdict != null
            ? {
              label: String(meta.verdict).toUpperCase(),
              tone:
                String(meta.verdict).toLowerCase() === "enter"
                  ? tokens.tagGreen
                  : tokens.tagRed,
            }
            : meta?.band_side != null
              ? { label: String(meta.band_side), tone: tokens.tagBlue }
              : showAiHint
                ? { label: "AI read", tone: tokens.tagAccent }
                : null,
      ]}
    />
  );

  const toggleAi = () => {
    if (showAiHint) setAiOpen((open) => !open);
  };

  const row = (
    <Stack
      gap="1"
      py="2.5"
      px="3"
      bg={rowStripeBg(tokens, rowIndex, aiOpen)}
      _hover={{ bg: aiOpen ? tokens.panelBgUser : tokens.blockquoteBg }}
      borderLeftWidth="2px"
      borderLeftColor={style.color}
      borderBottomWidth="1px"
      borderBottomColor={tokens.panelBorder}
      fontFamily="mono"
      fontSize="xs"
      lineHeight="1.45"
      transition="background 0.15s ease"
      cursor={showAiHint ? "pointer" : undefined}
      onClick={showAiHint ? toggleAi : undefined}
      role={showAiHint ? "button" : undefined}
      aria-expanded={showAiHint ? aiOpen : undefined}
      aria-label={showAiHint ? "Toggle AI entry read" : undefined}
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
        <Flex align="center" gap="2" minW="0" pl="0.5">
          <Text
            color={tokens.panelBody}
            fontSize="2xs"
            lineHeight="1.5"
            flex="1"
            minW="0"
            textDecoration={showAiHint && !aiOpen ? "underline dotted" : undefined}
            textDecorationColor={tokens.tagAccent.border}
            textUnderlineOffset="3px"
          >
            {detailShort}
          </Text>
          {showAiHint ? (
            <Text
              flexShrink={0}
              fontSize="2xs"
              color={tokens.tagAccent.color}
              letterSpacing="0.06em"
            >
              {aiOpen ? "▲ hide" : "▼ AI read"}
            </Text>
          ) : null}
        </Flex>
      ) : showAiHint ? (
        <Text fontSize="2xs" color={tokens.tagAccent.color} pl="0.5" letterSpacing="0.06em">
          {aiOpen ? "▲ hide AI read" : "▼ tap for AI read"}
        </Text>
      ) : null}
      {showConditionDots && alertConditions ? (
        <SignalConditionDots
          conditions={alertConditions}
          tokens={tokens}
          variant="alert"
          pulse={live && rowIndex === 0}
        />
      ) : null}
    </Stack>
  );

  if (showAiHint && meta) {
    const aiPanel = aiOpen ? (
      <Box
        px="3"
        pb="3"
        pt="1"
        bg={tokens.panelBgUser}
        borderBottomWidth="1px"
        borderBottomColor={tokens.panelBorder}
        borderLeftWidth="2px"
        borderLeftColor={tokens.tagAccent.color}
      >
        <AiTooltipContent meta={meta} tokens={tokens} />
      </Box>
    ) : null;

    return (
      <Box>
        <Tooltip
          showArrow
          openDelay={200}
          disabled={aiOpen}
          content={
            <Box
              bg={tokens.panelBgUser}
              borderWidth="1px"
              borderColor={tokens.panelBorder}
              rounded="md"
              boxShadow={tokens.panelGlow}
            >
              <AiTooltipContent meta={meta} tokens={tokens} />
            </Box>
          }
          contentProps={{ bg: "transparent", border: "none", p: 0 }}
        >
          <Box>{row}</Box>
        </Tooltip>
        {aiPanel}
      </Box>
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
  refreshKey?: number;
};

async function fetchMonitorSnapshot() {
  const [healthData, activityData, statsData] = await Promise.all([
    fetchSignalsHealth(),
    fetchSignalsActivity(200),
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

export default function SignalsMonitorPanel({ active = true, refreshKey = 0 }: SignalsMonitorPanelProps) {
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
  const [feedTab, setFeedTab] = useState("watchlist");

  useEffect(() => {
    if (!active || !pageVisible) return;

    let cancelled = false;
    setLoading(true);

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
  }, [active, pageVisible, refreshKey]);

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

  const watchlistEntries = useMemo(() => {
    const rows: Array<{ profileKey: string; entry: SignalsBandWatchEntry }> = [];
    for (const [key, profile] of profileEntries) {
      const list =
        profile.watchlist.length > 0 ? profile.watchlist : profile.band_watch;
      for (const entry of list) {
        rows.push({ profileKey: key, entry });
      }
    }
    rows.sort((a, b) => {
      const nearA = a.entry.near_band ? 0 : 1;
      const nearB = b.entry.near_band ? 0 : 1;
      if (nearA !== nearB) return nearA - nearB;
      const distA = a.entry.distance_pct ?? 999;
      const distB = b.entry.distance_pct ?? 999;
      if (distA !== distB) return distA - distB;
      return a.entry.symbol.localeCompare(b.entry.symbol);
    });
    return rows;
  }, [profileEntries]);

  const watchlistNearCount = useMemo(
    () => watchlistEntries.filter(({ entry }) => entry.near_band).length,
    [watchlistEntries],
  );

  const historicEvents = useMemo(
    () => mergeHistoricSignalEvents(liveEvents, historyEvents),
    [liveEvents, historyEvents],
  );

  const nearBandMaxPct = health?.monitor_near_band_max_dist_pct ?? 2;
  const showPaused = Boolean(health && (health.paused || !health.signals_enabled));
  const noProfiles = !loading && profileEntries.length === 0;
  const statusLabel = loading && !health
    ? "LOADING"
    : (health?.service_status?.toUpperCase() ?? "—");

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
              AI A{" "}
              <Box
                as="span"
                color={
                  health?.a_entry_advice_enabled ? tokens.tagAccent.color : tokens.panelMuted
                }
              >
                {health?.a_entry_advice_enabled ? "on" : "off"}
              </Box>
              {" · "}B{" "}
              <Box
                as="span"
                color={
                  health?.b_entry_advice_enabled
                    ? tokens.tagAccent.color
                    : tokens.panelMuted
                }
              >
                {health?.b_entry_advice_enabled ? "on" : "off"}
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
              {"// no active profiles — enable A or B in Config"}
            </Text>
          </Box>
        ) : null}

        {profileEntries.length > 0 ? (
          <Flex p="4" gap="3" flexWrap="wrap" borderBottomWidth="1px" borderColor={tokens.panelBorder}>
            {profileEntries.map(([key, profile]) => {
              const countdown = Math.max(0, (countdownBase[key] ?? profile.next_bar_close_in_sec) - tick);
              return (
                <ProfileCountdownCore
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

        <Tabs.Root
          value={feedTab}
          onValueChange={(event) => setFeedTab(event.value)}
          colorPalette={palette}
        >
          <Tabs.List
            px="3"
            pt="2"
            bg="transparent"
            borderBottomWidth="1px"
            borderColor={tokens.panelBorder}
            gap="2"
          >
            <ThemeTabTrigger value="watchlist">
              Watchlist
              {watchlistEntries.length > 0 ? ` · ${watchlistEntries.length}` : ""}
            </ThemeTabTrigger>
            <ThemeTabTrigger value="historic">
              Historic{historicEvents.length > 0 ? ` · ${historicEvents.length}` : ""}
            </ThemeTabTrigger>
          </Tabs.List>

          <Tabs.Content value="watchlist" p="0">
            {loading && watchlistEntries.length === 0 ? (
              <Flex p="6" gap="3" align="center" justify="center" color={tokens.panelMuted}>
                <Spinner size="sm" color={tokens.panelHeading} />
                <Text fontFamily="mono" fontSize="xs">
                  Loading watchlist…
                </Text>
              </Flex>
            ) : watchlistEntries.length > 0 ? (
              <>
                <Box
                  px="3"
                  py="2"
                  borderBottomWidth="1px"
                  borderColor={tokens.panelBorder}
                  bg={tokens.blockquoteBg}
                >
                  <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
                    {watchlistNearCount} near band · ≤{nearBandMaxPct}% threshold
                  </Text>
                </Box>
                {watchlistEntries.map(({ profileKey, entry }, index) => (
                  <BandWatchRow
                    key={`${profileKey}-${entry.symbol}-${entry.band_low ?? "x"}-${entry.band_high ?? "x"}`}
                    entry={entry}
                    profileKey={profileKey}
                    tokens={tokens}
                    rowIndex={index}
                  />
                ))}
              </>
            ) : (
              <Text p="4" fontFamily="mono" fontSize="xs" color={tokens.panelMuted} lineHeight="1.6">
                {`// no symbols in watchlist — run scanner and enable profile A or B.`}
              </Text>
            )}
          </Tabs.Content>

          <Tabs.Content value="historic" p="0">
            {loading && historicEvents.length === 0 ? (
              <Flex p="6" gap="3" align="center" justify="center" color={tokens.panelMuted}>
                <Spinner size="sm" color={tokens.panelHeading} />
                <Text fontFamily="mono" fontSize="xs">
                  Loading signal history…
                </Text>
              </Flex>
            ) : historicEvents.length > 0 ? (
              <>
                <Box
                  px="3"
                  py="2"
                  borderBottomWidth="1px"
                  borderColor={tokens.panelBorder}
                  bg={tokens.blockquoteBg}
                >
                  <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
                    past alerts with AI read · tap row for full message
                  </Text>
                </Box>
                {historicEvents.map((event, index) => (
                  <TerminalLine
                    key={`hist-${event.id}-${event.created_at}-${event.symbol ?? ""}`}
                    event={event}
                    tokens={tokens}
                    eventStyles={eventStyles}
                    rowIndex={index}
                    showConditionDots={false}
                  />
                ))}
              </>
            ) : (
              <Text p="4" fontFamily="mono" fontSize="xs" color={tokens.panelMuted} lineHeight="1.6">
                {"// no past signals yet — fired alerts with AI advice appear here."}
              </Text>
            )}
          </Tabs.Content>
        </Tabs.Root>

        {stats ? <StatsStrip stats={stats} tokens={tokens} /> : null}
      </Box>

      <Text mt="2" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted}>
        Watchlist = scanner symbols with band proximity dots · Historic = past alerts.
      </Text>
    </Box>
  );
}
