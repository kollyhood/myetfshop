'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Flame,
  Trophy,
  Target,
  TrendingDown,
  ArrowRight,
  Calendar,
  Zap,
  CheckCircle2,
  Circle,
  Sparkles,
} from 'lucide-react';
import {
  useActiveInstance,
  useActiveGraduation,
  useActiveStreak,
  useActiveTrades,
  useActivePositions,
  useAppStore,
} from '@/lib/store';
import { StrategySetupFlow } from '@/components/strategy/setup-flow';

const GRAD_MIN_DAYS = 30;
const GRAD_MIN_ROUND_TRIPS = 5;

export function Dashboard() {
  const instance = useActiveInstance();
  const graduation = useActiveGraduation();
  const streak = useActiveStreak();
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const runDailyCycle = useAppStore((s) => s.runDailyCycle);
  const reviewTodaysSignal = useAppStore((s) => s.reviewTodaysSignal);
  const latestSignal = useAppStore((s) => s.latestSignal);
  const trades = useActiveTrades();
  const positions = useActivePositions();

  if (!instance) {
    return <StrategySetupFlow />;
  }

  const dayProgress = Math.min(100, ((graduation?.daysElapsed ?? 0) / GRAD_MIN_DAYS) * 100);
  const roundTripProgress = Math.min(100, ((graduation?.roundTripsCompleted ?? 0) / GRAD_MIN_ROUND_TRIPS) * 100);
  const drawdownWithinLimit =
    graduation?.maxDrawdownTolerated === null ||
    graduation?.maxDrawdownTolerated === undefined ||
    (graduation?.currentDrawdown ?? 0) <= graduation.maxDrawdownTolerated;
  const explainerDone = !!instance.explainerCompleted;
  const acknowledged = !!instance.acknowledgedRisk;

  const dayGoalDone = (graduation?.daysElapsed ?? 0) >= GRAD_MIN_DAYS;
  const rtGoalDone = (graduation?.roundTripsCompleted ?? 0) >= GRAD_MIN_ROUND_TRIPS;
  const allGraduationMet = dayGoalDone && rtGoalDone && drawdownWithinLimit && explainerDone && acknowledged;

  const handleAdvance = () => {
    runDailyCycle(instance.id);
    reviewTodaysSignal(instance.id);
  };

  return (
    <div className="space-y-4 p-4">
      {/* Welcome / 30-day goal headline */}
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {instance.mode === 'live' ? 'Live strategy' : 'Paper strategy'}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{instance.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Day <span className="font-semibold text-foreground">{graduation?.daysElapsed ?? 0}</span> of {GRAD_MIN_DAYS} toward eligibility to go live.
        </p>
      </div>

      {/* 30-day progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              30-day paper goal
            </CardTitle>
            <Badge variant={dayGoalDone ? 'default' : 'secondary'}>
              {graduation?.daysElapsed ?? 0} / {GRAD_MIN_DAYS}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={dayProgress} />
          <p className="text-xs text-muted-foreground">
            {dayGoalDone
              ? 'Duration criterion met. This is one of several signals — it does not auto-unlock live mode.'
              : `${GRAD_MIN_DAYS - (graduation?.daysElapsed ?? 0)} more trading days to satisfy this criterion.`}
          </p>
        </CardContent>
      </Card>

      {/* Streak + Round-trips quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-amber-500" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Streak</span>
            </div>
            <div className="text-2xl font-bold">{streak?.currentStreak ?? 0}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Days you reviewed the signal
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Round trips</span>
            </div>
            <div className="text-2xl font-bold">{graduation?.roundTripsCompleted ?? 0}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Buy → sell cycles completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's action CTA */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs uppercase tracking-wider text-primary font-semibold">
                  Today's action
                </span>
              </div>
              {latestSignal ? (
                <p className="text-sm">
                  {latestSignal.buyCandidate && (
                    <>Buy <span className="font-bold">{latestSignal.buyCandidate.symbol}</span> (rank #{latestSignal.buyCandidate.rank}, RSI {latestSignal.buyCandidate.rsi.toFixed(1)})<br /></>
                  )}
                  {latestSignal.sellCandidate && (
                    <>Sell <span className="font-bold">{latestSignal.sellCandidate.symbol}</span> (+{latestSignal.sellCandidate.gainPct.toFixed(2)}%)<br /></>
                  )}
                  {!latestSignal.buyCandidate && !latestSignal.sellCandidate && (
                    <span className="text-muted-foreground">No trade today — this is the correct action.</span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Run today's cycle to compute RSI, rank the universe, and generate the signal.
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={handleAdvance} className="flex-1">
              Run daily cycle
            </Button>
            <Button variant="outline" onClick={() => setActiveTab('today')}>
              Details <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Graduation readiness checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Graduation readiness
          </CardTitle>
          <CardDescription>
            Here's what's happened so far. The decision to go live stays with you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ReadinessRow
            done={dayGoalDone}
            label={`30 trading days elapsed (${graduation?.daysElapsed ?? 0}/${GRAD_MIN_DAYS})`}
          />
          <ReadinessRow
            done={rtGoalDone}
            label={`5 completed round trips (${graduation?.roundTripsCompleted ?? 0}/${GRAD_MIN_ROUND_TRIPS})`}
          />
          <ReadinessRow
            done={drawdownWithinLimit}
            label={
              graduation?.maxDrawdownTolerated === null
                ? 'Drawdown within your limit (no limit set)'
                : `Drawdown within your limit (${(graduation?.currentDrawdown ?? 0).toFixed(1)}% / ${graduation?.maxDrawdownTolerated ?? '—'}%)`
            }
            warning={!drawdownWithinLimit}
          />
          <ReadinessRow
            done={explainerDone}
            label="Learn the Strategy explainer completed"
          />
          <ReadinessRow
            done={acknowledged}
            label="Risk acknowledgement signed"
          />
          <div className="pt-2">
            <Button
              variant={allGraduationMet ? 'default' : 'outline'}
              className="w-full"
              disabled={!allGraduationMet || instance.mode === 'live'}
              onClick={() => setActiveTab('settings')}
            >
              {instance.mode === 'live'
                ? 'Already live'
                : allGraduationMet
                  ? 'Review graduation flow →'
                  : 'Not ready yet'}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Graduation requires all five signals plus an explicit acknowledgement step.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick portfolio summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Portfolio at a glance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Positions</span>
            <span className="font-mono">{positions.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total trades</span>
            <span className="font-mono">{trades.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Capital allocated</span>
            <span className="font-mono">₹{instance.capitalAllocated.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Parts</span>
            <span className="font-mono">{instance.numParts} (₹{(instance.capitalAllocated / instance.numParts).toLocaleString('en-IN', { maximumFractionDigits: 0 })} each)</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => setActiveTab('portfolio')}
          >
            View portfolio <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ReadinessRow({ done, label, warning }: { done: boolean; label: string; warning?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
      ) : warning ? (
        <TrendingDown className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
      )}
      <span className={`text-sm ${done ? '' : warning ? 'text-destructive' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}
