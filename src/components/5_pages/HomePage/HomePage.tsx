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
    scannerProfileLabel,
    scannerSymbolToBase,
    SCANNER_PROFILES,
    type ScannerProfile,
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

type ProfileRunState = {
    running: boolean;
    runError: string | null;
    runWarning: string | null;
};

const INITIAL_RUN_STATE: ProfileRunState = {
    running: false,
    runError: null,
    runWarning: null,
};

function ScannerConfigPanel({
    profile,
    loading,
    runState,
    onRefresh,
    onRun,
}: {
    profile: ScannerProfile;
    loading: boolean;
    runState: ProfileRunState;
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
                    loading={runState.running}
                    onClick={onRun}
                >
                    Run {label} scan
                </Button>
            </Stack>
            {runState.runError || runState.runWarning ? (
                <Box
                    p="3"
                    rounded="md"
                    borderWidth="1px"
                    borderColor={tokens.panelBorder}
                    bg={tokens.panelBgUser}
                >
                    <Stack gap="1">
                        {runState.runError ? (
                            <Text fontSize="xs" fontFamily="mono" color="red.400">
                                {runState.runError}
                            </Text>
                        ) : null}
                        {runState.runWarning ? (
                            <Text fontSize="xs" fontFamily="mono" color={tokens.panelLabel}>
                                {runState.runWarning}
                            </Text>
                        ) : null}
                    </Stack>
                </Box>
            ) : null}
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
    const [loading, setLoading] = useState<Record<ScannerProfile, boolean>>({
        swing: false,
        day: false,
    });
    const [runState, setRunState] = useState<Record<ScannerProfile, ProfileRunState>>({
        swing: { ...INITIAL_RUN_STATE },
        day: { ...INITIAL_RUN_STATE },
    });
    const loadIdRef = useRef<Record<ScannerProfile, number>>({ swing: 0, day: 0 });

    const loadScanner = useCallback((profile: ScannerProfile) => {
        const loadId = ++loadIdRef.current[profile];
        setLoading((prev) => ({ ...prev, [profile]: true }));

        void fetchLatestScannerBatch(profile)
            .then((batch) => {
                if (loadId !== loadIdRef.current[profile]) return;
                setBatches((prev) => ({ ...prev, [profile]: batch }));
            })
            .catch((e) => console.error(`[scanner refresh ${profile}]`, e))
            .finally(() => {
                if (loadId !== loadIdRef.current[profile]) return;
                setLoading((prev) => ({ ...prev, [profile]: false }));
            });
    }, []);

    const runScannerScan = useCallback(
        (profile: ScannerProfile) => {
            setRunState((prev) => ({
                ...prev,
                [profile]: { ...INITIAL_RUN_STATE, running: true },
            }));

            void runScanner(profile)
                .then((result) => {
                    if (!result.success) {
                        setRunState((prev) => ({
                            ...prev,
                            [profile]: {
                                running: false,
                                runError: result.message,
                                runWarning: null,
                            },
                        }));
                        return;
                    }
                    const runWarning = result.ai_error
                        ? `Scan saved, but AI failed: ${result.ai_error}`
                        : result.ai_skip_reason
                          ? `Scan saved; AI skipped: ${result.ai_skip_reason}`
                          : null;
                    setRunState((prev) => ({
                        ...prev,
                        [profile]: {
                            running: false,
                            runError: null,
                            runWarning,
                        },
                    }));
                    loadScanner(profile);
                })
                .catch((e) => {
                    console.error(`[scanner run ${profile}]`, e);
                    setRunState((prev) => ({
                        ...prev,
                        [profile]: {
                            running: false,
                            runError: "Scanner run failed",
                            runWarning: null,
                        },
                    }));
                });
        },
        [loadScanner],
    );

    useEffect(() => {
        for (const profile of SCANNER_PROFILES) {
            loadScanner(profile);
        }
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
        <Stack w="100%" maxW={CONTENT_MAX_WIDTH} mx="auto" gap="1rem">
            <Tabs.Root defaultValue="pairs" colorPalette={palette}>
                <Box overflowX="auto" pb="1">
                    <Tabs.List flexWrap="wrap" gap="2">
                        <ThemeTabTrigger value="pairs">Pairs</ThemeTabTrigger>
                        <ThemeTabTrigger value="scanner-swing">Swing scan</ThemeTabTrigger>
                        <ThemeTabTrigger value="scanner-day">Day scan</ThemeTabTrigger>
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
                <Tabs.Content value="scanner-swing">
                    <Box>
                        <ScannerResults
                            profile="swing"
                            latestBatch={batches.swing}
                            loading={loading.swing}
                        />
                    </Box>
                </Tabs.Content>
                <Tabs.Content value="scanner-day">
                    <Box>
                        <ScannerResults
                            profile="day"
                            latestBatch={batches.day}
                            loading={loading.day}
                        />
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

                            <ConfigSection title="Swing scanner">
                                <ScannerConfigPanel
                                    profile="swing"
                                    loading={loading.swing}
                                    runState={runState.swing}
                                    onRefresh={() => loadScanner("swing")}
                                    onRun={() => runScannerScan("swing")}
                                />
                            </ConfigSection>

                            <Separator borderColor={tokens.panelBorder} />

                            <ConfigSection title="Day scanner">
                                <ScannerConfigPanel
                                    profile="day"
                                    loading={loading.day}
                                    runState={runState.day}
                                    onRefresh={() => loadScanner("day")}
                                    onRun={() => runScannerScan("day")}
                                />
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
