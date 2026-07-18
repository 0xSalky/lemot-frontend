"use client";

import type { ThemeTokens } from "@/components/ui/theme-color";
import {
  biasPalette,
  displaySignals,
  formatFlowBiasLabel,
  formatFootprintUsd,
  formatFundingRate,
  formatOiChange,
  signalSeverityPalette,
  trendEmoji,
} from "@/services/footprintUtils";
import type { FootprintPairView } from "@/types/footprintTypes";
import { FOOTPRINT_SIGNAL_SEVERITY_ORDER } from "@/types/footprintTypes";
import { Badge, Flex, Stack, Text } from "@chakra-ui/react";

type FootprintOrderflowTagsProps = {
  summary?: FootprintPairView["summary"] | null;
  tokens: ThemeTokens;
  /** Today's daily open vs prior-day value area. */
  openVsVa?: string | null;
};

// Short labels shown in the badge; full label shown in title tooltip on hover
const TAG_SHORT_LABEL: Record<string, string> = {
  flow_against_price: "CVD diverging",
  flow_with_price: "CVD aligned",
  oi_divergence: "OI div · covering",
  oi_short_buildup: "fresh shorts",
  oi_building: "OI building",
  oi_flush: "OI flush",
  absorption_buy_side: "buy absorbed",
  absorption_sell_side: "sell absorbed",
  window_long_liquidations: "long liqs",
  window_short_liquidations: "short liqs",
  aggressive_buyers: "buy faded",
  aggressive_sellers: "sell faded",
  data_gap: "data gap",
};

function isRedundantHtfSignal(label: string): boolean {
  const lower = label.trim().toLowerCase();
  return lower.includes("htf") && (lower.includes("bullish") || lower.includes("bearish"));
}

function openVsVaBadge(openVsVa: string | null | undefined): {
  label: string;
  title: string;
  colorPalette: string;
} | null {
  if (openVsVa === "above_vah") {
    return {
      label: "☀️ Above VAH",
      title: "Today's daily open is above yesterday's value area high",
      colorPalette: "green",
    };
  }
  if (openVsVa === "below_val") {
    return {
      label: "☀️ Below VAL",
      title: "Today's daily open is below yesterday's value area low",
      colorPalette: "red",
    };
  }
  return null;
}

export default function FootprintOrderflowTags({
  summary,
  tokens,
  openVsVa,
}: FootprintOrderflowTagsProps) {
  const vaBadge = openVsVaBadge(openVsVa);
  const bias = summary?.flow_bias ?? summary?.bias;
  const lastDelta = summary?.last_delta;
  const cvdWindow = summary?.last_cvd_window;
  const oiWindowPct = summary?.window_oi_change_pct;
  const funding = summary?.last_funding_rate;

  // Filter: skip HTF redundant, skip bare last_bar tags (covered by delta number), skip
  // parent `absorption` tag (keep the directional variants instead)
  const signals = summary
    ? [...displaySignals(summary)]
      .filter((s) => !isRedundantHtfSignal(s.label))
      .filter(
        (s) =>
          s.id !== "last_bar_buyers" &&
          s.id !== "last_bar_sellers" &&
          s.id !== "absorption",
      )
      .sort(
        (a, b) =>
          FOOTPRINT_SIGNAL_SEVERITY_ORDER[a.severity] -
          FOOTPRINT_SIGNAL_SEVERITY_ORDER[b.severity],
      )
      .slice(0, 6)
    : [];

  const hasStats =
    bias != null ||
    lastDelta != null ||
    cvdWindow != null ||
    oiWindowPct != null ||
    funding != null;
  const hasSignals = signals.length > 0;

  if (!hasStats && !hasSignals && !vaBadge) return null;

  return (
    <Stack
      gap="2"
      px="3"
      py="2"
      mx="-3"
      borderBottomWidth="1px"
      borderColor={tokens.panelBorder}
    >
      {/* Row 1: bias badge + price/CVD direction + key numbers */}
      {hasStats && (
        <Flex align="center" gap="2" flexWrap="wrap">
          {bias != null && (
            <Badge
              colorPalette={biasPalette(bias)}
              variant="subtle"
              fontFamily="mono"
              fontSize="2xs"
              flexShrink={0}
            >
              {formatFlowBiasLabel(bias)}
            </Badge>
          )}

          {summary?.price_trend && summary.price_trend !== "unknown" && (
            <Badge variant="outline" fontFamily="mono" fontSize="2xs" flexShrink={0}>
              {trendEmoji(summary.price_trend)} price {summary.price_trend}
            </Badge>
          )}

          {summary?.cvd_trend && summary.cvd_trend !== "unknown" && (
            <Badge variant="outline" fontFamily="mono" fontSize="2xs" flexShrink={0}>
              {trendEmoji(summary.cvd_trend)} CVD {summary.cvd_trend}
            </Badge>
          )}

          {lastDelta != null && (
            <Text
              fontFamily="mono"
              fontSize="2xs"
              color={lastDelta > 0 ? "green.400" : lastDelta < 0 ? "red.400" : tokens.panelMuted}
              title="Last bar net delta (buying vs selling pressure on the most recent candle)"
            >
              <Text as="span" color={tokens.panelMuted}>
                Δ{" "}
              </Text>
              {formatFootprintUsd(lastDelta)}
            </Text>
          )}

          {cvdWindow != null && (
            <Text
              fontFamily="mono"
              fontSize="2xs"
              color={cvdWindow > 0 ? "green.400" : cvdWindow < 0 ? "red.400" : tokens.panelMuted}
              title="Cumulative volume delta over the chart window — overall buying vs selling pressure"
            >
              <Text as="span" color={tokens.panelMuted}>
                CVD{" "}
              </Text>
              {formatFootprintUsd(cvdWindow)}
            </Text>
          )}

          {oiWindowPct != null && (
            <Text
              fontFamily="mono"
              fontSize="2xs"
              color={tokens.panelMuted}
              title="Open interest change over the window — positive means new positions opening, negative means contracts closing"
            >
              OI {formatOiChange(oiWindowPct)}
            </Text>
          )}

          {funding != null && (
            <Text
              fontFamily="mono"
              fontSize="2xs"
              color={tokens.panelMuted}
              title="Funding rate — positive means longs pay shorts (market leaning long); negative means shorts pay longs (market leaning short)"
            >
              <Text as="span" color={tokens.panelMuted}>
                Fund{" "}
              </Text>
              {formatFundingRate(funding)}
            </Text>
          )}
        </Flex>
      )}

      {/* Row 2: open-vs-VA + event signal badges — hover for full explanation */}
      {(vaBadge || hasSignals) && (
        <Flex gap="1.5" flexWrap="wrap">
          {vaBadge ? (
            <Badge
              colorPalette={vaBadge.colorPalette}
              variant="solid"
              fontFamily="mono"
              fontSize="2xs"
              fontWeight="bold"
              letterSpacing="wide"
              px="2"
              title={vaBadge.title}
              cursor="default"
              boxShadow="0 0 10px color-mix(in srgb, currentColor 45%, transparent)"
            >
              {vaBadge.label}
            </Badge>
          ) : null}
          {signals.map((signal) => (
            <Badge
              key={signal.id}
              colorPalette={signalSeverityPalette(signal.severity)}
              variant="subtle"
              fontFamily="mono"
              fontSize="2xs"
              title={signal.label}
              cursor="default"
            >
              {TAG_SHORT_LABEL[signal.id] ?? signal.label}
            </Badge>
          ))}
        </Flex>
      )}
    </Stack>
  );
}
