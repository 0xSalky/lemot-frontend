import type {
    ScannerAiSetupAnalysis,
    ScannerBandRow,
    ScannerChartPayload,
    ScannerChartTimeframe,
    ScannerSetupRow,
    ScannerViewFetchResult,
} from "@/types/scannerTypes";
import {
    bandLineMarker,
    bandLineSections,
    formatCompactLevel,
    formatUtcIsoLocal,
    isLevelAnchor,
    levelsHighToLow,
    orderedBands,
    patchScannerCharts,
    prefetchScannerCharts,
    scannerProfileLabel,
    SCANNER_CHART_LIVE_PATCH_MS,
    SCANNER_CHART_REFRESH_MS,
    SCANNER_PROFILE_CHART_TIMEFRAME,
    scannerSymbolToBase,
    setupsFromScannerView,
    type ScannerProfile,
} from "@/services/scannerUtils";
import ResponsiveCardGrid from "@/components/4_layouts/ResponsiveCardGrid/ResponsiveCardGrid";
import FootprintOrderflowTags from "@/components/2_molecules/FootprintOrderflowTags/FootprintOrderflowTags";
import SetupHeaderTags from "@/components/2_molecules/SetupHeaderTags/SetupHeaderTags";
import DaySetupChart from "@/components/3_organisms/DaySetupChart/DaySetupChart";
import { usePageVisible } from "@/hooks/usePageVisible";
import { useThemeColor, useThemeTokens, type ThemeTokens } from "@/components/ui/theme-color";
import { themedPanelStyle } from "@/components/ui/themed-panel";
import { expectsFootprintSymbol, hasFootprintChartCandles, hasOrderflowData, hasScannerChartCandles, isFootprintCollectorOnline } from "@/services/footprintUtils";
import { Box, Badge, Flex, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FootprintPairView } from "@/types/footprintTypes";

type ScannerResultsProps = {
    profile: ScannerProfile;
    scannerView: ScannerViewFetchResult | null;
    loading?: boolean;
    refreshKey?: number;
};

const AI_TEXT = {
    fontFamily: "mono",
    fontSize: "xs",
    lineHeight: "1.75",
} as const;

function formatLabel(raw: string): string {
    return raw.replace(/_/g, " ");
}

function AiTag({
    label,
    tone = "neutral",
    tokens,
}: {
    label: string;
    tone?: "neutral" | "green" | "red" | "accent" | "blue";
    tokens: ThemeTokens;
}) {
    const tones: Record<string, { bg: string; color: string; border: string }> = {
        neutral: tokens.tagNeutral,
        green: tokens.tagGreen,
        red: tokens.tagRed,
        accent: tokens.tagAccent,
        blue: tokens.tagBlue,
    };
    const toneStyle = tones[tone] ?? tones.neutral;

    return (
        <Box
            as="span"
            display="inline-block"
            px="2"
            py="0.5"
            rounded="sm"
            {...AI_TEXT}
            fontSize="2xs"
            bg={toneStyle.bg}
            color={toneStyle.color}
            borderWidth="1px"
            borderColor={toneStyle.border}
        >
            {label}
        </Box>
    );
}

function AiSection({
    title,
    children,
    tokens,
    emphasize,
}: {
    title: string;
    children: ReactNode;
    tokens: ThemeTokens;
    emphasize?: boolean;
}) {
    return (
        <Stack
            gap="1.5"
            pl={emphasize ? "2.5" : undefined}
            borderLeftWidth={emphasize ? "2px" : undefined}
            borderLeftColor={emphasize ? tokens.tagAccent.border : undefined}
        >
            <Text
                {...AI_TEXT}
                color={emphasize ? tokens.tagAccent.color : tokens.panelLabel}
                letterSpacing="0.04em"
                fontWeight={emphasize ? "semibold" : "normal"}
            >
                {title}
            </Text>
            {children}
        </Stack>
    );
}

function actionTone(action: string): "green" | "red" | "accent" | "neutral" | "blue" {
    const a = action.toLowerCase();
    if (a.includes("buy") || a.includes("support")) return "green";
    if (a.includes("fade") || a.includes("resistance")) return "red";
    if (a.includes("counter") || a.includes("bounce")) return "accent";
    if (a.includes("wait")) return "accent";
    if (a.includes("map")) return "blue";
    return "neutral";
}

