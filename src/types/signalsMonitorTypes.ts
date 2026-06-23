export type SignalsServiceStatus = "live" | "stale" | "down";

export interface SignalsBandWatchEntry {
  symbol: string;
  price: number;
  band_side: string;
  band_low: number;
  band_high: number;
  distance_pct: number;
  at_band: boolean;
  band_weight: number;
  span_pct?: number | null;
  max_dist_pct?: number;
}

export interface SignalsProfileHealth {
  enabled: boolean;
  timeframe: string;
  fractal_timing: string;
  symbols_watched: number;
  last_poll_symbols_evaluated: number;
  last_bar_processed_at: string | null;
  last_bar_ts: number | null;
  last_alert_at: string | null;
  bars_processed_total: number;
  alerts_total: number;
  next_bar_close_at: string;
  next_bar_close_in_sec: number;
  last_profile_poll_at: string | null;
  last_profile_alerts: number;
  near_band_count: number;
  band_watch: SignalsBandWatchEntry[];
  monitor_near_band_max_dist_pct: number;
}

export interface SignalsMonitorHealth {
  ready: boolean;
  service_status: SignalsServiceStatus;
  signals_enabled: boolean;
  entry_advice_enabled: boolean;
  poll_interval_sec: number;
  monitor_near_band_max_dist_pct: number;
  last_poll_at: string | null;
  last_poll_age_sec: number | null;
  last_poll_duration_ms: number | null;
  paused: boolean;
  telegram_configured: boolean;
  profiles: Record<string, SignalsProfileHealth>;
  controls: {
    signals_enabled: boolean;
    entry_advice_enabled: boolean;
    day_enabled: boolean;
    swing_enabled: boolean;
    updated_at: string | null;
    summary: string;
    ready: boolean;
  };
}

export type SignalEventType =
  | "poll"
  | "bar_processed"
  | "fractal_seen"
  | "alert_sent"
  | "alert_skipped"
  | "telegram_failed"
  | "advice_queued"
  | "advice_sent"
  | "advice_failed"
  | "profile_error";

export interface SignalMonitorEvent {
  id: number;
  event_type: SignalEventType;
  profile: string | null;
  symbol: string | null;
  timeframe: string | null;
  side: string | null;
  message: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface SignalsMonitorActivity {
  live_events: SignalMonitorEvent[];
  history_events: SignalMonitorEvent[];
  events: SignalMonitorEvent[];
  profiles: string[];
}

export interface SignalsSkipReasonStat {
  reason: string;
  count: number;
}

export interface SignalsHourlyAlertStat {
  hour: string;
  count: number;
}

export interface SignalsMonitorStats {
  hours: number;
  since: string;
  alerts_sent: number;
  alerts_skipped: number;
  bars_processed: number;
  advice_sent: number;
  advice_failed: number;
  telegram_failed: number;
  top_skip_reasons: SignalsSkipReasonStat[];
  alerts_by_hour: SignalsHourlyAlertStat[];
  profiles: string[];
}

export const EMPTY_SIGNALS_HEALTH: SignalsMonitorHealth = {
  ready: false,
  service_status: "down",
  signals_enabled: false,
  entry_advice_enabled: false,
  poll_interval_sec: 30,
  monitor_near_band_max_dist_pct: 2,
  last_poll_at: null,
  last_poll_age_sec: null,
  last_poll_duration_ms: null,
  paused: true,
  telegram_configured: false,
  profiles: {},
  controls: {
    signals_enabled: false,
    entry_advice_enabled: false,
    day_enabled: false,
    swing_enabled: false,
    updated_at: null,
    summary: "Unavailable",
    ready: false,
  },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeBandWatchEntry(raw: unknown): SignalsBandWatchEntry | null {
  const row = asRecord(raw);
  if (!row || typeof row.symbol !== "string") return null;
  return {
    symbol: row.symbol,
    price: Number(row.price ?? 0),
    band_side: String(row.band_side ?? "AT"),
    band_low: Number(row.band_low ?? 0),
    band_high: Number(row.band_high ?? 0),
    distance_pct: Number(row.distance_pct ?? 0),
    at_band: Boolean(row.at_band),
    band_weight: Number(row.band_weight ?? 0),
    span_pct: row.span_pct != null ? Number(row.span_pct) : null,
    max_dist_pct: row.max_dist_pct != null ? Number(row.max_dist_pct) : undefined,
  };
}

export function normalizeSignalsHealth(raw: unknown): SignalsMonitorHealth {
  const data = asRecord(raw);
  if (!data) return { ...EMPTY_SIGNALS_HEALTH };

  const profilesRaw = asRecord(data.profiles) ?? {};
  const profiles: Record<string, SignalsProfileHealth> = {};
  for (const [key, value] of Object.entries(profilesRaw)) {
    const p = asRecord(value);
    if (!p) continue;
    profiles[key] = {
      enabled: Boolean(p.enabled),
      timeframe: String(p.timeframe ?? ""),
      fractal_timing: String(p.fractal_timing ?? ""),
      symbols_watched: Number(p.symbols_watched ?? 0),
      last_poll_symbols_evaluated: Number(p.last_poll_symbols_evaluated ?? 0),
      last_bar_processed_at:
        typeof p.last_bar_processed_at === "string" ? p.last_bar_processed_at : null,
      last_bar_ts: typeof p.last_bar_ts === "number" ? p.last_bar_ts : null,
      last_alert_at: typeof p.last_alert_at === "string" ? p.last_alert_at : null,
      bars_processed_total: Number(p.bars_processed_total ?? 0),
      alerts_total: Number(p.alerts_total ?? 0),
      next_bar_close_at: String(p.next_bar_close_at ?? ""),
      next_bar_close_in_sec: Number(p.next_bar_close_in_sec ?? 0),
      last_profile_poll_at:
        typeof p.last_profile_poll_at === "string" ? p.last_profile_poll_at : null,
      last_profile_alerts: Number(p.last_profile_alerts ?? 0),
      near_band_count: Number(p.near_band_count ?? 0),
      band_watch: Array.isArray(p.band_watch)
        ? p.band_watch
            .map(normalizeBandWatchEntry)
            .filter((row): row is SignalsBandWatchEntry => row != null)
        : [],
      monitor_near_band_max_dist_pct: Number(
        p.monitor_near_band_max_dist_pct ?? data.monitor_near_band_max_dist_pct ?? 2,
      ),
    };
  }

  const controlsRaw = asRecord(data.controls);
  const status = data.service_status;
  const serviceStatus: SignalsServiceStatus =
    status === "live" || status === "stale" || status === "down" ? status : "down";

  return {
    ready: Boolean(data.ready),
    service_status: serviceStatus,
    signals_enabled: Boolean(data.signals_enabled),
    entry_advice_enabled: Boolean(data.entry_advice_enabled),
    poll_interval_sec: Number(data.poll_interval_sec ?? 30),
    monitor_near_band_max_dist_pct: Number(data.monitor_near_band_max_dist_pct ?? 2),
    last_poll_at: typeof data.last_poll_at === "string" ? data.last_poll_at : null,
    last_poll_age_sec:
      typeof data.last_poll_age_sec === "number" ? data.last_poll_age_sec : null,
    last_poll_duration_ms:
      typeof data.last_poll_duration_ms === "number" ? data.last_poll_duration_ms : null,
    paused: Boolean(data.paused),
    telegram_configured: Boolean(data.telegram_configured),
    profiles,
    controls: {
      signals_enabled: Boolean(controlsRaw?.signals_enabled),
      entry_advice_enabled: Boolean(controlsRaw?.entry_advice_enabled),
      day_enabled: Boolean(controlsRaw?.day_enabled),
      swing_enabled: Boolean(controlsRaw?.swing_enabled),
      updated_at:
        typeof controlsRaw?.updated_at === "string" ? controlsRaw.updated_at : null,
      summary:
        typeof controlsRaw?.summary === "string"
          ? controlsRaw.summary
          : "Signals",
      ready: Boolean(controlsRaw?.ready ?? data.ready),
    },
  };
}

function normalizeMonitorEvent(item: unknown): SignalMonitorEvent | null {
  const row = asRecord(item);
  if (!row) return null;
  const meta = asRecord(row.meta);
  return {
    id: Number(row.id ?? 0),
    event_type: String(row.event_type ?? "") as SignalEventType,
    profile: typeof row.profile === "string" ? row.profile : null,
    symbol: typeof row.symbol === "string" ? row.symbol : null,
    timeframe: typeof row.timeframe === "string" ? row.timeframe : null,
    side: typeof row.side === "string" ? row.side : null,
    message: typeof row.message === "string" ? row.message : null,
    meta,
    created_at: String(row.created_at ?? ""),
  };
}

function normalizeEventList(raw: unknown): SignalMonitorEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeMonitorEvent)
    .filter((row): row is SignalMonitorEvent => row != null);
}

