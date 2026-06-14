import AccountBalance from "@/components/3_organisms/AccountBalance/AccountBalance";
import AssetInterface from "@/components/3_organisms/AssetInterface/AssetInterface";
import ScannerResults from "@/components/3_organisms/ScannerResults/ScannerResults";
import ScannerV2Results from "@/components/3_organisms/ScannerV2Results/ScannerV2Results";
import { CARD_WIDTH, TRADING_PAIRS } from "@/services/config";
import type { ScannerLatestBatchFetchResult } from "@/types/scannerTypes";
import type { ScannerV2LatestBatchFetchResult } from "@/types/scannerV2Types";
import { fetchLatestScannerBatch, scannerSymbolToBase } from "@/services/scannerUtils";
import { fetchLatestScannerV2Batch } from "@/services/scannerV2Utils";
import { Button, Box, Stack, Tabs } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ColorModeButton } from "@/components/ui/color-mode";

const HomePage = () => {
    const [latestBatch, setLatestBatch] = useState<ScannerLatestBatchFetchResult | null>(
        null,
    );
    const [latestBatchV2, setLatestBatchV2] = useState<ScannerV2LatestBatchFetchResult | null>(
        null,
    );
    const [scannerPairs, setScannerPairs] = useState<string[]>([]);
    const [scannerV2Pairs, setScannerV2Pairs] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const loadIdRef = useRef(0);





    const loadScanner = useCallback(() => {
        const loadId = ++loadIdRef.current;
        queueMicrotask(() => setLoading(true));

        void Promise.all([fetchLatestScannerBatch(), fetchLatestScannerV2Batch()])
            .then(([v1, v2]) => {
                if (loadId !== loadIdRef.current) return;

                setLatestBatch(v1);
                if ("message" in v1) {
                    setScannerPairs([]);
                } else {
                    const bases = v1.matches.map((m) => scannerSymbolToBase(m.symbol));
                    setScannerPairs([...new Set(bases)]);
                }

                setLatestBatchV2(v2);
                if ("message" in v2) {
                    setScannerV2Pairs([]);
                } else {
                    const bases = v2.setups.map((s) => scannerSymbolToBase(s.symbol));
                    setScannerV2Pairs([...new Set(bases)]);
                }
            })
            .catch((e) => console.error("[scanner refresh]", e))
            .finally(() => {
                if (loadId !== loadIdRef.current) return;
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        loadScanner();
    }, [loadScanner]);

    return (
        <Stack w={CARD_WIDTH}>
            <Tabs.Root defaultValue="favorites">
                <Stack direction="row" gap="1rem">
                    <Box>
                        <Tabs.List>
                            <Tabs.Trigger value="favorites">
                                Favorites
                            </Tabs.Trigger>
                            <Tabs.Trigger value="scanner-v1-pairs">
                                Sc Pairs
                            </Tabs.Trigger>
                            <Tabs.Trigger value="scanner-v2-pairs">
                                Sc2 Pairs
                            </Tabs.Trigger>
                            <Tabs.Trigger value="scanner-v1-results">
                                Sc Results
                            </Tabs.Trigger>
                            <Tabs.Trigger value="scanner-v2-results">
                                Sc2 Results
                            </Tabs.Trigger>
                        </Tabs.List>
                    </Box>
                </Stack>
                <Tabs.Content value="favorites">
                    <Stack mt="1rem" gap="1rem" mb="1rem">
                        {TRADING_PAIRS.map((pair: string) => (
                            <AssetInterface key={pair} pair={pair} />
                        ))}
                    </Stack>
                </Tabs.Content>
                <Tabs.Content value="scanner-v1-pairs">
                    <Stack mt="1rem" gap="1rem" mb="1rem">
                        {scannerPairs.map((pair: string) => (
                            <AssetInterface key={pair} pair={pair} />
                        ))}
                    </Stack>
                </Tabs.Content>
                <Tabs.Content value="scanner-v2-pairs">
                    <Stack mt="1rem" gap="1rem" mb="1rem">
                        {scannerV2Pairs.map((pair: string) => (
                            <AssetInterface key={pair} pair={pair} />
                        ))}
                    </Stack>
                </Tabs.Content>
                <Tabs.Content value="scanner-v1-results">
                    <ScannerResults latestBatch={latestBatch} />
                </Tabs.Content>
                <Tabs.Content value="scanner-v2-results">
                    <Box>
                        <ScannerV2Results latestBatch={latestBatchV2} />
                    </Box>
                </Tabs.Content>
            </Tabs.Root>
            <Stack direction="row" gap="1rem">
                <ColorModeButton />
                <AccountBalance />
                <Button
                    size="xs"
                    variant="outline"
                    colorPalette="teal"
                    loading={loading}
                    onClick={() => loadScanner()}
                >
                    Refresh
                </Button>
            </Stack>
        </Stack>

    );
}

export default HomePage;
