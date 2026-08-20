import AlertsPanel from "@/components/3_organisms/AlertsPanel/AlertsPanel";
import ThemeTabTrigger from "@/components/2_molecules/ThemeTabTrigger/ThemeTabTrigger";
import AssetInterface from "@/components/3_organisms/AssetInterface/AssetInterface";
import PairsAccountBar from "@/components/3_organisms/PairsAccountBar/PairsAccountBar";
import ResponsiveCardGrid from "@/components/4_layouts/ResponsiveCardGrid/ResponsiveCardGrid";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { TRADING_PAIRS, CONTENT_MAX_WIDTH } from "@/services/config";
import { sortTradingPairs } from "@/services/tradingPairs";
import { Stack, Tabs } from "@chakra-ui/react";
import { useCallback, useState } from "react";

type HomeTabId = "pairs" | "alerts";

const HomePage = () => {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const [extraTradingPairs, setExtraTradingPairs] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<HomeTabId>("pairs");
    const [tabRefreshKeys, setTabRefreshKeys] = useState<Record<HomeTabId, number>>({
        pairs: 0,
        alerts: 0,
    });

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

    const tradingPairs = sortTradingPairs([...TRADING_PAIRS, ...extraTradingPairs]);

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
                    <ThemeTabTrigger value="alerts" currentTab={activeTab} onReselect={bumpTabRefresh}>
                        Alerts
                    </ThemeTabTrigger>
                </Tabs.List>

                <Tabs.Content value="pairs">
                    <Stack gap="3" pt="3">
                        <PairsAccountBar
                            active={activeTab === "pairs"}
                            refreshKey={tabRefreshKeys.pairs}
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

                <Tabs.Content value="alerts">
                    <AlertsPanel
                        active={activeTab === "alerts"}
                        refreshKey={tabRefreshKeys.alerts}
                    />
                </Tabs.Content>
            </Tabs.Root>
        </Stack>
    );
};

export default HomePage;
