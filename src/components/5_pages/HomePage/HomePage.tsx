import ThemeTabTrigger from "@/components/2_molecules/ThemeTabTrigger/ThemeTabTrigger";
import AssetInterface from "@/components/3_organisms/AssetInterface/AssetInterface";
import ConfigPanel from "@/components/3_organisms/ConfigPanel/ConfigPanel";
import ScannerChat from "@/components/3_organisms/ScannerChat/ScannerChat";
import ScannerResults from "@/components/3_organisms/ScannerResults/ScannerResults";
import SignalsMonitorPanel from "@/components/3_organisms/SignalsMonitorPanel/SignalsMonitorPanel";
import RiskDeskPanel from "@/components/3_organisms/RiskDeskPanel/RiskDeskPanel";
import JournalAnalyticsPanel from "@/components/3_organisms/JournalAnalyticsPanel/JournalAnalyticsPanel";
import TradeJournalPanel from "@/components/3_organisms/TradeJournalPanel/TradeJournalPanel";
import PairsAccountBar from "@/components/3_organisms/PairsAccountBar/PairsAccountBar";
import ResponsiveCardGrid from "@/components/4_layouts/ResponsiveCardGrid/ResponsiveCardGrid";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { TRADING_PAIRS, CONTENT_MAX_WIDTH } from "@/services/config";
import { sortTradingPairs } from "@/services/tradingPairs";
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
    | "pnl"
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
        pnl: 0,
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
    const [extraTradingPairs, setExtraTradingPairs] = useState<string[]>([]);
    const [batchSetups, setBatchSetups] = useState<Record<ScannerProfile, ScannerSetupRow[]>>({
        b: [],
        a: [],
    });
    const [loading, setLoading] = useState<Record<ScannerProfile, boolean>>(INITIAL_SCANNER_LOADING);
    const loadIdRef = useRef<Record<ScannerProfile, number>>({ b: 0, a: 0 });
    const [activeTab, setActiveTab] = useState<HomeTabId>("pairs");
    const [tabRefreshKeys, setTabRefreshKeys] = useState(initialTabRefreshKeys);

    const [refreshing, setRefreshing] = useState<
        Record<ScannerProfile, { batch: boolean; charts: boolean }>
    >({
        b: { batch: false, charts: false },
        a: { batch: false, charts: false },
    });
    const [chartsRefreshKey, setChartsRefreshKey] = useState<Record<ScannerProfile, number>>({
        b: 0,
        a: 0,
    });

    const loadScanner = useCallback(
        (profile: ScannerProfile, options?: { fresh?: boolean; reload?: boolean }) =>
            runScannerViewFetch(profile, loadIdRef, setViews, setLoading, options),
        [],
    );

    const refreshScannerCharts = useCallback(
        (profile: ScannerProfile) => {
            setRefreshing((prev) => ({
                ...prev,
                [profile]: { ...prev[profile], charts: true },
            }));
            setChartsRefreshKey((prev) => ({ ...prev, [profile]: prev[profile] + 1 }));
            return loadScanner(profile, { fresh: true }).finally(() => {
                setRefreshing((prev) => ({
                    ...prev,
                    [profile]: { ...prev[profile], charts: false },
                }));
            });
        },
        [loadScanner],
    );

    const refreshScannerBatch = useCallback(
        (profile: ScannerProfile) => {
            setRefreshing((prev) => ({
                ...prev,
                [profile]: { ...prev[profile], batch: true },
            }));
            return loadScanner(profile, { reload: true }).finally(() => {
                setRefreshing((prev) => ({
                    ...prev,
                    [profile]: { ...prev[profile], batch: false },
                }));
            });
        },
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

    const addTradingPair = useCallback((symbol: string) => {
        setExtraTradingPairs((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]));
    }, []);

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

    const tradingPairs = useMemo(
        () => sortTradingPairs([...TRADING_PAIRS, ...scannerPairs, ...extraTradingPairs]),
        [scannerPairs, extraTradingPairs],
    );

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
                        Scanner A
                    </ThemeTabTrigger>
                    <ThemeTabTrigger value="scanner-b" currentTab={activeTab} onReselect={bumpTabRefresh}>
                        Scanner B
                    </ThemeTabTrigger>
                    <ThemeTabTrigger value="scanner-chat" currentTab={activeTab} onReselect={bumpTabRefresh}>
                        AI Chat
                    </ThemeTabTrigger>
                    <ThemeTabTrigger value="signals" currentTab={activeTab} onReselect={bumpTabRefresh}>
                        Signals
                    </ThemeTabTrigger>
                    <ThemeTabTrigger value="risk" currentTab={activeTab} onReselect={bumpTabRefresh}>
                        Risk desk
                    </ThemeTabTrigger>
                    <ThemeTabTrigger value="pnl" currentTab={activeTab} onReselect={bumpTabRefresh}>
                        PnL
                    </ThemeTabTrigger>
                    <ThemeTabTrigger value="journal" currentTab={activeTab} onReselect={bumpTabRefresh}>
                        Journal
                    </ThemeTabTrigger>
                    <ThemeTabTrigger value="config" currentTab={activeTab} onReselect={bumpTabRefresh}>
                        Config
                    </ThemeTabTrigger>
                </Tabs.List>

                <Tabs.Content value="pairs">
                    <Stack gap="3" pt="3">
                        <PairsAccountBar
                            active={activeTab === "pairs"}
                            refreshKey={pairsRefreshKey}
                            existingPairs={tradingPairs}
                            onAddPair={addTradingPair}
                        />
                        <ResponsiveCardGrid>
                            {tradingPairs.map((pair) => (
                                <AssetInterface key={pair} pair={pair} />
                            ))}
                        </ResponsiveCardGrid>
                    </Stack>
                </Tabs.Content>

                <Tabs.Content value="scanner-a">
                    <ScannerResults
                        profile="a"
                        scannerView={views.a}
                        loading={loading.a}
                        refreshingBatch={refreshing.a.batch}
                        refreshingCharts={refreshing.a.charts}
                        chartsRefreshKey={chartsRefreshKey.a}
                        onRefreshBatch={() => void refreshScannerBatch("a")}
                        onRefreshCharts={() => void refreshScannerCharts("a")}
                    />
                </Tabs.Content>

                <Tabs.Content value="scanner-b">
                    <ScannerResults
                        profile="b"
                        scannerView={views.b}
                        loading={loading.b}
                        refreshingBatch={refreshing.b.batch}
                        refreshingCharts={refreshing.b.charts}
                        chartsRefreshKey={chartsRefreshKey.b}
                        onRefreshBatch={() => void refreshScannerBatch("b")}
                        onRefreshCharts={() => void refreshScannerCharts("b")}
                    />
                </Tabs.Content>

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

                <Tabs.Content value="pnl">
                    <TradeJournalPanel
                        active={activeTab === "pnl"}
                        refreshKey={tabRefreshKeys.pnl}
                    />
                </Tabs.Content>

                <Tabs.Content value="journal">
                    <JournalAnalyticsPanel
                        active={activeTab === "journal"}
                        refreshKey={tabRefreshKeys.journal}
                    />
                </Tabs.Content>

                <Tabs.Content value="config">
                    <ConfigPanel refreshKey={tabRefreshKeys.config} />
                </Tabs.Content>
            </Tabs.Root>
        </Stack>
    );
};

export default HomePage;
