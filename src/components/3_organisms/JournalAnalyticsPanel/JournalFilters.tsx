"use client";

import {
  DOW_LABELS,
  groupLevelKeysByFamily,
  LEVEL_FAMILY_LABELS,
  LEVEL_FAMILY_ORDER,
  toggleNumberList,
  toggleStringList,
  UTC_SESSION_LABELS,
} from "@/lib/journalFilters";
import type { JournalFilterCatalog, JournalFilterState } from "@/types/journalAnalyticsTypes";
import type { ThemeTokens } from "@/components/ui/theme-color";
import { Box, Button, Checkbox, Flex, Input, Stack, Text } from "@chakra-ui/react";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

type FilterCategory = "levels" | "htf" | "orderflow" | "btc" | "time" | "score";

const CATEGORIES: { id: FilterCategory; label: string }[] = [
  { id: "levels", label: "Band levels" },
  { id: "htf", label: "HTF bias" },
  { id: "orderflow", label: "Orderflow" },
  { id: "btc", label: "BTC" },
  { id: "time", label: "Time" },
  { id: "score", label: "Setup score" },
];

type JournalFiltersProps = {
  filters: JournalFilterState;
  setFilters: Dispatch<SetStateAction<JournalFilterState>>;
  catalog: JournalFilterCatalog;
  tokens: ThemeTokens;
};

function Chip({
  label,
  active,
  onClick,
  tokens,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tokens: ThemeTokens;
}) {
  return (
    <Button
      size="sm"
      variant={active ? "solid" : "outline"}
      onClick={onClick}
      fontSize="xs"
      px="3"
      borderColor={active ? tokens.tagAccent.border : tokens.panelBorder}
      color={active ? tokens.tagAccent.color : tokens.panelMuted}
      bg={active ? tokens.tagAccent.bg : "transparent"}
    >
      {label}
    </Button>
  );
}

function SectionHint({ children, tokens }: { children: string; tokens: ThemeTokens }) {
  return (
    <Text fontSize="xs" color={tokens.panelMuted} mb="3">
      {children}
    </Text>
  );
}

