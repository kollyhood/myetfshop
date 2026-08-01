'use client';

import { useEffect, useState } from 'react';
import { Signal, Wifi, WifiOff } from 'lucide-react';
import { useAppStore, useActiveInstance } from '@/lib/store';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * Persistent mode indicator (§3.5).
 *
 * Visual metaphor: signal-strength bars (like a phone's mobile network indicator).
 * - Paper mode: bars rendered outlined/hollow, neutral cool tone, "P" badge.
 * - Live mode: bars rendered solid/filled, warm alert tone (amber/red), live-pulse animation.
 *   This is the OPPOSITE of normal signal-bar semantics — solid reads "live wire," not "strong connection."
 * - Bar count reflects Shoonya session freshness:
 *     4 bars = authenticated + fresh data (today)
 *     3 bars = recent but slightly stale
 *     2 bars = stale data
 *     1 bar = failed re-auth / never refreshed
 *
 * Tapping opens a detail panel — never navigates away.
 *
 * In live mode, this icon is non-suppressible, non-dismissible, non-themeable — it's a safety indicator.
 */
export function ModeIndicator() {
  const instance = useActiveInstance();
  const sessionHealth = useAppStore((s) => s.sessionHealth);
  const [open, setOpen] = useState(false);

  const isLive = instance?.mode === 'live';
  const lastRefresh = sessionHealth.lastRefresh;
  const staleHours = lastRefresh
    ? (Date.now() - new Date(lastRefresh).getTime()) / (1000 * 60 * 60)
    : 999;

  // 4 bars = fresh (<1h), 3 bars = <6h, 2 bars = <24h, 1 bar = >24h or never
  let barCount = 1;
  if (sessionHealth.authenticated) {
    if (staleHours < 1) barCount = 4;
    else if (staleHours < 6) barCount = 3;
    else if (staleHours < 24) barCount = 2;
    else barCount = 1;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={isLive ? 'Live mode — real capital at risk' : 'Paper mode — simulated trading'}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isLive
              ? 'bg-destructive/15 hover:bg-destructive/25 live-pulse'
              : 'bg-muted hover:bg-accent'
          )}
        >
          {/* Signal bars */}
          <div className="flex items-end gap-[2px] h-4">
            {[1, 2, 3, 4].map((i) => {
              const filled = i <= barCount;
              return (
                <span
                  key={i}
                  className={cn(
                    'w-[3px] rounded-sm',
                    i === 1 && 'h-1.5',
                    i === 2 && 'h-2.5',
                    i === 3 && 'h-3.5',
                    i === 4 && 'h-4',
                    isLive
                      ? filled
                        ? 'bg-destructive'
                        : 'bg-destructive/25'
                      : filled
                        ? 'bg-muted-foreground'
                        : 'bg-muted-foreground/25'
                  )}
                />
              );
            })}
          </div>
          <span
            className={cn(
              'text-[10px] font-bold tracking-wider uppercase',
              isLive ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {isLive ? 'Live' : 'Paper'}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-4 text-sm"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Mode</span>
            <span
              className={cn(
                'font-semibold',
                isLive ? 'text-destructive' : 'text-foreground'
              )}
            >
              {isLive ? 'Live — real capital' : 'Paper — simulated'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Strategy</span>
            <span className="font-medium truncate ml-2 max-w-[160px]">
              {instance?.name ?? 'No instance'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Session</span>
            <span className="flex items-center gap-1 font-medium">
              {sessionHealth.authenticated ? (
                <Wifi className="h-3 w-3 text-emerald-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-destructive" />
              )}
              {sessionHealth.authenticated ? 'Authenticated' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Last refresh</span>
            <span className="font-mono text-xs">
              {lastRefresh
                ? new Date(lastRefresh).toLocaleString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short',
                  })
                : 'Never'}
            </span>
          </div>
          {isLive && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive-foreground">
              <p className="font-medium text-destructive">Live wire — real money is at risk.</p>
              <p className="mt-1 text-muted-foreground">
                This indicator cannot be hidden or themed. It stays visible on every screen
                while you're in live mode.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
