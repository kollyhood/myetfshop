'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useActiveInstance, useActivePositions, useActiveTrades, useActiveTrail, useAppStore,
} from '@/lib/store';
import { getETF } from '@/lib/strategy/universe';
import {
  TrendingUp, TrendingDown, Activity, Wallet, ArrowDownToLine, ArrowUpFromLine, FileText, RefreshCw,
} from 'lucide-react';
import { StrategySetupFlow } from '@/components/strategy/setup-flow';
import { cn } from '@/lib/utils';
import type { TrailStage } from '@/lib/types';

const STAGE_LABEL: Record<TrailStage, string> = {
  auth: 'Session re-auth',
  fetch_prices: 'Fetch prices',
  compute_rsi: 'Compute RSI',
  rank: 'Rank universe',
  evaluate_buy: 'Evaluate buy rule',
  evaluate_sell: 'Evaluate sell rule',
  generate_signal: 'Generate signal',
  execute: 'Execute',
  log: 'Log trail',
};

export function Portfolio() {
  const instance = useActiveInstance();
  const positions = useActivePositions();
  const trades = useActiveTrades();
  const trail = useActiveTrail();
  const priceHistory = useAppStore((s) => s.priceHistory);
  const [tab, setTab] = useState('positions');

  if (!instance) return <StrategySetupFlow />;

  // Build current price lookup
  const priceBySymbol = new Map<string, number>();
  for (const [sym, bars] of priceHistory.entries()) {
    if (bars.length > 0) priceBySymbol.set(sym, bars[bars.length - 1].close);
  }

  // Compute portfolio value
  const totalValue = positions.reduce((sum, p) => {
    const price = priceBySymbol.get(p.symbol) ?? p.avgCostBasis;
    return sum + price * p.quantity;
  }, 0);
  const totalCost = positions.reduce((sum, p) => sum + p.avgCostBasis * p.quantity, 0);
  const unrealizedPnL = totalValue - totalCost;
  const unrealizedPnLPct = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;

  // Cash remaining (rough proxy)
  const investedCost = positions.reduce((s, p) => s + p.avgCostBasis * p.quantity, 0);
  const realizedPnL = trades
    .filter((t) => !t.rejected)
    .reduce((sum, t) => {
      if (t.side === 'sell') {
        // Rough realized gain = (sell price - avg cost) * qty - costs
        // We don't have avg cost at time of sell stored per trade; approximate using current position tracking
        // For a cleaner impl we'd store cost basis snapshot on the trade itself
        return sum; // simplified
      }
      return sum;
    }, 0);

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{instance.mode === 'live' ? 'Live' : 'Paper'} · {instance.name}</p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Portfolio</h1>
      </div>

      {/* Portfolio summary */}
      <Card>
        <CardContent className="pt-5 space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Current value</span>
            <span className="text-2xl font-bold font-mono">
              ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Unrealized P&amp;L</span>
            <span className={cn('font-mono font-medium', unrealizedPnL >= 0 ? 'text-primary' : 'text-destructive')}>
              {unrealizedPnL >= 0 ? '+' : ''}₹{Math.abs(unrealizedPnL).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              <span className="text-xs ml-1">({unrealizedPnLPct >= 0 ? '+' : ''}{unrealizedPnLPct.toFixed(2)}%)</span>
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Invested</span>
            <span className="font-mono">₹{investedCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cash (unallocated)</span>
            <span className="font-mono">₹{Math.max(0, instance.capitalAllocated - investedCost).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="positions">
            <Wallet className="h-3.5 w-3.5 mr-1" /> Positions
          </TabsTrigger>
          <TabsTrigger value="trades">
            <Activity className="h-3.5 w-3.5 mr-1" /> Trades
          </TabsTrigger>
          <TabsTrigger value="trail">
            <FileText className="h-3.5 w-3.5 mr-1" /> Trail
          </TabsTrigger>
        </TabsList>

        {/* Positions */}
        <TabsContent value="positions" className="space-y-2 mt-3">
          {positions.length === 0 ? (
            <Card>
              <CardContent className="pt-8 pb-8 text-center text-sm text-muted-foreground">
                No open positions. Run a daily cycle to start accumulating.
              </CardContent>
            </Card>
          ) : (
            positions.map((p) => {
              const etf = getETF(p.symbol);
              const currentPrice = priceBySymbol.get(p.symbol) ?? p.avgCostBasis;
              const gainPct = ((currentPrice - p.avgCostBasis) / p.avgCostBasis) * 100;
              const isGain = gainPct >= 0;
              const value = currentPrice * p.quantity;
              const cost = p.avgCostBasis * p.quantity;
              const aboveTarget = gainPct >= 4.57;
              return (
                <Card key={p.symbol}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">{p.symbol}</span>
                          {aboveTarget && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/40">
                              Above +4.57% target
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {etf?.sector} · {etf?.indexTracked}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-semibold">
                          ₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className={cn('text-xs font-mono', isGain ? 'text-primary' : 'text-destructive')}>
                          {isGain ? '+' : ''}{gainPct.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                      <div>
                        <div className="text-muted-foreground">Qty</div>
                        <div className="font-mono">{p.quantity}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg cost</div>
                        <div className="font-mono">₹{p.avgCostBasis.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Last fill</div>
                        <div className="font-mono">₹{p.lastPurchasePrice.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      The buy rule uses <span className="font-medium">last fill</span> for the -3% averaging-down check, not avg cost.
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Trades */}
        <TabsContent value="trades" className="space-y-2 mt-3">
          {trades.length === 0 ? (
            <Card>
              <CardContent className="pt-8 pb-8 text-center text-sm text-muted-foreground">
                No trades yet. Run a daily cycle.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Total trades</div>
                      <div className="font-mono font-bold text-lg">{trades.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Rejections</div>
                      <div className="font-mono font-bold text-lg">
                        {trades.filter(t => t.rejected).length}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[60vh] thin-scroll">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Symbol</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...trades].reverse().map((t) => (
                          <TableRow key={t.id} className={cn(t.rejected && 'opacity-50')}>
                            <TableCell>
                              {t.side === 'buy' ? (
                                <ArrowDownToLine className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <ArrowUpFromLine className="h-3.5 w-3.5 text-amber-500" />
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {t.symbol}
                              {t.rejected && <Badge variant="destructive" className="ml-1 text-[9px]">Rejected</Badge>}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">{t.quantity}</TableCell>
                            <TableCell className="text-right font-mono text-xs">₹{t.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-[10px] text-muted-foreground">
                              {t.triggerReason}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Trail log */}
        <TabsContent value="trail" className="space-y-2 mt-3">
          {trail.length === 0 ? (
            <Card>
              <CardContent className="pt-8 pb-8 text-center text-sm text-muted-foreground">
                No trail entries yet. Each stage of the daily cycle writes its own row here.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Decision trail</CardTitle>
                <CardDescription>
                  Append-only. One row per stage — a failure is traceable to the exact stage without
                  reconstructing it from scattered logs.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[60vh] thin-scroll">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...trail].reverse().map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                            {new Date(t.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </TableCell>
                          <TableCell className="text-xs">{STAGE_LABEL[t.stage]}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                t.outcome === 'ok' ? 'default' :
                                t.outcome === 'skipped' ? 'secondary' :
                                t.outcome === 'no_trade' ? 'outline' :
                                'destructive'
                              }
                              className="text-[9px]"
                            >
                              {t.outcome}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">
                            {t.error ?? JSON.stringify(t.payload).slice(0, 60)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
