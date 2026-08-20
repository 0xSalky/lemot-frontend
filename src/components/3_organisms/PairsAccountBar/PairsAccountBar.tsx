"use client";

import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { themedPanelStyle } from "@/components/ui/themed-panel";
import { usePageVisible } from "@/hooks/usePageVisible";
import { fetchAccountBalance } from "@/services/accountBalance";
import {
  resolveManualConnectionState,
  type AccountBalanceResponse,
  type ManualAccountConnectionState,
} from "@/types/accountBalanceTypes";
import { formatUsd } from "@/lib/money";
import AddTradingPairDialog from "@/components/2_molecules/AddTradingPairDialog/AddTradingPairDialog";
import { Box, Flex, IconButton, Spinner, Stack, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

const pulse = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 8px currentColor; }
  50% { opacity: 0.45; box-shadow: 0 0 2px currentColor; }
`;

const CONNECTION_LABEL: Record<ManualAccountConnectionState, string> = {
  loading: "CHECKING",
  connected: "CONNECTED",
  not_configured: "NOT CONFIGURED",
  balance_unavailable: "BALANCE UNAVAILABLE",
  disconnected: "DISCONNECTED",
};

function connectionColor(
  state: ManualAccountConnectionState,
  tokens: ReturnType<typeof useThemeTokens>,
): string {
  switch (state) {
    case "connected":
      return tokens.tagGreen.color;
    case "loading":
      return tokens.panelMuted;
    case "not_configured":
    case "balance_unavailable":
      return tokens.warn;
    case "disconnected":
      return "red.400";
  }
}

function connectionDetail(
  state: ManualAccountConnectionState,
  payload: AccountBalanceResponse | null,
  fetchError: string | null,
): string {
  if (state === "disconnected") {
    return fetchError ?? "Could not reach trading API";
  }
  if (state === "not_configured") {
    return "Set MANUAL_EXCHANGE_API_KEY and MANUAL_EXCHANGE_SECRET_KEY on the API";
  }
  if (state === "balance_unavailable") {
    return payload?.hint ?? payload?.accounts.manual.reason ?? "Bybit balance unavailable";
  }
  if (state === "connected") {
    return "Manual /trade account ready";
  }
  return "Fetching account state…";
}

type PairsAccountBarProps = {
  active: boolean;
  refreshKey: number;
  existingPairs: readonly string[];
  onAddPair: (symbol: string) => void;
};

export default function PairsAccountBar({
  active,
  refreshKey,
  existingPairs,
  onAddPair,
}: PairsAccountBarProps) {
  const { palette } = useThemeColor();
  const tokens = useThemeTokens(palette);
  const pageVisible = usePageVisible();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<AccountBalanceResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogKey, setAddDialogKey] = useState(0);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    const result = await fetchAccountBalance({ refresh });
    setPayload(result.data);
    setFetchError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!active || !pageVisible) return;
    void load(refreshKey > 0);
  }, [active, pageVisible, refreshKey, load]);

  useEffect(() => {
    if (!active || !pageVisible) return;
    const id = window.setInterval(() => void load(false), 60_000);
    return () => window.clearInterval(id);
  }, [active, pageVisible, load]);

  const connectionState = useMemo(() => {
    if (loading && !payload) return "loading" as const;
    return resolveManualConnectionState(payload, fetchError);
  }, [loading, payload, fetchError]);

  const manual = payload?.accounts.manual;
  const statusColor = connectionColor(connectionState, tokens);
  const statusLabel = CONNECTION_LABEL[connectionState];
  const detail = connectionDetail(connectionState, payload, fetchError);

  return (
    <>
      <Box rounded="md" {...themedPanelStyle(tokens, "strong")}>
        <Flex
          px="4"
          py="3"
          align={{ base: "stretch", md: "center" }}
          justify="space-between"
          flexWrap="wrap"
          gap="3"
        >
          <Flex align="center" gap="3" minW="0">
            <Box
              w="2.5"
              h="2.5"
              rounded="full"
              bg={statusColor}
              color={statusColor}
              flexShrink={0}
              animation={connectionState === "connected" ? `${pulse} 2s ease-in-out infinite` : undefined}
            />
            <Stack gap="0" minW="0">
              <Text
                fontFamily="mono"
                fontSize="sm"
                fontWeight="bold"
                color={tokens.title}
                letterSpacing="0.12em"
              >
                MANUAL_ACCOUNT
              </Text>
              <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} lineClamp={2}>
                {statusLabel}
                {" · "}
                {detail}
              </Text>
            </Stack>
          </Flex>

          <Flex
            align="center"
            gap={{ base: "2", md: "3" }}
            fontFamily="mono"
            fontSize="xs"
            color={tokens.panelLabel}
            flexWrap="wrap"
          >
            {loading && !manual ? (
              <Spinner size="sm" color={tokens.panelMuted} />
            ) : (
              <>
                <Stack gap="0" minW="5.5rem">
                  <Text fontSize="2xs" color={tokens.panelMuted}>
                    equity
                  </Text>
                  <Text color={tokens.title} fontWeight="semibold">
                    {manual && manual.balance.total_equity > 0
                      ? formatUsd(manual.balance.total_equity)
                      : "—"}
                  </Text>
                </Stack>
                <Stack gap="0" minW="5.5rem">
                  <Text fontSize="2xs" color={tokens.panelMuted}>
                    available
                  </Text>
                  <Text color={tokens.title}>
                    {manual && manual.balance.available_balance > 0
                      ? formatUsd(manual.balance.available_balance)
                      : "—"}
                  </Text>
                </Stack>
                <Stack gap="0" minW="5.5rem">
                  <Text fontSize="2xs" color={tokens.panelMuted}>
                    unrealized
                  </Text>
                  <Text
                    color={
                      manual && manual.balance.total_unrealized_pnl > 0
                        ? tokens.tagGreen.color
                        : manual && manual.balance.total_unrealized_pnl < 0
                          ? "red.400"
                          : tokens.title
                    }
                  >
                    {manual ? formatUsd(manual.balance.total_unrealized_pnl) : "—"}
                  </Text>
                </Stack>
              </>
            )}
            <IconButton
              aria-label="Add trading pair"
              title="Add trading pair"
              size="sm"
              variant="outline"
              colorPalette={palette}
              borderColor={tokens.panelBorder}
              color={tokens.panelBody}
              minW="33px"
              minH="33px"
              onClick={() => {
                setAddDialogKey((key) => key + 1);
                setAddDialogOpen(true);
              }}
            >
              <Text fontFamily="mono" fontSize="lg" lineHeight="1">
                +
              </Text>
            </IconButton>
          </Flex>
        </Flex>
      </Box>
      <AddTradingPairDialog
        key={addDialogKey}
        open={addDialogOpen}
        existingPairs={existingPairs}
        onAdd={onAddPair}
        onClose={() => setAddDialogOpen(false)}
      />
    </>
  );
}
