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
import { IS_PROFILE_B_ACTIVE, IS_PROFILE_C_ACTIVE } from "@/services/config";
import { syncClosedPnlJournal } from "@/services/tradeJournal";
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
  onSyncClosedPnl,
  syncing,
}: {
  profile: ScannerProfile;
  onRequestScan: () => void;
  onRequestScanWithAi: () => void;
  onSyncClosedPnl?: () => void;
  syncing?: boolean;
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
        {onSyncClosedPnl ? (
          <Button
            size="xs"
            variant="outline"
            colorPalette="cyan"
            borderColor={tokens.panelBorder}
            loading={syncing}
            disabled={syncing}
            onClick={onSyncClosedPnl}
          >
            Sync closed PnL
          </Button>
        ) : null}
      </Stack>
      {onSyncClosedPnl ? (
        <Text fontSize="2xs" fontFamily="mono" color={tokens.panelMuted} lineHeight="1.4">
          Pulls Bybit closed trades for profile {profile.toUpperCase()} into the journal DB
          (full ~14d lookback).
        </Text>
      ) : null}
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
  const [syncingProfile, setSyncingProfile] = useState<"a" | "b" | null>(null);

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

  const runClosedPnlSync = useCallback(async (profile: "a" | "b") => {
    setSyncingProfile(profile);
    try {
      const result = await syncClosedPnlJournal({ full: true, profile });
      const stats = result.profiles?.[profile];
      if (result.error || stats?.error) {
        toaster.error({
          title: `Profile ${profile.toUpperCase()} PnL sync failed`,
          description: result.error || stats?.error || "Unknown error",
        });
        return;
      }
      toaster.success({
        title: `Profile ${profile.toUpperCase()} closed PnL synced`,
        description: stats
          ? `${stats.fetched ?? 0} fetched · ${stats.upserted ?? 0} stored · ${stats.linked ?? 0} linked`
          : "Done",
      });
    } catch (e) {
      console.error(`[closed pnl sync ${profile}]`, e);
      toaster.error({
        title: `Profile ${profile.toUpperCase()} PnL sync failed`,
        description: e instanceof Error ? e.message : "Request failed",
      });
    } finally {
      setSyncingProfile(null);
    }
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

          <ConfigSection title="Scanner A">
            <ScannerConfigPanel
              profile="a"
              onRequestScan={() => setPendingScan({ profile: "a", withAi: false })}
              onRequestScanWithAi={() => setPendingScan({ profile: "a", withAi: true })}
              onSyncClosedPnl={() => void runClosedPnlSync("a")}
              syncing={syncingProfile === "a"}
            />
          </ConfigSection>

          {IS_PROFILE_B_ACTIVE ? (
            <>
              <Separator borderColor={tokens.panelBorder} />
              <ConfigSection title="Scanner B">
                <ScannerConfigPanel
                  profile="b"
                  onRequestScan={() => setPendingScan({ profile: "b", withAi: false })}
                  onRequestScanWithAi={() => setPendingScan({ profile: "b", withAi: true })}
                  onSyncClosedPnl={() => void runClosedPnlSync("b")}
                  syncing={syncingProfile === "b"}
                />
              </ConfigSection>
            </>
          ) : null}

          {IS_PROFILE_C_ACTIVE ? (
            <>
              <Separator borderColor={tokens.panelBorder} />
              <ConfigSection title="Scanner C">
                <ScannerConfigPanel
                  profile="c"
                  onRequestScan={() => setPendingScan({ profile: "c", withAi: false })}
                  onRequestScanWithAi={() => setPendingScan({ profile: "c", withAi: true })}
                />
              </ConfigSection>
            </>
          ) : null}

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
