'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type {
  Certificate,
  CertificateType,
  DailySignal,
  GraduationSnapshot,
  Position,
  PriceBar,
  StreakState,
  StrategyInstance,
  Trade,
  TrailEntry,
  TrailOutcome,
  TrailStage,
} from '@/lib/types';
import {
  generateUniverseHistory,
  advanceUniverseOneDay,
  buildPriceLookup,
  latestTradingDate,
  nextTradingDate,
} from '@/lib/strategy/mock-shoonya';
import {
  computeUniverseRSI,
  generateSignal,
  SELL_TARGET_PCT,
} from '@/lib/strategy/rules';
import { buildTradeRecord } from '@/lib/strategy/friction';
import { getETF } from '@/lib/strategy/universe';

export type TabKey = 'dashboard' | 'today' | 'portfolio' | 'learn' | 'settings';

export interface SessionHealth {
  authenticated: boolean;
  lastRefresh: string | null; // ISO timestamp
  status: 'ok' | 'stale' | 'failed';
}

interface AppState {
  // Navigation
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;

  // Strategy instances
  instances: StrategyInstance[];
  activeInstanceId: string | null;
  createInstance: (params: {
    name: string;
    capitalAllocated: number;
    numParts: number;
    maxDrawdownTolerated: number | null;
  }) => string;
  setActiveInstance: (id: string | null) => void;
  updateInstance: (id: string, patch: Partial<StrategyInstance>) => void;
  graduateInstance: (id: string) => void;
  markPaymentCompleted: (id: string, paymentId: string, orderId: string) => void;
  pauseInstance: (id: string) => void;
  resumeInstance: (id: string) => void;

  // Positions
  positions: Position[];
  // Trades
  trades: Trade[];
  // Trail log
  trail: TrailEntry[];
  // Graduation
  graduation: GraduationSnapshot[];
  // Streaks
  streaks: Record<string, StreakState>;
  // Certificates
  certificates: Certificate[];

  // Price history (mock Shoonya)
  priceHistory: Map<string, PriceBar[]>;
  ensurePriceHistory: () => void;

  // Latest computed signal (per instance)
  latestSignal: DailySignal | null;

  // Session health (mock Shoonya session)
  sessionHealth: SessionHealth;

