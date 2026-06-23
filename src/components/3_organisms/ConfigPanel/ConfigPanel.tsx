"use client";

import AccountBalance from "@/components/3_organisms/AccountBalance/AccountBalance";
import SignalsConfigPanel from "@/components/3_organisms/SignalsConfigPanel/SignalsConfigPanel";
import { useTradingAccess } from "@/components/3_organisms/TradingAccess/TradingAccess";
import { ColorModeButton } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import { ThemeSkinSelector } from "@/components/ui/theme-skin";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import {
  runScanner,
  scannerProfileLabel,
  type ScannerProfile,
} from "@/services/scannerUtils";
import { Box, Button, Separator, Stack, Text } from "@chakra-ui/react";
import { useCallback, type ReactNode } from "react";

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

function ScannerConfigPanel({
  profile,
  loading,
  onRefresh,
  onRunScan,
  onRunScanWithAi,
}: {
  profile: ScannerProfile;
  loading: boolean;
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
          onClick={onRunScan}
        >
          Run {label} scan
        </Button>
        <Button
          size="xs"
          variant="outline"
          colorPalette={palette}
          borderColor={tokens.panelBorder}
          onClick={onRunScanWithAi}
        >
          Run {label} scan + AI
        </Button>
      </Stack>
    </Stack>
  );
}

export type ConfigPanelProps = {
  scannerLoading: Record<ScannerProfile, boolean>;
  onScannerRefresh: (profile: ScannerProfile) => void;
};

export default function ConfigPanel({ scannerLoading, onScannerRefresh }: ConfigPanelProps) {
  const tokens = useThemeTokens();
  const { serverConfigured, signOut } = useTradingAccess();

  const runScannerJob = useCallback((profile: ScannerProfile, withAi: boolean) => {
    const label = scannerProfileLabel(profile);
    toaster.info({
      title: withAi ? `${label} scan + AI started` : `${label} scan started`,
      description: "Runs on the server. Tap Refresh when ready — may take several minutes.",
    });
    void runScanner(profile, { analyze: withAi }).catch((e) => {
      console.error(`[scanner run ${profile}]`, e);
    });
  }, []);

  return (
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
              loading={scannerLoading.day}
              onRefresh={() => onScannerRefresh("day")}
              onRunScan={() => runScannerJob("day", false)}
              onRunScanWithAi={() => runScannerJob("day", true)}
            />
          </ConfigSection>

          <Separator borderColor={tokens.panelBorder} />

          <ConfigSection title="Swing scanner">
            <ScannerConfigPanel
              profile="swing"
              loading={scannerLoading.swing}
              onRefresh={() => onScannerRefresh("swing")}
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
  );
}
