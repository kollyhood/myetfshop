'use client';

import { useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Zap, TrendingUp, TrendingDown, HelpCircle, ArrowRight, RefreshCw, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  useActiveInstance, useActiveGraduation, useAppStore,
} from '@/lib/store';
import type { DailySignal } from '@/lib/types';
import { getETF } from '@/lib/strategy/universe';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { StrategySetupFlow } from '@/components/strategy/setup-flow';
import { SELL_TARGET_PCT, AVG_DOWN_TRIGGER_PCT } from '@/lib/strategy/rules';

export function TodaySignal() {
  const instance = useActiveInstance();
  const graduation = useActiveGraduation();
  const latestSignal = useAppStore((s) => s.latestSignal);
  const runDailyCycle = useAppStore((s) => s.runDailyCycle);
  const reviewTodaysSignal = useAppStore((s) => s.reviewTodaysSignal);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const [explainerFor, setExplainerFor] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  if (!instance) return <StrategySetupFlow />;

  const handleRun = () => {
    setIsRunning(true);
    // Defer to next tick so the spinner can render
    setTimeout(() => {
      runDailyCycle(instance.id);
      reviewTodaysSignal(instance.id);
      setIsRunning(false);
    }, 50);
  };

  const signal = latestSignal;
  const isLive = instance.mode === 'live';

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {instance.mode === 'live' ? 'Live signal' : 'Paper signal'} · {instance.name}
        </p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Today's action</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Computed once per trading day, after market data settles. Same rules in paper and live —
          only the execution adapter differs.
        </p>
      </div>

      {!signal ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <Zap className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No signal computed yet. Run today's cycle to fetch prices, compute RSI, rank the
              universe, and evaluate the buy/sell rules.
            </p>
            <Button onClick={handleRun} disabled={isRunning} className="mt-2">
              {isRunning ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Run daily cycle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Buy card */}
          {signal.buyCandidate ? (
            <SignalCard
              kind="buy"
              symbol={signal.buyCandidate.symbol}
              reason={signal.buyCandidate.reason}
              meta={{
                RSI: signal.buyCandidate.rsi.toFixed(2),
                Rank: `#${signal.buyCandidate.rank} of 75`,
              }}
              isLive={isLive}
              onExplain={() => setExplainerFor(signal.buyCandidate!.symbol)}
            />
          ) : null}

          {/* Sell card */}
          {signal.sellCandidate ? (
            <SignalCard
              kind="sell"
              symbol={signal.sellCandidate.symbol}
              reason={signal.sellCandidate.reason}
              meta={{
                Gain: `+${signal.sellCandidate.gainPct.toFixed(2)}%`,
                'Cost basis': `₹${signal.sellCandidate.costBasis.toFixed(2)}`,
                'Current price': `₹${signal.sellCandidate.currentPrice.toFixed(2)}`,
              }}
              isLive={isLive}
              onExplain={() => setExplainerFor(signal.sellCandidate!.symbol)}
            />
          ) : null}

          {/* No trade */}
          {!signal.buyCandidate && !signal.sellCandidate && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6 pb-6 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-primary" />
                <p className="font-semibold mt-2">No trade today</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  {signal.noTradeReason}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  This counts identically toward your streak as a day with a trade. A textbook
                  correct &ldquo;no action&rdquo; outcome is not a miss.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Top-5 rank list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rank-5 buy zone today</CardTitle>
              <CardDescription>
                Universe sorted by 14-day Wilder RSI ascending. Lowest = most oversold = cheapest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {signal.rankTop5.map((r) => {
                const etf = getETF(r.symbol);
                return (
                  <div
                    key={r.symbol}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-muted-foreground w-5">#{r.rank}</span>
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-medium truncate">{r.symbol}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {etf?.sector} · {etf?.indexTracked}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      RSI {r.rsi.toFixed(1)}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Run again */}
          <Button onClick={handleRun} disabled={isRunning} variant="outline" className="w-full">
            {isRunning ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Advance one trading day
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            This advances the simulated Shoonya price feed by one trading day and re-runs the full cycle.
          </p>
        </>
      )}

      {/* Contextual explainer drawer (inline accordion, always-relevant) */}
      {explainerFor && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              Why is {explainerFor} today's pick?
            </CardTitle>
            <CardDescription>
              Annotated with today's real numbers from your account, not a generic lesson.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContextualExplainer symbol={explainerFor} signal={signal} />
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('learn')}>
              Open full Learn tab <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setExplainerFor(null)}>
              Close
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Compliance note */}
      <p className="text-[11px] text-muted-foreground text-center px-4">
        My ETF Shop is not a SEBI-registered investment adviser, research analyst, or portfolio
        manager. This is educational, rules-based tooling — not investment advice or a
        recommendation. You execute your own rules with your own capital and your own judgment.
      </p>
    </div>
  );
}

function SignalCard({
  kind, symbol, reason, meta, isLive, onExplain,
}: {
  kind: 'buy' | 'sell';
  symbol: string;
  reason: string;
  meta: Record<string, string>;
  isLive: boolean;
  onExplain: () => void;
}) {
  const etf = getETF(symbol);
  const isBuy = kind === 'buy';
  return (
    <Card className={isBuy ? 'border-primary/40' : 'border-amber-500/40'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isBuy ? (
              <TrendingUp className="h-5 w-5 text-primary" />
            ) : (
              <TrendingDown className="h-5 w-5 text-amber-500" />
            )}
            <div>
              <CardTitle className="text-base">
                {isBuy ? 'Buy' : 'Sell'} {symbol}
              </CardTitle>
              <CardDescription className="text-xs">
                {etf?.name}
              </CardDescription>
            </div>
          </div>
          {isLive && (
            <Badge variant="destructive" className="text-[10px]">
              Live — tap to confirm
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="rounded-md bg-muted/50 p-2.5 text-xs">
          <span className="text-muted-foreground">Trigger: </span>
          <span className="font-mono">{reason}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(meta).map(([k, v]) => (
            <div key={k} className="rounded-md border border-border p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="font-mono text-sm font-medium">{v}</div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm" variant="outline" onClick={onExplain}>
          <HelpCircle className="h-3.5 w-3.5 mr-1" /> Why this pick?
        </Button>
        {isLive && (
          <Button size="sm" variant={isBuy ? 'default' : 'destructive'} className="ml-auto">
            {isBuy ? 'Confirm buy' : 'Confirm sell'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function ContextualExplainer({
  symbol, signal,
}: {
  symbol: string;
  signal: DailySignal;
}) {
  const rankEntry = signal?.rankTop5.find(r => r.symbol === symbol);
  const isBuy = signal?.buyCandidate?.symbol === symbol;
  const isSell = signal?.sellCandidate?.symbol === symbol;

  return (
    <Accordion type="multiple" defaultValue={['why']}>
      <AccordionItem value="why">
        <AccordionTrigger className="text-sm">Why this ETF, today</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>
            {symbol} {rankEntry ? `ranks #${rankEntry.rank} in today's universe of 75 ETFs, with a 14-day Wilder RSI of ${rankEntry.rsi.toFixed(2)}.` : "is not in today's rank-5."}
          </p>
          {isBuy && signal?.buyCandidate?.reason === 'rank-5-entry' && (
            <p>
              The buy rule walked down the rank-5 list. {symbol} is the highest-ranked ETF
              in the top-5 that you don't currently hold — so it's today's buy.
            </p>
          )}
          {isBuy && signal?.buyCandidate?.reason === 'avg-down-3pct' && (
            <p>
              All of the rank-5 ETFs are already held. The rule then checks each held position
              for a price drop greater than {AVG_DOWN_TRIGGER_PCT}% from its own last fill.
              {symbol} qualified as the most oversold among qualifiers, so it gets today's
              averaging-down buy.
            </p>
          )}
          {isSell && (
            <p>
              The sell rule checks every position against a +{SELL_TARGET_PCT}% target from cost basis.
              {symbol} reached +{signal.sellCandidate!.gainPct.toFixed(2)}% — above target —
              and is the single best performer today, so it gets sold. Other positions above target
              are left alone to &ldquo;let the rest ripen.&rdquo;
            </p>
          )}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="rule-recap">
        <AccordionTrigger className="text-sm">The exact rule that fired</AccordionTrigger>
        <AccordionContent className="text-sm">
          {isBuy && (
            <code className="block rounded-md bg-muted/70 p-2 text-xs font-mono whitespace-pre-wrap">
              {signal?.buyCandidate?.reason === 'rank-5-entry'
                ? `evaluate_buy_rule(rank_top5, positions):
  for cand in rank_top5:
    if cand.symbol not in held_symbols:
      return cand  # ${symbol} is the first not-held
  # ...fall through to avg-down check`
                : `evaluate_buy_rule(...):
  # rank-5 all held → check avg-down
  for pos in positions:
    if price(pos.symbol) ≤ pos.last_purchase_price × 0.97:
      qualifiers.add(pos)
  # ${symbol} = lowest RSI among qualifiers`}
            </code>
          )}
          {isSell && (
            <code className="block rounded-md bg-muted/70 p-2 text-xs font-mono whitespace-pre-wrap">
              {`evaluate_sell_rule(positions, target=4.57%):
  qualifiers = [p for p in positions
                if gain(p) >= 4.57%]
  # ${symbol} is the single best performer
  return max(qualifiers, by=gain)`}
            </code>
          )}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="strategy-context">
        <AccordionTrigger className="text-sm">Why this works (counter-intuitive part)</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>
            In single-stock RSI trading, a falling stock with low RSI is often a distress signal.
            Here, the universe is a curated basket of diversified ETFs — a falling ETF is treated
            as an accumulation opportunity, not a warning.
          </p>
          <p>
            The thinking: a sector ETF rarely goes to zero. If it's oversold relative to its
            peers, it's a candidate to add. The +{SELL_TARGET_PCT}% sell target is a deliberately
            small &ldquo;middle path&rdquo; between 3.14% and 6.28% — chosen to capture small rotations
            rather than wait for large moves.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
