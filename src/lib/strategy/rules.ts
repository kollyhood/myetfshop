import type {
  DailySignal,
  Position,
  PriceBar,
  RSIEntry,
  TriggerReason,
} from '@/lib/types';
import { computeWilderRSI } from '@/lib/strategy/rsi';

export const RSI_PERIOD = 14;
export const SELL_TARGET_PCT = 4.57;   // §2.5
export const AVG_DOWN_TRIGGER_PCT = 3; // §2.4: down >3% from last fill

export interface RankedETF {
  symbol: string;
  rsi: number;
  rank: number;
}

/**
 * Rank the universe by RSI ascending (lowest = most oversold = "cheapest").
 * §2.3: rank 1–5 = buy zone. ETFs with insufficient history are excluded (§2.7).
 */
export function rankUniverse(
  rsiBySymbol: Map<string, RSIEntry[]>,
  asOfDate: string
): RankedETF[] {
  const list: { symbol: string; rsi: number }[] = [];
  for (const [symbol, entries] of rsiBySymbol.entries()) {
    // §2.7: exclude ETFs without enough history to compute RSI
    if (entries.length < RSI_PERIOD + 1) continue;
    // Find the latest entry on or before asOfDate
    const eligible = entries.filter(e => e.date <= asOfDate);
    if (eligible.length === 0) continue;
    const latest = eligible[eligible.length - 1];
    list.push({ symbol, rsi: latest.rsi14 });
  }
  list.sort((a, b) => a.rsi - b.rsi);
  return list.map((e, i) => ({ ...e, rank: i + 1 }));
}

/**
 * Buy rule — exactly one buy per trading day (§2.4).
 * Returns the candidate to buy, or null if no trade today.
 */
export function evaluateBuyRule(
  rankTop5: RankedETF[],
  positions: Position[],
  asOfDate: string,
  priceBySymbol: Map<string, number>
): { symbol: string; reason: TriggerReason; rsi: number; rank: number } | null {
  const heldSymbols = new Set(positions.map(p => p.symbol));

  // Step 1: walk down rank-5 list. If any of those 5 ETFs is NOT held, buy the
  // highest-ranked one not held.
  for (const cand of rankTop5) {
    if (!heldSymbols.has(cand.symbol)) {
      return {
        symbol: cand.symbol,
        reason: 'rank-5-entry',
        rsi: cand.rsi,
        rank: cand.rank,
      };
    }
  }

  // Step 2: all 5 already held. Check each held position for
  // current_price ≤ last_purchase_price × 0.97 (down >3% from its own last fill).
  // §7.2 tie-break: lowest RSI among qualifiers (most consistent reading).
  const qualifiers: { symbol: string; deficitPct: number; rsi: number; rank: number }[] = [];
  for (const pos of positions) {
    const currentPrice = priceBySymbol.get(pos.symbol);
    if (currentPrice === undefined) continue;
    const threshold = pos.lastPurchasePrice * (1 - AVG_DOWN_TRIGGER_PCT / 100);
    if (currentPrice <= threshold) {
      const deficitPct = ((pos.lastPurchasePrice - currentPrice) / pos.lastPurchasePrice) * 100;
      // Look up RSI for this symbol from rankTop5 (if it's still in top-5) — otherwise use Infinity
      // since we only have RSI for ranked names. In production we'd pass the full ranked list.
      const rsiEntry = rankTop5.find(r => r.symbol === pos.symbol);
      qualifiers.push({
        symbol: pos.symbol,
        deficitPct,
        rsi: rsiEntry?.rsi ?? 999, // if not in top-5, push to back
        rank: rsiEntry?.rank ?? 999,
      });
    }
  }

  if (qualifiers.length > 0) {
    // §7.2: tie-break by lowest RSI (most oversold among qualifiers)
    qualifiers.sort((a, b) => a.rsi - b.rsi);
    const top = qualifiers[0];
    return {
      symbol: top.symbol,
      reason: 'avg-down-3pct',
      rsi: top.rsi,
      rank: top.rank,
    };
  }

  // Step 3: neither condition met — no trade today.
  return null;
}

/**
 * Sell rule — at most one sell per trading day (§2.5).
 * Per-position target: +4.57% from cost basis.
 * Sell only the single best performer; do not mass-exit.
 */
export function evaluateSellRule(
  positions: Position[],
  priceBySymbol: Map<string, number>
): { symbol: string; reason: TriggerReason; gainPct: number; currentPrice: number; costBasis: number } | null {
  const qualifiers: { symbol: string; gainPct: number; currentPrice: number; costBasis: number }[] = [];
  for (const pos of positions) {
    const currentPrice = priceBySymbol.get(pos.symbol);
    if (currentPrice === undefined) continue;
    const gainPct = ((currentPrice - pos.avgCostBasis) / pos.avgCostBasis) * 100;
    if (gainPct >= SELL_TARGET_PCT) {
      qualifiers.push({ symbol: pos.symbol, gainPct, currentPrice, costBasis: pos.avgCostBasis });
    }
  }
  if (qualifiers.length === 0) return null;
  // Sell the single best performer
  qualifiers.sort((a, b) => b.gainPct - a.gainPct);
  const top = qualifiers[0];
  return {
    symbol: top.symbol,
    reason: 'target-hit-4.57pct',
    gainPct: top.gainPct,
    currentPrice: top.currentPrice,
    costBasis: top.costBasis,
  };
}

/**
 * Compose the daily signal (§4.2 generate_signal stage).
 * Buy and sell can both happen on the same day (one each).
 */
export function generateSignal(
  instanceId: string,
  asOfDate: string,
  rsiBySymbol: Map<string, RSIEntry[]>,
  positions: Position[],
  priceBySymbol: Map<string, number>
): DailySignal {
  const ranked = rankUniverse(rsiBySymbol, asOfDate);
  const rankTop5 = ranked.slice(0, 5);
  const buyCandidate = evaluateBuyRule(rankTop5, positions, asOfDate, priceBySymbol);
  const sellCandidate = evaluateSellRule(positions, priceBySymbol);

  let noTradeReason: string | undefined;
  if (!buyCandidate && !sellCandidate) {
    noTradeReason = 'All rank-5 ETFs already held and no position down >3% from last fill or above +4.57% target. No action today — this is a valid, expected outcome.';
  }

  return {
    instanceId,
    date: asOfDate,
    rankTop5,
    buyCandidate,
    sellCandidate,
    noTradeReason,
  };
}

/** Convenience: compute RSI map for the whole universe, given price history per symbol. */
export function computeUniverseRSI(
  priceHistory: Map<string, PriceBar[]>
): Map<string, RSIEntry[]> {
  const out = new Map<string, RSIEntry[]>();
  for (const [symbol, bars] of priceHistory.entries()) {
    if (bars.length < RSI_PERIOD + 1) continue;
    // Pass symbol through by mutating bar entries (computeWilderRSI doesn't take symbol)
    const tagged = bars.map(b => ({ ...b, symbol }));
    out.set(symbol, computeWilderRSI(tagged));
  }
  return out;
}