function ActiveFilterPills({
  filters,
  setFilters,
  tokens,
}: {
  filters: JournalFilterState;
  setFilters: Dispatch<SetStateAction<JournalFilterState>>;
  tokens: ThemeTokens;
}) {
  const pills = useMemo(() => {
    const items: { key: string; label: string; clear: () => void }[] = [];

    for (const key of filters.excludedLevelKeys) {
      items.push({
        key: `ex-${key}`,
        label: `No ${key}`,
        clear: () =>
          setFilters((f) => ({
            ...f,
            excludedLevelKeys: f.excludedLevelKeys.filter((k) => k !== key),
          })),
      });
    }
    for (const side of filters.bandSides) {
      items.push({
        key: `side-${side}`,
        label: side === "SUP" ? "Support bands" : "Resistance bands",
        clear: () =>
          setFilters((f) => ({
            ...f,
            bandSides: f.bandSides.filter((s) => s !== side),
          })),
      });
    }
    for (const bias of filters.htfSetupBias) {
      items.push({
        key: `htf-${bias}`,
        label: `HTF ${bias.toLowerCase()}`,
        clear: () =>
          setFilters((f) => ({
            ...f,
            htfSetupBias: f.htfSetupBias.filter((b) => b !== bias),
          })),
      });
    }
    for (const regime of filters.htfAdxRegime) {
      items.push({
        key: `regime-${regime}`,
        label: regime.toLowerCase(),
        clear: () =>
          setFilters((f) => ({
            ...f,
            htfAdxRegime: f.htfAdxRegime.filter((r) => r !== regime),
          })),
      });
    }
    if (filters.htfAligned !== "any") {
      items.push({
        key: "htf-align",
        label: filters.htfAligned === "aligned" ? "HTF aligned" : "HTF not aligned",
        clear: () => setFilters((f) => ({ ...f, htfAligned: "any" })),
      });
    }
    if (filters.btcHtfAligned !== "any") {
      items.push({
        key: "btc-htf",
        label: filters.btcHtfAligned === "aligned" ? "BTC HTF aligned" : "BTC HTF not aligned",
        clear: () => setFilters((f) => ({ ...f, btcHtfAligned: "any" })),
      });
    }
    if (filters.btcFlowAligned !== "any") {
      items.push({
        key: "btc-flow",
        label: filters.btcFlowAligned === "aligned" ? "BTC flow aligned" : "BTC flow not aligned",
        clear: () => setFilters((f) => ({ ...f, btcFlowAligned: "any" })),
      });
    }
    for (const item of filters.flowAlignment) {
      items.push({
        key: `flow-${item}`,
        label: `Flow ${item.replace(/_/g, " ")}`,
        clear: () =>
          setFilters((f) => ({
            ...f,
            flowAlignment: f.flowAlignment.filter((v) => v !== item),
          })),
      });
    }
    for (const tag of filters.flowTags) {
      items.push({
        key: `tag-${tag}`,
        label: tag,
        clear: () =>
          setFilters((f) => ({
            ...f,
            flowTags: f.flowTags.filter((t) => t !== tag),
          })),
      });
    }
    for (const dow of filters.daysOfWeek) {
      items.push({
        key: `dow-${dow}`,
        label: DOW_LABELS[dow],
        clear: () =>
          setFilters((f) => ({
            ...f,
            daysOfWeek: f.daysOfWeek.filter((d) => d !== dow),
          })),
      });
    }
    for (const session of filters.utcSessions) {
      items.push({
        key: `session-${session}`,
        label: UTC_SESSION_LABELS[session] ?? session,
        clear: () =>
          setFilters((f) => ({
            ...f,
            utcSessions: f.utcSessions.filter((s) => s !== session),
          })),
      });
    }
    for (const grade of filters.setupGrades) {
      items.push({
        key: `grade-${grade}`,
        label: `Grade ${grade}`,
        clear: () =>
          setFilters((f) => ({
            ...f,
            setupGrades: f.setupGrades.filter((g) => g !== grade),
          })),
      });
    }
    if (filters.minBaseProbability != null) {
      items.push({
        key: "min-base",
        label: `Base ≥ ${filters.minBaseProbability}%`,
        clear: () => setFilters((f) => ({ ...f, minBaseProbability: null })),
      });
    }

    return items;
  }, [filters, setFilters]);

  if (pills.length === 0) return null;

  return (
    <Flex gap="2" flexWrap="wrap" px="4" py="3" borderBottomWidth="1px" borderColor={tokens.panelBorder}>
      {pills.map((pill) => (
        <Button
          key={pill.key}
          size="xs"
          variant="outline"
          borderColor={tokens.panelBorder}
          color={tokens.panelBody}
          onClick={pill.clear}
          fontSize="xs"
        >
          {pill.label} ×
        </Button>
      ))}
      <Button
        size="xs"
        variant="ghost"
        color={tokens.panelMuted}
        onClick={() =>
          setFilters((f) => ({
            ...f,
            excludedLevelKeys: [],
            requiredLevelKeys: [],
            bandSides: [],
            htfSetupBias: [],
            htfAdxRegime: [],
            htfAligned: "any",
            btcHtfAligned: "any",
            btcFlowAligned: "any",
            flowAlignment: [],
            flowBias: [],
            flowTags: [],
            sequenceAcceptance: [],
            auctionFlags: [],
            triggers: [],
            placements: [],
            trappedAtFractal: "any",
            minBaseProbability: null,
            maxBaseProbability: null,
            setupGrades: [],
            minEnterProbability: null,
            requiredFactors: [],
            excludedFactors: [],
            daysOfWeek: [],
            hours: [],
            utcSessions: [],
          }))
        }
      >
        Clear all
      </Button>
    </Flex>
  );
}

