import type {
    ScannerV2AiSetupAnalysis,
    ScannerV2BandRow,
    ScannerV2LatestBatchFetchResult,
    ScannerV2SetupRow,
} from "@/types/scannerV2Types";
import { formatUtcIsoLocal } from "@/services/scannerUtils";
import {
    bandLineMarker,
    bandLineSections,
    formatCompactLevel,
    formatSetupHeaderLine1,
    levelsHighToLow,
    orderedBands,
    setupsFromBatch,
} from "@/services/scannerV2Utils";
import ResponsiveCardGrid from "@/components/4_layouts/ResponsiveCardGrid/ResponsiveCardGrid";
import { Box, Separator, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

type ScannerV2ResultsProps = {
    latestBatch: ScannerV2LatestBatchFetchResult | null;
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
}: {
    label: string;
    tone?: "neutral" | "green" | "red" | "orange" | "purple" | "blue";
}) {
    const tones: Record<string, { bg: string; color: string; border: string }> = {
        neutral: { bg: "whiteAlpha.100", color: "purple.200", border: "purple.700" },
        green: { bg: "green.950", color: "green.300", border: "green.800" },
        red: { bg: "red.950", color: "red.300", border: "red.800" },
        orange: { bg: "orange.950", color: "orange.300", border: "orange.800" },
        purple: { bg: "purple.900", color: "purple.200", border: "purple.600" },
        blue: { bg: "blue.950", color: "blue.300", border: "blue.800" },
    };
    const palette = tones[tone] ?? tones.neutral;

    return (
        <Box
            as="span"
            display="inline-block"
            px="2"
            py="0.5"
            rounded="sm"
            {...AI_TEXT}
            fontSize="2xs"
            bg={palette.bg}
            color={palette.color}
            borderWidth="1px"
            borderColor={palette.border}
        >
            {label}
        </Box>
    );
}

function AiField({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
    return (
        <Box display="grid" gridTemplateColumns="7.5rem 1fr" gap="3" alignItems="start">
            <Text {...AI_TEXT} color="purple.400" pt="1px">
                {label}
            </Text>
            <Text
                {...AI_TEXT}
                color={warn ? "red.300" : "purple.50"}
                whiteSpace="pre-wrap"
                wordBreak="break-word"
            >
                {value}
            </Text>
        </Box>
    );
}

function AiSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Stack gap="1.5">
            <Text {...AI_TEXT} color="purple.400" letterSpacing="0.04em">
                {title}
            </Text>
            {children}
        </Stack>
    );
}

function actionTone(action: string): "green" | "red" | "orange" | "purple" | "neutral" | "blue" {
    const a = action.toLowerCase();
    if (a.includes("buy") || a.includes("support")) return "green";
    if (a.includes("fade") || a.includes("resistance")) return "red";
    if (a.includes("counter") || a.includes("bounce")) return "purple";
    if (a.includes("wait")) return "orange";
    if (a.includes("map")) return "blue";
    return "neutral";
}

function riskTone(risk: string | undefined): "green" | "orange" | "red" | "neutral" {
    const r = risk?.toUpperCase();
    if (r === "HIGH") return "red";
    if (r === "MEDIUM") return "orange";
    if (r === "LOW") return "green";
    return "neutral";
}

function AiBlock({ ai }: { ai: ScannerV2AiSetupAnalysis }) {
    const action = ai.ai_action ?? "unknown";

    return (
        <Box
            mt="3"
            pt="3"
            mx="-3"
            mb="-3"
            px="3"
            pb="3"
            borderTopWidth="1px"
            borderColor="purple.800"
            bg="purple.950/40"
            roundedBottom="md"
        >
            <Stack gap="3">
                <Stack gap="2">
                    <Text {...AI_TEXT} color="purple.300" fontWeight="semibold">
                        AI analysis
                    </Text>
                    <Box display="flex" flexWrap="wrap" gap="1.5">
                        <AiTag label={formatLabel(action)} tone={actionTone(action)} />
                        {ai.ai_confidence != null ? (
                            <AiTag label={`conf ${ai.ai_confidence}/5`} tone="blue" />
                        ) : null}
                        {ai.ai_btc_alignment ? (
                            <AiTag label={`BTC ${formatLabel(ai.ai_btc_alignment)}`} tone="neutral" />
                        ) : null}
                        {ai.ai_opportunity_type ? (
                            <AiTag label={formatLabel(ai.ai_opportunity_type)} tone="purple" />
                        ) : null}
                        {ai.ai_risk_level ? (
                            <AiTag label={`risk ${ai.ai_risk_level}`} tone={riskTone(ai.ai_risk_level)} />
                        ) : null}
                        {ai.ai_rank_in_batch != null ? (
                            <AiTag label={`#${ai.ai_rank_in_batch}`} tone="neutral" />
                        ) : null}
                    </Box>
                </Stack>

                {ai.ai_thesis ? (
                    <AiSection title="── thesis">
                        <Text {...AI_TEXT} color="purple.50" whiteSpace="pre-wrap" wordBreak="break-word">
                            {ai.ai_thesis}
                        </Text>
                    </AiSection>
                ) : null}

                {ai.ai_opportunity_notes ? (
                    <AiSection title="── opportunity">
                        <Text {...AI_TEXT} color="purple.50" whiteSpace="pre-wrap" wordBreak="break-word">
                            {ai.ai_opportunity_notes}
                        </Text>
                    </AiSection>
                ) : null}

                {ai.ai_entry_zone || ai.ai_stop || (ai.ai_targets && ai.ai_targets.length > 0) ? (
                    <AiSection title="── trade plan">
                        <Stack gap="2">
                            {ai.ai_entry_zone ? (
                                <AiField label="entry" value={ai.ai_entry_zone} />
                            ) : null}
                            {ai.ai_stop ? <AiField label="stop" value={ai.ai_stop} /> : null}
                            {ai.ai_targets && ai.ai_targets.length > 0 ? (
                                <AiField label="targets" value={ai.ai_targets.join(" · ")} />
                            ) : null}
                        </Stack>
                    </AiSection>
                ) : null}

                {ai.fractal_vwap_notes ? (
                    <AiSection title="── fractal / vwap">
                        <Text {...AI_TEXT} color="purple.50" whiteSpace="pre-wrap" wordBreak="break-word">
                            {ai.fractal_vwap_notes}
                        </Text>
                    </AiSection>
                ) : null}

                {ai.ai_risks && ai.ai_risks.length > 0 ? (
                    <AiSection title="── risks">
                        <Stack gap="2">
                            {ai.ai_risks.map((risk, i) => (
                                <AiField key={i} label={`! ${i + 1}`} value={risk} warn />
                            ))}
                        </Stack>
                    </AiSection>
                ) : null}
            </Stack>
        </Box>
    );
}

