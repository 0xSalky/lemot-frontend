import ThemeTabTrigger from "@/components/2_molecules/ThemeTabTrigger/ThemeTabTrigger";
import AccountBalance from "@/components/3_organisms/AccountBalance/AccountBalance";
import AssetInterface from "@/components/3_organisms/AssetInterface/AssetInterface";
import ScannerChat from "@/components/3_organisms/ScannerChat/ScannerChat";
import ScannerResults from "@/components/3_organisms/ScannerResults/ScannerResults";
import { useTradingAccess } from "@/components/3_organisms/TradingAccess/TradingAccess";
import ResponsiveCardGrid from "@/components/4_layouts/ResponsiveCardGrid/ResponsiveCardGrid";
import { ColorModeButton } from "@/components/ui/color-mode";
import { ThemeSkinSelector } from "@/components/ui/theme-skin";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { TRADING_PAIRS, CONTENT_MAX_WIDTH } from "@/services/config";
import type { ScannerLatestBatchFetchResult } from "@/types/scannerTypes";
import {
    fetchLatestScannerBatch,
    runScanner,
    scannerSymbolToBase,
    SCANNER_PROFILE,
    SCANNER_PROFILE_LABEL,
} from "@/services/scannerUtils";
import { Button, Box, Separator, Stack, Tabs, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function ConfigSection({ title, children }: { title: string; children: ReactNode }) {
    const tokens = useThemeTokens();

    return (
        <Stack gap="2">
            <Text
                fontSize="2xs"
                fontFamily="mono"
                color={tokens.panelLabel}
                textTransform="uppercase"
                letterSpacing="0.08em"
            >
                {title}
            </Text>
            {children}
        </Stack>
    );
}

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

        void fetchLatestScannerBatch(SCANNER_PROFILE)
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
        void runScanner(SCANNER_PROFILE)
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

    const tradingPairs = useMemo(() => {
        const combined = [...new Set([...TRADING_PAIRS, ...scannerPairs])];
        const rest = combined.filter((p) => p !== "BTC").sort((a, b) => a.localeCompare(b));
        return combined.includes("BTC") ? ["BTC", ...rest] : rest;
    }, [scannerPairs]);

    return (
        <Stack w="100%" maxW={CONTENT_MAX_WIDTH} mx="auto" gap="1rem">
            <Tabs.Root defaultValue="pairs" colorPalette={palette}>
                <Box overflowX="auto" pb="1">
                    <Tabs.List flexWrap="wrap" gap="2">
                        <ThemeTabTrigger value="pairs">Pairs</ThemeTabTrigger>
                        <ThemeTabTrigger value="scanner-results">{SCANNER_PROFILE_LABEL} scan</ThemeTabTrigger>
                        <ThemeTabTrigger value="scanner-chat">AI Chat</ThemeTabTrigger>
                        <ThemeTabTrigger value="config">Config</ThemeTabTrigger>
                    </Tabs.List>
                </Box>
                <Tabs.Content value="pairs">
                    <ResponsiveCardGrid>
                        {tradingPairs.map((pair: string) => (
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
                    <Box
                        mt="2"
                        p={{ base: "4", md: "5" }}
                        rounded="lg"
                        borderWidth="1px"
                        borderColor={tokens.panelBorder}
                        bg={tokens.panelBg}
                        backdropFilter="blur(10px)"
                    >
                        <Text
                            fontFamily="mono"
                            fontSize="sm"
                            fontWeight="semibold"
                            color={tokens.title}
                            mb="4"
                        >
                            Settings
                        </Text>
                        <Stack gap="5">
                            <ConfigSection title="Appearance">
                                <Stack
                                    direction={{ base: "column", sm: "row" }}
                                    gap="4"
                                    align={{ base: "stretch", sm: "flex-end" }}
                                    flexWrap="wrap"
                                >
                                    <Stack gap="1" minW="6rem">
                                        <Text fontSize="xs" fontFamily="mono" color={tokens.panelMuted}>
                                            Color mode
                                        </Text>
                                        <Box>
                                            <ColorModeButton
                                                variant="outline"
                                                borderColor={tokens.panelBorder}
                                                color={tokens.panelBody}
                                            />
                                        </Box>
                                    </Stack>
                                    <ThemeSkinSelector />
                                </Stack>
                            </ConfigSection>

                            <Separator borderColor={tokens.panelBorder} />

                            <ConfigSection title={`${SCANNER_PROFILE_LABEL} scanner`}>
                                <Stack gap="3">
                                    <Text fontSize="xs" fontFamily="mono" color={tokens.panelMuted}>
                                        Profile: {SCANNER_PROFILE}
                                    </Text>
                                    <Stack direction="row" gap="2" flexWrap="wrap">
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            colorPalette={palette}
                                            borderColor={tokens.panelBorder}
                                            loading={loading}
                                            onClick={() => loadScanner()}
                                        >
                                            Refresh {SCANNER_PROFILE} results
                                        </Button>
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            colorPalette={palette}
                                            borderColor={tokens.panelBorder}
                                            loading={running}
                                            onClick={runScannerScan}
                                        >
                                            Run {SCANNER_PROFILE} scan
                                        </Button>
                                    </Stack>
                                    {runError || runWarning ? (
                                        <Box
                                            p="3"
                                            rounded="md"
                                            borderWidth="1px"
                                            borderColor={tokens.panelBorder}
                                            bg={tokens.panelBgUser}
                                        >
                                            <Stack gap="1">
                                                {runError ? (
                                                    <Text fontSize="xs" fontFamily="mono" color="red.400">
                                                        {runError}
                                                    </Text>
                                                ) : null}
                                                {runWarning ? (
                                                    <Text
                                                        fontSize="xs"
                                                        fontFamily="mono"
                                                        color={tokens.panelLabel}
                                                    >
                                                        {runWarning}
                                                    </Text>
                                                ) : null}
                                            </Stack>
                                        </Box>
                                    ) : null}
                                </Stack>
                            </ConfigSection>

                            <Separator borderColor={tokens.panelBorder} />

                            <ConfigSection title="Account">
                                <Stack
                                    direction={{ base: "column", sm: "row" }}
                                    gap="3"
                                    align={{ base: "stretch", sm: "center" }}
                                    flexWrap="wrap"
                                >
                                    <AccountBalance />
                                    {!serverConfigured ? (
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            colorPalette={palette}
                                            borderColor={tokens.panelBorder}
                                            onClick={signOut}
                                        >
                                            Sign out
                                        </Button>
                                    ) : null}
                                </Stack>
                            </ConfigSection>
                        </Stack>
                    </Box>
                </Tabs.Content>
            </Tabs.Root>
        </Stack>
    );
};

export default HomePage;
