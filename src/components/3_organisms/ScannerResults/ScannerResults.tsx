import type {
    ScannerLatestBatchFetchResult,
    ScannerMatchRow,
} from "@/types/scannerTypes";
import { formatUsCompact, scannerSymbolToBase } from "@/utils/scannerUtils";
import { Table } from "@chakra-ui/react";

type ScannerResultsProps = {
    latestBatch: ScannerLatestBatchFetchResult | null;
};

function matchesFromBatch(
    latestBatch: ScannerLatestBatchFetchResult | null,
): ScannerMatchRow[] {
    if (latestBatch == null || "message" in latestBatch) return [];
    return latestBatch.matches;
}

const ScannerResults = ({ latestBatch }: ScannerResultsProps) => {
    const matches = matchesFromBatch(latestBatch);

    return (
        <Table.Root size="sm">
            <Table.Header>
                <Table.Row>
                    <Table.ColumnHeader>Symbol</Table.ColumnHeader>
                    <Table.ColumnHeader>Bias</Table.ColumnHeader>
                    <Table.ColumnHeader>Signal</Table.ColumnHeader>
                    <Table.ColumnHeader>Volume</Table.ColumnHeader>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {matches.map((match) => (
                    <Table.Row key={match.id}>
                        <Table.Cell>{scannerSymbolToBase(match.symbol)}</Table.Cell>
                        <Table.Cell>{match.bias === "BULLISH" ? "🟢" : "🔴"}</Table.Cell>
                        <Table.Cell>{match.signal === "IN_RANGE" ? "🟡" : "--"}</Table.Cell>
                        <Table.Cell>{formatUsCompact(match.quote_volume_24h)}</Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table.Root>
    );
};

export default ScannerResults;