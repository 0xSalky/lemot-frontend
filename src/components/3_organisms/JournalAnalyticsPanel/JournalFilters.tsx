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

type FilterCategory = "levels" | "htf" | "orderflow" | "btc" | "time" | "markov";

const CATEGORIES: { id: FilterCategory; label: string }[] = [
  { id: "levels", label: "Bands" },
  { id: "htf", label: "HTF" },
  { id: "orderflow", label: "Flow" },
  { id: "btc", label: "BTC" },
  { id: "time", label: "Time" },
  { id: "markov", label: "Markov" },
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
        label: `Prior ≥ ${filters.minBaseProbability}%`,
        clear: () => setFilters((f) => ({ ...f, minBaseProbability: null })),
      });
    }
    if (filters.minMarkovPosterior != null) {
      items.push({
        key: "min-posterior",
        label: `Posterior ≥ ${filters.minMarkovPosterior}%`,
        clear: () => setFilters((f) => ({ ...f, minMarkovPosterior: null })),
      });
    }
    for (const tier of filters.bandTypeTiers) {
      items.push({
        key: `band-type-${tier}`,
        label: `Band ${tier}`,
        clear: () =>
          setFilters((f) => ({ ...f, bandTypeTiers: f.bandTypeTiers.filter((t) => t !== tier) })),
      });
    }
    for (const density of filters.bandDensities) {
      items.push({
        key: `density-${density}`,
        label: `Band ${density}`,
        clear: () =>
          setFilters((f) => ({
            ...f,
            bandDensities: f.bandDensities.filter((d) => d !== density),
          })),
      });
    }
    for (const vt of filters.fractalVolumeTiers) {
      items.push({
        key: `vol-${vt}`,
        label: `Vol ${vt}`,
        clear: () =>
          setFilters((f) => ({
            ...f,
            fractalVolumeTiers: f.fractalVolumeTiers.filter((t) => t !== vt),
          })),
      });
    }
    for (const tp of filters.tpPresets) {
      items.push({
        key: `tp-${tp}`,
        label: `TP ${tp.replace("rr_1_", "").replace(/_/g, ".")}R`,
        clear: () =>
          setFilters((f) => ({ ...f, tpPresets: f.tpPresets.filter((t) => t !== tp) })),
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
            minMarkovPosterior: null,
            setupGrades: [],
            minEnterProbability: null,
            bandTypeTiers: [],
            bandDensities: [],
            fractalVolumeTiers: [],
            tpPresets: [],
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
              Filter by band side, level quality, and density.
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
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                Level type quality
              </Text>
              <Flex gap="2" flexWrap="wrap">
                {[
                  { id: "best", label: "Best (VP/Fractal/Prev)" },
                  { id: "good", label: "Good (HTF level)" },
                  { id: "ok", label: "OK (EMA)" },
                  { id: "weak", label: "Weak (VWAP only)" },
                ].map((t) => (
                  <Chip
                    key={t.id}
                    label={t.label}
                    active={filters.bandTypeTiers.includes(t.id)}
                    onClick={() =>
                      patch({ bandTypeTiers: toggleStringList(filters.bandTypeTiers, t.id) })
                    }
                    tokens={tokens}
                  />
                ))}
              </Flex>
            </Box>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                Band density
              </Text>
              <Flex gap="2" flexWrap="wrap">
                {[
                  { id: "dense", label: "Dense cluster" },
                  { id: "normal", label: "Normal" },
                  { id: "wide", label: "Wide zone" },
                ].map((d) => (
                  <Chip
                    key={d.id}
                    label={d.label}
                    active={filters.bandDensities.includes(d.id)}
                    onClick={() =>
                      patch({ bandDensities: toggleStringList(filters.bandDensities, d.id) })
                    }
                    tokens={tokens}
                  />
                ))}
              </Flex>
            </Box>
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
              Filter by orderflow and volume participation at the fractal.
            </SectionHint>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                Fractal bar volume
              </Text>
              <Flex gap="2" flexWrap="wrap">
                {[
                  { id: "climactic", label: "Climactic" },
                  { id: "high", label: "High" },
                  { id: "normal", label: "Normal" },
                  { id: "dry", label: "Dry" },
                ].map((v) => (
                  <Chip
                    key={v.id}
                    label={v.label}
                    active={filters.fractalVolumeTiers.includes(v.id)}
                    onClick={() =>
                      patch({
                        fractalVolumeTiers: toggleStringList(filters.fractalVolumeTiers, v.id),
                      })
                    }
                    tokens={tokens}
                  />
                ))}
              </Flex>
            </Box>
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

        {category === "markov" ? (
          <Stack gap="4">
            <SectionHint tokens={tokens}>
              Filter by Markov probability, grade, and selected TP preset.
            </SectionHint>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                Min posterior probability (%)
              </Text>
              <Input
                size="sm"
                type="number"
                maxW="8rem"
                placeholder="e.g. 60"
                bg={tokens.blockquoteBg}
                borderColor={tokens.panelBorder}
                value={filters.minMarkovPosterior ?? ""}
                onChange={(e) =>
                  patch({
                    minMarkovPosterior: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </Box>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                Grade
              </Text>
              <Flex gap="2" flexWrap="wrap">
                {["A", "B", "C", "D"].map((grade) => (
                  <Chip
                    key={grade}
                    label={`Grade ${grade}`}
                    active={filters.setupGrades.includes(grade)}
                    onClick={() =>
                      patch({ setupGrades: toggleStringList(filters.setupGrades, grade) })
                    }
                    tokens={tokens}
                  />
                ))}
              </Flex>
            </Box>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                TP preset selected
              </Text>
              <Flex gap="2" flexWrap="wrap">
                {[
                  { id: "rr_1_1_5", label: "1.5R" },
                  { id: "rr_1_2", label: "2R" },
                  { id: "rr_1_2_5", label: "2.5R" },
                ].map((tp) => (
                  <Chip
                    key={tp.id}
                    label={tp.label}
                    active={filters.tpPresets.includes(tp.id)}
                    onClick={() =>
                      patch({ tpPresets: toggleStringList(filters.tpPresets, tp.id) })
                    }
                    tokens={tokens}
                  />
                ))}
              </Flex>
            </Box>
            <Box>
              <Text fontSize="xs" color={tokens.panelMuted} mb="2">
                Min prior probability (%)
              </Text>
              <Input
                size="sm"
                type="number"
                maxW="8rem"
                placeholder="e.g. 45"
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
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
}
