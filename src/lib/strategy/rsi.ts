import type { PriceBar, RSIEntry } from '@/lib/types';

/**
 * Wilder's RSI (EMA-based average gain/loss) — the variant explicitly required by §2.2.
 * NOT the simple-moving-average variant. The choice of smoothing is what produces the
 * small numerical deviations vs. other RSI sources.
 *
 * Algorithm:
 *   - Period defaults to 14 (per §2.2).
 *   - First average gain/loss uses a simple mean over the first `period` deltas.
 *   - Subsequent averages use Wilder's smoothing:
 *       avgGain[t] = (avgGain[t-1] * (period - 1) + gain[t]) / period
 *   - RS = avgGain / avgLoss ; RSI = 100 - 100 / (1 + RS)
 *
 * The warm-up window question (§7.4) is about how many bars of price history to feed
 * in before the first usable RSI is emitted. Here we require at least 2*period bars;
 * in production this should be calibrated against the source's Google Sheet output.
 */
export function computeWilderRSI(bars: PriceBar[], period = 14): RSIEntry[] {
  if (bars.length < period + 1) {
    return [];
  }

  // Sort by date ascending
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  const entries: RSIEntry[] = [];

  // Compute daily changes
  const gains: number[] = [0];
  const losses: number[] = [0];
  for (let i = 1; i < sorted.length; i++) {
    const change = sorted[i].close - sorted[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  // Seed first average over the first `period` deltas (indices 1..period)
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  // First RSI is at index `period` (i.e., day `period+1` of data)
  const rs0 = avgLoss === 0 ? Infinity : avgGain / avgLoss;
  const rsi0 = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs0);
  entries.push({ symbol: sorted[0].symbol ?? '', date: sorted[period].date, rsi14: rsi0 });

  // Wilder smoothing for the rest
  for (let i = period + 1; i < sorted.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    entries.push({ symbol: sorted[0].symbol ?? '', date: sorted[i].date, rsi14: rsi });
  }

  return entries;
}

/** Convenience: latest RSI value from a series. */
export function latestRSI(entries: RSIEntry[]): number | null {
  if (entries.length === 0) return null;
  return entries[entries.length - 1].rsi14;
}
