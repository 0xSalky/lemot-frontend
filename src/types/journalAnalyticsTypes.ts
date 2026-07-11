import type { TradeJournalRow } from "@/types/tradeJournalTypes";

export type TradeSetupContext = {
  has_snapshot: boolean;
  proposed_side: string | null;
  band_side: string | null;
  band_total_weight: number | null;
  band_anchor_count: number | null;
  band_span_pct: number | null;
  band_level_keys: string[];
  band_level_families: string[];
  band_anchor_level_keys: string[];
  htf_setup_bias: string | null;
  htf_adx_regime: string | null;
  htf_composite_read: string | null;
  htf_favored_side: string | null;
  htf_aligned: boolean | null;
  htf_adx: number | null;
  btc_available: boolean;
  btc_htf_setup_bias: string | null;
  btc_htf_adx_regime: string | null;
  btc_htf_aligned: boolean | null;
  btc_flow_bias: string | null;
  btc_flow_aligned: boolean | null;
  flow_alignment: string | null;
  flow_bias: string | null;
  flow_confidence: string | null;
  flow_aligned: boolean | null;
  flow_tags: string[];
  flow_headline: string | null;
  trapped_at_fractal: boolean;
  sequence_acceptance: string | null;
  auction_flags: string[];
  confirm_opposes_trade: boolean | null;
  trigger: string | null;
  placement: string | null;
  res_short_rejection: boolean;
  sup_long_reclaim: boolean;
  base_probability_pct: number | null;
  markov_posterior_pct: number | null;
  markov_log_odds_total: number | null;
  setup_grade: string | null;
  enter_probability_pct: number | null;
  tp_preset: string | null;
  setup_factors: string[];
  fractal_volume_vs_median: number | null;
  confirm_volume_vs_median: number | null;
  fractal_volume_tier: string | null;
  band_type_tier: string | null;
  band_tf_count: number | null;
  band_density: string | null;
  band_has_anchor: boolean | null;
  entry_dow: number | null;
  entry_hour: number | null;
  entry_utc_session: string | null;
};

export type TriState = "any" | "yes" | "no";
export type AlignFilter = "any" | "aligned" | "misaligned";

export type JournalFilterState = {
  snapshotOnly: boolean;
  excludedLevelKeys: string[];
  requiredLevelKeys: string[];
  bandSides: string[];
  htfSetupBias: string[];
  htfAdxRegime: string[];
  htfAligned: AlignFilter;
  btcHtfAligned: AlignFilter;
  btcFlowAligned: AlignFilter;
  flowAlignment: string[];
  flowBias: string[];
  flowTags: string[];
  sequenceAcceptance: string[];
  auctionFlags: string[];
  triggers: string[];
  placements: string[];
  trappedAtFractal: TriState;
  minBaseProbability: number | null;
  maxBaseProbability: number | null;
  minMarkovPosterior: number | null;
  setupGrades: string[];
  minEnterProbability: number | null;
  bandTypeTiers: string[];
  bandDensities: string[];
  fractalVolumeTiers: string[];
  tpPresets: string[];
  requiredFactors: string[];
  excludedFactors: string[];
  daysOfWeek: number[];
  hours: number[];
  utcSessions: string[];
};

export const EMPTY_JOURNAL_FILTERS: JournalFilterState = {
  snapshotOnly: true,
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
};

export type LevelCatalogEntry = {
  key: string;
  timeframe: string;
  levelType: string;
  family: string;
  count: number;
};

export type JournalFilterCatalog = {
  levelKeys: LevelCatalogEntry[];
  flowTags: string[];
  setupFactors: string[];
  sequenceAcceptance: string[];
  auctionFlags: string[];
  triggers: string[];
  placements: string[];
};

export type FilteredJournalResult = {
  baseline: TradeJournalRow[];
  filtered: TradeJournalRow[];
  activeFilterCount: number;
};
