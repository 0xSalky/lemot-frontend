import type {
    ScannerAiSetupAnalysis,
    ScannerBandRow,
    ScannerChartPayload,
    ScannerChartTimeframe,
    ScannerLatestBatchFetchResult,
    ScannerSetupRow,
} from "@/types/scannerTypes";
import {
    bandLineMarker,
    bandLineSections,
    formatCompactLevel,
    formatUtcIsoLocal,
    isLevelAnchor,
    levelsHighToLow,
    orderedBands,
    prefetchScannerCharts,
    scannerProfileLabel,
    SCANNER_PROFILE_CHART_TIMEFRAME,
    scannerSymbolToBase,
    setupsFromBatch,
    SCANNER_CHART_REFRESH_MS,
    type ScannerProfile,
} from "@/services/scannerUtils";
import ResponsiveCardGrid from "@/components/4_layouts/ResponsiveCardGrid/ResponsiveCardGrid";
import FootprintOrderflowTags from "@/components/2_molecules/FootprintOrderflowTags/FootprintOrderflowTags";
import SetupHeaderTags from "@/components/2_molecules/SetupHeaderTags/SetupHeaderTags";
import DaySetupChart from "@/components/3_organisms/DaySetupChart/DaySetupChart";
import { useThemeColor, useThemeTokens, type ThemeTokens } from "@/components/ui/theme-color";
import { usePageVisible } from "@/hooks/usePageVisible";
import { expectsFootprintSymbol, fetchFootprintView, hasOrderflowData } from "@/services/footprintUtils";
import { Box, Badge, Flex, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FootprintPairView, FootprintViewPayload } from "@/types/footprintTypes";

