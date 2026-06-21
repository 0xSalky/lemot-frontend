import type {
    ScannerAiSetupAnalysis,
    ScannerBandRow,
    ScannerChartTimeframe,
    ScannerLatestBatchFetchResult,
    ScannerSetupRow,
} from "@/types/scannerTypes";
import {
    bandLineMarker,
    bandLineSections,
    formatCompactLevel,
    formatSetupHeaderLine1,
    formatUtcIsoLocal,
    isLevelAnchor,
    levelsHighToLow,
    orderedBands,
    scannerProfileLabel,
    SCANNER_PROFILE_CHART_TIMEFRAME,
    scannerSymbolToBase,
    setupsFromBatch,
    SCANNER_CHART_REFRESH_MS,
    type ScannerProfile,
} from "@/services/scannerUtils";
import ResponsiveCardGrid from "@/components/4_layouts/ResponsiveCardGrid/ResponsiveCardGrid";
import DaySetupChart from "@/components/3_organisms/DaySetupChart/DaySetupChart";
import ScannerSetupChart from "@/components/3_organisms/ScannerSetupChart/ScannerSetupChart";
import { useThemeColor, useThemeTokens, type ThemeTokens } from "@/components/ui/theme-color";
import { fetchFootprintView } from "@/services/footprintUtils";
import { Box, Badge, Flex, Separator, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { FootprintPairView, FootprintViewPayload } from "@/types/footprintTypes";

type ScannerResultsProps = {
    profile: ScannerProfile;
    latestBatch: ScannerLatestBatchFetchResult | null;
    loading?: boolean;
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
}: {
    setup: ScannerSetupRow;
    tokens: ThemeTokens;
    defaultChartTimeframe?: ScannerChartTimeframe;
    profile: ScannerProfile;
    footprintPair?: FootprintPairView | null;
    footprintLoading?: boolean;
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
            {profile === "day" ? (
                <DaySetupChart
                    symbol={setup.symbol}
                    price={setup.price}
                    bands={bands}
                    tokens={tokens}
                    footprintPair={footprintPair}
                    footprintLoading={footprintLoading}
                    defaultChartTimeframe={defaultChartTimeframe}
                />
            ) : (
                <ScannerSetupChart
                    symbol={setup.symbol}
                    price={setup.price}
                    bands={bands}
                    tokens={tokens}
                    defaultTimeframe={defaultChartTimeframe}
                />
            )}
            <Text whiteSpace="pre-wrap" wordBreak="break-word">
                {formatSetupHeaderLine1(setup)}
            </Text>
            <Separator my="2" />
            <Stack gap="3">
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

const ScannerResults = ({ profile, latestBatch, loading = false }: ScannerResultsProps) => {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const setups = setupsFromBatch(latestBatch);
    const profileLabel = scannerProfileLabel(profile);
    const defaultChartTimeframe = SCANNER_PROFILE_CHART_TIMEFRAME[profile];
    const [footprintPayload, setFootprintPayload] = useState<FootprintViewPayload | null>(null);
    const [footprintLoading, setFootprintLoading] = useState(false);

    const batchMeta =
        latestBatch != null && !("message" in latestBatch) ? latestBatch.batch : null;

    const footprintSymbolsKey = useMemo(() => {
        if (latestBatch == null || "message" in latestBatch) return "";
        return [...new Set(latestBatch.setups.map((setup) => scannerSymbolToBase(setup.symbol)))]
            .sort()
            .join(",");
    }, [latestBatch]);

    useEffect(() => {
        if (profile !== "day" || !footprintSymbolsKey) {
            setFootprintPayload(null);
            setFootprintLoading(false);
            return;
        }

        const symbols = footprintSymbolsKey.split(",");
        let cancelled = false;
        setFootprintLoading(true);

        const loadFootprint = (initial: boolean) => {
            void fetchFootprintView(symbols, { profile: "day", timeframe: "30m" })
                .then((data) => {
                    if (!cancelled) setFootprintPayload(data);
                })
                .catch(() => {
                    if (!cancelled) setFootprintPayload(null);
                })
                .finally(() => {
                    if (!cancelled && initial) setFootprintLoading(false);
                });
        };

        loadFootprint(true);
        const refreshId = window.setInterval(() => loadFootprint(false), SCANNER_CHART_REFRESH_MS);

        return () => {
            cancelled = true;
            window.clearInterval(refreshId);
        };
    }, [profile, footprintSymbolsKey]);

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
                {setups.map((setup) => (
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
                    />
                ))}
            </ResponsiveCardGrid>
        </Stack>
    );
};

export default ScannerResults;
