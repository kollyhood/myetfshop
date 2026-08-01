import type {
  StrategyInstance as PrismaInstance,
  Position as PrismaPosition,
  Trade as PrismaTrade,
  TrailEntry as PrismaTrailEntry,
  GraduationSnapshot as PrismaGraduation,
  StreakState as PrismaStreak,
  Certificate as PrismaCertificate,
} from '@prisma/client';
import type {
  StrategyInstance,
  Position,
  Trade,
  TrailEntry,
  GraduationSnapshot,
  StreakState,
  Certificate,
} from '@/lib/types';

export function serializeInstance(i: PrismaInstance): StrategyInstance {
  return {
    id: i.id,
    name: i.name,
    mode: i.mode,
    createdAt: i.createdAt.toISOString(),
    capitalAllocated: i.capitalAllocated,
    numParts: i.numParts,
    status: i.status,
    brokerConnected: i.brokerConnected,
    acknowledgedRisk: i.acknowledgedRisk,
    explainerCompleted: i.explainerCompleted,
    paymentCompleted: i.paymentCompleted,
    paymentId: i.paymentId ?? undefined,
    paymentOrderId: i.paymentOrderId ?? undefined,
    paidAt: i.paidAt ? i.paidAt.toISOString() : undefined,
  };
}

export function serializePosition(p: PrismaPosition): Position {
  return {
    instanceId: p.instanceId,
    symbol: p.symbol,
    quantity: p.quantity,
    lastPurchasePrice: p.lastPurchasePrice,
    avgCostBasis: p.avgCostBasis,
    firstPurchaseDate: p.firstPurchaseDate.toISOString(),
  };
}

export function serializeTrade(t: PrismaTrade): Trade {
  return {
    id: t.id,
    instanceId: t.instanceId,
    symbol: t.symbol,
    side: t.side,
    quantity: t.quantity,
    price: t.price,
    notional: t.notional,
    brokerage: t.brokerage,
    stt: t.stt,
    slippageCost: t.slippageCost,
    timestamp: t.timestamp.toISOString(),
    mode: t.mode,
    triggerReason: t.triggerReason as Trade['triggerReason'],
    rejected: t.rejected,
    rejectionReason: t.rejectionReason ?? undefined,
  };
}

export function serializeTrail(e: PrismaTrailEntry): TrailEntry {
  return {
    id: e.id,
    instanceId: e.instanceId,
    date: e.date,
    stage: e.stage,
    outcome: e.outcome,
    payload: e.payload as Record<string, unknown>,
    error: e.error ?? undefined,
    timestamp: e.timestamp.toISOString(),
  };
}

export function serializeGraduation(g: PrismaGraduation): GraduationSnapshot {
  return {
    instanceId: g.instanceId,
    daysElapsed: g.daysElapsed,
    roundTripsCompleted: g.roundTripsCompleted,
    currentDrawdown: g.currentDrawdown,
    maxDrawdownTolerated: g.maxDrawdownTolerated ?? null,
    acknowledged: g.acknowledged,
    explainerCompleted: g.explainerCompleted,
    lastUpdated: g.lastUpdated.toISOString(),
  };
}

export function serializeStreak(s: PrismaStreak): StreakState {
  return {
    currentStreak: s.currentStreak,
    longestStreak: s.longestStreak,
    lastReviewedDate: s.lastReviewedDate ?? null,
    reviewHistory: s.reviewHistory as { date: string; reviewed: boolean }[],
  };
}

export function serializeCertificate(c: PrismaCertificate): Certificate {
  return {
    id: c.id,
    instanceId: c.instanceId,
    type: c.type,
    title: c.title,
    issuedAt: c.issuedAt.toISOString(),
  };
}