  // Actions
  runDailyCycle: (instanceId: string) => void;
  reviewTodaysSignal: (instanceId: string) => void;  // mark streak day
  acknowledgeRisk: (instanceId: string) => void;
  markExplainerCompleted: (instanceId: string) => void;
  issueCertificate: (instanceId: string, type: CertificateType, title: string) => void;
  resetAll: () => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowISO(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

function computeDrawdown(positions: Position[], priceBySymbol: Map<string, number>, capitalAllocated: number): number {
  // Simple drawdown proxy: current portfolio value vs historical peak (which we approximate
  // from cost basis). For a real impl we'd track peak across time.
  // Here: drawdown is the worst position's % below its cost basis, scaled to portfolio.
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
  const drawdownPct = ((totalCost - totalValue) / totalCost) * 100;
  return Math.max(0, drawdownPct);
}

function countRoundTrips(trades: Trade[], instanceId: string): number {
  const inst = trades.filter(t => t.instanceId === instanceId && !t.rejected);
  const symbols = new Set(inst.map(t => t.symbol));
  let count = 0;
  for (const s of symbols) {
    const sTrades = inst.filter(t => t.symbol === s);
    // A round trip = at least one buy followed by at least one sell
    let hasBuy = false;
    for (const t of sTrades) {
      if (t.side === 'buy') hasBuy = true;
      else if (t.side === 'sell' && hasBuy) {
        count++;
        hasBuy = false; // count distinct cycles
      }
    }
  }
  return count;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'dashboard',
      setActiveTab: (t) => set({ activeTab: t }),

      instances: [],
      activeInstanceId: null,
      positions: [],
      trades: [],
      trail: [],
      graduation: [],
      streaks: {},
      certificates: [],
      priceHistory: new Map(),
      latestSignal: null,
      sessionHealth: {
        authenticated: false,
        lastRefresh: null,
        status: 'stale',
      },

      ensurePriceHistory: () => {
        const state = get();
        if (state.priceHistory.size === 0) {
          const today = new Date();
          const history = generateUniverseHistory(today, 200);
          set({
            priceHistory: history,
            sessionHealth: {
              authenticated: true,
              lastRefresh: nowISO(),
              status: 'ok',
            },
          });
        }
      },

      createInstance: ({ name, capitalAllocated, numParts, maxDrawdownTolerated }) => {
        const id = uid('inst');
        const instance: StrategyInstance = {
          id,
          name: name || 'My ETF Strategy',
          mode: 'paper', // §3.1: paper-first default, un-skippable
          createdAt: nowISO(),
          capitalAllocated,
          numParts,
          status: 'active',
          brokerConnected: false,
          acknowledgedRisk: false,
          explainerCompleted: false,
          paymentCompleted: false,
        };
        const snapshot: GraduationSnapshot = {
          instanceId: id,
          daysElapsed: 0,
          roundTripsCompleted: 0,
          currentDrawdown: 0,
          maxDrawdownTolerated,
          acknowledged: false,
          explainerCompleted: false,
          lastUpdated: nowISO(),
        };
        const streak: StreakState = {
          currentStreak: 0,
          longestStreak: 0,
          lastReviewedDate: null,
          reviewHistory: [],
        };
        set((s) => ({
          instances: [...s.instances, instance],
          graduation: [...s.graduation, snapshot],
          streaks: { ...s.streaks, [id]: streak },
          activeInstanceId: id,
          activeTab: 'dashboard',
        }));
        // Ensure price history exists for the daily cycle
        get().ensurePriceHistory();
        return id;
      },

      setActiveInstance: (id) => set({ activeInstanceId: id, latestSignal: null }),

      updateInstance: (id, patch) =>
        set((s) => ({
          instances: s.instances.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),

      graduateInstance: (id) => {
        set((s) => ({
          instances: s.instances.map((i) =>
            i.id === id ? { ...i, mode: 'live', status: 'graduated' } : i
          ),
        }));
        get().issueCertificate(id, 'graduated_to_live', 'Graduated to Live Trading');
      },

      markPaymentCompleted: (id, paymentId, orderId) => {
        set((s) => ({
          instances: s.instances.map((i) =>
            i.id === id
              ? {
                  ...i,
                  paymentCompleted: true,
                  paymentId,
                  paymentOrderId: orderId,
                  paidAt: nowISO(),
                }
              : i
          ),
        }));
      },

      pauseInstance: (id) =>
        set((s) => ({
          instances: s.instances.map((i) =>
            i.id === id ? { ...i, status: 'paused' } : i
          ),
        })),

      resumeInstance: (id) =>
        set((s) => ({
          instances: s.instances.map((i) =>
            i.id === id ? { ...i, status: 'active' } : i
          ),
        })),

      runDailyCycle: (instanceId) => {
        const state = get();
        const instance = state.instances.find((i) => i.id === instanceId);
        if (!instance) return;

        // Ensure price history exists
        if (state.priceHistory.size === 0) {
          get().ensurePriceHistory();
        }
        const history = get().priceHistory;
        if (history.size === 0) return;

        // Re-establish session (§4.3 — daily re-auth as first step)
        const authTrail: TrailEntry = {
          id: uid('trail'),
          instanceId,
          date: todayISO(),
          stage: 'auth',
          outcome: 'ok',
          payload: { session: 're-established' },
          timestamp: nowISO(),
        };

        // Fetch prices (already in history)
        const fetchTrail: TrailEntry = {
          id: uid('trail'),
          instanceId,
          date: todayISO(),
          stage: 'fetch_prices',
          outcome: 'ok',
          payload: { symbols: history.size },
          timestamp: nowISO(),
        };

        // Compute RSI for universe
        const rsiMap = computeUniverseRSI(history);
        const computeTrail: TrailEntry = {
          id: uid('trail'),
          instanceId,
          date: todayISO(),
          stage: 'compute_rsi',
          outcome: 'ok',
          payload: { computed: rsiMap.size },
          timestamp: nowISO(),
        };

        // Determine as-of date (latest trading date in history)
        const asOfDate = latestTradingDate(history);
        if (!asOfDate) return;

        const rankTrail: TrailEntry = {
          id: uid('trail'),
          instanceId,
          date: asOfDate,
          stage: 'rank',
          outcome: 'ok',
          payload: {},
          timestamp: nowISO(),
        };

        // Get current positions for this instance
        const instancePositions = state.positions.filter((p) => p.instanceId === instanceId);
        const priceBySymbol = buildPriceLookup(history);

        // Generate signal
        const signal = generateSignal(
          instanceId,
          asOfDate,
          rsiMap,
          instancePositions,
          priceBySymbol
        );

        const genSignalTrail: TrailEntry = {
          id: uid('trail'),
          instanceId,
          date: asOfDate,
          stage: 'generate_signal',
          outcome: signal.buyCandidate || signal.sellCandidate ? 'ok' : 'no_trade',
          payload: {
            buyCandidate: signal.buyCandidate?.symbol ?? null,
            sellCandidate: signal.sellCandidate?.symbol ?? null,
          },
          timestamp: nowISO(),
        };

        const newTrades: Trade[] = [];
        const newPositions: Position[] = [...instancePositions];
        let executeOutcome: TrailOutcome = 'ok';
        let executeError: string | undefined;

        // Determine position size: capitalAllocated / numParts per new position
        const perPartCapital = instance.capitalAllocated / instance.numParts;

        // Execute buy (if any) — paper mode auto-executes (§4.5)
        if (signal.buyCandidate && instance.mode === 'paper') {
          const sym = signal.buyCandidate.symbol;
          const refPrice = priceBySymbol.get(sym);
          if (refPrice !== undefined) {
            const qty = Math.floor(perPartCapital / refPrice);
            if (qty > 0) {
              // §2.4.4: model occasional rejection (upper circuit) for paper realism
              const rejected = Math.random() < 0.05; // 5% rejection rate
              if (rejected) {
                const trade = buildTradeRecord({
                  instanceId,
                  symbol: sym,
                  side: 'buy',
                  quantity: qty,
                  referencePrice: refPrice,
                  mode: instance.mode,
                  triggerReason: signal.buyCandidate.reason,
                  rejected: true,
                  rejectionReason: 'Upper circuit — order rejected at exchange',
                });
                newTrades.push(trade);
                executeOutcome = 'error';
                executeError = `Buy ${sym} rejected (circuit)`;
              } else {
                const trade = buildTradeRecord({
                  instanceId,
                  symbol: sym,
                  side: 'buy',
                  quantity: qty,
                  referencePrice: refPrice,
                  mode: instance.mode,
                  triggerReason: signal.buyCandidate.reason,
                });
                newTrades.push(trade);
                // Update positions
                const existingIdx = newPositions.findIndex(
                  (p) => p.symbol === sym && p.instanceId === instanceId
                );
                if (existingIdx >= 0) {
                  // Averaging down — update lastPurchasePrice (§2.4: last fill, NOT avg cost)
                  // and recompute avgCostBasis
                  const existing = newPositions[existingIdx];
                  const newQty = existing.quantity + qty;
                  const newAvgCost =
                    (existing.avgCostBasis * existing.quantity + trade.price * qty) / newQty;
                  newPositions[existingIdx] = {
                    ...existing,
                    quantity: newQty,
                    lastPurchasePrice: trade.price,
                    avgCostBasis: newAvgCost,
                  };
                } else {
                  newPositions.push({
                    instanceId,
                    symbol: sym,
                    quantity: qty,
                    lastPurchasePrice: trade.price,
                    avgCostBasis: trade.price,
                    firstPurchaseDate: nowISO(),
                  });
                }
              }
            }
          }
        }

        // Execute sell (if any) — paper mode auto-executes
        if (signal.sellCandidate && instance.mode === 'paper' && executeOutcome !== 'error') {
          const sym = signal.sellCandidate.symbol;
          const refPrice = priceBySymbol.get(sym);
          const pos = newPositions.find((p) => p.symbol === sym && p.instanceId === instanceId);
          if (refPrice !== undefined && pos) {
            const trade = buildTradeRecord({
              instanceId,
              symbol: sym,
              side: 'sell',
              quantity: pos.quantity,
              referencePrice: refPrice,
              mode: instance.mode,
              triggerReason: signal.sellCandidate.reason,
            });
            newTrades.push(trade);
            // Remove position
            const idx = newPositions.findIndex(
              (p) => p.symbol === sym && p.instanceId === instanceId
            );
            if (idx >= 0) newPositions.splice(idx, 1);
            // Check for first round-trip certificate
            const roundTrips = countRoundTrips([...state.trades, ...newTrades], instanceId);
            if (roundTrips === 1) {
              get().issueCertificate(instanceId, 'first_round_trip', 'First Round Trip Completed');
            }
          }
        }

        // Live mode: don't auto-execute — just present the signal (§4.5)
        if (instance.mode === 'live' && (signal.buyCandidate || signal.sellCandidate)) {
          executeOutcome = 'skipped';
          executeError = 'Live mode: awaiting user tap-to-confirm';
        }

        const executeTrail: TrailEntry = {
          id: uid('trail'),
          instanceId,
          date: asOfDate,
          stage: 'execute',
          outcome: executeOutcome,
          payload: {
            trades: newTrades.length,
            rejected: newTrades.filter((t) => t.rejected).length,
          },
          error: executeError,
          timestamp: nowISO(),
        };

        const logTrail: TrailEntry = {
          id: uid('trail'),
          instanceId,
          date: asOfDate,
          stage: 'log',
          outcome: 'ok',
          payload: {},
          timestamp: nowISO(),
        };

        // Compute updated graduation snapshot
        const oldSnap = state.graduation.find((g) => g.instanceId === instanceId);
        const daysElapsed = oldSnap
          ? tradingDaysBetween(instance.createdAt.slice(0, 10), asOfDate)
          : 0;
        const roundTrips = countRoundTrips([...state.trades, ...newTrades], instanceId);
        const drawdown = computeDrawdown(newPositions, priceBySymbol, instance.capitalAllocated);
        const updatedSnap: GraduationSnapshot = {
          ...(oldSnap ?? {
            instanceId,
            daysElapsed: 0,
            roundTripsCompleted: 0,
            currentDrawdown: 0,
            maxDrawdownTolerated: null,
            acknowledged: false,
            explainerCompleted: false,
            lastUpdated: nowISO(),
          }),
          daysElapsed,
          roundTripsCompleted: roundTrips,
          currentDrawdown: drawdown,
          lastUpdated: nowISO(),
        };

        // Check 30-day milestone certificate
        if (daysElapsed >= 30 && !state.certificates.some((c) => c.instanceId === instanceId && c.type === 'day_30_milestone')) {
          setTimeout(() => get().issueCertificate(instanceId, 'day_30_milestone', '30-Day Paper Milestone'), 0);
        }

        set((s) => ({
          trail: [...s.trail, authTrail, fetchTrail, computeTrail, rankTrail, genSignalTrail, executeTrail, logTrail],
          trades: [...s.trades, ...newTrades],
          positions: [
            ...s.positions.filter((p) => !(p.instanceId === instanceId)),
            ...newPositions,
          ],
          graduation: [
            ...s.graduation.filter((g) => g.instanceId !== instanceId),
            updatedSnap,
          ],
          latestSignal: signal,
        }));

        // Advance the price history by one trading day for next cycle
        const latest = latestTradingDate(history);
        if (latest) {
          const nextDate = nextTradingDate(new Date(latest));
          const advanced = advanceUniverseOneDay(history, nextDate);
          set({ priceHistory: advanced });
        }
      },

      reviewTodaysSignal: (instanceId) => {
        const today = todayISO();
        set((s) => {
          const old = s.streaks[instanceId] ?? {
            currentStreak: 0,
            longestStreak: 0,
            lastReviewedDate: null,
            reviewHistory: [],
          };
          if (old.lastReviewedDate === today) return {}; // already reviewed today
          const newStreak = old.currentStreak + 1;
          const history = [...old.reviewHistory, { date: today, reviewed: true }].slice(-100);
          return {
            streaks: {
              ...s.streaks,
              [instanceId]: {
                currentStreak: newStreak,
                longestStreak: Math.max(old.longestStreak, newStreak),
                lastReviewedDate: today,
                reviewHistory: history,
              },
            },
          };
        });
      },

      acknowledgeRisk: (instanceId) => {
        set((s) => ({
          instances: s.instances.map((i) =>
            i.id === instanceId ? { ...i, acknowledgedRisk: true } : i
          ),
          graduation: s.graduation.map((g) =>
            g.instanceId === instanceId ? { ...g, acknowledged: true } : g
          ),
        }));
      },

      markExplainerCompleted: (instanceId) => {
        set((s) => {
          const alreadyIssued = s.certificates.some(
            (c) => c.instanceId === instanceId && c.type === 'learn_completed'
          );
          const newCerts = alreadyIssued ? [] : [{
            id: uid('cert'),
            instanceId,
            type: 'learn_completed' as CertificateType,
            title: 'Learn the Strategy — Completed',
            issuedAt: nowISO(),
          }];
          return {
            instances: s.instances.map((i) =>
              i.id === instanceId ? { ...i, explainerCompleted: true } : i
            ),
            graduation: s.graduation.map((g) =>
              g.instanceId === instanceId ? { ...g, explainerCompleted: true } : g
            ),
            certificates: [...s.certificates, ...newCerts],
          };
        });
      },

      issueCertificate: (instanceId, type, title) => {
        set((s) => {
          const exists = s.certificates.some(
            (c) => c.instanceId === instanceId && c.type === type
          );
          if (exists) return {};
          const cert: Certificate = {
            id: uid('cert'),
            instanceId,
            type,
            title,
            issuedAt: nowISO(),
          };
          return { certificates: [...s.certificates, cert] };
        });
      },

      resetAll: () => {
        set({
          instances: [],
          activeInstanceId: null,
          positions: [],
          trades: [],
          trail: [],
          graduation: [],
          streaks: {},
          certificates: [],
          priceHistory: new Map(),
          latestSignal: null,
          sessionHealth: { authenticated: false, lastRefresh: null, status: 'stale' },
          activeTab: 'dashboard',
        });
      },
    }),
    {
      name: 'etf-dukaan-store',
      // Map serialization for localStorage
      storage: {
        getItem: (name) => {
          const raw = typeof window !== 'undefined' ? window.localStorage.getItem(name) : null;
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          // Revive Map
          if (parsed?.state?.priceHistory && Array.isArray(parsed.state.priceHistory)) {
            parsed.state.priceHistory = new Map(parsed.state.priceHistory);
          }
          return parsed;
        },
        setItem: (name, value) => {
          const serializable = {
            ...value,
            state: {
              ...value.state,
              priceHistory: value.state.priceHistory instanceof Map
                ? Array.from(value.state.priceHistory.entries())
                : value.state.priceHistory,
            },
          };
          window.localStorage.setItem(name, JSON.stringify(serializable));
        },
        removeItem: (name) => window.localStorage.removeItem(name),
      },
    }
  )
);

// Helper selectors. For array-returning selectors we use useShallow to avoid the
// "new array reference every render → infinite re-render loop" footgun.
export function useActiveInstance(): StrategyInstance | null {
  return useAppStore((s) => {
    const id = s.activeInstanceId;
    return id ? s.instances.find((i) => i.id === id) ?? null : null;
  });
}

export function useActivePositions(): Position[] {
  return useAppStore(
    useShallow((s) => {
      const id = s.activeInstanceId;
      return id ? s.positions.filter((p) => p.instanceId === id) : [];
    })
  );
}

export function useActiveTrades(): Trade[] {
  return useAppStore(
    useShallow((s) => {
      const id = s.activeInstanceId;
      return id ? s.trades.filter((t) => t.instanceId === id) : [];
    })
  );
}

export function useActiveTrail(): TrailEntry[] {
  return useAppStore(
    useShallow((s) => {
      const id = s.activeInstanceId;
      return id ? s.trail.filter((t) => t.instanceId === id) : [];
    })
  );
}

export function useActiveGraduation(): GraduationSnapshot | null {
  return useAppStore((s) => {
    const id = s.activeInstanceId;
    return id ? s.graduation.find((g) => g.instanceId === id) ?? null : null;
  });
}

export function useActiveStreak(): StreakState | null {
  return useAppStore((s) => {
    const id = s.activeInstanceId;
    return id ? s.streaks[id] ?? null : null;
  });
}

export function useActiveCertificates(): Certificate[] {
  return useAppStore(
    useShallow((s) => {
      const id = s.activeInstanceId;
      return id ? s.certificates.filter((c) => c.instanceId === id) : [];
    })
  );
}

export { SELL_TARGET_PCT };
