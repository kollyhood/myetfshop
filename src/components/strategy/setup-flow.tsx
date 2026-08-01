'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppStore } from '@/lib/store';
import { Shield, AlertTriangle, Info } from 'lucide-react';

export function StrategySetupFlow({ onClose }: { onClose?: () => void }) {
  const createInstance = useAppStore((s) => s.createInstance);
  const router = useRouter();

  const [name, setName] = useState('');
  const [capital, setCapital] = useState(50000);
  const [numParts, setNumParts] = useState(10);
  const [maxDrawdown, setMaxDrawdown] = useState<number | null>(10);
  const [useDrawdownLimit, setUseDrawdownLimit] = useState(true);

  const perPart = capital / numParts;

  const handleSubmit = () => {
    const id = createInstance({
      name: name || 'My ETF Strategy',
      capitalAllocated: capital,
      numParts,
      maxDrawdownTolerated: useDrawdownLimit ? maxDrawdown : null,
    });
    // §3.1: every new strategy starts in paper mode — no path to create one that starts live.
    // This is enforced inside the store, not the form (no mode selector shown here at all).
    if (onClose) onClose();
    else router.push('/');
  };

  return (
    <div className="space-y-4 p-4 pb-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Strategy</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set up a rules-based ETF rotation strategy. Paper trading is the default —
          you graduate to live only when you decide you're ready.
        </p>
      </div>

      <Alert className="bg-primary/5 border-primary/30">
        <Shield className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">Paper-first by default</AlertTitle>
        <AlertDescription>
          Every new strategy starts in paper mode. There's no setting to skip this —
          it's the un-skippable starting state. Live mode unlocks only after you
          complete the graduation flow.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Strategy name</CardTitle>
          <CardDescription>
            A label you'll recognize in the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Conservative paper run, Aggressive live"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capital to allocate</CardTitle>
          <CardDescription>
            Total capital (in ₹) the rule engine will work with. In paper mode this is simulated;
            in live mode it's the real capital at stake.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">₹</span>
            <Input
              type="number"
              min={1000}
              step={1000}
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[10000, 25000, 50000, 100000].map((v) => (
              <button
                key={v}
                onClick={() => setCapital(v)}
                className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent transition-colors"
              >
                ₹{v.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Position sizing — number of parts</CardTitle>
          <CardDescription>
            Capital is divided equally into this many parts. Each new buy uses one part.
            The source material defers compounding logic to a later lesson — you set this number
            yourself; the app does not invent a default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Parts</Label>
            <span className="font-bold text-primary text-lg">{numParts}</span>
          </div>
          <Slider
            min={3}
            max={25}
            step={1}
            value={[numParts]}
            onValueChange={(v) => setNumParts(v[0])}
          />
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Per-part capital</span>
              <span className="font-mono font-semibold">₹{perPart.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Capital</span>
              <span className="font-mono">₹{capital.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Parts</span>
              <span className="font-mono">{numParts}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Max drawdown you'll tolerate</CardTitle>
          <CardDescription>
            This is YOUR risk-tolerance number, not a strategy parameter. Used as one of the
            graduation signals (§3.3). Set to what you can stomach — the app won't tell you
            what it should be.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Use a drawdown limit</Label>
            <Switch
              checked={useDrawdownLimit}
              onCheckedChange={setUseDrawdownLimit}
            />
          </div>
          {useDrawdownLimit && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Max drawdown</Label>
                <span className="font-bold text-destructive text-lg">{maxDrawdown}%</span>
              </div>
              <Slider
                min={3}
                max={30}
                step={1}
                value={[maxDrawdown ?? 10]}
                onValueChange={(v) => setMaxDrawdown(v[0])}
              />
              <p className="text-xs text-muted-foreground">
                If portfolio drawdown exceeds this during paper trading, the graduation
                dashboard flags it — but it's your decision whether to keep going.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This is a mechanical rules engine, not investment advice. The rules come from a
          public strategy description (a popular honest YouTuber's &ldquo;ETF Dukaan — Updated Method 2026&rdquo;).
          Losses are possible. You execute your own rules with your own capital and your own judgment.
        </AlertDescription>
      </Alert>

      <Alert className="bg-amber-500/10 border-amber-500/40">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription>
          Position sizing is your responsibility — the source material explicitly defers this
          to a future lesson. Pick a number that makes sense for you; don't reverse-engineer one
          from the rules.
        </AlertDescription>
      </Alert>

      <Button
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        disabled={capital < 1000 || numParts < 3}
      >
        Create paper strategy →
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        No live orders will fire. Paper mode runs the identical rules engine against simulated fills
        at real market prices.
      </p>
    </div>
  );
}
