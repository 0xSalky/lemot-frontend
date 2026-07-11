import type {
  AlignFilter,
  JournalFilterCatalog,
  JournalFilterState,
  LevelCatalogEntry,
  TriState,
} from "@/types/journalAnalyticsTypes";
import type { TradeJournalRow } from "@/types/tradeJournalTypes";

export const LEVEL_FAMILY_LABELS: Record<string, string> = {
  cc: "CC / HTF Level",
  anchor_vwap: "Anchor VWAP",
  session_vwap: "Session VWAP",
  fractal: "HTF Fractal",
  sma: "SMA",
  ema: "EMA",
  vp: "Volume Profile",
  prev: "Prev Period",
};

export const LEVEL_FAMILY_ORDER = [
  "anchor_vwap",
  "session_vwap",
  "cc",
  "fractal",
  "ema",
  "sma",
  "vp",
  "prev",
];

export const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const UTC_SESSION_LABELS: Record<string, string> = {
  asia: "Asia (00–08 UTC)",
  london: "London (08–16 UTC)",
  ny: "New York (16–24 UTC)",
};

function ctx(trade: TradeJournalRow) {
  return trade.setup_context;
}

function matchesAlign(value: boolean | null | undefined, filter: AlignFilter): boolean {
  if (filter === "any") return true;
  if (value == null) return false;
  return filter === "aligned" ? value : !value;
}

function matchesTri(value: boolean, filter: TriState): boolean {
  if (filter === "any") return true;
  return filter === "yes" ? value : !value;
}

function matchesStringList(value: string | null | undefined, selected: string[]): boolean {
  if (selected.length === 0) return true;
  if (!value) return false;
  return selected.includes(value);
}

function matchesAnyInList(values: string[], selected: string[]): boolean {
  if (selected.length === 0) return true;
  if (values.length === 0) return false;
  return selected.some((item) => values.includes(item));
}

function matchesAllInList(values: string[], required: string[]): boolean {
  if (required.length === 0) return true;
  return required.every((item) => values.includes(item));
}

function matchesNoneInList(values: string[], excluded: string[]): boolean {
  if (excluded.length === 0) return true;
  return !excluded.some((item) => values.includes(item));
}

export function countActiveFilters(filters: JournalFilterState): number {
  let count = 0;
  if (filters.snapshotOnly) count += 1;
  count += filters.excludedLevelKeys.length;
  count += filters.requiredLevelKeys.length;
  if (filters.bandSides.length) count += 1;
  if (filters.htfSetupBias.length) count += 1;
  if (filters.htfAdxRegime.length) count += 1;
  if (filters.htfAligned !== "any") count += 1;
  if (filters.btcHtfAligned !== "any") count += 1;
  if (filters.btcFlowAligned !== "any") count += 1;
  if (filters.flowAlignment.length) count += 1;
  if (filters.flowBias.length) count += 1;
  if (filters.flowTags.length) count += 1;
  if (filters.sequenceAcceptance.length) count += 1;
  if (filters.auctionFlags.length) count += 1;
  if (filters.triggers.length) count += 1;
  if (filters.placements.length) count += 1;
  if (filters.trappedAtFractal !== "any") count += 1;
  if (filters.minBaseProbability != null) count += 1;
  if (filters.maxBaseProbability != null) count += 1;
  if (filters.setupGrades.length) count += 1;
  if (filters.minEnterProbability != null) count += 1;
  if (filters.requiredFactors.length) count += 1;
  if (filters.excludedFactors.length) count += 1;
  if (filters.daysOfWeek.length) count += 1;
  if (filters.hours.length) count += 1;
  if (filters.utcSessions.length) count += 1;
  return count;
}