export default function JournalFilters({
  filters,
  setFilters,
  catalog,
  tokens,
}: JournalFiltersProps) {
  const [category, setCategory] = useState<FilterCategory>("levels");
  const levelGroups = groupLevelKeysByFamily(catalog.levelKeys);

  const patch = (partial: Partial<JournalFilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  return (
    <Box borderBottomWidth="1px" borderColor={tokens.panelBorder}>
      <ActiveFilterPills filters={filters} setFilters={setFilters} tokens={tokens} />

      <Flex
        gap="1"
        px="4"
        pt="3"
        pb="2"
        overflowX="auto"
        borderBottomWidth="1px"
        borderColor={tokens.panelBorder}
      >
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            size="sm"
            variant={category === cat.id ? "solid" : "ghost"}
            onClick={() => setCategory(cat.id)}
            fontSize="xs"
            whiteSpace="nowrap"
            color={category === cat.id ? tokens.tagAccent.color : tokens.panelMuted}
            bg={category === cat.id ? tokens.tagAccent.bg : "transparent"}
          >
            {cat.label}
          </Button>
        ))}
      </Flex>

      <Box px="4" py="4" maxH="280px" overflowY="auto">
        {category === "levels" ? (
          <Stack gap="4">
            <SectionHint tokens={tokens}>
              Pick band side, then check levels to hide trades that used them.
            </SectionHint>
            <Flex gap="2" flexWrap="wrap">
              <Chip
                label="Support"
                active={filters.bandSides.includes("SUP")}
                onClick={() =>
                  patch({ bandSides: toggleStringList(filters.bandSides, "SUP") })
                }
                tokens={tokens}
              />
              <Chip
                label="Resistance"
                active={filters.bandSides.includes("RES")}
                onClick={() =>
                  patch({ bandSides: toggleStringList(filters.bandSides, "RES") })
                }
                tokens={tokens}
              />
            </Flex>
            {LEVEL_FAMILY_ORDER.filter((family) => levelGroups[family]?.length).map((family) => (
              <Box key={family}>
                <Text fontSize="xs" fontWeight="semibold" color={tokens.panelHeading} mb="2">
                  {LEVEL_FAMILY_LABELS[family] ?? family}
                </Text>
                <Stack gap="1.5">
                  {levelGroups[family].map((entry) => (
                    <Checkbox.Root
                      key={entry.key}
                      checked={filters.excludedLevelKeys.includes(entry.key)}
                      onCheckedChange={() =>
                        patch({
                          excludedLevelKeys: toggleStringList(
                            filters.excludedLevelKeys,
                            entry.key,
                          ),
                        })
                      }
                      size="sm"
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label fontSize="sm" color={tokens.panelBody}>
                        Hide {entry.timeframe} {entry.levelType}{" "}
                        <Text as="span" color={tokens.panelMuted}>
                          ({entry.count})
                        </Text>
                      </Checkbox.Label>
                    </Checkbox.Root>
                  ))}
                </Stack>
              </Box>
            ))}
            {catalog.levelKeys.length === 0 ? (
              <Text fontSize="sm" color={tokens.panelMuted}>
                No band levels in your trades yet.
              </Text>
            ) : null}
          </Stack>
        ) : null}

        {category === "htf" ? (
          <Stack gap="4">
            <SectionHint tokens={tokens}>
              Filter by higher-timeframe bias and whether it agreed with your trade.
            </SectionHint>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                Bias
              </Text>
              <Flex gap="2" flexWrap="wrap">
                {["BULLISH", "BEARISH"].map((bias) => (
                  <Chip
                    key={bias}
                    label={bias.charAt(0) + bias.slice(1).toLowerCase()}
                    active={filters.htfSetupBias.includes(bias)}
                    onClick={() =>
                      patch({ htfSetupBias: toggleStringList(filters.htfSetupBias, bias) })
                    }
                    tokens={tokens}
                  />
                ))}
              </Flex>
            </Box>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                Market type
              </Text>
              <Flex gap="2" flexWrap="wrap">
                {["TRENDING", "RANGING", "STRONG TREND"].map((regime) => (
                  <Chip
                    key={regime}
                    label={regime.charAt(0) + regime.slice(1).toLowerCase()}
                    active={filters.htfAdxRegime.includes(regime)}
                    onClick={() =>
                      patch({ htfAdxRegime: toggleStringList(filters.htfAdxRegime, regime) })
                    }
                    tokens={tokens}
                  />
                ))}
              </Flex>
            </Box>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                Alignment with trade
              </Text>
              <Flex gap="2" flexWrap="wrap">
                <Chip
                  label="Aligned"
                  active={filters.htfAligned === "aligned"}
                  onClick={() =>
                    patch({
                      htfAligned: filters.htfAligned === "aligned" ? "any" : "aligned",
                    })
                  }
                  tokens={tokens}
                />
                <Chip
                  label="Not aligned"
                  active={filters.htfAligned === "misaligned"}
                  onClick={() =>
                    patch({
                      htfAligned: filters.htfAligned === "misaligned" ? "any" : "misaligned",
                    })
                  }
                  tokens={tokens}
                />
              </Flex>
            </Box>
          </Stack>
        ) : null}

        {category === "orderflow" ? (
          <Stack gap="4">
            <SectionHint tokens={tokens}>
              Filter by how orderflow lined up with the trade.
            </SectionHint>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                Flow vs trade
              </Text>
              <Flex gap="2" flexWrap="wrap">
                {[
                  { id: "with_trade", label: "With trade" },
                  { id: "against_trade", label: "Against trade" },
                  { id: "neutral", label: "Neutral" },
                ].map((item) => (
                  <Chip
                    key={item.id}
                    label={item.label}
                    active={filters.flowAlignment.includes(item.id)}
                    onClick={() =>
                      patch({
                        flowAlignment: toggleStringList(filters.flowAlignment, item.id),
                      })
                    }
                    tokens={tokens}
                  />
                ))}
              </Flex>
            </Box>
            {catalog.flowTags.length > 0 ? (
              <Box>
                <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                  Tags
                </Text>
                <Flex gap="2" flexWrap="wrap">
                  {catalog.flowTags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      active={filters.flowTags.includes(tag)}
                      onClick={() =>
                        patch({ flowTags: toggleStringList(filters.flowTags, tag) })
                      }
                      tokens={tokens}
                    />
                  ))}
                </Flex>
              </Box>
            ) : null}
            {catalog.sequenceAcceptance.length > 0 ? (
              <Box>
                <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                  Acceptance
                </Text>
                <Flex gap="2" flexWrap="wrap">
                  {catalog.sequenceAcceptance.map((item) => (
                    <Chip
                      key={item}
                      label={item.replace(/_/g, " ")}
                      active={filters.sequenceAcceptance.includes(item)}
                      onClick={() =>
                        patch({
                          sequenceAcceptance: toggleStringList(
                            filters.sequenceAcceptance,
                            item,
                          ),
                        })
                      }
                      tokens={tokens}
                    />
                  ))}
                </Flex>
              </Box>
            ) : null}
          </Stack>
        ) : null}

        {category === "btc" ? (
          <Stack gap="4">
            <SectionHint tokens={tokens}>
              Filter by whether BTC context supported the trade.
            </SectionHint>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                BTC HTF
              </Text>
              <Flex gap="2" flexWrap="wrap">
                <Chip
                  label="Aligned"
                  active={filters.btcHtfAligned === "aligned"}
                  onClick={() =>
                    patch({
                      btcHtfAligned: filters.btcHtfAligned === "aligned" ? "any" : "aligned",
                    })
                  }
                  tokens={tokens}
                />
                <Chip
                  label="Not aligned"
                  active={filters.btcHtfAligned === "misaligned"}
                  onClick={() =>
                    patch({
                      btcHtfAligned:
                        filters.btcHtfAligned === "misaligned" ? "any" : "misaligned",
                    })
                  }
                  tokens={tokens}
                />
              </Flex>
            </Box>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                BTC orderflow
              </Text>
              <Flex gap="2" flexWrap="wrap">
                <Chip
                  label="Aligned"
                  active={filters.btcFlowAligned === "aligned"}
                  onClick={() =>
                    patch({
                      btcFlowAligned: filters.btcFlowAligned === "aligned" ? "any" : "aligned",
                    })
                  }
                  tokens={tokens}
                />
                <Chip
                  label="Not aligned"
                  active={filters.btcFlowAligned === "misaligned"}
                  onClick={() =>
                    patch({
                      btcFlowAligned:
                        filters.btcFlowAligned === "misaligned" ? "any" : "misaligned",
                    })
                  }
                  tokens={tokens}
                />
              </Flex>
            </Box>
          </Stack>
        ) : null}

        {category === "time" ? (
          <Stack gap="4">
            <SectionHint tokens={tokens}>
              Filter by when the trade was opened (UTC).
            </SectionHint>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                Day of week
              </Text>
              <Flex gap="2" flexWrap="wrap">
                {DOW_LABELS.map((label, dow) => (
                  <Chip
                    key={label}
                    label={label}
                    active={filters.daysOfWeek.includes(dow)}
                    onClick={() =>
                      patch({ daysOfWeek: toggleNumberList(filters.daysOfWeek, dow) })
                    }
                    tokens={tokens}
                  />
                ))}
              </Flex>
            </Box>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                Session
              </Text>
              <Flex gap="2" flexWrap="wrap">
                {[
                  { id: "asia", label: "Asia" },
                  { id: "london", label: "London" },
                  { id: "ny", label: "New York" },
                ].map((session) => (
                  <Chip
                    key={session.id}
                    label={session.label}
                    active={filters.utcSessions.includes(session.id)}
                    onClick={() =>
                      patch({
                        utcSessions: toggleStringList(filters.utcSessions, session.id),
                      })
                    }
                    tokens={tokens}
                  />
                ))}
              </Flex>
            </Box>
          </Stack>
        ) : null}

        {category === "score" ? (
          <Stack gap="4">
            <SectionHint tokens={tokens}>
              Filter by setup quality from the advice snapshot.
            </SectionHint>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                Minimum base probability
              </Text>
              <Input
                size="sm"
                type="number"
                maxW="8rem"
                placeholder="e.g. 55"
                bg={tokens.blockquoteBg}
                borderColor={tokens.panelBorder}
                value={filters.minBaseProbability ?? ""}
                onChange={(e) =>
                  patch({
                    minBaseProbability: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </Box>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                Grade
              </Text>
              <Flex gap="2" flexWrap="wrap">
                {["A", "B", "C", "D", "F"].map((grade) => (
                  <Chip
                    key={grade}
                    label={grade}
                    active={filters.setupGrades.includes(grade)}
                    onClick={() =>
                      patch({ setupGrades: toggleStringList(filters.setupGrades, grade) })
                    }
                    tokens={tokens}
                  />
                ))}
              </Flex>
            </Box>
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
}
