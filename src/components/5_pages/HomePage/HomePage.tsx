import ThemeTabTrigger from "@/components/2_molecules/ThemeTabTrigger/ThemeTabTrigger";
import AccountBalance from "@/components/3_organisms/AccountBalance/AccountBalance";
import AssetInterface from "@/components/3_organisms/AssetInterface/AssetInterface";
import ScannerChat from "@/components/3_organisms/ScannerChat/ScannerChat";
import ScannerResults from "@/components/3_organisms/ScannerResults/ScannerResults";
import SignalsConfigPanel from "@/components/3_organisms/SignalsConfigPanel/SignalsConfigPanel";
import SignalsMonitorPanel from "@/components/3_organisms/SignalsMonitorPanel/SignalsMonitorPanel";
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
    running,
    onRefresh,
    onRunScan,
    onRunScanWithAi,
}: {
    profile: ScannerProfile;
    loading: boolean;
    running: boolean;
    onRefresh: () => void;
    onRunScan: () => void;
    onRunScanWithAi: () => void;
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
                    loading={running}
                    onClick={onRunScan}
                >
                    Run {label} scan
                </Button>
                <Button
                    size="xs"
                    variant="outline"
                    colorPalette={palette}
                    borderColor={tokens.panelBorder}
                    loading={running}
                    onClick={onRunScanWithAi}
                >
                    Run {label} scan + AI
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
    const [running, setRunning] = useState<Record<ScannerProfile, boolean>>({ swing: false, day: false });
    const loadIdRef = useRef<Record<ScannerProfile, number>>({ swing: 0, day: 0 });
    const [activeTab, setActiveTab] = useState("pairs");

    const loadScanner = useCallback((profile: ScannerProfile) => {
        setLoading((prev) => ({ ...prev, [profile]: true }));
        void runScannerBatchFetch(profile, loadIdRef, setBatches, setLoading);
    }, []);

    useEffect(() => {
        for (const profile of SCANNER_PROFILES) {
            void runScannerBatchFetch(profile, loadIdRef, setBatches, setLoading);
        }
    }, []);

    const runScannerJob = useCallback(
        (profile: ScannerProfile, withAi: boolean) => {
            const label = scannerProfileLabel(profile);
            toaster.info({
                title: withAi ? `${label} scan + AI started` : `${label} scan started`,
                description: "This may take a few minutes. Tap Refresh when ready.",
            });
            setRunning((prev) => ({ ...prev, [profile]: true }));
            void runScanner(profile, { analyze: withAi })
                .then((result) => {
                    if (!result.success) {
                        toaster.error({ title: `${label} scan failed`, description: result.message });
                        return;
                    }
                    if (withAi && result.ai_error) {
                        toaster.warning({
                            title: `${label} scan saved, AI failed`,
                            description: result.ai_error,
                        });
                        return;
                    }
                    if (withAi && result.ai_skip_reason) {
                        toaster.warning({
                            title: `${label} scan saved, AI skipped`,
                            description: result.ai_skip_reason,
                        });
                        return;
                    }
                    toaster.success({
                        title: withAi ? `${label} scan + AI complete` : `${label} scan complete`,
                        description:
                            result.setup_count != null
                                ? `${result.setup_count} setups`
                                : undefined,
                    });
                })
                .catch((e) => {
                    console.error(`[scanner run ${profile}]`, e);
                    toaster.error({ title: `${label} scan failed`, description: String(e) });
                })
                .finally(() => {
                    setRunning((prev) => ({ ...prev, [profile]: false }));
                });
        },
        [],
    );

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
            <Tabs.Root
                value={activeTab}
                onValueChange={(event) => setActiveTab(event.value)}
                defaultValue="pairs"
                colorPalette={palette}
            >
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
                    <ThemeTabTrigger value="signals">Signals</ThemeTabTrigger>
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
                    {activeTab === "scanner-day" ? (
                        <ScannerResults
                            profile="day"
                            latestBatch={batches.day}
                            loading={loading.day}
                            active
                        />
                    ) : null}
                </Tabs.Content>

                <Tabs.Content value="scanner-swing">
                    {activeTab === "scanner-swing" ? (
                        <ScannerResults
                            profile="swing"
                            latestBatch={batches.swing}
                            loading={loading.swing}
                            active
                        />
                    ) : null}
                </Tabs.Content>

                <Tabs.Content value="scanner-chat">
                    <ScannerChat />
                </Tabs.Content>

                <Tabs.Content value="signals">
                    {activeTab === "signals" ? <SignalsMonitorPanel active /> : null}
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
                                    </Stack>
                                </ConfigSection>

                                <Separator borderColor={tokens.panelBorder} />

                                <ConfigSection title="Day scanner">
                                    <ScannerConfigPanel
                                        profile="day"
                                        loading={loading.day}
                                        running={running.day}
                                        onRefresh={() => loadScanner("day")}
                                        onRunScan={() => runScannerJob("day", false)}
                                        onRunScanWithAi={() => runScannerJob("day", true)}
                                    />
                                </ConfigSection>

                                <Separator borderColor={tokens.panelBorder} />

                                <ConfigSection title="Swing scanner">
                                    <ScannerConfigPanel
                                        profile="swing"
                                        loading={loading.swing}
                                        running={running.swing}
                                        onRefresh={() => loadScanner("swing")}
                                        onRunScan={() => runScannerJob("swing", false)}
                                        onRunScanWithAi={() => runScannerJob("swing", true)}
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

                                {!serverConfigured ? (
                                    <>
                                        <Separator borderColor={tokens.panelBorder} />
                                        <ConfigSection title="API">
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
                                        </ConfigSection>
                                    </>
                                ) : null}
                            </Stack>
                        </Stack>
                    </Box>
                </Tabs.Content>
            </Tabs.Root>
        </Stack>
    );
};

export default HomePage;
