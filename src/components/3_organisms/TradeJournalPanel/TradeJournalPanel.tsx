"use client";

import { closedTradesOnly } from "@/components/3_organisms/TradeJournalPanel/journalClosedStats";
import JournalHistoryViz from "@/components/3_organisms/TradeJournalPanel/JournalHistoryViz";
import JournalTradesTable from "@/components/3_organisms/TradeJournalPanel/JournalTradesTable";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { themedPanelStyle } from "@/components/ui/themed-panel";
import { usePageVisible } from "@/hooks/usePageVisible";
import { fetchTradeJournal } from "@/services/tradeJournal";
import type { TradeJournalPayload } from "@/types/tradeJournalTypes";
import { Box, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

const POLL_MS = 15_000;

const pulse = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 12px currentColor, 0 0 24px currentColor; }
  50% { opacity: 0.5; box-shadow: 0 0 4px currentColor; }
`;

const blink = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
`;

const headerScan = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
`;

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

type TradeJournalPanelProps = {
  active?: boolean;
  refreshKey?: number;
};

export default function TradeJournalPanel({ active = true, refreshKey = 0 }: TradeJournalPanelProps) {
  const { palette } = useThemeColor();
  const tokens = useThemeTokens(palette);
  const pageVisible = usePageVisible();
  const polling = active && pageVisible;
  const [journal, setJournal] = useState<TradeJournalPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchTradeJournal();
    setJournal(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!polling) return;
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load, polling, refreshKey]);

  const closedTrades = useMemo(
    () => closedTradesOnly(journal?.trades ?? []),
    [journal?.trades],
  );
  const openCount = useMemo(
    () => (journal?.trades ?? []).filter((t) => t.lifecycle === "open").length,
    [journal?.trades],
  );
  const liveColor = journal?.exchange_available ? tokens.tagGreen.color : tokens.warn;
  const alien = tokens.tagAccent.color;

  return (
    <Box
      {...themedPanelStyle(tokens, "default", "panel")}
      overflow="hidden"
      boxShadow={`0 0 32px ${alien}22, inset 0 0 48px ${alien}08`}
    >
      <Flex
        position="relative"
        overflow="hidden"
        px="4"
        py="3"
        borderBottomWidth="1px"
        borderColor={tokens.panelBorder}
        align="center"
        justify="space-between"
        flexWrap="wrap"
        gap="2"
        bg={`linear-gradient(90deg, ${tokens.blockquoteBg}, ${tokens.panelBg}, ${tokens.blockquoteBg})`}
      >
        <Box
          position="absolute"
          top="0"
          left="0"
          w="40%"
          h="1px"
          bg={`linear-gradient(90deg, transparent, ${alien}, transparent)`}
          animation={`${headerScan} 4s linear infinite`}
          pointerEvents="none"
        />
        <Flex align="center" gap="3">
          <Box
            w="2.5"
            h="2.5"
            rounded="full"
            bg={liveColor}
            color={liveColor}
            animation={journal?.exchange_available ? `${pulse} 2s ease-in-out infinite` : undefined}
          />
          <Stack gap="0">
            <Text
              fontFamily="mono"
              fontSize="sm"
              fontWeight="bold"
              color={tokens.title}
              letterSpacing="0.18em"
              textShadow={`0 0 12px ${alien}66`}
            >
              ◈ PNL_DESK
            </Text>
            <Text fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} letterSpacing="0.1em">
              equity curve · closed log · Bybit match
            </Text>
          </Stack>
        </Flex>
        <Flex gap="4" fontFamily="mono" fontSize="2xs" color={tokens.panelMuted} flexWrap="wrap">
          <Text>
            closed{" "}
            <Box as="span" color={tokens.panelBody}>
              {closedTrades.length}
            </Box>
          </Text>
          <Text>
            journal{" "}
            <Box as="span" color={tokens.panelBody}>
              {journal?.journal_count ?? 0}
            </Box>
          </Text>
          <Text>
            updated {formatTime(journal?.fetched_at ?? null)}
          </Text>
          <Text animation={`${blink} 1.2s step-end infinite`} color={alien}>
            _
          </Text>
        </Flex>
      </Flex>

      {loading && !journal ? (
        <Flex py="12" justify="center">
          <Spinner size="sm" color={alien} />
        </Flex>
      ) : journal ? (
        <Stack gap="0">
          {journal.exchange_error ? (
            <Box px="4" py="2" bg={tokens.tagRed.bg} borderBottomWidth="1px" borderColor={tokens.panelBorder}>
              <Text fontFamily="mono" fontSize="2xs" color={tokens.tagRed.color}>
                exchange: {journal.exchange_error}
              </Text>
            </Box>
          ) : null}
          <Box px="4" py="4" borderBottomWidth="1px" borderColor={tokens.panelBorder}>
            <JournalHistoryViz
              trades={journal.trades}
              growth={journal.growth}
              journalCount={journal.journal_count}
              closedPnlRows={journal.closed_pnl_rows}
              openCount={openCount}
              tokens={tokens}
            />
          </Box>
          <Box px="0" py="0">
            <JournalTradesTable
              trades={closedTrades}
              pendingCount={openCount}
              tokens={tokens}
            />
          </Box>
        </Stack>
      ) : null}
    </Box>
  );
}