export function normalizeSignalsActivity(raw: unknown): SignalsMonitorActivity {
  const data = asRecord(raw);
  if (!data) {
    return { live_events: [], history_events: [], events: [], profiles: [] };
  }

  const live_events = normalizeEventList(data.live_events);
  const history_events = normalizeEventList(data.history_events);
  const events =
    live_events.length > 0 || history_events.length > 0
      ? [...live_events, ...history_events]
      : normalizeEventList(data.events);

  const profiles = Array.isArray(data.profiles)
    ? data.profiles.filter((p): p is string => typeof p === "string")
    : [];

  return { live_events, history_events, events, profiles };
}

export function normalizeSignalsStats(raw: unknown): SignalsMonitorStats {
  const data = asRecord(raw);
  if (!data) {
    return {
      hours: 24,
      since: "",
      alerts_sent: 0,
      alerts_skipped: 0,
      bars_processed: 0,
      advice_sent: 0,
      advice_failed: 0,
      telegram_failed: 0,
      top_skip_reasons: [],
      alerts_by_hour: [],
      profiles: [],
    };
  }

  return {
    hours: Number(data.hours ?? 24),
    since: String(data.since ?? ""),
    alerts_sent: Number(data.alerts_sent ?? 0),
    alerts_skipped: Number(data.alerts_skipped ?? 0),
    bars_processed: Number(data.bars_processed ?? 0),
    advice_sent: Number(data.advice_sent ?? 0),
    advice_failed: Number(data.advice_failed ?? 0),
    telegram_failed: Number(data.telegram_failed ?? 0),
    top_skip_reasons: Array.isArray(data.top_skip_reasons)
      ? data.top_skip_reasons
          .map((item) => {
            const row = asRecord(item);
            if (!row) return null;
            return {
              reason: String(row.reason ?? "unknown"),
              count: Number(row.count ?? 0),
            };
          })
          .filter((row): row is SignalsSkipReasonStat => row != null)
      : [],
    alerts_by_hour: Array.isArray(data.alerts_by_hour)
      ? data.alerts_by_hour
          .map((item) => {
            const row = asRecord(item);
            if (!row) return null;
            return {
              hour: String(row.hour ?? ""),
              count: Number(row.count ?? 0),
            };
          })
          .filter((row): row is SignalsHourlyAlertStat => row != null)
      : [],
    profiles: Array.isArray(data.profiles)
      ? data.profiles.filter((p): p is string => typeof p === "string")
      : [],
  };
}
