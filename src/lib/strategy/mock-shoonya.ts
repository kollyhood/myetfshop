import type { ETF, PriceBar } from '@/lib/types';
import { ETF_UNIVERSE } from '@/lib/strategy/universe';

/**
 * Mock Shoonya price engine.
 *
 * In production (§4.3), this is replaced by:
 *   - Daily scrip-master download + cache (symbol → exchange/token mapping)
 *   - Historical OHLC backfill per scrip
 *   - Live LTP quotes inside the trading window
 *
 * Here we generate deterministic synthetic price history per ETF so the rule engine,
 * RSI computation, and trail logging all have something real to chew on. The random
 * walk is seeded by symbol so the same ETF always produces the same series — this
 * keeps paper results comparable across reloads.
 *
 * Seeded RNG: mulberry32.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

// Sector-volatility profile — different sectors have different typical daily vol.
// (Rough ballpark numbers, not calibrated to any specific window.)
const SECTOR_VOL_BPS: Record<string, number> = {
  'Broad Index': 80,
  'Next 50': 130,
  'Midcap': 170,
  'Smallcap': 220,
  'Banking': 150,
  'Financials': 140,
  'PSU Bank': 200,
  'Private Bank': 160,
  'Information Tech': 140,
  'Pharma': 160,
  'Healthcare': 150,
  'Automobile': 150,
  'Metals': 220,
  'Gold': 90,
  'Silver': 180,
  'FMCG': 80,
  'Energy': 170,
  'Oil & Gas': 180,
  'PSU': 200,
  'Infrastructure': 180,
  'Consumption': 130,
  'Realty': 260,
  'Media': 220,
  'MNC': 130,
  'Value': 140,
  'Quality': 110,
  'Alpha': 220,
  'ESG': 120,
  'Dividend': 100,
  'Low Vol': 80,
  'International': 130,
};

// Base price anchor per symbol — gives the synthetic series a realistic-looking level.
// (Not investment data; purely cosmetic so the UI doesn't show ₹1 prices for everything.)
const SYMBOL_BASE_PRICE: Record<string, number> = {
  NIFTYBEES: 245, JUNIORBEES: 690, BANKBEES: 510, GOLDBEES: 65, SILVERBEES: 88,
  ITBEES: 380, PHARMABEES: 195, AUTOBEES: 220, METALBEES: 235, INFRABEES: 580,
  FMCG: 540, ENERGYBEES: 410, OILGASBEES: 320, REALTYBEES: 165, MEDIABEES: 90,
  CPSEETF: 95, BHARAT22: 90, MOTILALNASDAQ: 165, HANGSENGBEES: 280,
};

function basePriceFor(etf: ETF): number {
  if (SYMBOL_BASE_PRICE[etf.symbol]) return SYMBOL_BASE_PRICE[etf.symbol];
  // Hash-based fallback between 80 and 400
  const seed = hashStringToSeed(etf.symbol);
  return 80 + (seed % 320);
}

function volBpsFor(etf: ETF): number {
  return SECTOR_VOL_BPS[etf.sector] ?? 130;
}

/**
 * Generate `days` of synthetic daily price history ending at `endDate`.
 * Trading days only (skips weekends).
 */
export function generatePriceHistory(etf: ETF, days: number, endDate: Date): PriceBar[] {
  const seed = hashStringToSeed(etf.symbol);
  const rng = mulberry32(seed);
  const volBps = volBpsFor(etf);
  const base = basePriceFor(etf);

  const bars: PriceBar[] = [];
  // Walk backwards from endDate, skipping weekends
  const cursor = new Date(endDate);
  cursor.setHours(0, 0, 0, 0);
  const dates: Date[] = [];
  while (dates.length < days) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  dates.reverse();

  // Mild mean-reverting random walk with occasional momentum bursts
  let price = base;
  // A slow drift component so prices don't sit flat
  const driftBps = (rng() - 0.45) * 5; // -2.25 to +2.75 bps/day

  for (let i = 0; i < dates.length; i++) {
    // Random shock, fat-tailed (occasional larger moves)
    const shockMag = volBps * (0.6 + rng() * 0.8);
    const fatTail = rng() < 0.05 ? 2 + rng() * 2 : 1; // 5% of days: 2-4x move
    const direction = rng() < 0.5 ? -1 : 1;
    const shockBps = direction * shockMag * fatTail;
    const totalBps = driftBps + shockBps;
    price = price * (1 + totalBps / 10000);
    if (price < 1) price = 1; // floor

    const volume = Math.round(
      etf.avgVolume * (0.7 + rng() * 0.6) // 70%–130% of avg
    );

    bars.push({
      date: dates[i].toISOString().slice(0, 10),
      close: +price.toFixed(4),
      volume,
    });
  }
  return bars;
}

/**
 * Generate price history for the entire universe.
 * Returns Map<symbol, PriceBar[]>.
 */
export function generateUniverseHistory(endDate: Date, days = 200): Map<string, PriceBar[]> {
  const out = new Map<string, PriceBar[]>();
  for (const etf of ETF_UNIVERSE) {
    out.set(etf.symbol, generatePriceHistory(etf, days, endDate));
  }
  return out;
}

/**
 * Advance the universe by one trading day: append a new bar to each ETF's history
 * (synthetic, but consistent with that ETF's prior volatility profile).
 * Returns a new Map (does not mutate input).
 */
export function advanceUniverseOneDay(
  history: Map<string, PriceBar[]>,
  newDate: Date
): Map<string, PriceBar[]> {
  const out = new Map<string, PriceBar[]>();
  const dateStr = newDate.toISOString().slice(0, 10);
  for (const etf of ETF_UNIVERSE) {
    const prior = history.get(etf.symbol) ?? [];
    const lastBar = prior[prior.length - 1];
    const rng = mulberry32(hashStringToSeed(etf.symbol + dateStr));
    const volBps = volBpsFor(etf);
    const shockMag = volBps * (0.6 + rng() * 0.8);
    const fatTail = rng() < 0.05 ? 2 + rng() * 2 : 1;
    const direction = rng() < 0.5 ? -1 : 1;
    const shockBps = direction * shockMag * fatTail;
    const lastClose = lastBar?.close ?? basePriceFor(etf);
    const newClose = +Math.max(1, lastClose * (1 + shockBps / 10000)).toFixed(4);
    const volume = Math.round(etf.avgVolume * (0.7 + rng() * 0.6));
    out.set(etf.symbol, [...prior, { date: dateStr, close: newClose, volume }]);
  }
  return out;
}

/**
 * Build a "current price" lookup from latest bar of each symbol.
 */
export function buildPriceLookup(history: Map<string, PriceBar[]>): Map<string, number> {
  const out = new Map<string, number>();
  for (const [symbol, bars] of history.entries()) {
    if (bars.length === 0) continue;
    out.set(symbol, bars[bars.length - 1].close);
  }
  return out;
}

/** Latest trading date present in the price history. */
export function latestTradingDate(history: Map<string, PriceBar[]>): string | null {
  for (const [, bars] of history.entries()) {
    if (bars.length > 0) return bars[bars.length - 1].date;
  }
  return null;
}

/** Next trading day after a given date (skips weekends). */
export function nextTradingDate(after: Date): Date {
  const d = new Date(after);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}