function riskTone(risk: string | undefined): "green" | "accent" | "red" | "neutral" {
    const r = risk?.toUpperCase();
    if (r === "HIGH") return "red";
    if (r === "MEDIUM") return "accent";
    if (r === "LOW") return "green";
    return "neutral";
}

function AiBlock({
    ai,
    tokens,
    profile,
}: {
    ai: ScannerAiSetupAnalysis;
    tokens: ThemeTokens;
    profile: ScannerProfile;
}) {
    const action = ai.ai_action ?? "unknown";
    const opportunityTitle =
        profile === "a" ? "── orderflow read" : "── opportunity  (funding · OI)";

    return (
        <Box
            mt="3"
            pt="3"
            mx="-3"
            mb="-3"
            px="3"
            pb="3"
            borderTopWidth="1px"
            borderColor={tokens.panelBorder}
            bg={tokens.panelBg}
            roundedBottom="md"
        >
            <Stack gap="3">
                <Stack gap="2">
                    <Text {...AI_TEXT} color={tokens.panelHeading} fontWeight="semibold">
                        AI analysis
                    </Text>
                    <Box display="flex" flexWrap="wrap" gap="1.5">
                        <AiTag label={formatLabel(action)} tone={actionTone(action)} tokens={tokens} />
                        {ai.ai_confidence != null ? (
                            <AiTag label={`conf ${ai.ai_confidence}/5`} tone="blue" tokens={tokens} />
                        ) : null}
                        {ai.ai_btc_alignment ? (
                            <AiTag label={`BTC ${formatLabel(ai.ai_btc_alignment)}`} tone="neutral" tokens={tokens} />
                        ) : null}
                        {ai.ai_opportunity_type ? (
                            <AiTag label={formatLabel(ai.ai_opportunity_type)} tone="accent" tokens={tokens} />
                        ) : null}
                        {ai.ai_risk_level ? (
                            <AiTag label={`risk ${ai.ai_risk_level}`} tone={riskTone(ai.ai_risk_level)} tokens={tokens} />
                        ) : null}
                        {ai.ai_rank_in_batch != null ? (
                            <AiTag label={`#${ai.ai_rank_in_batch}`} tone="neutral" tokens={tokens} />
                        ) : null}
                    </Box>
                </Stack>

                {ai.ai_thesis ? (
                    <AiSection title="── thesis" tokens={tokens}>
                        <Text {...AI_TEXT} color={tokens.panelBody} whiteSpace="pre-wrap" wordBreak="break-word">
                            {ai.ai_thesis}
                        </Text>
                    </AiSection>
                ) : null}

                {ai.ai_opportunity_notes ? (
                    <AiSection title={opportunityTitle} tokens={tokens} emphasize>
                        <Text {...AI_TEXT} color={tokens.panelBody} whiteSpace="pre-wrap" wordBreak="break-word">
                            {ai.ai_opportunity_notes}
                        </Text>
                    </AiSection>
                ) : null}

                {ai.ai_map_read ? (
                    <AiSection title="── map read" tokens={tokens}>
                        <Text {...AI_TEXT} color={tokens.panelBody} whiteSpace="pre-wrap" wordBreak="break-word">
                            {ai.ai_map_read}
                        </Text>
                    </AiSection>
                ) : null}
            </Stack>
        </Box>
    );
}

function BtcReadCard({ text, tokens }: { text: string; tokens: ThemeTokens }) {
    return (
        <Box rounded="md" p="3" {...themedPanelStyle(tokens, "default", "panel")}>
            <Text {...AI_TEXT} color={tokens.panelHeading} fontWeight="semibold" mb="2">
                BTC read
            </Text>
            <Text {...AI_TEXT} color={tokens.panelBody} whiteSpace="pre-wrap" wordBreak="break-word">
                {text}
            </Text>
        </Box>
    );
}

