import ThemeTabTrigger from "@/components/2_molecules/ThemeTabTrigger/ThemeTabTrigger";
import AccountBalance from "@/components/3_organisms/AccountBalance/AccountBalance";
import AssetInterface from "@/components/3_organisms/AssetInterface/AssetInterface";
import ScannerChat from "@/components/3_organisms/ScannerChat/ScannerChat";
import ScannerResults from "@/components/3_organisms/ScannerResults/ScannerResults";
import { useTradingAccess } from "@/components/3_organisms/TradingAccess/TradingAccess";
import ResponsiveCardGrid from "@/components/4_layouts/ResponsiveCardGrid/ResponsiveCardGrid";
import { ColorModeButton } from "@/components/ui/color-mode";
import { ThemeColorSelector, useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { TRADING_PAIRS, CONTENT_MAX_WIDTH } from "@/services/config";
import type { ScannerLatestBatchFetchResult } from "@/types/scannerTypes";
import {
    fetchLatestScannerBatch,
    runScanner,
    scannerSymbolToBase,
} from "@/services/scannerUtils";
import { Button, Box, Stack, Tabs, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";

const HomePage = () => {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const { serverConfigured, signOut } = useTradingAccess();
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
        <Stack w="100%" maxW={CONTENT_MAX_WIDTH} mx="auto" gap="1rem">
            <Tabs.Root defaultValue="favorites" colorPalette={palette}>
                <Box overflowX="auto" pb="1">
                    <Tabs.List flexWrap="wrap" gap="2">
                        <ThemeTabTrigger value="favorites">Favs</ThemeTabTrigger>
                        <ThemeTabTrigger value="scanner-pairs">Scan Pairs</ThemeTabTrigger>
                        <ThemeTabTrigger value="scanner-results">Scan Results</ThemeTabTrigger>
                        <ThemeTabTrigger value="scanner-chat">Ask AI</ThemeTabTrigger>
                        <ThemeTabTrigger value="config">Config</ThemeTabTrigger>
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
                <Tabs.Content value="scanner-chat">
                    <ScannerChat />
                </Tabs.Content>
                <Tabs.Content value="config">
                    <Stack gap="3">
                        <Stack direction="row" gap="1rem" flexWrap="wrap" align="flex-end">
                            <ColorModeButton />
                            <ThemeColorSelector />
                            <AccountBalance />
                            <Button
                                size="xs"
                                variant="outline"
                                colorPalette={palette}
                                loading={loading}
                                onClick={() => loadScanner()}
                            >
                                Refresh
                            </Button>
                            <Button
                                size="xs"
                                variant="outline"
                                colorPalette={palette}
                                loading={running}
                                onClick={runScannerScan}
                            >
                                Run scanner
                            </Button>
                            {!serverConfigured ? (
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    colorPalette={palette}
                                    onClick={signOut}
                                >
                                    Sign out
                                </Button>
                            ) : null}
                        </Stack>
                        {runError || runWarning ? (
                            <Stack gap="0">
                                {runError ? (
                                    <Text fontSize="xs" color="red.400">
                                        Scanner: {runError}
                                    </Text>
                                ) : null}
                                {runWarning ? (
                                    <Text fontSize="xs" color={tokens.panelLabel}>
                                        {runWarning}
                                    </Text>
                                ) : null}
                            </Stack>
                        ) : null}
                    </Stack>
                </Tabs.Content>
            </Tabs.Root>
        </Stack>
    );
};

export default HomePage;
