"use client";

import FootprintPairChart from "@/components/3_organisms/FootprintPairChart/FootprintPairChart";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { themedPanelStyle } from "@/components/ui/themed-panel";
import {
  biasPalette,
  displaySignals,
  fetchFootprintView,
  formatFlowBiasLabel,
  formatFootprintLiqLine,
  formatFootprintStatsLine,
  formatStructureBiasLabel,
  isFootprintCollectorOnline,
  signalSeverityPalette,
  structureBiasPalette,
  trendEmoji,
} from "@/services/footprintUtils";
import type {
  FootprintPairView,
  FootprintProfile,
  FootprintTimeframe,
  FootprintViewPayload,
} from "@/types/footprintTypes";
import {
  FOOTPRINT_PROFILE_DEFAULTS,
  FOOTPRINT_SIGNAL_SEVERITY_ORDER,
  FOOTPRINT_SYMBOLS,
  FOOTPRINT_TIMEFRAMES,
} from "@/types/footprintTypes";
import {
  Badge,
  Box,
  Button,
  Flex,
  NativeSelect,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";

const REFRESH_MS = 60_000;

function PairCard({
  data,
  timeframe,
  cvdAnchor,
  tokens,
}: {
  data: FootprintPairView;
  timeframe: string;
  cvdAnchor: string;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  const { summary, merged, orderflow } = data;
  const hasFlow = orderflow != null;
  const signals = displaySignals(summary);
  const statsLine = formatFootprintStatsLine(summary);
  const liqLine = formatFootprintLiqLine(summary, merged);

  return (
    <Box p="4" rounded="lg" {...themedPanelStyle(tokens)}>
      <Flex justify="space-between" align="flex-start" gap="3" flexWrap="wrap" mb="3">
        <Stack gap="1">
          <Text fontFamily="mono" fontSize="md" fontWeight="semibold" color={tokens.title}>
            {data.base}
            <Text as="span" fontSize="xs" color={tokens.panelMuted} ml="2">
              {data.symbol}
            </Text>
          </Text>
          <Text fontSize="sm" color={tokens.panelBody}>
            {summary.combined_read ?? summary.headline}
          </Text>
        </Stack>
        <Flex gap="2" align="center" flexWrap="wrap">
          <Badge
            colorPalette={structureBiasPalette(summary.structure_bias)}
            variant="solid"
            fontFamily="mono"
            fontSize="2xs"
          >
            {formatStructureBiasLabel(summary.structure_bias, summary.structure_timeframe)}
          </Badge>
          <Badge
            colorPalette={biasPalette(summary.flow_bias ?? summary.bias)}
            variant="outline"
            fontFamily="mono"
            fontSize="2xs"
          >
            {formatFlowBiasLabel(summary.flow_bias ?? summary.bias)}
            {summary.flow_confidence ?? summary.confidence
              ? ` · ${summary.flow_confidence ?? summary.confidence}`
              : ""}
          </Badge>
          <Badge
            colorPalette={hasFlow ? "green" : "gray"}
            variant="subtle"
            fontFamily="mono"
            fontSize="2xs"
          >
            {hasFlow ? "orderflow live" : "no orderflow"}
          </Badge>
        </Flex>
      </Flex>

      <Flex gap="2" flexWrap="wrap" mb="3">
        <Badge variant="outline" fontFamily="mono" fontSize="2xs">
          {trendEmoji(summary.price_trend)} price {summary.price_trend}
        </Badge>
        <Badge variant="outline" fontFamily="mono" fontSize="2xs">
          {trendEmoji(summary.cvd_trend)} CVD {summary.cvd_trend}
        </Badge>
        <Badge variant="outline" fontFamily="mono" fontSize="2xs">
          {summary.flow_alignment.replace(/_/g, " ")}
        </Badge>
        <Badge variant="outline" fontFamily="mono" fontSize="2xs">
          {timeframe} · CVD {cvdAnchor}
        </Badge>
        {summary.structure_read ? (
          <Badge variant="outline" fontFamily="mono" fontSize="2xs">
            {summary.structure_read.replace(/_/g, " ")}
          </Badge>
        ) : null}
        {summary.structure_adx_regime ? (
          <Badge variant="outline" fontFamily="mono" fontSize="2xs">
            ADX {summary.structure_adx_regime.toLowerCase()}
          </Badge>
        ) : null}
        {summary.recent ? (
          <Badge variant="outline" fontFamily="mono" fontSize="2xs">
            recent {summary.recent.price_trend}
          </Badge>
        ) : null}
      </Flex>

      {signals.length > 0 ? (
        <Flex gap="1" flexWrap="wrap" mb="3">
          {signals.map((signal) => (
            <Badge
              key={signal.id}
              colorPalette={signalSeverityPalette(signal.severity)}
              variant="subtle"
              fontFamily="mono"
              fontSize="2xs"
            >
              {signal.label}
            </Badge>
          ))}
        </Flex>
      ) : null}

      <Stack gap="1" mb="3" fontFamily="mono" fontSize="xs" color={tokens.panelBody}>
        <Text>{statsLine}</Text>
        {liqLine ? <Text>{liqLine}</Text> : null}
        {summary.flow_bias_disclaimer ?? summary.bias_disclaimer ? (
          <Text fontSize="2xs" color={tokens.panelMuted}>
            {summary.flow_bias_disclaimer ?? summary.bias_disclaimer}
          </Text>
        ) : null}
      </Stack>

      <FootprintPairChart
        bars={merged}
        timeframe={timeframe as FootprintTimeframe}
        tokens={tokens}
      />
    </Box>
  );
}

function pairSignalRank(data: FootprintPairView): number {
  const signals = displaySignals(data.summary);
  if (!signals.length) return FOOTPRINT_SIGNAL_SEVERITY_ORDER.low + 1;
  return Math.min(...signals.map((s) => FOOTPRINT_SIGNAL_SEVERITY_ORDER[s.severity]));
}

export default function FootprintPanel() {
  const { palette } = useThemeColor();
  const tokens = useThemeTokens(palette);
  const [profile, setProfile] = useState<FootprintProfile>("a");
  const [timeframe, setTimeframe] = useState<FootprintTimeframe>(
    FOOTPRINT_PROFILE_DEFAULTS.a.defaultTimeframe,
  );
  const [payload, setPayload] = useState<FootprintViewPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTimeframe(FOOTPRINT_PROFILE_DEFAULTS[profile].defaultTimeframe);
  }, [profile]);

  const load = useCallback(async (options?: { bustCache?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFootprintView(FOOTPRINT_SYMBOLS, {
        profile,
        timeframe,
        bustCache: options?.bustCache,
      });
      setPayload(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load footprint");
    } finally {
      setLoading(false);
    }
  }, [profile, timeframe]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let refreshTimer: number | undefined;
    const scheduleRefresh = () => {
      refreshTimer = window.setTimeout(() => {
        void load({ bustCache: true }).finally(() => scheduleRefresh());
      }, REFRESH_MS);
    };
    scheduleRefresh();
    return () => {
      if (refreshTimer != null) window.clearTimeout(refreshTimer);
    };
  }, [load]);

  const sortedSymbols = useMemo(() => {
    if (!payload) return FOOTPRINT_SYMBOLS;
    return [...FOOTPRINT_SYMBOLS].sort((a, b) => {
      const pairA = payload.pairs[a];
      const pairB = payload.pairs[b];
      if (!pairA || !pairB) return 0;
      return pairSignalRank(pairA) - pairSignalRank(pairB);
    });
  }, [payload]);

  const wsConnected = isFootprintCollectorOnline(
    payload?.health as Record<string, unknown> | null | undefined,
    payload?.pairs,
  );

  return (
    <Stack gap="4">
      <Flex gap="3" flexWrap="wrap" align="flex-end" justify="space-between">
        <Stack gap="2">
          <Text fontSize="xs" fontFamily="mono" color={tokens.panelMuted}>
            {FOOTPRINT_SYMBOLS.join(", ")} · read-only · config: bot/footprint/analysis/
            {profile}.yaml
          </Text>
          <Flex gap="2" flexWrap="wrap">
            {(["a", "b"] as FootprintProfile[]).map((p) => (
              <Button
                key={p}
                size="xs"
                variant={profile === p ? "solid" : "outline"}
                colorPalette={palette}
                fontFamily="mono"
                onClick={() => setProfile(p)}
              >
                {FOOTPRINT_PROFILE_DEFAULTS[p].label}
              </Button>
            ))}
            <NativeSelect.Root size="xs" width="5rem">
              <NativeSelect.Field
                value={timeframe}
                fontFamily="mono"
                fontSize="2xs"
                onChange={(e) => setTimeframe(e.currentTarget.value as FootprintTimeframe)}
              >
                {FOOTPRINT_TIMEFRAMES.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
            <Button
              size="xs"
              variant="outline"
              colorPalette={palette}
              loading={loading}
              onClick={() => void load()}
            >
              Refresh
            </Button>
          </Flex>
        </Stack>
        <Badge
          colorPalette={wsConnected ? "green" : "red"}
          variant="subtle"
          fontFamily="mono"
          fontSize="2xs"
        >
          collector {wsConnected ? "online" : "offline"}
        </Badge>
      </Flex>

      {error ? (
        <Text fontSize="sm" fontFamily="mono" color="red.400">
          {error}
        </Text>
      ) : null}

      {!payload && loading ? (
        <Text fontSize="sm" fontFamily="mono" color={tokens.panelMuted}>
          Loading footprint…
        </Text>
      ) : null}

      {payload ? (
        <Stack gap="4">
          {sortedSymbols.map((base) => {
            const pair = payload.pairs[base];
            if (!pair) return null;
            return (
              <PairCard
                key={base}
                data={pair}
                timeframe={payload.timeframe}
                cvdAnchor={payload.cvd_anchor}
                tokens={tokens}
              />
            );
          })}
        </Stack>
      ) : null}
    </Stack>
  );
}