function SetupCard({
    setup,
    tokens,
    defaultChartTimeframe,
    profile,
    footprintPair,
    managedChart,
    managedChartLoading,
    chartRefreshCountdownSec,
}: {
    setup: ScannerSetupRow;
    tokens: ThemeTokens;
    defaultChartTimeframe?: ScannerChartTimeframe;
    profile: ScannerProfile;
    footprintPair?: FootprintPairView | null;
    managedChart?: ScannerChartPayload | null;
    managedChartLoading?: boolean;
    chartRefreshCountdownSec?: number;
}) {
    const bands = orderedBands(Array.isArray(setup.bands) ? setup.bands : []);

    return (
        <Box
            rounded="md"
            p="3"
            w="100%"
            fontFamily="mono"
            fontSize="xs"
            lineHeight="1.7"
            {...themedPanelStyle(tokens)}
        >
            <SetupHeaderTags setup={setup} tokens={tokens} />
            {hasOrderflowData(footprintPair) && footprintPair ? (
                <FootprintOrderflowTags summary={footprintPair.summary} tokens={tokens} />
            ) : null}
            <DaySetupChart
                symbol={setup.symbol}
                price={setup.price}
                bands={bands}
                tokens={tokens}
                profile={profile}
                footprintPair={footprintPair}
                footprintEnabled={expectsFootprintSymbol(scannerSymbolToBase(setup.symbol))}
                defaultChartTimeframe={defaultChartTimeframe}
                managedChart={managedChart}
                managedChartLoading={managedChartLoading}
                footprintRefreshCountdownSec={chartRefreshCountdownSec}
                managedRefreshCountdownSec={chartRefreshCountdownSec}
            />
            <Stack gap="3" mt="2">
                {bands.map((band, bandIdx) => (
                    <BandBlock key={`${setup.id}-${band.side}-${bandIdx}`} band={band} />
                ))}
            </Stack>
            {setup.ai ? <AiBlock ai={setup.ai} tokens={tokens} profile={profile} /> : null}
        </Box>
    );
}

function BandBlock({ band }: { band: ScannerBandRow }) {
    const sections = bandLineSections(band);
    const dist = band.distance_pct ?? 0;
    const distanceTitle =
        band.side === "RES"
            ? `${dist.toFixed(2)}% above`
            : band.side === "SUP"
              ? `${dist.toFixed(2)}% below`
              : "at price";

    return (
        <Stack gap="0">
            <Box
                display="flex"
                flexWrap="nowrap"
                alignItems="baseline"
                columnGap="1"
                overflowX="auto"
                fontFamily="mono"
                fontSize="xs"
                title={distanceTitle}
                css={{ WebkitOverflowScrolling: "touch" }}
            >
                <Text as="span" flexShrink={0}>{bandLineMarker(band.side)}</Text>
                {sections.map((section, i) => (
                    <Box key={`${section.text}-${i}`} display="flex" alignItems="baseline" gap="1" flexShrink={0}>
                        {i > 0 ? (
                            <Text as="span" color="fg.subtle" userSelect="none">
                                ·
                            </Text>
                        ) : null}
                        <Text
                            as="span"
                            color={section.emphasis ? undefined : "fg.muted"}
                            fontWeight={section.emphasis ? "medium" : undefined}
                            title={
                                section.text.startsWith("sp=")
                                    ? `${band.span_pct?.toFixed(2)}% span`
                                    : undefined
                            }
                        >
                            {section.text}
                        </Text>
                    </Box>
                ))}
            </Box>
            {levelsHighToLow(band.levels).map((level, i) => (
                <Box
                    key={`${level.timeframe}-${level.level_type}-${i}`}
                    display="grid"
                    gridTemplateColumns="1.5ch 1fr"
                    columnGap="1"
                    alignItems="baseline"
                    pl="4"
                    fontFamily="mono"
                    fontSize="xs"
                >
                    <Text
                        as="span"
                        color={isLevelAnchor(level) ? "fg.muted" : "transparent"}
                        textAlign="center"
                        userSelect="none"
                        aria-hidden={!isLevelAnchor(level)}
                    >
                        ⚓
                    </Text>
                    <Text as="span" color="fg.muted">
                        {formatCompactLevel(level)}
                    </Text>
                </Box>
            ))}
        </Stack>
    );
}

