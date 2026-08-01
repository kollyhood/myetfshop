import type { StrategyMode, Trade, TradeSide, TriggerReason } from '@/lib/types';

/**
 * Paper-mode friction model (§3.2).
 *
 * Realistic frictions so paper performance doesn't look better than live ever could.
 * - Brokerage: 0.05% of notional, capped at ₹20 per order (typical discount broker)
 * - STT (Securities Transaction Tax): 0.025% on sell side only (equity delivery)
 * - Exchange charges: 0.00325% of notional
 * - GST on brokerage: 18% of brokerage
 * - SEBI turnover fee: ₹10 per crore of turnover
 * - Stamp duty: 0.015% on buy side only (equity delivery, capped at ₹1500)
 * - Slippage: modeled as adverse fill (buy fills higher, sell fills lower)
 *
 * In live mode, these are reported from the actual broker contract note;
 * the modeled numbers here are only for paper.
 */

export interface FrictionBreakdown {
  notional: number;
  brokerage: number;
  stt: number;
  exchangeCharges: number;
  gstOnBrokerage: number;
  sebiFee: number;
  stampDuty: number;
  slippageCost: number;
  totalCharges: number;
  fillPrice: number; // effective fill price (post-slippage)
}

export function modelFriction(
  side: TradeSide,
  quantity: number,
  referencePrice: number,
  mode: StrategyMode
): FrictionBreakdown {
  if (mode === 'live') {
    // Live mode: no modeled slippage/charges — these come from the actual broker fill.
    return {
      notional: quantity * referencePrice,
      brokerage: 0,
      stt: 0,
      exchangeCharges: 0,
      gstOnBrokerage: 0,
      sebiFee: 0,
      stampDuty: 0,
      slippageCost: 0,
      totalCharges: 0,
      fillPrice: referencePrice,
    };
  }

  // Paper mode: model everything
  // Slippage — random in [-0.05%, +0.05%] but biased adverse
  const slippageBps = (Math.random() * 5 + 0.5) / 100; // 0.005% to 0.05%
  const slippageDirection = side === 'buy' ? 1 : -1; // buy fills higher, sell fills lower
  const fillPrice = +(referencePrice * (1 + slippageDirection * slippageBps / 100)).toFixed(4);

  const notional = quantity * fillPrice;
  const brokerage = Math.min(notional * 0.0005, 20);
  const stt = side === 'sell' ? notional * 0.00025 : 0;
  const exchangeCharges = notional * 0.0000325;
  const gstOnBrokerage = brokerage * 0.18;
  const sebiFee = notional * 0.000001;
  const stampDuty = side === 'buy' ? Math.min(notional * 0.00015, 1500) : 0;
  const slippageCost = Math.abs(quantity * (fillPrice - referencePrice));

  const totalCharges =
    brokerage + stt + exchangeCharges + gstOnBrokerage + sebiFee + stampDuty + slippageCost;

  return {
    notional,
    brokerage,
    stt,
    exchangeCharges,
    gstOnBrokerage,
    sebiFee,
    stampDuty,
    slippageCost,
    totalCharges,
    fillPrice,
  };
}

export function buildTradeRecord(params: {
  instanceId: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  referencePrice: number;
  mode: StrategyMode;
  triggerReason: TriggerReason;
  rejected?: boolean;
  rejectionReason?: string;
}): Trade {
  const friction = modelFriction(
    params.side,
    params.quantity,
    params.referencePrice,
    params.mode
  );
  return {
    id: `trd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    instanceId: params.instanceId,
    symbol: params.symbol,
    side: params.side,
    quantity: params.quantity,
    price: friction.fillPrice,
    notional: friction.notional,
    brokerage: friction.brokerage,
    stt: friction.stt,
    slippageCost: friction.slippageCost,
    timestamp: new Date().toISOString(),
    mode: params.mode,
    triggerReason: params.triggerReason,
    rejected: params.rejected,
    rejectionReason: params.rejectionReason,
  };
}
