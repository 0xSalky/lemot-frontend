"use client";

import ConfirmDialog from "@/components/2_molecules/ConfirmDialog/ConfirmDialog";
import SignalsConfigPanel from "@/components/3_organisms/SignalsConfigPanel/SignalsConfigPanel";
import { useTradingAccess } from "@/components/3_organisms/TradingAccess/TradingAccess";
import { ColorModeButton } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import { ThemeSkinSelector } from "@/components/ui/theme-skin";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { themedPanelStyle } from "@/components/ui/themed-panel";
import {
  runScanner,
  scannerProfileLabel,
  type ScannerProfile,
} from "@/services/scannerUtils";
import { Box, Button, Separator, Stack, Text } from "@chakra-ui/react";
import { useCallback, useState, type ReactNode } from "react";

type PendingScan = {
  profile: ScannerProfile;
  withAi: boolean;
};

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
  onRequestScan,
  onRequestScanWithAi,
}: {
  profile: ScannerProfile;
  onRequestScan: () => void;
  onRequestScanWithAi: () => void;
}) {
  const { palette } = useThemeColor();
  const tokens = useThemeTokens(palette);
  const label = scannerProfileLabel(profile);

  return (
    <Stack gap="3">
      <Text fontSize="xs" fontFamily="mono" color={tokens.panelMuted}>
        Profile: {profile}
        {profile === "a" ? " · watchlist scan" : " · high-volume scan"}
      </Text>
      <Stack direction="row" gap="2" flexWrap="wrap">
        <Button
          size="xs"
          variant="outline"
          colorPalette={palette}
          borderColor={tokens.panelBorder}
          onClick={onRequestScan}
        >
          Run {label} scan
        </Button>
        <Button
          size="xs"
          variant="outline"
          colorPalette={palette}
          borderColor={tokens.panelBorder}
          onClick={onRequestScanWithAi}
        >
          Run {label} scan + AI
        </Button>
      </Stack>
    </Stack>
  );
}

export type ConfigPanelProps = {
  refreshKey?: number;
};

export default function ConfigPanel({ refreshKey = 0 }: ConfigPanelProps) {
  const { palette } = useThemeColor();
  const tokens = useThemeTokens();
  const { serverConfigured, signOut } = useTradingAccess();
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null);

  const runScannerJob = useCallback((profile: ScannerProfile, withAi: boolean) => {
    const label = scannerProfileLabel(profile);
    toaster.info({
      title: withAi ? `${label} scan + AI started` : `${label} scan started`,
      description: "Results will be ready in a few minutes. Use the batch refresh on the Scanner tab to load new setups.",
    });

    void runScanner(profile, { analyze: withAi }).then((result) => {
      if (!result.success) {
        toaster.error({
          title: "Scanner failed",
          description: result.message,
        });
      }
    }).catch((e) => {
      console.error(`[scanner run ${profile}]`, e);
      toaster.error({
        title: "Scanner failed to start",
        description: e instanceof Error ? e.message : "Request failed",
      });
    });
  }, []);

  const pendingLabel = pendingScan ? scannerProfileLabel(pendingScan.profile) : "";

  return (
    <Box
      p="4"
      rounded="md"
      {...themedPanelStyle(tokens, "default", "panel")}
    >
      <ConfirmDialog
        open={pendingScan != null}
        title={
          pendingScan?.withAi
            ? `Run ${pendingLabel} scan + AI?`
            : `Run ${pendingLabel} scan?`
        }
        description={
          pendingScan?.withAi ? (
            <>
              Starts a new {pendingLabel} scanner batch with Claude analysis on the server. This
              can take several minutes and replaces the latest batch when finished.
            </>
          ) : (
            <>
              Starts a new {pendingLabel} scanner batch without AI analysis. Faster — use the refresh
              button on the Scanner tab when the run completes.
            </>
          )
        }
        confirmLabel={pendingScan?.withAi ? "Run scan + AI" : "Run scan"}
        confirmColorPalette={palette}
        onCancel={() => setPendingScan(null)}
        onConfirm={() => {
          if (!pendingScan) return;
          const { profile, withAi } = pendingScan;
          setPendingScan(null);
          runScannerJob(profile, withAi);
        }}
      />

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

          <ConfigSection title="Day">
            <ScannerConfigPanel
              profile="a"
              onRequestScan={() => setPendingScan({ profile: "a", withAi: false })}
              onRequestScanWithAi={() => setPendingScan({ profile: "a", withAi: true })}
            />
          </ConfigSection>

          <Separator borderColor={tokens.panelBorder} />

          <ConfigSection title="Scalper">
            <ScannerConfigPanel
              profile="b"
              onRequestScan={() => setPendingScan({ profile: "b", withAi: false })}
              onRequestScanWithAi={() => setPendingScan({ profile: "b", withAi: true })}
            />
          </ConfigSection>

          <Separator borderColor={tokens.panelBorder} />

          <ConfigSection title="Signals (live)">
            <SignalsConfigPanel tokens={tokens} refreshKey={refreshKey} />
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
