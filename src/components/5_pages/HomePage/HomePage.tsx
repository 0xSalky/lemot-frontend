import AccountBalance from "@/components/3_organisms/AccountBalance/AccountBalance";
import AssetInterface from "@/components/3_organisms/AssetInterface/AssetInterface";
import ScannerResults from "@/components/3_organisms/ScannerResults/ScannerResults";
import { TRADING_PAIRS } from "@/services/config";
import type { ScannerLatestBatchFetchResult } from "@/types/scannerTypes";
import { fetchLatestScannerBatch, scannerSymbolToBase } from "@/utils/scannerUtils";
import { Button, Flex, Stack, Tabs } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";

const HomePage = () => {
    const [latestBatch, setLatestBatch] = useState<ScannerLatestBatchFetchResult | null>(
        null,
    );
    const [scannerPairs, setScannerPairs] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const loadIdRef = useRef(0);

    const loadScanner = useCallback(() => {
        const loadId = ++loadIdRef.current;
        queueMicrotask(() => setLoading(true));
        void fetchLatestScannerBatch()
            .then((data) => {
                if (loadId !== loadIdRef.current) return;
                setLatestBatch(data);
                if ("message" in data) {
                    setScannerPairs([]);
                } else {
                    const bases = data.matches.map((m) => scannerSymbolToBase(m.symbol));
                    setScannerPairs([...new Set(bases)]);
                }
            })
            .catch((e) => console.error("[scanner/latest-batch]", e))
            .finally(() => {
                if (loadId !== loadIdRef.current) return;
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        loadScanner();
    }, [loadScanner]);

    return (
        <Tabs.Root defaultValue="favorites">
            <Stack direction="row" gap="1rem">
                <Tabs.List>
                    <Tabs.Trigger value="favorites">
                        Favorites
                    </Tabs.Trigger>
                    <Tabs.Trigger value="watchlist">
                        Scanner Watchlist
                    </Tabs.Trigger>
                    <Tabs.Trigger value="results">
                        Scanner Results
                    </Tabs.Trigger>
                </Tabs.List>
                <Flex align="center" justifyContent="space-between">
                    <Button
                        size="xs"
                        variant="outline"
                        colorPalette="teal"
                        loading={loading}
                        onClick={() => loadScanner()}
                    >
                        Refresh
                    </Button>
                </Flex>
            </Stack>
            <Tabs.Content value="favorites"><Stack mt="1rem" gap="1rem" mb="1rem" w="30rem">
                {TRADING_PAIRS.map((pair: string) => (
                    <AssetInterface key={pair} pair={pair} />
                ))}
                <AccountBalance />
            </Stack></Tabs.Content>
            <Tabs.Content value="watchlist">
                <Stack mt="1rem" gap="1rem" mb="1rem" w="30rem">
                    {scannerPairs.map((pair: string) => (
                        <AssetInterface key={pair} pair={pair} />
                    ))}
                </Stack>
            </Tabs.Content>
            <Tabs.Content value="results">
                <ScannerResults latestBatch={latestBatch} />
            </Tabs.Content>
        </Tabs.Root>

    );
}

export default HomePage;