import AccountBalance from "@/components/3_organisms/AccountBalance/AccountBalance";
import AssetInterface from "@/components/3_organisms/AssetInterface/AssetInterface";
import ScannerResults from "@/components/3_organisms/ScannerResults/ScannerResults";
import ScannerV2Results from "@/components/3_organisms/ScannerV2Results/ScannerV2Results";
import ResponsiveCardGrid from "@/components/4_layouts/ResponsiveCardGrid/ResponsiveCardGrid";
import { TRADING_PAIRS } from "@/services/config";
import type { ScannerLatestBatchFetchResult } from "@/types/scannerTypes";
import type { ScannerV2LatestBatchFetchResult } from "@/types/scannerV2Types";
import { fetchLatestScannerBatch, runScanner, scannerSymbolToBase } from "@/services/scannerUtils";
import { fetchLatestScannerV2Batch, runScannerV2 } from "@/services/scannerV2Utils";
import { Button, Box, Stack, Tabs, Text } from "@chakra-ui/react";
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
    const [runningV1, setRunningV1] = useState<boolean>(false);
    const [runningV2, setRunningV2] = useState<boolean>(false);
    const [runErrorV1, setRunErrorV1] = useState<string | null>(null);
    const [runErrorV2, setRunErrorV2] = useState<string | null>(null);
    const [runWarningV2, setRunWarningV2] = useState<string | null>(null);
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

    const runScannerV1 = useCallback(() => {
        setRunErrorV1(null);
        setRunningV1(true);
        void runScanner()
            .then((result) => {
                if (!result.success) {
                    setRunErrorV1(result.message);
                    return;
                }
                return loadScanner();
            })
            .catch((e) => {
                console.error("[scanner v1 run]", e);
                setRunErrorV1("Scanner v1 run failed");
            })
            .finally(() => setRunningV1(false));
    }, [loadScanner]);

    const runScannerV2Scan = useCallback(() => {
        setRunErrorV2(null);
        setRunWarningV2(null);
        setRunningV2(true);
        void runScannerV2()
            .then((result) => {
                if (!result.success) {
                    setRunErrorV2(result.message);
                    return;
                }
                if (result.ai_error) {
                    setRunWarningV2(`Scan saved, but AI failed: ${result.ai_error}`);
                } else if (result.ai_skip_reason) {
                    setRunWarningV2(`Scan saved; AI skipped: ${result.ai_skip_reason}`);
                }
                return loadScanner();
            })
            .catch((e) => {
                console.error("[scanner v2 run]", e);
                setRunErrorV2("Scanner v2 run failed");
            })
            .finally(() => setRunningV2(false));
    }, [loadScanner]);

    useEffect(() => {
        loadScanner();
    }, [loadScanner]);

    return (
        <Stack w="100%" maxW="100%" gap="1rem">
            <Tabs.Root defaultValue="favorites">
                <Box overflowX="auto" pb="1">
                    <Tabs.List flexWrap="wrap" gap="1">
                        <Tabs.Trigger value="favorites">
                            Favorit
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
                <Tabs.Content value="favorites">
                    <ResponsiveCardGrid>
                        {TRADING_PAIRS.map((pair: string) => (
                            <AssetInterface key={pair} pair={pair} />
                        ))}
                    </ResponsiveCardGrid>
                </Tabs.Content>
                <Tabs.Content value="scanner-v1-pairs">
                    <ResponsiveCardGrid>
                        {scannerPairs.map((pair: string) => (
                            <AssetInterface key={pair} pair={pair} />
                        ))}
                    </ResponsiveCardGrid>
                </Tabs.Content>
                <Tabs.Content value="scanner-v2-pairs">
                    <ResponsiveCardGrid>
                        {scannerV2Pairs.map((pair: string) => (
                            <AssetInterface key={pair} pair={pair} />
                        ))}
                    </ResponsiveCardGrid>
                </Tabs.Content>
                <Tabs.Content value="scanner-v1-results">
                    <ScannerResults latestBatch={latestBatch} loading={loading} />
                </Tabs.Content>
                <Tabs.Content value="scanner-v2-results">
                    <Box>
                        <ScannerV2Results latestBatch={latestBatchV2} loading={loading} />
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
                        colorPalette="teal"
                        loading={runningV1}
                        onClick={runScannerV1}
                    >
                        Run scanner v1
                    </Button>
                    <Button
                        size="xs"
                        variant="outline"
                        colorPalette="purple"
                        loading={runningV2}
                        onClick={runScannerV2Scan}
                    >
                        Run scanner v2
                    </Button>
                </Stack>
                {runErrorV1 || runErrorV2 || runWarningV2 ? (
                    <Stack gap="0">
                        {runErrorV1 ? (
                            <Text fontSize="xs" color="red.400">
                                Scanner v1: {runErrorV1}
                            </Text>
                        ) : null}
                        {runErrorV2 ? (
                            <Text fontSize="xs" color="red.400">
                                Scanner v2: {runErrorV2}
                            </Text>
                        ) : null}
                        {runWarningV2 ? (
                            <Text fontSize="xs" color="orange.400">
                                {runWarningV2}
                            </Text>
                        ) : null}
                    </Stack>
                ) : null}
            </Stack>
        </Stack>

    );
}

export default HomePage;
