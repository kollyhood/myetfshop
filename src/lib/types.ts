// Core domain types for My ETF Shop

export type StrategyMode = 'paper' | 'live';

export type TradeSide = 'buy' | 'sell';

export type TriggerReason =
  | 'rank-5-entry'        // Buy: top-5 ranked ETF not currently held
  | 'avg-down-3pct'       // Buy: held position down >3% from last fill
  | 'target-hit-4.57pct'; // Sell: position reached +4.57% target

export type TrailStage =
  | 'auth'                // Shoonya session re-established
  | 'fetch_prices'        // Price history + LTP fetch
  | 'compute_rsi'         // 14-day Wilder RSI
  | 'rank'                // Sort universe by RSI ascending
  | 'evaluate_buy'        // Buy rule walked
  | 'evaluate_sell'       // Sell rule walked
  | 'generate_signal'     // Signal composed
  | 'execute'             // Order fired (paper or live)
  | 'log';                // Trail persisted

export type TrailOutcome = 'ok' | 'skipped' | 'error' | 'no_trade';

export interface ETF {
  symbol: string;          // NSE ticker, e.g. NIFTYBEES
  name: string;            // Human-friendly name
  sector: string;          // Sector classification
  indexTracked: string;    // Underlying index
  avgVolume: number;       // Average daily volume (proxy)
  shoonyaExchange: 'NSE' | 'BSE';
  shoonyaToken: string;    // Mock token (numeric string)
}

export interface PriceBar {
  date: string;            // ISO date
  close: number;
  volume: number;
}

export interface RSIEntry {
  symbol: string;
  date: string;
  rsi14: number;
}

export interface StrategyInstance {
  id: string;
  name: string;
  mode: StrategyMode;
  createdAt: string;       // ISO datetime
  capitalAllocated: number;// INR
  numParts: number;        // Position sizing — user-set, no default
  status: 'active' | 'paused' | 'graduated';
  // For live mode only
  brokerConnected: boolean;
  // Acknowledgement tracking
  acknowledgedRisk: boolean;
  explainerCompleted: boolean;
  // One-time graduation fee (Rs. 299 via Razorpay) — required before going live
  paymentCompleted: boolean;
  paymentId?: string;      // Razorpay payment_id, stored for audit
  paymentOrderId?: string; // Razorpay order_id
  paidAt?: string;         // ISO timestamp
}

export interface Position {
  instanceId: string;
  symbol: string;
  quantity: number;
  lastPurchasePrice: number;  // §2.4: last fill, NOT avg cost
  avgCostBasis: number;       // For P&L reporting
  firstPurchaseDate: string;
}

export interface Trade {
  id: string;
  instanceId: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;            // Fill price (post-slippage in paper)
  notional: number;         // quantity * price
  brokerage: number;        // INR
  stt: number;              // INR
  slippageCost: number;     // INR (modeled, paper only)
  timestamp: string;
  mode: StrategyMode;
  triggerReason: TriggerReason;
  rejected?: boolean;
  rejectionReason?: string;
}

export interface TrailEntry {
  id: string;
  instanceId: string;
  date: string;             // Trading date
  stage: TrailStage;
  outcome: TrailOutcome;
  payload: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

export interface GraduationSnapshot {
  instanceId: string;
  daysElapsed: number;          // Trading days since start
  roundTripsCompleted: number;  // buy→sell cycles
  currentDrawdown: number;      // % from peak portfolio value
  maxDrawdownTolerated: number | null;  // user-set
  acknowledged: boolean;
  explainerCompleted: boolean;
  lastUpdated: string;
}

export interface DailySignal {
  instanceId: string;
  date: string;
  rankTop5: { symbol: string; rsi: number; rank: number }[];
  buyCandidate: {
    symbol: string;
    reason: TriggerReason;
    rsi: number;
    rank: number;
  } | null;
  sellCandidate: {
    symbol: string;
    reason: TriggerReason;
    gainPct: number;
    currentPrice: number;
    costBasis: number;
  } | null;
  noTradeReason?: string;
}

export interface StreakState {
  currentStreak: number;        // Consecutive days signal reviewed
  longestStreak: number;
  lastReviewedDate: string | null;
  reviewHistory: { date: string; reviewed: boolean }[];
}

export type CertificateType =
  | 'learn_completed'
  | 'first_round_trip'
  | 'day_30_milestone'
  | 'graduated_to_live';

export interface Certificate {
  id: string;
  instanceId: string;
  type: CertificateType;
  title: string;
  issuedAt: string;
}
