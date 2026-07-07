"use client";

import ConfigPanel from "@/components/3_organisms/ConfigPanel/ConfigPanel";
import RiskDeskPanel from "@/components/3_organisms/RiskDeskPanel/RiskDeskPanel";
import ScannerChat from "@/components/3_organisms/ScannerChat/ScannerChat";
import ScannerResults from "@/components/3_organisms/ScannerResults/ScannerResults";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { themedPanelStyle } from "@/components/ui/themed-panel";
import { TRADING_PAIRS, CONTENT_MAX_WIDTH, IS_PROFILE_B_ACTIVE } from "@/services/config";
import type { ScannerViewFetchResult } from "@/types/scannerTypes";
import {
    fetchScannerView,
    scannerSymbolToBase,
    SCANNER_PROFILES,
    type ScannerProfile,
} from "@/services/scannerUtils";
import { Box, Flex, Stack, Tabs, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

type TabValue = "risk-desk" | "scanner-a" | "scanner-b" | "chat";

function runScannerViewFetch(
    profile: ScannerProfile,
    loadIdRef: MutableRefObject<Record<ScannerProfile, number>>,
    setViews: Dispatch<SetStateAction<Record<ScannerProfile, ScannerViewFetchResult | null>>>,
    setLoading: Dispatch<SetStateAction<Record<ScannerProfile, boolean>>>,
    options?: { fresh?: boolean },
) {
    const loadId = ++loadIdRef.current[profile];
    setLoading((prev) => ({ ...prev, [profile]: true }));
    void fetchScannerView(profile, options).then((data) => {
        if (loadIdRef.current[profile] !== loadId) return;
        setViews((prev) => ({ ...prev, [profile]: data }));
        setLoading((prev) => ({ ...prev, [profile]: false }));
    });
}

export default function HomePage() {
    const { palette } = useThemeColor();
    const tokens = useThemeTokens(palette);
    const [activeTab, setActiveTab] = useState<TabValue>("risk-desk");
    const [views, setViews] = useState<Record<ScannerProfile, ScannerViewFetchResult | null>>({
        a: null,
        b: null,
    });
    const [scannerLoading, setScannerLoading] = useState<Record<ScannerProfile, boolean>>({
        a: false,
        b: false,
    });
    const scannerLoadIdRef = useRef<Record<ScannerProfile, number>>({ a: 0, b: 0 });
    const scannerLoadedRef = useRef<Record<ScannerProfile, boolean>>({ a: false, b: false });

    const loadScannerView = useCallback(
        (profile: ScannerProfile, options?: { fresh?: boolean }) => {
            runScannerViewFetch(profile, scannerLoadIdRef, setViews, setScannerLoading, options);
        },
        [],
    );

    useEffect(() => {
        for (const profile of SCANNER_PROFILES) {
            if (scannerLoadedRef.current[profile]) continue;
            scannerLoadedRef.current[profile] = true;
            loadScannerView(profile);
        }
    }, [loadScannerView]);

    return (
        <Flex
                direction={{ base: "column", lg: "row" }}
                gap={{ base: "4", lg: "6" }}
                align="stretch"
                maxW={CONTENT_MAX_WIDTH}
                mx="auto"
                w="100%"
                px={{ base: "3", md: "4" }}
                py={{ base: "4", md: "6" }}
            >
                <Box flex="1" minW={0}>
                    <Tabs.Root
                        value={activeTab}
                        onValueChange={(details) => setActiveTab(details.value as TabValue)}
                        variant="line"
                        colorPalette={palette}
                    >
                        <Tabs.List mb="4" flexWrap="wrap" gap="1">
                            <Tabs.Trigger value="risk-desk" fontFamily="mono" fontSize="sm">
                                Risk Desk
                            </Tabs.Trigger>
                            <Tabs.Trigger value="scanner-a" fontFamily="mono" fontSize="sm">
                                Day
                            </Tabs.Trigger>
                            {IS_PROFILE_B_ACTIVE ? (
                                <Tabs.Trigger value="scanner-b" fontFamily="mono" fontSize="sm">
                                    Scalper
                                </Tabs.Trigger>
                            ) : null}
                            <Tabs.Trigger value="chat" fontFamily="mono" fontSize="sm">
                                Chat
                            </Tabs.Trigger>
                        </Tabs.List>

                        <Tabs.Content value="risk-desk" pt="0">
                            <RiskDeskPanel active={activeTab === "risk-desk"} />
                        </Tabs.Content>

                        <Tabs.Content value="scanner-a" pt="0" />
                        {IS_PROFILE_B_ACTIVE ? <Tabs.Content value="scanner-b" pt="0" /> : null}

                        <Tabs.Content value="chat" pt="0">
                            <ScannerChat />
                        </Tabs.Content>
                    </Tabs.Root>

                    <Box hidden={activeTab !== "scanner-a"}>
                        <ScannerResults
                            profile="a"
                            scannerView={views.a}
                            loading={scannerLoading.a}
                        />
                    </Box>
                    {IS_PROFILE_B_ACTIVE ? (
                        <Box hidden={activeTab !== "scanner-b"}>
                            <ScannerResults
                                profile="b"
                                scannerView={views.b}
                                loading={scannerLoading.b}
                            />
                        </Box>
                    ) : null}
                </Box>

                <Box
                    w={{ base: "100%", lg: "280px" }}
                    flexShrink={0}
                    position={{ lg: "sticky" }}
                    top={{ lg: "1rem" }}
                    alignSelf={{ lg: "flex-start" }}
                >
                    <ConfigPanel
                        scannerLoading={scannerLoading}
                        onScannerRefresh={(profile) => loadScannerView(profile, { fresh: true })}
                    />
                    <Box
                        mt="4"
                        p="3"
                        rounded="md"
                        {...themedPanelStyle(tokens, "default", "panel")}
                    >
                        <Text fontSize="2xs" fontFamily="mono" color={tokens.panelMuted} mb="2">
                            Watchlist ({TRADING_PAIRS.length})
                        </Text>
                        <Stack gap="1">
                            {TRADING_PAIRS.map((pair) => (
                                <Text key={pair} fontSize="xs" fontFamily="mono" color={tokens.panelBody}>
                                    {scannerSymbolToBase(pair)}
                                </Text>
                            ))}
                        </Stack>
                    </Box>
                </Box>
            </Flex>
    );
}
