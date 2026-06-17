import AccountBalance from "@/components/3_organisms/AccountBalance/AccountBalance";
import AssetInterface from "@/components/3_organisms/AssetInterface/AssetInterface";
import ScannerResults from "@/components/3_organisms/ScannerResults/ScannerResults";
import ResponsiveCardGrid from "@/components/4_layouts/ResponsiveCardGrid/ResponsiveCardGrid";
import { TRADING_PAIRS } from "@/services/config";
import type { ScannerLatestBatchFetchResult } from "@/types/scannerTypes";
import {
    fetchLatestScannerBatch,
    runScanner,
    scannerSymbolToBase,
} from "@/services/scannerUtils";
import { Button, Box, Stack, Tabs, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ColorModeButton } from "@/components/ui/color-mode";

const HomePage = () => {
    const [latestBatch, setLatestBatch] = useState<ScannerLatestBatchFetchResult | null>(
        null,
    );
    const [scannerPairs, setScannerPairs] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [running, setRunning] = useState<boolean>(false);
    const [runError, setRunError] = useState<string | null>(null);
    const [runWarning, setRunWarning] = useState<string | null>(null);
    const loadIdRef = useRef(0);

    const loadScanner = useCallback(() => {
        const loadId = ++loadIdRef.current;
        queueMicrotask(() => setLoading(true));

        void fetchLatestScannerBatch()
            .then((batch) => {
                if (loadId !== loadIdRef.current) return;

                setLatestBatch(batch);
                if ("message" in batch) {
                    setScannerPairs([]);
                } else {
                    const bases = batch.setups.map((s) => scannerSymbolToBase(s.symbol));
                    setScannerPairs([...new Set(bases)]);
                }
            })
            .catch((e) => console.error("[scanner refresh]", e))
            .finally(() => {
                if (loadId !== loadIdRef.current) return;
                setLoading(false);
            });
    }, []);

    const runScannerScan = useCallback(() => {
        setRunError(null);
        setRunWarning(null);
        setRunning(true);
        void runScanner()
            .then((result) => {
                if (!result.success) {
                    setRunError(result.message);
                    return;
                }
                if (result.ai_error) {
                    setRunWarning(`Scan saved, but AI failed: ${result.ai_error}`);
                } else if (result.ai_skip_reason) {
                    setRunWarning(`Scan saved; AI skipped: ${result.ai_skip_reason}`);
                }
                return loadScanner();
            })
            .catch((e) => {
                console.error("[scanner run]", e);
                setRunError("Scanner run failed");
            })
            .finally(() => setRunning(false));
    }, [loadScanner]);

    useEffect(() => {
        loadScanner();
    }, [loadScanner]);

    return (
        <Stack w="100%" maxW="100%" gap="1rem">
            <Tabs.Root defaultValue="favorites">
                <Box overflowX="auto" pb="1">
                    <Tabs.List flexWrap="wrap" gap="1">
                        <Tabs.Trigger value="favorites">Favorites</Tabs.Trigger>
                        <Tabs.Trigger value="scanner-pairs">Scanner Pairs</Tabs.Trigger>
                        <Tabs.Trigger value="scanner-results">Scanner Results</Tabs.Trigger>
                    </Tabs.List>
                </Box>
                <Tabs.Content value="favorites">
                    <ResponsiveCardGrid>
                        {TRADING_PAIRS.map((pair: string) => (
                            <AssetInterface key={pair} pair={pair} />
                        ))}
                    </ResponsiveCardGrid>
                </Tabs.Content>
                <Tabs.Content value="scanner-pairs">
                    <ResponsiveCardGrid>
                        {scannerPairs.map((pair: string) => (
                            <AssetInterface key={pair} pair={pair} />
                        ))}
                    </ResponsiveCardGrid>
                </Tabs.Content>
                <Tabs.Content value="scanner-results">
                    <Box>
                        <ScannerResults latestBatch={latestBatch} loading={loading} />
                    </Box>
                </Tabs.Content>
            </Tabs.Root>
            <Stack gap="2">
                <Stack direction="row" gap="1rem" flexWrap="wrap" align="center">
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
                    <Button
                        size="xs"
                        variant="outline"
                        colorPalette="purple"
                        loading={running}
                        onClick={runScannerScan}
                    >
                        Run scanner
                    </Button>
                </Stack>
                {runError || runWarning ? (
                    <Stack gap="0">
                        {runError ? (
                            <Text fontSize="xs" color="red.400">
                                Scanner: {runError}
                            </Text>
                        ) : null}
                        {runWarning ? (
                            <Text fontSize="xs" color="orange.400">
                                {runWarning}
                            </Text>
                        ) : null}
                    </Stack>
                ) : null}
            </Stack>
        </Stack>
    );
};

export default HomePage;
