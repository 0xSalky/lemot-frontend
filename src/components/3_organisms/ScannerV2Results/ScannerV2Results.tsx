import type { ScannerV2BandRow, ScannerV2LatestBatchFetchResult } from "@/types/scannerV2Types";
import type { ScannerV2SetupRow } from "@/types/scannerV2Types";
import { formatUtcIsoLocal } from "@/services/scannerUtils";
import {
    formatBandLine,
    formatCompactLevel,
    formatSetupHeaderLine1,
    orderedBands,
    setupsFromBatch,
} from "@/services/scannerV2Utils";
import { Box, Separator, Stack, Text } from "@chakra-ui/react";

type ScannerV2ResultsProps = {
    latestBatch: ScannerV2LatestBatchFetchResult | null;
};

function SetupCard({ setup }: { setup: ScannerV2SetupRow }) {
    const bands = orderedBands(setup.bands);

    return (
        <Box
            borderWidth="1px"
            borderColor="border.emphasized"
            rounded="md"
            p="3"
            w="100%"
            fontFamily="mono"
            fontSize="xs"
            lineHeight="1.6"
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
        </Box>
    );
}

function BandBlock({ band }: { band: ScannerV2BandRow }) {
    return (
        <Stack gap="0">
            <Text>{formatBandLine(band)}</Text>
            {band.levels.map((level, i) => (
                <Text key={`${level.timeframe}-${level.level_type}-${i}`} pl="4" color="fg.muted">
                    {formatCompactLevel(level)}
                </Text>
            ))}
        </Stack>
    );
}

const ScannerV2Results = ({ latestBatch }: ScannerV2ResultsProps) => {
    const setups = setupsFromBatch(latestBatch);

    if (latestBatch != null && "message" in latestBatch) {
        return (
            <Text fontSize="sm" color="fg.muted" mt="1rem">
                {latestBatch.message}
            </Text>
        );
    }

    if (setups.length === 0) {
        return (
            <Text fontSize="sm" color="fg.muted" mt="1rem">
                No scanner v2 setups yet.
            </Text>
        );
    }

    const batchMeta =
        latestBatch != null && !("message" in latestBatch) ? latestBatch.batch : null;

    return (
        <Stack mt="1rem" gap="3" align="stretch">
            {batchMeta ? (
                <Text fontSize="xs" color="fg.muted" fontFamily="sans">
                    Batch #{batchMeta.id} · {batchMeta.mode} · {batchMeta.match_count} setups ·{" "}
                    {formatUtcIsoLocal(batchMeta.created_at)}
                </Text>
            ) : null}
            {setups.map((setup) => (
                <SetupCard key={setup.id} setup={setup} />
            ))}
        </Stack>
    );
};

export default ScannerV2Results;