function BtcReadCard({ text }: { text: string }) {
    return (
        <Box
            borderWidth="1px"
            borderColor="purple.800"
            bg="purple.950/40"
            rounded="md"
            p="3"
        >
            <Text {...AI_TEXT} color="purple.300" fontWeight="semibold" mb="2">
                BTC read
            </Text>
            <Text {...AI_TEXT} color="purple.50" whiteSpace="pre-wrap" wordBreak="break-word">
                {text}
            </Text>
        </Box>
    );
}

function SetupCard({ setup }: { setup: ScannerV2SetupRow }) {
    const bands = orderedBands(Array.isArray(setup.bands) ? setup.bands : []);

    return (
        <Box
            borderWidth="1px"
            borderColor="border.emphasized"
            rounded="md"
            p="3"
            w="100%"
            fontFamily="mono"
            fontSize="xs"
            lineHeight="1.7"
            overflow="hidden"
        >
            <Text whiteSpace="pre-wrap" wordBreak="break-word">
                {formatSetupHeaderLine1(setup)}
            </Text>
            <Separator my="2" />
            <Stack gap="3">
                {bands.map((band, bandIdx) => (
                    <BandBlock key={`${setup.id}-${band.side}-${bandIdx}`} band={band} />
                ))}
            </Stack>
            {setup.ai ? <AiBlock ai={setup.ai} /> : null}
        </Box>
    );
}

function BandBlock({ band }: { band: ScannerV2BandRow }) {
    const sections = bandLineSections(band);

    return (
        <Stack gap="0">
            <Box display="flex" flexWrap="wrap" alignItems="baseline" columnGap="1" rowGap="0.5">
                <Text as="span">{bandLineMarker(band.side)}</Text>
                {sections.map((section, i) => (
                    <Box key={`${section.text}-${i}`} display="flex" alignItems="baseline" gap="1">
                        {i > 0 ? (
                            <Text as="span" color="fg.subtle" userSelect="none">
                                ·
                            </Text>
                        ) : null}
                        <Text
                            as="span"
                            color={section.emphasis ? undefined : "fg.muted"}
                            fontWeight={section.emphasis ? "medium" : undefined}
                        >
                            {section.text}
                        </Text>
                    </Box>
                ))}
            </Box>
            {levelsHighToLow(band.levels).map((level, i) => (
                <Text key={`${level.timeframe}-${level.level_type}-${i}`} pl="4" color="fg.muted">
                    {formatCompactLevel(level)}
                </Text>
            ))}
        </Stack>
    );
}

const ScannerV2Results = ({ latestBatch, loading = false }: ScannerV2ResultsProps) => {
    const setups = setupsFromBatch(latestBatch);

    if (loading && latestBatch == null) {
        return (
            <Text fontSize="sm" color="fg.muted" mt="1rem" fontFamily="mono">
                Loading scanner v2 results…
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
                No scanner v2 setups yet. Run a scan to populate results.
            </Text>
        );
    }

    const batchMeta =
        latestBatch != null && !("message" in latestBatch) ? latestBatch.batch : null;

    return (
        <Stack gap="3" align="stretch">
            {batchMeta ? (
                <Stack gap="2">
                    <Text fontSize="xs" color="fg.muted" fontFamily="mono">
                        batch #{batchMeta.id} · {batchMeta.mode} · {batchMeta.match_count} setups ·{" "}
                        {formatUtcIsoLocal(batchMeta.created_at)}
                        {batchMeta.ai_generated_at
                            ? ` · ai ${formatUtcIsoLocal(batchMeta.ai_generated_at)}`
                            : ""}
                    </Text>
                    {batchMeta.ai_summary?.btc_read ? (
                        <BtcReadCard text={batchMeta.ai_summary.btc_read} />
                    ) : null}
                </Stack>
            ) : null}
            <ResponsiveCardGrid>
                {setups.map((setup) => (
                    <SetupCard key={setup.id} setup={setup} />
                ))}
            </ResponsiveCardGrid>
        </Stack>
    );
};

export default ScannerV2Results;