export function applyJournalFilters(
  trades: TradeJournalRow[],
  filters: JournalFilterState,
): TradeJournalRow[] {
  return trades.filter((trade) => {
    const c = ctx(trade);
    if (!c) return !filters.snapshotOnly;

    if (filters.snapshotOnly && !c.has_snapshot) return false;

    const levelKeys = c.band_level_keys ?? [];
    if (filters.excludedLevelKeys.some((key) => levelKeys.includes(key))) return false;
    if (!matchesAllInList(levelKeys, filters.requiredLevelKeys)) return false;

    if (filters.bandSides.length > 0) {
      const side = (c.band_side ?? trade.band_side ?? "").toUpperCase();
      if (!filters.bandSides.includes(side)) return false;
    }

    if (!matchesStringList(c.htf_setup_bias, filters.htfSetupBias)) return false;
    if (!matchesStringList(c.htf_adx_regime, filters.htfAdxRegime)) return false;
    if (!matchesAlign(c.htf_aligned, filters.htfAligned)) return false;
    if (!matchesAlign(c.btc_htf_aligned, filters.btcHtfAligned)) return false;
    if (!matchesAlign(c.btc_flow_aligned, filters.btcFlowAligned)) return false;

    if (!matchesStringList(c.flow_alignment, filters.flowAlignment)) return false;
    if (!matchesStringList(c.flow_bias, filters.flowBias)) return false;
    if (!matchesAnyInList(c.flow_tags ?? [], filters.flowTags)) return false;
    if (!matchesStringList(c.sequence_acceptance, filters.sequenceAcceptance)) return false;
    if (!matchesAnyInList(c.auction_flags ?? [], filters.auctionFlags)) return false;
    if (!matchesStringList(c.trigger, filters.triggers)) return false;
    if (!matchesStringList(c.placement, filters.placements)) return false;
    if (!matchesTri(Boolean(c.trapped_at_fractal), filters.trappedAtFractal)) return false;

    if (filters.minBaseProbability != null) {
      if (c.base_probability_pct == null || c.base_probability_pct < filters.minBaseProbability) {
        return false;
      }
    }
    if (filters.maxBaseProbability != null) {
      if (c.base_probability_pct == null || c.base_probability_pct > filters.maxBaseProbability) {
        return false;
      }
    }
    if (filters.setupGrades.length > 0) {
      const grade = c.setup_grade ?? trade.setup_grade;
      if (!grade || !filters.setupGrades.includes(grade)) return false;
    }
    if (filters.minEnterProbability != null) {
      const enter = c.enter_probability_pct ?? trade.enter_probability_pct;
      if (enter == null || enter < filters.minEnterProbability) return false;
    }

    const factors = c.setup_factors ?? [];
    if (!matchesAllInList(factors, filters.requiredFactors)) return false;
    if (!matchesNoneInList(factors, filters.excludedFactors)) return false;

    if (filters.daysOfWeek.length > 0) {
      if (c.entry_dow == null || !filters.daysOfWeek.includes(c.entry_dow)) return false;
    }
    if (filters.hours.length > 0) {
      if (c.entry_hour == null || !filters.hours.includes(c.entry_hour)) return false;
    }
    if (filters.utcSessions.length > 0) {
      if (!c.entry_utc_session || !filters.utcSessions.includes(c.entry_utc_session)) return false;
    }

    return true;
  });
}

function levelFamilyFromKey(key: string): string {
  const levelType = key.split(":")[1] ?? key;
  const lt = levelType.toLowerCase();
  if (lt.startsWith("anchor_vwap")) return "anchor_vwap";
  if (lt === "vwap" || lt.startsWith("vwap_")) return "session_vwap";
  if (lt.startsWith("htf_fractal")) return "fractal";
  if (lt.startsWith("sma_")) return "sma";
  if (lt.startsWith("ema_")) return "ema";
  if (lt === "htf_level") return "cc";
  if (lt.startsWith("vp_")) return "vp";
  if (lt.startsWith("prev_")) return "prev";
  return lt;
}

function bumpCount(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sortedKeys(map: Map<string, number>): string[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key]) => key);
}

export function buildJournalFilterCatalog(trades: TradeJournalRow[]): JournalFilterCatalog {
  const levelCounts = new Map<string, number>();
  const flowTags = new Map<string, number>();
  const setupFactors = new Map<string, number>();
  const sequenceAcceptance = new Map<string, number>();
  const auctionFlags = new Map<string, number>();
  const triggers = new Map<string, number>();
  const placements = new Map<string, number>();

  for (const trade of trades) {
    const c = trade.setup_context;
    if (!c?.has_snapshot) continue;

    for (const key of c.band_level_keys ?? []) {
      bumpCount(levelCounts, key);
    }
    for (const tag of c.flow_tags ?? []) bumpCount(flowTags, tag);
    for (const factor of c.setup_factors ?? []) bumpCount(setupFactors, factor);
    if (c.sequence_acceptance) bumpCount(sequenceAcceptance, c.sequence_acceptance);
    for (const flag of c.auction_flags ?? []) bumpCount(auctionFlags, flag);
    if (c.trigger) bumpCount(triggers, c.trigger);
    if (c.placement) bumpCount(placements, c.placement);
  }

  const levelKeys: LevelCatalogEntry[] = sortedKeys(levelCounts).map((key) => {
    const [timeframe, levelType] = key.split(":");
    return {
      key,
      timeframe: timeframe ?? "",
      levelType: levelType ?? key,
      family: levelFamilyFromKey(key),
      count: levelCounts.get(key) ?? 0,
    };
  });

  return {
    levelKeys,
    flowTags: sortedKeys(flowTags),
    setupFactors: sortedKeys(setupFactors),
    sequenceAcceptance: sortedKeys(sequenceAcceptance),
    auctionFlags: sortedKeys(auctionFlags),
    triggers: sortedKeys(triggers),
    placements: sortedKeys(placements),
  };
}

export function groupLevelKeysByFamily(
  entries: LevelCatalogEntry[],
): Record<string, LevelCatalogEntry[]> {
  const groups: Record<string, LevelCatalogEntry[]> = {};
  for (const entry of entries) {
    if (!groups[entry.family]) groups[entry.family] = [];
    groups[entry.family].push(entry);
  }
  for (const family of Object.keys(groups)) {
    groups[family].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }
  return groups;
}

export function toggleStringList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function toggleNumberList(list: number[], value: number): number[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