const ScannerResults = ({ profile, scannerView, loading = false, refreshKey = 0 }: ScannerResultsProps) => {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const pageVisible = usePageVisible();
    const setups = setupsFromScannerView(scannerView);
    const profileLabel = scannerProfileLabel(profile);
    const defaultChartTimeframe = SCANNER_PROFILE_CHART_TIMEFRAME[profile];
    const [prefetchedCharts, setPrefetchedCharts] = useState<Record<string, ScannerChartPayload | null>>({});
    const [chartsLoading, setChartsLoading] = useState(false);
    const chartRefreshSec = Math.ceil(SCANNER_CHART_REFRESH_MS / 1000);
    const [refreshDeadline, setRefreshDeadline] = useState(() => Date.now() + SCANNER_CHART_REFRESH_MS);
    const [chartRefreshCountdownSec, setChartRefreshCountdownSec] = useState(chartRefreshSec);
    const nextFullRefreshAtRef = useRef(refreshDeadline);

    const chartSymbols = useMemo(
        () => setups.map((setup) => setup.symbol),
        [setups],
    );
    const chartSymbolsKey = chartSymbols.slice().sort().join(",");

    const batchMeta =
        scannerView != null && !("message" in scannerView) ? scannerView.batch : null;
    const viewChartsBySymbol =
        scannerView != null && !("message" in scannerView) ? scannerView.charts.by_symbol : {};
    const chartsBySymbol = useMemo(
        () => ({ ...viewChartsBySymbol, ...prefetchedCharts }),
        [prefetchedCharts, viewChartsBySymbol],
    );
    const footprintPairs =
        scannerView != null && !("message" in scannerView)
            ? scannerView.footprint.pairs_by_base
            : {};
    const footprintHealth =
        scannerView != null && !("message" in scannerView) ? scannerView.footprint.health : null;

    const missingChartSymbols = useMemo(() => {
        if (scannerView == null || "message" in scannerView) return [];
        return setups
            .filter((setup) => {
                const base = scannerSymbolToBase(setup.symbol);
                const footprintPair = footprintPairs[base] ?? null;
                const managedChart = chartsBySymbol[setup.symbol] ?? null;
                const footprintReady =
                    hasOrderflowData(footprintPair) &&
                    (hasFootprintChartCandles(footprintPair) || hasScannerChartCandles(managedChart));
                const usesManagedChart =
                    !expectsFootprintSymbol(base)
                    || !hasOrderflowData(footprintPair)
                    || !footprintReady;
                return usesManagedChart && managedChart == null;
            })
            .map((setup) => setup.symbol);
    }, [chartsBySymbol, footprintPairs, scannerView, setups]);

    const missingChartKey = missingChartSymbols.slice().sort().join(",");

    const batchId =
        scannerView != null && !("message" in scannerView) ? scannerView.batch?.id : null;

    useEffect(() => {
        if (!loading && scannerView != null && !("message" in scannerView)) {
            const next = Date.now() + SCANNER_CHART_REFRESH_MS;
            nextFullRefreshAtRef.current = next;
            setRefreshDeadline(next);
            setChartRefreshCountdownSec(chartRefreshSec);
        }
    }, [batchId, chartRefreshSec, loading, profile, refreshKey, scannerView]);

    useEffect(() => {
        const tick = () => {
            setChartRefreshCountdownSec(
                Math.max(0, Math.ceil((refreshDeadline - Date.now()) / 1000)),
            );
        };
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, [refreshDeadline]);

    useEffect(() => {
        if (loading || !pageVisible || !chartSymbolsKey) return;

        let cancelled = false;
        let refreshTimer: number | undefined;

        const scheduleFullRefresh = () => {
            const delay = Math.max(0, nextFullRefreshAtRef.current - Date.now());
            refreshTimer = window.setTimeout(() => {
                if (cancelled) return;
                if (document.visibilityState !== "visible") {
                    scheduleFullRefresh();
                    return;
                }
                void prefetchScannerCharts(chartSymbols, defaultChartTimeframe, { bustCache: true })
                    .then((charts) => {
                        if (cancelled) return;
                        setPrefetchedCharts((prev) => {
                            const next = { ...prev };
                            for (const [symbol, chart] of Object.entries(charts)) {
                                if (chart) next[symbol] = chart;
                            }
                            return next;
                        });
                        const deadline = Date.now() + SCANNER_CHART_REFRESH_MS;
                        nextFullRefreshAtRef.current = deadline;
                        setRefreshDeadline(deadline);
                    })
                    .catch(() => {
                        console.warn("[scanner charts] full refresh failed", { profile });
                    })
                    .finally(() => {
                        if (!cancelled) scheduleFullRefresh();
                    });
            }, delay);
        };

        scheduleFullRefresh();
        return () => {
            cancelled = true;
            if (refreshTimer != null) window.clearTimeout(refreshTimer);
        };
    }, [
        chartSymbols,
        chartSymbolsKey,
        defaultChartTimeframe,
        loading,
        pageVisible,
        profile,
        refreshKey,
    ]);

    useEffect(() => {
        if (loading || !pageVisible || !chartSymbolsKey) return;

        let cancelled = false;
        const patchLive = () => {
            if (cancelled || document.visibilityState !== "visible") return;
            void patchScannerCharts(chartSymbols, defaultChartTimeframe)
                .then((charts) => {
                    if (cancelled) return;
                    setPrefetchedCharts((prev) => {
                        const next = { ...prev };
                        for (const [symbol, chart] of Object.entries(charts)) {
                            if (chart) next[symbol] = chart;
                        }
                        return next;
                    });
                })
                .catch(() => {
                    console.warn("[scanner charts] live patch failed", { profile });
                });
        };

        const initial = window.setTimeout(patchLive, 0);
        const id = window.setInterval(patchLive, SCANNER_CHART_LIVE_PATCH_MS);
        return () => {
            cancelled = true;
            window.clearTimeout(initial);
            window.clearInterval(id);
        };
    }, [chartSymbols, chartSymbolsKey, defaultChartTimeframe, loading, pageVisible, profile, refreshKey]);

    useEffect(() => {
        setPrefetchedCharts({});
    }, [batchId, profile]);

    useEffect(() => {
        if (loading || !missingChartKey) {
            setChartsLoading(false);
            return;
        }

        let cancelled = false;
        setChartsLoading(true);
        const symbols = missingChartKey.split(",").filter(Boolean);

        void prefetchScannerCharts(symbols, defaultChartTimeframe)
            .then((charts) => {
                if (!cancelled) setPrefetchedCharts((prev) => ({ ...prev, ...charts }));
            })
            .catch(() => {
                console.warn("[scanner charts] batch prefetch failed", { profile, symbols });
            })
            .finally(() => {
                if (!cancelled) setChartsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [defaultChartTimeframe, loading, missingChartKey, profile]);

    const wsConnected = isFootprintCollectorOnline(footprintHealth, footprintPairs);

    if (loading && scannerView == null) {
        return (
            <Text fontSize="sm" color="fg.muted" mt="1rem" fontFamily="mono">
                Loading {profileLabel} scanner results…
            </Text>
        );
    }

    if (scannerView != null && "message" in scannerView) {
        return (
            <Text fontSize="sm" color="fg.muted" mt="1rem" fontFamily="mono">
                {scannerView.message}
            </Text>
        );
    }

    if (setups.length === 0) {
        return (
            <Text fontSize="sm" color="fg.muted" mt="1rem" fontFamily="mono">
                No {profileLabel} setups yet. Run a {profileLabel} scan to populate results.
            </Text>
        );
    }

    const batchMetaLine = batchMeta;
    const hasFootprintPairs = Object.keys(footprintPairs).length > 0;

    return (
        <Stack gap="3" align="stretch">
            {batchMetaLine ? (
                <Stack gap="2">
                    <Flex gap="2" flexWrap="wrap" align="center">
                        <Text fontSize="xs" color="fg.muted" fontFamily="mono">
                            batch #{batchMetaLine.id} · {batchMetaLine.mode} · {batchMetaLine.match_count}{" "}
                            setups · {formatUtcIsoLocal(batchMetaLine.created_at)}
                            {batchMetaLine.ai_generated_at
                                ? ` · ai ${formatUtcIsoLocal(batchMetaLine.ai_generated_at)}`
                                : ""}
                        </Text>
                        {hasFootprintPairs ? (
                            <Badge
                                colorPalette={wsConnected ? "green" : "gray"}
                                variant="subtle"
                                fontFamily="mono"
                                fontSize="2xs"
                            >
                                footprint collector {wsConnected ? "online" : "offline"}
                            </Badge>
                        ) : null}
                    </Flex>
                    {batchMetaLine.ai_summary?.btc_read ? (
                        <BtcReadCard text={batchMetaLine.ai_summary.btc_read} tokens={tokens} />
                    ) : null}
                </Stack>
            ) : null}
            <ResponsiveCardGrid>
                {setups.map((setup) => {
                    const base = scannerSymbolToBase(setup.symbol);
                    const footprintPair = footprintPairs[base] ?? null;
                    const managedChart = chartsBySymbol[setup.symbol] ?? null;

                    return (
                        <SetupCard
                            key={setup.id}
                            setup={setup}
                            tokens={tokens}
                            profile={profile}
                            defaultChartTimeframe={defaultChartTimeframe}
                            footprintPair={footprintPair}
                            managedChart={managedChart}
                            managedChartLoading={chartsLoading && managedChart == null}
                            chartRefreshCountdownSec={chartRefreshCountdownSec}
                        />
                    );
                })}
            </ResponsiveCardGrid>
        </Stack>
    );
};

export default ScannerResults;
