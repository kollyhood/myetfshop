import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';
import {
  serializeInstance, serializePosition, serializeTrade, serializeTrail,
  serializeGraduation, serializeCertificate,
} from '@/lib/server/serialize';
import {
  generateUniverseHistory, buildPriceLookup, latestTradingDate, nextTradingDate,
} from '@/lib/strategy/mock-shoonya';
import { computeUniverseRSI, generateSignal } from '@/lib/strategy/rules';
import { buildTradeRecord } from '@/lib/strategy/friction';
import type { Position as DomainPosition, TrailStage, TrailOutcome } from '@/lib/types';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function tradingDaysBetween(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (end < start) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function computeDrawdown(positions: DomainPosition[], priceBySymbol: Map<string, number>): number {
  if (positions.length === 0) return 0;
  let totalValue = 0;
  let totalCost = 0;
  for (const p of positions) {
    const price = priceBySymbol.get(p.symbol);
    if (price === undefined) continue;
    totalValue += price * p.quantity;
    totalCost += p.avgCostBasis * p.quantity;
  }
  if (totalCost === 0) return 0;
  return Math.max(0, ((totalCost - totalValue) / totalCost) * 100);
}

function countRoundTrips(trades: { symbol: string; side: string; rejected?: boolean | null }[]): number {
  const valid = trades.filter((t) => !t.rejected);
  const symbols = new Set(valid.map((t) => t.symbol));
  let count = 0;
  for (const s of symbols) {
    const sTrades = valid.filter((t) => t.symbol === s);
    let hasBuy = false;
    for (const t of sTrades) {
      if (t.side === 'buy') hasBuy = true;
      else if (t.side === 'sell' && hasBuy) {
        count++;
        hasBuy = false;
      }
    }
  }
  return count;
}

// Runs the entire daily cycle server-side: fetch (regenerate) prices, compute RSI, rank,
// evaluate buy/sell rules, execute (paper auto-fills; live just presents the signal),
// and persist trail/trades/positions/graduation. This is the one place trades and
// money-relevant state get written — the client only ever triggers it and reads the result.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const instance = await db.strategyInstance.findUnique({ where: { id } });
  if (!instance || instance.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (instance.status !== 'active') {
    return NextResponse.json({ error: 'Instance is not active' }, { status: 400 });
  }

  // Regenerate the deterministic mock price feed on demand — never persisted (see A2 note
  // on StrategyInstance.priceAsOfDate). Each call reconstructs a self-consistent trailing
  // 200-day window ending at the instance's cursor date (or "today" for the first run ever).
  const endDate = instance.priceAsOfDate ? new Date(instance.priceAsOfDate) : new Date();
  const history = generateUniverseHistory(endDate, 200);
  const asOfDate = latestTradingDate(history);
  if (!asOfDate) return NextResponse.json({ error: 'Failed to generate price history' }, { status: 500 });

  const rsiMap = computeUniverseRSI(history);
  const priceBySymbol = buildPriceLookup(history);

  const existingPositions = await db.position.findMany({ where: { instanceId: id } });
  const domainPositions: DomainPosition[] = existingPositions.map((p) => ({
    instanceId: p.instanceId,
    symbol: p.symbol,
    quantity: p.quantity,
    lastPurchasePrice: p.lastPurchasePrice,
    avgCostBasis: p.avgCostBasis,
    firstPurchaseDate: p.firstPurchaseDate.toISOString(),
  }));

  const signal = generateSignal(id, asOfDate, rsiMap, domainPositions, priceBySymbol);

  type TrailDraft = { date: string; stage: TrailStage; outcome: TrailOutcome; payload: Record<string, unknown>; error?: string };
  const trailDrafts: TrailDraft[] = [
    { date: todayISO(), stage: 'auth', outcome: 'ok', payload: { session: 're-established' } },
    { date: todayISO(), stage: 'fetch_prices', outcome: 'ok', payload: { symbols: history.size } },
    { date: todayISO(), stage: 'compute_rsi', outcome: 'ok', payload: { computed: rsiMap.size } },
    { date: asOfDate, stage: 'rank', outcome: 'ok', payload: {} },
    {
      date: asOfDate,
      stage: 'generate_signal',
      outcome: signal.buyCandidate || signal.sellCandidate ? 'ok' : 'no_trade',
      payload: { buyCandidate: signal.buyCandidate?.symbol ?? null, sellCandidate: signal.sellCandidate?.symbol ?? null },
    },
  ];

  const perPartCapital = instance.capitalAllocated / instance.numParts;
  const newTrades: ReturnType<typeof buildTradeRecord>[] = [];
  const positionUpserts = new Map<string, { quantity: number; lastPurchasePrice: number; avgCostBasis: number; firstPurchaseDate: string }>();
  for (const p of domainPositions) {
    positionUpserts.set(p.symbol, {
      quantity: p.quantity, lastPurchasePrice: p.lastPurchasePrice, avgCostBasis: p.avgCostBasis, firstPurchaseDate: p.firstPurchaseDate,
    });
  }
  const positionsToDelete: string[] = [];

  let executeOutcome: TrailOutcome = 'ok';
  let executeError: string | undefined;

  if (signal.buyCandidate && instance.mode === 'paper') {
    const sym = signal.buyCandidate.symbol;
    const refPrice = priceBySymbol.get(sym);
    if (refPrice !== undefined) {
      const qty = Math.floor(perPartCapital / refPrice);
      if (qty > 0) {
        const rejected = Math.random() < 0.05; // §2.4.4: model occasional upper-circuit rejection
        if (rejected) {
          const trade = buildTradeRecord({
            instanceId: id, symbol: sym, side: 'buy', quantity: qty, referencePrice: refPrice,
            mode: instance.mode, triggerReason: signal.buyCandidate.reason,
            rejected: true, rejectionReason: 'Upper circuit — order rejected at exchange',
          });
          newTrades.push(trade);
          executeOutcome = 'error';
          executeError = `Buy ${sym} rejected (circuit)`;
        } else {
          const trade = buildTradeRecord({
            instanceId: id, symbol: sym, side: 'buy', quantity: qty, referencePrice: refPrice,
            mode: instance.mode, triggerReason: signal.buyCandidate.reason,
          });
          newTrades.push(trade);
          const existing = positionUpserts.get(sym);
          if (existing) {
            const newQty = existing.quantity + qty;
            const newAvgCost = (existing.avgCostBasis * existing.quantity + trade.price * qty) / newQty;
            positionUpserts.set(sym, { quantity: newQty, lastPurchasePrice: trade.price, avgCostBasis: newAvgCost, firstPurchaseDate: existing.firstPurchaseDate });
          } else {
            positionUpserts.set(sym, { quantity: qty, lastPurchasePrice: trade.price, avgCostBasis: trade.price, firstPurchaseDate: new Date().toISOString() });
          }
        }
      }
    }
  }

  if (signal.sellCandidate && instance.mode === 'paper' && executeOutcome !== 'error') {
    const sym = signal.sellCandidate.symbol;
    const refPrice = priceBySymbol.get(sym);
    const pos = positionUpserts.get(sym);
    if (refPrice !== undefined && pos) {
      const trade = buildTradeRecord({
        instanceId: id, symbol: sym, side: 'sell', quantity: pos.quantity, referencePrice: refPrice,
        mode: instance.mode, triggerReason: signal.sellCandidate.reason,
      });
      newTrades.push(trade);
      positionUpserts.delete(sym);
      positionsToDelete.push(sym);
    }
  }

  if (instance.mode === 'live' && (signal.buyCandidate || signal.sellCandidate)) {
    // Live mode never auto-executes — the signal is presented for tap-to-confirm.
    executeOutcome = 'skipped';
    executeError = 'Live mode: awaiting user tap-to-confirm';
  }

  trailDrafts.push({
    date: asOfDate, stage: 'execute', outcome: executeOutcome,
    payload: { trades: newTrades.length, rejected: newTrades.filter((t) => t.rejected).length },
    error: executeError,
  });
  trailDrafts.push({ date: asOfDate, stage: 'log', outcome: 'ok', payload: {} });

  const existingTrades = await db.trade.findMany({ where: { instanceId: id }, select: { symbol: true, side: true, rejected: true } });
  const roundTrips = countRoundTrips([
    ...existingTrades,
    ...newTrades.map((t) => ({ symbol: t.symbol, side: t.side, rejected: t.rejected })),
  ]);
  const daysElapsed = tradingDaysBetween(instance.createdAt.toISOString().slice(0, 10), asOfDate);
  const finalPositions: DomainPosition[] = Array.from(positionUpserts.entries()).map(([symbol, p]) => ({
    instanceId: id, symbol, ...p,
  }));
  const drawdown = computeDrawdown(finalPositions, priceBySymbol);
  const nextAsOfDate = nextTradingDate(new Date(asOfDate)).toISOString().slice(0, 10);

  const existingGraduation = await db.graduationSnapshot.findUnique({ where: { instanceId: id } });
  const hadFirstRoundTripCert = await db.certificate.findFirst({ where: { instanceId: id, type: 'first_round_trip' } });
  const had30DayCert = await db.certificate.findFirst({ where: { instanceId: id, type: 'day_30_milestone' } });
  const shouldIssueFirstRoundTrip = roundTrips >= 1 && !hadFirstRoundTripCert;
  const shouldIssue30Day = daysElapsed >= 30 && !had30DayCert;

  await db.$transaction([
    db.strategyInstance.update({ where: { id }, data: { priceAsOfDate: nextAsOfDate } }),
    ...positionsToDelete.map((symbol) => db.position.deleteMany({ where: { instanceId: id, symbol } })),
    ...Array.from(positionUpserts.entries()).map(([symbol, p]) =>
      db.position.upsert({
        where: { instanceId_symbol: { instanceId: id, symbol } },
        create: {
          instanceId: id, symbol, quantity: p.quantity, lastPurchasePrice: p.lastPurchasePrice,
          avgCostBasis: p.avgCostBasis, firstPurchaseDate: new Date(p.firstPurchaseDate),
        },
        update: { quantity: p.quantity, lastPurchasePrice: p.lastPurchasePrice, avgCostBasis: p.avgCostBasis },
      })
    ),
    ...newTrades.map((t) =>
      db.trade.create({
        data: {
          instanceId: id, symbol: t.symbol, side: t.side, quantity: t.quantity, price: t.price,
          notional: t.notional, brokerage: t.brokerage, stt: t.stt, slippageCost: t.slippageCost,
          timestamp: new Date(t.timestamp), mode: t.mode, triggerReason: t.triggerReason,
          rejected: t.rejected ?? false, rejectionReason: t.rejectionReason,
        },
      })
    ),
    ...trailDrafts.map((e) =>
      db.trailEntry.create({
        data: { instanceId: id, date: e.date, stage: e.stage, outcome: e.outcome, payload: e.payload as Prisma.InputJsonValue, error: e.error, timestamp: new Date() },
      })
    ),
    db.graduationSnapshot.upsert({
      where: { instanceId: id },
      create: {
        instanceId: id, daysElapsed, roundTripsCompleted: roundTrips, currentDrawdown: drawdown,
        maxDrawdownTolerated: existingGraduation?.maxDrawdownTolerated ?? null,
        acknowledged: instance.acknowledgedRisk, explainerCompleted: instance.explainerCompleted,
      },
      update: { daysElapsed, roundTripsCompleted: roundTrips, currentDrawdown: drawdown },
    }),
    ...(shouldIssueFirstRoundTrip
      ? [db.certificate.create({ data: { instanceId: id, type: 'first_round_trip', title: 'First Round Trip Completed' } })]
      : []),
    ...(shouldIssue30Day
      ? [db.certificate.create({ data: { instanceId: id, type: 'day_30_milestone', title: '30-Day Paper Milestone' } })]
      : []),
  ]);

  const [updatedInstance, positions, trades, trail, graduation, newCertificates] = await Promise.all([
    db.strategyInstance.findUniqueOrThrow({ where: { id } }),
    db.position.findMany({ where: { instanceId: id } }),
    db.trade.findMany({ where: { instanceId: id }, orderBy: { timestamp: 'desc' }, take: 20 }),
    db.trailEntry.findMany({ where: { instanceId: id }, orderBy: { timestamp: 'desc' }, take: trailDrafts.length }),
    db.graduationSnapshot.findUniqueOrThrow({ where: { instanceId: id } }),
    shouldIssueFirstRoundTrip || shouldIssue30Day
      ? db.certificate.findMany({ where: { instanceId: id, type: { in: ['first_round_trip', 'day_30_milestone'] } } })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    instance: serializeInstance(updatedInstance),
    positions: positions.map(serializePosition),
    trades: trades.map(serializeTrade),
    trail: trail.map(serializeTrail),
    graduation: serializeGraduation(graduation),
    newCertificates: newCertificates.map(serializeCertificate),
    signal,
  });
}
