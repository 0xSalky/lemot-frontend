import type { TradeJournalRow } from "@/types/tradeJournalTypes";

export type ClosedHistoryStats = {
  closed_trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  win_rate_pct: number | null;
  total_r: number;
  avg_r: number | null;
  best_r: number | null;
  worst_r: number | null;
};

export function emptyClosedStats(): ClosedHistoryStats {
  return {
    closed_trades: 0,
    wins: 0,
    losses: 0,
    breakeven: 0,
    win_rate_pct: null,
    total_r: 0,
    avg_r: null,
    best_r: null,
    worst_r: null,
  };
}

export function computeClosedStats(trades: TradeJournalRow[]): ClosedHistoryStats {
  const closed = trades.filter((t) => t.lifecycle === "closed");
  const stats = emptyClosedStats();
  stats.closed_trades = closed.length;

  const rs: number[] = [];
  for (const trade of closed) {
    const outcome = tradeOutcome(trade);
    if (outcome === "win") stats.wins += 1;
    else if (outcome === "loss") stats.losses += 1;
    else if (outcome === "breakeven") stats.breakeven += 1;

    if (trade.r_multiple != null && Number.isFinite(trade.r_multiple)) {
      const r = trade.r_multiple;
      rs.push(r);
      stats.total_r = Math.round((stats.total_r + r) * 100) / 100;
      if (stats.best_r == null || r > stats.best_r) stats.best_r = r;
      if (stats.worst_r == null || r < stats.worst_r) stats.worst_r = r;
    }
  }

  const decided = stats.wins + stats.losses + stats.breakeven;
  if (decided > 0) {
    stats.win_rate_pct = Math.round((stats.wins / decided) * 1000) / 10;
  }
  if (rs.length > 0) {
    stats.avg_r = Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 100) / 100;
  }
  return stats;
}

export function closedTradesOnly(trades: TradeJournalRow[]): TradeJournalRow[] {
  return trades.filter((t) => t.lifecycle === "closed");
}

export function tradeOutcome(
  trade: TradeJournalRow,
): "win" | "loss" | "breakeven" | "unknown" {
  if (trade.lifecycle !== "closed") return "unknown";
  const realized = trade.realized_pnl_usd;
  if (realized != null) {
    if (realized > 0.01) return "win";
    if (realized < -0.01) return "loss";
    return "breakeven";
  }
  const r = trade.r_multiple;
  if (r != null && Number.isFinite(r)) {
    if (r > 0.02) return "win";
    if (r < -0.02) return "loss";
    return "breakeven";
  }
  return "unknown";
}