type ScannerResultsProps = {
    profile: ScannerProfile;
    latestBatch: ScannerLatestBatchFetchResult | null;
    loading?: boolean;
    /** False when scanner tab is hidden — pauses chart/footprint polling. */
    active?: boolean;
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
        profile === "day" ? "── orderflow read" : "── opportunity  (funding · OI)";

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
        <Box
            borderWidth="1px"
            borderColor={tokens.panelBorder}
            bg={tokens.panelBg}
            rounded="md"
            p="3"
        >
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
    footprintLoading,
    footprintRefreshCountdownSec,
    managedChart,
    managedChartLoading,
    managedRefreshCountdownSec,
}: {
    setup: ScannerSetupRow;
    tokens: ThemeTokens;
    defaultChartTimeframe?: ScannerChartTimeframe;
    profile: ScannerProfile;
    footprintPair?: FootprintPairView | null;
    footprintLoading?: boolean;
    footprintRefreshCountdownSec?: number;
    managedChart?: ScannerChartPayload | null;
    managedChartLoading?: boolean;
    managedRefreshCountdownSec?: number;
}) {
    const bands = orderedBands(Array.isArray(setup.bands) ? setup.bands : []);

    return (
        <Box
            borderWidth="1px"
            borderColor="border.emphasized"
            bg="bg.subtle"
            rounded="md"
            p="3"
            w="100%"
            fontFamily="mono"
            fontSize="xs"
            lineHeight="1.7"
            overflow="hidden"
            boxShadow="0 0 22px rgba(255, 78, 205, 0.07)"
        >
            <SetupHeaderTags setup={setup} tokens={tokens} />
            {profile === "day" && hasOrderflowData(footprintPair) && footprintPair ? (
                <FootprintOrderflowTags summary={footprintPair.summary} tokens={tokens} />
            ) : null}
            <DaySetupChart
                symbol={setup.symbol}
                price={setup.price}
                bands={bands}
                tokens={tokens}
                footprintPair={profile === "day" ? footprintPair : null}
                footprintLoading={profile === "day" ? footprintLoading : false}
                footprintEnabled={profile === "day"}
                footprintRefreshCountdownSec={footprintRefreshCountdownSec}
                defaultChartTimeframe={defaultChartTimeframe}
                managedChart={managedChart}
                managedChartLoading={managedChartLoading}
                managedRefreshCountdownSec={managedRefreshCountdownSec}
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

const ScannerResults = ({ profile, latestBatch, loading = false, active = true }: ScannerResultsProps) => {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const pageVisible = usePageVisible();
    const pollingEnabled = active && pageVisible;
    const setups = setupsFromBatch(latestBatch);
    const profileLabel = scannerProfileLabel(profile);
    const defaultChartTimeframe = SCANNER_PROFILE_CHART_TIMEFRAME[profile];
    const [footprintPayload, setFootprintPayload] = useState<FootprintViewPayload | null>(null);
    const [footprintLoading, setFootprintLoading] = useState(false);
    const nextFootprintRefreshAtRef = useRef(0);
    const footprintLoadInFlight = useRef(false);
    const [footprintRefreshCountdownSec, setFootprintRefreshCountdownSec] = useState(
        Math.ceil(SCANNER_CHART_REFRESH_MS / 1000),
    );
    const [managedCharts, setManagedCharts] = useState<Record<string, ScannerChartPayload | null>>({});
    const [managedChartsLoading, setManagedChartsLoading] = useState(false);
    const nextChartRefreshAtRef = useRef(0);
    const [managedRefreshCountdownSec, setManagedRefreshCountdownSec] = useState(
        Math.ceil(SCANNER_CHART_REFRESH_MS / 1000),
    );

    const batchMeta =
        latestBatch != null && !("message" in latestBatch) ? latestBatch.batch : null;

    const footprintSymbolsKey = useMemo(() => {
        if (latestBatch == null || "message" in latestBatch) return "";
        return [...new Set(latestBatch.setups.map((setup) => scannerSymbolToBase(setup.symbol)))]
            .sort()
            .join(",");
    }, [latestBatch]);

    const activeFootprintKey = profile === "day" ? footprintSymbolsKey : "";
    const [prevFootprintKey, setPrevFootprintKey] = useState<string | null>(null);

    const restChartSymbols = useMemo(() => {
        if (!pollingEnabled || setups.length === 0) return [];
        if (profile === "swing") {
            return setups.map((setup) => setup.symbol);
        }
        if (profile === "day" && !footprintLoading) {
            return setups
                .filter((setup) => {
                    const base = scannerSymbolToBase(setup.symbol);
                    if (!expectsFootprintSymbol(base)) return true;
                    const pair = footprintPayload?.pairs[base];
                    return !hasOrderflowData(pair);
                })
                .map((setup) => setup.symbol);
        }
        return [];
    }, [footprintLoading, footprintPayload, pollingEnabled, profile, setups]);

    const restChartSymbolsKey = useMemo(
        () => restChartSymbols.slice().sort().join(","),
        [restChartSymbols],
    );

    if (activeFootprintKey !== prevFootprintKey) {
        setPrevFootprintKey(activeFootprintKey);
        if (!activeFootprintKey) {
            setFootprintPayload(null);
            setFootprintLoading(false);
        } else {
            setFootprintLoading(true);
        }
    }

    useEffect(() => {
        if (!activeFootprintKey || !pollingEnabled) return;

        const symbols = activeFootprintKey.split(",");
        let cancelled = false;
        const totalSec = Math.ceil(SCANNER_CHART_REFRESH_MS / 1000);

        const resetRefreshDeadline = () => {
            nextFootprintRefreshAtRef.current = Date.now() + SCANNER_CHART_REFRESH_MS;
            setFootprintRefreshCountdownSec(totalSec);
        };

        resetRefreshDeadline();

        const loadFootprint = (initial: boolean) => {
            if (footprintLoadInFlight.current) return;
            footprintLoadInFlight.current = true;
            void fetchFootprintView(symbols, { profile: "day", timeframe: "30m" })
                .then((data) => {
                    if (!cancelled) {
                        setFootprintPayload(data);
                        resetRefreshDeadline();
                    }
                })
                .catch(() => {
                    if (!cancelled) setFootprintPayload(null);
                })
                .finally(() => {
                    footprintLoadInFlight.current = false;
                    if (!cancelled && initial) setFootprintLoading(false);
                });
        };

        loadFootprint(true);
        const refreshId = window.setInterval(() => {
            if (document.visibilityState !== "visible") return;
            loadFootprint(false);
        }, SCANNER_CHART_REFRESH_MS);

        const tickId = window.setInterval(() => {
            const remaining = Math.max(
                0,
                Math.ceil((nextFootprintRefreshAtRef.current - Date.now()) / 1000),
            );
            setFootprintRefreshCountdownSec(remaining);
        }, 1000);

        return () => {
            cancelled = true;
            footprintLoadInFlight.current = false;
            window.clearInterval(refreshId);
            window.clearInterval(tickId);
        };
    }, [activeFootprintKey, pollingEnabled]);

    useEffect(() => {
        if (!restChartSymbolsKey || !pollingEnabled) return;

        const symbols = restChartSymbolsKey.split(",").filter(Boolean);
        let cancelled = false;
        const totalSec = Math.ceil(SCANNER_CHART_REFRESH_MS / 1000);

        const resetRefreshDeadline = () => {
            nextChartRefreshAtRef.current = Date.now() + SCANNER_CHART_REFRESH_MS;
            setManagedRefreshCountdownSec(totalSec);
        };

        resetRefreshDeadline();
        setManagedChartsLoading(true);

        const loadCharts = (initial: boolean) => {
            void prefetchScannerCharts(symbols, defaultChartTimeframe)
                .then((charts) => {
                    if (!cancelled) {
                        setManagedCharts(charts);
                        resetRefreshDeadline();
                    }
                })
                .catch(() => {
                    if (!cancelled) setManagedCharts({});
                })
                .finally(() => {
                    if (!cancelled && initial) setManagedChartsLoading(false);
                });
        };

        loadCharts(true);

        const refreshId = window.setInterval(() => {
            if (document.visibilityState !== "visible") return;
            loadCharts(false);
        }, SCANNER_CHART_REFRESH_MS);

        const tickId = window.setInterval(() => {
            const remaining = Math.max(
                0,
                Math.ceil((nextChartRefreshAtRef.current - Date.now()) / 1000),
            );
            setManagedRefreshCountdownSec(remaining);
        }, 1000);

        return () => {
            cancelled = true;
            window.clearInterval(refreshId);
            window.clearInterval(tickId);
        };
    }, [defaultChartTimeframe, pollingEnabled, restChartSymbolsKey]);

    const wsConnected =
        footprintPayload?.health &&
        Number((footprintPayload.health as { ws_connected?: number }).ws_connected) === 1;

    if (loading && latestBatch == null) {
        return (
            <Text fontSize="sm" color="fg.muted" mt="1rem" fontFamily="mono">
                Loading {profileLabel} scanner results…
            </Text>
        );
    }

    if (latestBatch != null && "message" in latestBatch) {
        return (
            <Text fontSize="sm" color="fg.muted" mt="1rem" fontFamily="mono">
                {latestBatch.message}
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
                        {profile === "day" ? (
                            footprintLoading ? (
                                <Badge
                                    colorPalette="blue"
                                    variant="subtle"
                                    fontFamily="mono"
                                    fontSize="2xs"
                                >
                                    loading footprint charts…
                                </Badge>
                            ) : (
                                <Badge
                                    colorPalette={wsConnected ? "green" : "gray"}
                                    variant="subtle"
                                    fontFamily="mono"
                                    fontSize="2xs"
                                >
                                    footprint collector {wsConnected ? "online" : "offline"}
                                </Badge>
                            )
                        ) : null}
                    </Flex>
                    {batchMetaLine.ai_summary?.btc_read ? (
                        <BtcReadCard text={batchMetaLine.ai_summary.btc_read} tokens={tokens} />
                    ) : null}
                </Stack>
            ) : null}
            <ResponsiveCardGrid>
                {setups.map((setup) => {
                    const usesManagedChart =
                        profile === "swing" ||
                        (profile === "day" &&
                            (!expectsFootprintSymbol(scannerSymbolToBase(setup.symbol)) ||
                                !hasOrderflowData(
                                    footprintPayload?.pairs[scannerSymbolToBase(setup.symbol)],
                                )));

                    return (
                    <SetupCard
                        key={setup.id}
                        setup={setup}
                        tokens={tokens}
                        profile={profile}
                        defaultChartTimeframe={defaultChartTimeframe}
                        footprintPair={
                            profile === "day"
                                ? footprintPayload?.pairs[scannerSymbolToBase(setup.symbol)] ?? null
                                : null
                        }
                        footprintLoading={profile === "day" ? footprintLoading : false}
                        footprintRefreshCountdownSec={
                            profile === "day" ? footprintRefreshCountdownSec : undefined
                        }
                        managedChart={usesManagedChart ? managedCharts[setup.symbol] ?? null : undefined}
                        managedChartLoading={usesManagedChart ? managedChartsLoading : false}
                        managedRefreshCountdownSec={
                            usesManagedChart ? managedRefreshCountdownSec : undefined
                        }
                    />
                    );
                })}
            </ResponsiveCardGrid>
        </Stack>
    );
};

export default ScannerResults;
