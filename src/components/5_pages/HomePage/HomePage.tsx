import ThemeTabTrigger from "@/components/2_molecules/ThemeTabTrigger/ThemeTabTrigger";
import AssetInterface from "@/components/3_organisms/AssetInterface/AssetInterface";
import ConfigPanel from "@/components/3_organisms/ConfigPanel/ConfigPanel";
import ScannerChat from "@/components/3_organisms/ScannerChat/ScannerChat";
import ScannerResults from "@/components/3_organisms/ScannerResults/ScannerResults";
import SignalsMonitorPanel from "@/components/3_organisms/SignalsMonitorPanel/SignalsMonitorPanel";
import RiskDeskPanel from "@/components/3_organisms/RiskDeskPanel/RiskDeskPanel";
import TradeJournalPanel from "@/components/3_organisms/TradeJournalPanel/TradeJournalPanel";
import ResponsiveCardGrid from "@/components/4_layouts/ResponsiveCardGrid/ResponsiveCardGrid";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { TRADING_PAIRS, CONTENT_MAX_WIDTH, IS_PROFILE_B_ACTIVE } from "@/services/config";
import type { ScannerSetupRow, ScannerViewFetchResult } from "@/types/scannerTypes";
import {
    fetchLatestScannerBatch,
    fetchScannerView,
    scannerSymbolToBase,
    SCANNER_PROFILES,
    type ScannerProfile,
} from "@/services/scannerUtils";
import { Stack, Tabs } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

const INITIAL_SCANNER_LOADING: Record<ScannerProfile, boolean> = {
    b: false,
    a: false,
};

function runScannerViewFetch(
    profile: ScannerProfile,
    loadIdRef: MutableRefObject<Record<ScannerProfile, number>>,
    setViews: Dispatch<SetStateAction<Record<ScannerProfile, ScannerViewFetchResult | null>>>,
    setLoading: Dispatch<SetStateAction<Record<ScannerProfile, boolean>>>,
    options?: { fresh?: boolean; reload?: boolean },
): Promise<void> {
    const loadId = ++loadIdRef.current[profile];
    setLoading((prev) => ({ ...prev, [profile]: true }));

    return fetchScannerView(profile, options)
        .then((view) => {
            if (loadId !== loadIdRef.current[profile]) return;
            setViews((prev) => ({ ...prev, [profile]: view }));
        })
        .catch((e) => console.error(`[scanner refresh ${profile}]`, e))
        .finally(() => {
            if (loadId !== loadIdRef.current[profile]) return;
            setLoading((prev) => ({ ...prev, [profile]: false }));
        });
}

const HomePage = () => {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const [views, setViews] = useState<Record<ScannerProfile, ScannerViewFetchResult | null>>({
        b: null,
        a: null,
    });
    const [batchSetups, setBatchSetups] = useState<Record<ScannerProfile, ScannerSetupRow[]>>({
        b: [],
        a: [],
    });
    const [loading, setLoading] = useState<Record<ScannerProfile, boolean>>(INITIAL_SCANNER_LOADING);
    const loadIdRef = useRef<Record<ScannerProfile, number>>({ b: 0, a: 0 });
    const [activeTab, setActiveTab] = useState("pairs");

    const loadScanner = useCallback(
        (profile: ScannerProfile, options?: { fresh?: boolean; reload?: boolean }) =>
            runScannerViewFetch(profile, loadIdRef, setViews, setLoading, options),
        [],
    );

    const refreshScannerFromConfig = useCallback(
        (profile: ScannerProfile) => loadScanner(profile, { reload: true }),
        [loadScanner],
    );

    useEffect(() => {
        for (const profile of SCANNER_PROFILES) {
            void fetchLatestScannerBatch(profile)
                .then((result) => {
                    if ("message" in result) return;
                    setBatchSetups((prev) => ({ ...prev, [profile]: result.setups }));
                })
                .catch((e) => console.error(`[scanner batch ${profile}]`, e));
        }
    }, []);

    useEffect(() => {
        const profile: ScannerProfile | null =
            activeTab === "scanner-a" ? "a" : activeTab === "scanner-b" ? "b" : null;
        if (!profile) return;

        const frameId = requestAnimationFrame(() => {
            loadScanner(profile, { reload: true });
        });
        return () => cancelAnimationFrame(frameId);
    }, [activeTab, loadScanner]);

    const scannerPairs = useMemo(() => {
        const bases: string[] = [];
        for (const profile of SCANNER_PROFILES) {
            const view = views[profile];
            const setups =
                view != null && !("message" in view) ? view.setups : batchSetups[profile];
            for (const setup of setups) {
                bases.push(scannerSymbolToBase(setup.symbol));
            }
        }
        return [...new Set(bases)];
    }, [batchSetups, views]);

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
                    <ThemeTabTrigger value="scanner-a">Scanner</ThemeTabTrigger>
                    {IS_PROFILE_B_ACTIVE && (
                        <ThemeTabTrigger value="scanner-b">Scanner B</ThemeTabTrigger>
                    )}
                    <ThemeTabTrigger value="scanner-chat">AI Chat</ThemeTabTrigger>
                    <ThemeTabTrigger value="signals">Signals</ThemeTabTrigger>
                    <ThemeTabTrigger value="risk">Risk desk</ThemeTabTrigger>
                    <ThemeTabTrigger value="journal">Journal</ThemeTabTrigger>
                    <ThemeTabTrigger value="config">Config</ThemeTabTrigger>
                </Tabs.List>

                <Tabs.Content value="pairs">
                    <ResponsiveCardGrid>
                        {tradingPairs.map((pair) => (
                            <AssetInterface key={pair} pair={pair} />
                        ))}
                    </ResponsiveCardGrid>
                </Tabs.Content>

                <Tabs.Content value="scanner-a">
                    <ScannerResults
                        profile="a"
                        scannerView={views.a}
                        loading={loading.a}
                    />
                </Tabs.Content>

                {IS_PROFILE_B_ACTIVE && (
                    <Tabs.Content value="scanner-b">
                        <ScannerResults
                            profile="b"
                            scannerView={views.b}
                            loading={loading.b}
                        />
                    </Tabs.Content>
                )}

                <Tabs.Content value="scanner-chat">
                    <ScannerChat />
                </Tabs.Content>

                <Tabs.Content value="signals">
                    {activeTab === "signals" ? <SignalsMonitorPanel active /> : null}
                </Tabs.Content>

                <Tabs.Content value="risk">
                    {activeTab === "risk" ? <RiskDeskPanel active /> : null}
                </Tabs.Content>

                <Tabs.Content value="journal">
                    {activeTab === "journal" ? <TradeJournalPanel active /> : null}
                </Tabs.Content>

                <Tabs.Content value="config">
                    <ConfigPanel onScannerRefresh={refreshScannerFromConfig} />
                </Tabs.Content>
            </Tabs.Root>
        </Stack>
    );
};

export default HomePage;
