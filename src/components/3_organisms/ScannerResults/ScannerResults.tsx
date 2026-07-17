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
    chartRevisionKey,
    formatCompactLevel,
    formatUtcIsoLocal,
    isLevelAnchor,
    levelsHighToLow,
    orderedBands,
    normalizeScannerChartTimeframe,
    scannerProfileLabel,
    SCANNER_PROFILE_CHART_TIMEFRAME,
    scannerSymbolToBase,
    setupsFromScannerView,
    type ScannerProfile,
} from "@/services/scannerUtils";
import ResponsiveCardGrid from "@/components/4_layouts/ResponsiveCardGrid/ResponsiveCardGrid";
import FootprintOrderflowTags from "@/components/2_molecules/FootprintOrderflowTags/FootprintOrderflowTags";
import SetupHeaderTags from "@/components/2_molecules/SetupHeaderTags/SetupHeaderTags";
import DaySetupChart from "@/components/3_organisms/DaySetupChart/DaySetupChart";
import { useThemeColor, useThemeTokens, type ThemeTokens } from "@/components/ui/theme-color";
import { themedPanelStyle } from "@/components/ui/themed-panel";
import {
    footprintWatchlistBases,
    hasOrderflowData,
    isFootprintWatchSymbol,
    isFootprintCollectorOnline,
    normalizeFootprintTimeframe,
} from "@/services/footprintUtils";
import { Box, Badge, Flex, IconButton, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import type { FootprintPairView, FootprintTimeframe } from "@/types/footprintTypes";
import { FOOTPRINT_PROFILE_DEFAULTS } from "@/types/footprintTypes";

type ScannerResultsProps = {
    profile: ScannerProfile;
    scannerView: ScannerViewFetchResult | null;
    loading?: boolean;
    refreshingBatch?: boolean;
    refreshingCharts?: boolean;
    chartsRefreshKey?: number;
    onRefreshBatch?: () => void;
    onRefreshCharts?: () => void;
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
    defaultFootprintTimeframe,
    profile,
    footprintPair,
    managedChart,
    chartsLoading,
    footprintWatchlist,
    chartRevisionKey: chartRevisionKeyProp,
}: {
    setup: ScannerSetupRow;
    tokens: ThemeTokens;
    defaultChartTimeframe?: ScannerChartTimeframe;
    defaultFootprintTimeframe?: FootprintTimeframe;
    profile: ScannerProfile;
    footprintPair?: FootprintPairView | null;
    managedChart?: ScannerChartPayload | null;
    chartsLoading?: boolean;
    footprintWatchlist: readonly string[];
    chartRevisionKey?: string;
}) {
    const bands = orderedBands(Array.isArray(setup.bands) ? setup.bands : []);
    const base = scannerSymbolToBase(setup.symbol);

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
                footprintEnabled={isFootprintWatchSymbol(base, footprintWatchlist)}
                defaultChartTimeframe={defaultChartTimeframe}
                defaultFootprintTimeframe={defaultFootprintTimeframe}
                managedChart={managedChart}
                managedChartLoading={chartsLoading}
                footprintLoading={chartsLoading}
                chartRevisionKey={chartRevisionKeyProp}
                volScore={setup.vol_score}
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

function BatchRefreshIcon({ size = 20 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M8 6h13" />
            <path d="M8 12h13" />
            <path d="M8 18h13" />
            <path d="M3 6h.01" />
            <path d="M3 12h.01" />
            <path d="M3 18h.01" />
        </svg>
    );
}

function RefreshIcon({ size = 20 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
        </svg>
    );
}

const ScannerResults = ({
    profile,
    scannerView,
    loading = false,
    refreshingBatch = false,
    refreshingCharts = false,
    chartsRefreshKey = 0,
    onRefreshBatch,
    onRefreshCharts,
}: ScannerResultsProps) => {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const setups = setupsFromScannerView(scannerView);
    const profileLabel = scannerProfileLabel(profile);
    const defaultChartTimeframe = normalizeScannerChartTimeframe(
        scannerView != null && !("message" in scannerView)
            ? scannerView.charts.timeframe
            : undefined,
        SCANNER_PROFILE_CHART_TIMEFRAME[profile],
    );
    const defaultFootprintTimeframe = normalizeFootprintTimeframe(
        scannerView != null && !("message" in scannerView)
            ? scannerView.footprint.timeframe
            : undefined,
        FOOTPRINT_PROFILE_DEFAULTS[profile].defaultTimeframe,
    );

    const footprintHealth =
        scannerView != null && !("message" in scannerView) ? scannerView.footprint.health : null;
    const footprintWatchlist = useMemo(
        () =>
            footprintWatchlistBases(
                scannerView != null && !("message" in scannerView)
                    ? {
                        watchlist: scannerView.footprint.watchlist,
                        health: scannerView.footprint.health,
                    }
                    : { health: footprintHealth },
            ),
        [footprintHealth, scannerView],
    );

    const batchMeta =
        scannerView != null && !("message" in scannerView) ? scannerView.batch : null;
    const chartsBySymbol =
        scannerView != null && !("message" in scannerView) ? scannerView.charts.by_symbol : {};
    const footprintPairs =
        scannerView != null && !("message" in scannerView)
            ? scannerView.footprint.pairs_by_base
            : {};

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
                    <Flex
                        w="100%"
                        align="center"
                        justify="space-between"
                        gap="3"
                        flexWrap={{ base: "wrap", sm: "nowrap" }}
                    >
                        <Text
                            fontSize="xs"
                            color="fg.muted"
                            fontFamily="mono"
                            flex="1"
                            minW="0"
                        >
                            batch #{batchMetaLine.id} · {batchMetaLine.mode} · {batchMetaLine.match_count}{" "}
                            setups · {formatUtcIsoLocal(batchMetaLine.created_at)}
                            {batchMetaLine.ai_generated_at
                                ? ` · ai ${formatUtcIsoLocal(batchMetaLine.ai_generated_at)}`
                                : ""}
                        </Text>
                        <Flex align="center" gap="2" flexShrink={0}>
                            {hasFootprintPairs ? (
                                <Badge
                                    colorPalette={wsConnected ? "green" : "gray"}
                                    variant="subtle"
                                    fontFamily="mono"
                                    fontSize="xs"
                                    px="2"
                                    py="1"
                                >
                                    footprint {wsConnected ? "online" : "offline"}
                                </Badge>
                            ) : null}
                            {onRefreshBatch ? (
                                <IconButton
                                    aria-label={`Refresh ${profileLabel} batch`}
                                    title={`Refresh ${profileLabel} batch`}
                                    size="sm"
                                    variant="outline"
                                    colorPalette={palette}
                                    borderColor={tokens.panelBorder}
                                    color={tokens.panelBody}
                                    loading={refreshingBatch}
                                    minW="33px"
                                    minH="33px"
                                    onClick={onRefreshBatch}
                                >
                                    <BatchRefreshIcon size={20} />
                                </IconButton>
                            ) : null}
                            {onRefreshCharts ? (
                                <IconButton
                                    aria-label={`Refresh ${profileLabel} charts`}
                                    title={`Refresh ${profileLabel} charts`}
                                    size="sm"
                                    variant="outline"
                                    colorPalette={palette}
                                    borderColor={tokens.panelBorder}
                                    color={tokens.panelBody}
                                    loading={refreshingCharts}
                                    minW="33px"
                                    minH="33px"
                                    onClick={onRefreshCharts}
                                >
                                    <RefreshIcon size={20} />
                                </IconButton>
                            ) : null}
                        </Flex>
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
                    const revisionKey = `${chartsRefreshKey}|${chartRevisionKey(managedChart)}`;

                    return (
                        <SetupCard
                            key={setup.id}
                            setup={setup}
                            tokens={tokens}
                            profile={profile}
                            defaultChartTimeframe={defaultChartTimeframe}
                            defaultFootprintTimeframe={defaultFootprintTimeframe}
                            footprintPair={footprintPair}
                            managedChart={managedChart}
                            chartsLoading={refreshingCharts}
                            footprintWatchlist={footprintWatchlist}
                            chartRevisionKey={revisionKey}
                        />
                    );
                })}
            </ResponsiveCardGrid>
        </Stack>
    );
};

export default ScannerResults;
