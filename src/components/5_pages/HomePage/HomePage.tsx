import ThemeTabTrigger from "@/components/2_molecules/ThemeTabTrigger/ThemeTabTrigger";
import AccountBalance from "@/components/3_organisms/AccountBalance/AccountBalance";
import AssetInterface from "@/components/3_organisms/AssetInterface/AssetInterface";
import ScannerChat from "@/components/3_organisms/ScannerChat/ScannerChat";
import ScannerResults from "@/components/3_organisms/ScannerResults/ScannerResults";
import SignalsConfigPanel from "@/components/3_organisms/SignalsConfigPanel/SignalsConfigPanel";
import { useTradingAccess } from "@/components/3_organisms/TradingAccess/TradingAccess";
import ResponsiveCardGrid from "@/components/4_layouts/ResponsiveCardGrid/ResponsiveCardGrid";
import { ColorModeButton } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import { ThemeSkinSelector } from "@/components/ui/theme-skin";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { TRADING_PAIRS, CONTENT_MAX_WIDTH } from "@/services/config";
import type { ScannerLatestBatchFetchResult } from "@/types/scannerTypes";
import {
    fetchLatestScannerBatch,
    runScanner,
    scannerProfileLabel,
    scannerSymbolToBase,
    SCANNER_PROFILES,
    type ScannerProfile,
} from "@/services/scannerUtils";
import { Button, Box, Separator, Stack, Tabs, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

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

const INITIAL_SCANNER_LOADING: Record<ScannerProfile, boolean> = {
    swing: true,
    day: true,
};

function runScannerBatchFetch(
    profile: ScannerProfile,
    loadIdRef: MutableRefObject<Record<ScannerProfile, number>>,
    setBatches: Dispatch<SetStateAction<Record<ScannerProfile, ScannerLatestBatchFetchResult | null>>>,
    setLoading: Dispatch<SetStateAction<Record<ScannerProfile, boolean>>>,
) {
    const loadId = ++loadIdRef.current[profile];

    return fetchLatestScannerBatch(profile)
        .then((batch) => {
            if (loadId !== loadIdRef.current[profile]) return;
            setBatches((prev) => ({ ...prev, [profile]: batch }));
        })
        .catch((e) => console.error(`[scanner refresh ${profile}]`, e))
        .finally(() => {
            if (loadId !== loadIdRef.current[profile]) return;
            setLoading((prev) => ({ ...prev, [profile]: false }));
        });
}

function ScannerConfigPanel({
    profile,
    loading,
    onRefresh,
    onRun,
}: {
    profile: ScannerProfile;
    loading: boolean;
    onRefresh: () => void;
    onRun: () => void;
}) {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const label = scannerProfileLabel(profile);

    return (
        <Stack gap="3">
            <Text fontSize="xs" fontFamily="mono" color={tokens.panelMuted}>
                Profile: {profile}
                {profile === "day" ? " · watchlist scan" : " · high-volume scan"}
            </Text>
            <Stack direction="row" gap="2" flexWrap="wrap">
                <Button
                    size="xs"
                    variant="outline"
                    colorPalette={palette}
                    borderColor={tokens.panelBorder}
                    loading={loading}
                    onClick={onRefresh}
                >
                    Refresh {label} results
                </Button>
                <Button
                    size="xs"
                    variant="outline"
                    colorPalette={palette}
                    borderColor={tokens.panelBorder}
                    onClick={onRun}
                >
                    Run {label} scan
                </Button>
            </Stack>
        </Stack>
    );
}

const HomePage = () => {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const { serverConfigured, signOut } = useTradingAccess();
    const [batches, setBatches] = useState<Record<ScannerProfile, ScannerLatestBatchFetchResult | null>>({
        swing: null,
        day: null,
    });
    const [loading, setLoading] = useState<Record<ScannerProfile, boolean>>(INITIAL_SCANNER_LOADING);
    const loadIdRef = useRef<Record<ScannerProfile, number>>({ swing: 0, day: 0 });

    const loadScanner = useCallback((profile: ScannerProfile) => {
        setLoading((prev) => ({ ...prev, [profile]: true }));
        void runScannerBatchFetch(profile, loadIdRef, setBatches, setLoading);
    }, []);

    useEffect(() => {
        for (const profile of SCANNER_PROFILES) {
            void runScannerBatchFetch(profile, loadIdRef, setBatches, setLoading);
        }
    }, []);

    const runScannerScan = useCallback((profile: ScannerProfile) => {
        const label = scannerProfileLabel(profile);
        toaster.success({
            title: `${label} scan requested`,
            description: "May take a few minutes. Refresh results when ready.",
        });
        void runScanner(profile)
            .then((result) => {
                if (!result.success) {
                    toaster.error({
                        title: `${label} scan`,
                        description: result.message,
                    });
                    return;
                }
                loadScanner(profile);
            })
            .catch((e) => {
                console.error(`[scanner run ${profile}]`, e);
                toaster.error({
                    title: `${label} scan`,
                    description: "Request failed",
                });
            });
    }, [loadScanner]);

    const scannerPairs = useMemo(() => {
        const bases: string[] = [];
        for (const profile of SCANNER_PROFILES) {
            const batch = batches[profile];
            if (batch == null || "message" in batch) continue;
            for (const setup of batch.setups) {
                bases.push(scannerSymbolToBase(setup.symbol));
            }
        }
        return [...new Set(bases)];
    }, [batches]);

    const tradingPairs = useMemo(() => {
        const combined = [...new Set([...TRADING_PAIRS, ...scannerPairs])];
        const rest = combined.filter((p) => p !== "BTC").sort((a, b) => a.localeCompare(b));
        return combined.includes("BTC") ? ["BTC", ...rest] : rest;
    }, [scannerPairs]);

    return (
        <Stack
            w="100%"
            maxW={CONTENT_MAX_WIDTH}
            mx="auto"
            gap="1rem"
            pt={{ base: "0.75rem", md: "1rem" }}
            pb={{ base: "2rem", md: "2.5rem" }}
        >
            <Tabs.Root defaultValue="pairs" colorPalette={palette}>
                <Tabs.List
                    bg="transparent"
                    borderBottomWidth="1px"
                    borderColor={tokens.panelBorder}
                    flexWrap="wrap"
                    gap="1.5"
                    w="100%"
                    pb="1"
                >
                        <ThemeTabTrigger value="pairs">Pairs</ThemeTabTrigger>
                        <ThemeTabTrigger value="scanner-day">Day scan</ThemeTabTrigger>
                        <ThemeTabTrigger value="scanner-swing">Swing scan</ThemeTabTrigger>
                        <ThemeTabTrigger value="scanner-chat">AI Chat</ThemeTabTrigger>
                        <ThemeTabTrigger value="config">Config</ThemeTabTrigger>
                </Tabs.List>

                <Tabs.Content value="pairs">
                    <ResponsiveCardGrid>
                        {tradingPairs.map((pair) => (
                            <AssetInterface key={pair} pair={pair} />
                        ))}
                    </ResponsiveCardGrid>
                </Tabs.Content>

                <Tabs.Content value="scanner-day">
                    <ScannerResults
                        profile="day"
                        latestBatch={batches.day}
                        loading={loading.day}
                    />
                </Tabs.Content>

                <Tabs.Content value="scanner-swing">
                    <ScannerResults
                        profile="swing"
                        latestBatch={batches.swing}
                        loading={loading.swing}
                    />
                </Tabs.Content>

                <Tabs.Content value="scanner-chat">
                    <ScannerChat />
                </Tabs.Content>

                <Tabs.Content value="config">
                    <Box
                        mt="2"
                        p="4"
                        borderWidth="1px"
                        borderColor={tokens.panelBorder}
                        bg={tokens.panelBg}
                        rounded="md"
                    >
                        <Stack gap="4">
                            <Stack gap="6">
                                <ConfigSection title="Appearance">
                                    <Stack gap="3">
                                        <Stack
                                            direction={{ base: "column", sm: "row" }}
                                            gap="3"
                                            align={{ base: "stretch", sm: "flex-end" }}
                                            flexWrap="wrap"
                                        >
                                            <Stack gap="1" minW="6rem">
                                                <Text fontSize="xs" fontFamily="mono" color={tokens.panelMuted}>
                                                    Color mode
                                                </Text>
                                                <Box w="fit-content">
                                                    <ColorModeButton
                                                        variant="outline"
                                                        borderColor={tokens.panelBorder}
                                                        color={tokens.panelBody}
                                                    />
                                                </Box>
                                            </Stack>
                                            <ThemeSkinSelector />
                                        </Stack>
                                        {!serverConfigured ? (
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                alignSelf="flex-start"
                                                borderColor={tokens.panelBorder}
                                                color={tokens.panelBody}
                                                onClick={signOut}
                                            >
                                                Disconnect API
                                            </Button>
                                        ) : null}
                                    </Stack>
                                </ConfigSection>

                                <Separator borderColor={tokens.panelBorder} />

                                <ConfigSection title="Day scanner">
                                    <ScannerConfigPanel
                                        profile="day"
                                        loading={loading.day}
                                        onRefresh={() => loadScanner("day")}
                                        onRun={() => runScannerScan("day")}
                                    />
                                </ConfigSection>

                                <Separator borderColor={tokens.panelBorder} />

                                <ConfigSection title="Swing scanner">
                                    <ScannerConfigPanel
                                        profile="swing"
                                        loading={loading.swing}
                                        onRefresh={() => loadScanner("swing")}
                                        onRun={() => runScannerScan("swing")}
                                    />
                                </ConfigSection>

                                <Separator borderColor={tokens.panelBorder} />

                                <ConfigSection title="Signals (live)">
                                    <SignalsConfigPanel tokens={tokens} />
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
                                    </Stack>
                                </ConfigSection>
                            </Stack>
                        </Stack>
                    </Box>
                </Tabs.Content>
            </Tabs.Root>
        </Stack>
    );
};

export default HomePage;
