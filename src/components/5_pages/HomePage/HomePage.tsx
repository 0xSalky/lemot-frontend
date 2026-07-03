import ThemeTabTrigger from "@/components/2_molecules/ThemeTabTrigger/ThemeTabTrigger";
import AssetInterface from "@/components/3_organisms/AssetInterface/AssetInterface";
import ConfigPanel from "@/components/3_organisms/ConfigPanel/ConfigPanel";
import ScannerChat from "@/components/3_organisms/ScannerChat/ScannerChat";
import ScannerResults from "@/components/3_organisms/ScannerResults/ScannerResults";
import SignalsMonitorPanel from "@/components/3_organisms/SignalsMonitorPanel/SignalsMonitorPanel";
import RiskDeskPanel from "@/components/3_organisms/RiskDeskPanel/RiskDeskPanel";
import ResponsiveCardGrid from "@/components/4_layouts/ResponsiveCardGrid/ResponsiveCardGrid";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { TRADING_PAIRS, CONTENT_MAX_WIDTH } from "@/services/config";
import type { ScannerLatestBatchFetchResult } from "@/types/scannerTypes";
import {
    fetchLatestScannerBatch,
    scannerSymbolToBase,
    SCANNER_PROFILES,
    type ScannerProfile,
} from "@/services/scannerUtils";
import { Stack, Tabs } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

const INITIAL_SCANNER_LOADING: Record<ScannerProfile, boolean> = {
    b: true,
    a: true,
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

const HomePage = () => {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const [batches, setBatches] = useState<Record<ScannerProfile, ScannerLatestBatchFetchResult | null>>({
        b: null,
        a: null,
    });
    const [loading, setLoading] = useState<Record<ScannerProfile, boolean>>(INITIAL_SCANNER_LOADING);
    const loadIdRef = useRef<Record<ScannerProfile, number>>({ b: 0, a: 0 });
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
                    <ThemeTabTrigger value="scanner-a">Day</ThemeTabTrigger>
                    <ThemeTabTrigger value="scanner-b">Scalper</ThemeTabTrigger>
                    <ThemeTabTrigger value="scanner-chat">AI Chat</ThemeTabTrigger>
                    <ThemeTabTrigger value="signals">Signals</ThemeTabTrigger>
                    <ThemeTabTrigger value="risk">Risk desk</ThemeTabTrigger>
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
                    {activeTab === "scanner-a" ? (
                        <ScannerResults
                            profile="a"
                            latestBatch={batches.a}
                            loading={loading.a}
                            active
                        />
                    ) : null}
                </Tabs.Content>

                <Tabs.Content value="scanner-b">
                    {activeTab === "scanner-b" ? (
                        <ScannerResults
                            profile="b"
                            latestBatch={batches.b}
                            loading={loading.b}
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

                <Tabs.Content value="risk">
                    {activeTab === "risk" ? <RiskDeskPanel active /> : null}
                </Tabs.Content>

                <Tabs.Content value="config">
                    <ConfigPanel scannerLoading={loading} onScannerRefresh={loadScanner} />
                </Tabs.Content>
            </Tabs.Root>
        </Stack>
    );
};

export default HomePage;
