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

type HomeTabId =
    | "pairs"
    | "scanner-a"
    | "scanner-b"
    | "scanner-chat"
    | "signals"
    | "risk"
    | "journal"
    | "config";

function initialTabRefreshKeys(): Record<HomeTabId, number> {
    return {
        pairs: 0,
        "scanner-a": 0,
        "scanner-b": 0,
        "scanner-chat": 0,
        signals: 0,
        risk: 0,
        journal: 0,
        config: 0,
    };
}

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
    const [activeTab, setActiveTab] = useState<HomeTabId>("pairs");
    const [tabRefreshKeys, setTabRefreshKeys] = useState(initialTabRefreshKeys);

    const loadScanner = useCallback(
        (profile: ScannerProfile, options?: { fresh?: boolean; reload?: boolean }) =>
            runScannerViewFetch(profile, loadIdRef, setViews, setLoading, options),
        [],
    );

    const refreshScannerFromConfig = useCallback(
        (profile: ScannerProfile) => loadScanner(profile, { reload: true }),
        [loadScanner],
    );

    const bumpTabRefresh = useCallback((tab: string) => {
        const key = tab as HomeTabId;
        setTabRefreshKeys((prev) => ({ ...prev, [key]: prev[key] + 1 }));
    }, []);

    const handleTabChange = useCallback(
        (value: string) => {
            setActiveTab(value as HomeTabId);
            bumpTabRefresh(value);
        },
        [bumpTabRefresh],
    );

    const refreshPairs = useCallback(() => {
        for (const profile of SCANNER_PROFILES) {
            void fetchLatestScannerBatch(profile)
                .then((result) => {
                    if ("message" in result) return;
                    setBatchSetups((prev) => ({ ...prev, [profile]: result.setups }));
                })
                .catch((e) => console.error(`[scanner batch ${profile}]`, e));
        }
    }, []);

    const pairsRefreshKey = tabRefreshKeys.pairs;
    const scannerARefreshKey = tabRefreshKeys["scanner-a"];
    const scannerBRefreshKey = tabRefreshKeys["scanner-b"];

    useEffect(() => {
        if (activeTab !== "pairs") return;
        refreshPairs();
    }, [activeTab, refreshPairs, pairsRefreshKey]);

    useEffect(() => {
        if (activeTab !== "scanner-a") return;
        void loadScanner("a", { reload: true });
    }, [activeTab, loadScanner, scannerARefreshKey]);

    useEffect(() => {
        if (activeTab !== "scanner-b") return;
        void loadScanner("b", { reload: true });
    }, [activeTab, loadScanner, scannerBRefreshKey]);

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
                onValueChange={(event) => handleTabChange(event.value)}
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
                    <ThemeTabTrigger value="pairs" currentTab={activeTab} onReselect={bumpTabRefresh}>
                        Pairs
                    </ThemeTabTrigger>
                    <ThemeTabTrigger value="scanner-a" currentTab={activeTab} onReselect={bumpTabRefresh}>
                        Scanner
                    </ThemeTabTrigger>
                    {IS_PROFILE_B_ACTIVE && (
                        <ThemeTabTrigger value="scanner-b" currentTab={activeTab} onReselect={bumpTabRefresh}>
                            Scanner B
                        </ThemeTabTrigger>
                    )}
                    <ThemeTabTrigger value="scanner-chat" currentTab={activeTab} onReselect={bumpTabRefresh}>
                        AI Chat
                    </ThemeTabTrigger>
                    <ThemeTabTrigger value="signals" currentTab={activeTab} onReselect={bumpTabRefresh}>
                        Signals
                    </ThemeTabTrigger>
                    <ThemeTabTrigger value="risk" currentTab={activeTab} onReselect={bumpTabRefresh}>
                        Risk desk
                    </ThemeTabTrigger>
                    <ThemeTabTrigger value="journal" currentTab={activeTab} onReselect={bumpTabRefresh}>
                        Journal
                    </ThemeTabTrigger>
                    <ThemeTabTrigger value="config" currentTab={activeTab} onReselect={bumpTabRefresh}>
                        Config
                    </ThemeTabTrigger>
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
                        refreshKey={tabRefreshKeys["scanner-a"]}
                    />
                </Tabs.Content>

                {IS_PROFILE_B_ACTIVE && (
                    <Tabs.Content value="scanner-b">
                        <ScannerResults
                            profile="b"
                            scannerView={views.b}
                            loading={loading.b}
                            refreshKey={tabRefreshKeys["scanner-b"]}
                        />
                    </Tabs.Content>
                )}

                <Tabs.Content value="scanner-chat">
                    <ScannerChat
                        active={activeTab === "scanner-chat"}
                        refreshKey={tabRefreshKeys["scanner-chat"]}
                    />
                </Tabs.Content>

                <Tabs.Content value="signals">
                    <SignalsMonitorPanel
                        active={activeTab === "signals"}
                        refreshKey={tabRefreshKeys.signals}
                    />
                </Tabs.Content>

                <Tabs.Content value="risk">
                    <RiskDeskPanel
                        active={activeTab === "risk"}
                        refreshKey={tabRefreshKeys.risk}
                    />
                </Tabs.Content>

                <Tabs.Content value="journal">
                    <TradeJournalPanel
                        active={activeTab === "journal"}
                        refreshKey={tabRefreshKeys.journal}
                    />
                </Tabs.Content>

                <Tabs.Content value="config">
                    <ConfigPanel
                        onScannerRefresh={refreshScannerFromConfig}
                        refreshKey={tabRefreshKeys.config}
                    />
                </Tabs.Content>
            </Tabs.Root>
        </Stack>
    );
};

export default HomePage;
