"use client";

import JournalFilters from "@/components/3_organisms/JournalAnalyticsPanel/JournalFilters";
import JournalStatsBar from "@/components/3_organisms/JournalAnalyticsPanel/JournalStatsBar";
import { closedTradesOnly } from "@/components/3_organisms/TradeJournalPanel/journalClosedStats";
import JournalTradesTable from "@/components/3_organisms/TradeJournalPanel/JournalTradesTable";
import { useThemeColor, useThemeTokens } from "@/components/ui/theme-color";
import { themedPanelStyle } from "@/components/ui/themed-panel";
import { usePageVisible } from "@/hooks/usePageVisible";
import {
  applyJournalFilters,
  buildJournalFilterCatalog,
  countActiveFilters,
} from "@/lib/journalFilters";
import { fetchTradeJournal } from "@/services/tradeJournal";
import { EMPTY_JOURNAL_FILTERS } from "@/types/journalAnalyticsTypes";
import type { TradeJournalPayload } from "@/types/tradeJournalTypes";
import { Box, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";

const POLL_MS = 15_000;

type JournalAnalyticsPanelProps = {
  active?: boolean;
  refreshKey?: number;
};

export default function JournalAnalyticsPanel({
  active = true,
  refreshKey = 0,
}: JournalAnalyticsPanelProps) {
  const { palette } = useThemeColor();
  const tokens = useThemeTokens(palette);
  const pageVisible = usePageVisible();
  const polling = active && pageVisible;
  const [journal, setJournal] = useState<TradeJournalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_JOURNAL_FILTERS);

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

  const baselineTrades = useMemo(
    () => closedTrades.filter((t) => t.setup_context?.has_snapshot),
    [closedTrades],
  );

  const filteredTrades = useMemo(
    () => applyJournalFilters(baselineTrades, filters),
    [baselineTrades, filters],
  );

  const catalog = useMemo(() => buildJournalFilterCatalog(baselineTrades), [baselineTrades]);
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const hasFilters = activeFilterCount > 1; // snapshotOnly is always on

  return (
    <Box {...themedPanelStyle(tokens, "default", "panel")} overflow="hidden">
      <Flex
        px="4"
        py="3"
        borderBottomWidth="1px"
        borderColor={tokens.panelBorder}
        align="center"
        justify="space-between"
        flexWrap="wrap"
        gap="2"
      >
        <Stack gap="0">
          <Text fontSize="md" fontWeight="semibold" color={tokens.title}>
            Journal
          </Text>
          <Text fontSize="xs" color={tokens.panelMuted}>
            Filter closed trades by setup context and see how they performed
          </Text>
        </Stack>
        {journal ? (
          <Text fontSize="xs" color={tokens.panelMuted}>
            {baselineTrades.length} trades with setup data
          </Text>
        ) : null}
      </Flex>

      {loading && !journal ? (
        <Flex py="12" justify="center">
          <Spinner size="sm" color={tokens.tagAccent.color} />
        </Flex>
      ) : journal ? (
        <Stack gap="0">
          <JournalFilters
            filters={filters}
            setFilters={setFilters}
            catalog={catalog}
            tokens={tokens}
          />
          <JournalStatsBar
            total={baselineTrades.length}
            filtered={filteredTrades}
            hasFilters={hasFilters}
            tokens={tokens}
          />
          <JournalTradesTable trades={filteredTrades} pendingCount={0} tokens={tokens} />
        </Stack>
      ) : null}
    </Box>
  );
}
