import type {
    ScannerBatchRow,
    ScannerLatestBatchFetchResult,
    ScannerMatchRow,
} from "@/types/scannerTypes";
import {
    formatBatchMetaLine,
    formatMatchDetailLines,
    formatMatchHeaderLine1,
    formatMatchHeaderLine2,
    matchesFromBatch,
} from "@/services/scannerUtils";
import ResponsiveCardGrid from "@/components/4_layouts/ResponsiveCardGrid/ResponsiveCardGrid";
import { Box, Separator, Stack, Text } from "@chakra-ui/react";

type ScannerResultsProps = {
    latestBatch: ScannerLatestBatchFetchResult | null;
    loading?: boolean;
};

function MatchCard({
    match,
    rank,
    batch,
}: {
    match: ScannerMatchRow;
    rank: number;
    batch: ScannerBatchRow;
}) {
    const details = formatMatchDetailLines(match, batch);

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
            <Stack gap="0">
                <Text whiteSpace="pre-wrap" wordBreak="break-word">
                    {formatMatchHeaderLine1(match, rank)}
                </Text>
                <Text whiteSpace="pre-wrap" wordBreak="break-word">
                    {formatMatchHeaderLine2(match)}
                </Text>
            </Stack>
            <Separator my="2" />
            <Stack gap="0">
                {details.map((line, i) => (
                    <Text key={i} color="fg.muted">
                        {line}
                    </Text>
                ))}
            </Stack>
        </Box>
    );
}

const ScannerResults = ({ latestBatch, loading = false }: ScannerResultsProps) => {
    const matches = matchesFromBatch(latestBatch);

    if (loading && latestBatch == null) {
        return (
            <Text fontSize="sm" color="fg.muted" mt="1rem">
                Loading scanner v1 results…
            </Text>
        );
    }

    if (latestBatch != null && "message" in latestBatch) {
        return (
            <Text fontSize="sm" color="fg.muted" mt="1rem">
                {latestBatch.message}
            </Text>
        );
    }

    if (matches.length === 0) {
        return (
            <Text fontSize="sm" color="fg.muted" mt="1rem">
                No scanner v1 matches yet. Run a scan to populate results.
            </Text>
        );
    }

    const batch =
        latestBatch != null && !("message" in latestBatch) ? latestBatch.batch : null;

    return (
        <Stack gap="3" align="stretch">
            {batch ? (
                <Text fontSize="xs" color="fg.muted" fontFamily="sans">
                    {formatBatchMetaLine(batch)}
                </Text>
            ) : null}
            <ResponsiveCardGrid>
                {matches.map((match, index) => (
                    <MatchCard
                        key={match.id}
                        match={match}
                        rank={index + 1}
                        batch={batch!}
                    />
                ))}
            </ResponsiveCardGrid>
        </Stack>
    );
};

export default ScannerResults;
