'use client';

import { useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen, GraduationCap, Award, CheckCircle2, Lock, Download, Lightbulb, Shield,
} from 'lucide-react';
import {
  useActiveInstance, useActiveCertificates, useAppStore,
} from '@/lib/store';
import { StrategySetupFlow } from '@/components/strategy/setup-flow';
import { SELL_TARGET_PCT, AVG_DOWN_TRIGGER_PCT } from '@/lib/strategy/rules';
import { cn } from '@/lib/utils';

interface LearnModule {
  id: string;
  title: string;
  duration: string;
  content: React.ReactNode;
}

export function Learn() {
  const instance = useActiveInstance();
  const certificates = useActiveCertificates();
  const markExplainerCompleted = useAppStore((s) => s.markExplainerCompleted);
  const [tab, setTab] = useState('modules');

  if (!instance) return <StrategySetupFlow />;

  const modules: LearnModule[] = [
    {
      id: 'm1',
      title: '1. What RSI measures — and why low RSI means buy here',
      duration: '3 min',
      content: (
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            <strong>RSI (Relative Strength Index)</strong> measures how much a price has moved up
            versus down over a recent window — typically 14 days. It ranges from 0 to 100.
          </p>
          <p>
            In <em>single-stock</em> RSI trading, a low RSI (under 30) is often read as
            &ldquo;oversold&rdquo; — a potential bounce candidate — and a high RSI (over 70) as
            &ldquo;overbought.&rdquo; But the standard reading still treats a falling stock as a
            warning sign that needs reversing.
          </p>
          <p>
            <strong>This strategy flips that on its head.</strong> The universe here is a curated
            basket of <em>diversified ETFs</em>, not individual stocks. A sector ETF rarely goes
            to zero. So when an ETF in the universe is falling hard, that's treated as an
            <strong> accumulation opportunity</strong>, not a distress signal.
          </p>
          <p>
            That's why the rule engine <strong>sorts the universe by RSI ascending</strong> —
            lowest first — and considers the bottom 5 (&ldquo;rank 1–5&rdquo;) as today's
            buy zone. The most oversold ETF you don't already hold is today's buy.
          </p>
          <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-3">
            Variant note: this app uses <strong>Wilder's smoothing</strong> (EMA-based average
            gain/loss) for RSI, not the simple-moving-average variant. That's what the source
            material specifies — it produces small numerical deviations vs. other RSI sources.
          </p>
        </div>
      ),
    },
    {
      id: 'm2',
      title: '2. The buy rule, walked through with a concrete example',
      duration: '4 min',
      content: (
        <div className="space-y-3 text-sm leading-relaxed">
          <p>Exactly <strong>one buy per trading day</strong>. Evaluate in this order:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>Walk down the rank-5 list from #1.</strong> If any of those 5 ETFs is
              <em> not currently held</em>, buy the highest-ranked one not held. Done for the day.
            </li>
            <li>
              <strong>If all 5 are already held:</strong> check each held position for
              <code className="mx-1 px-1 py-0.5 rounded bg-muted text-xs">current_price ≤ last_purchase_price × 0.97</code>
              (i.e., down &gt;{AVG_DOWN_TRIGGER_PCT}% from its <em>last fill</em>, not average cost, not first fill).
              If one or more qualify, buy the one furthest below its {AVG_DOWN_TRIGGER_PCT}% trigger
              (with the lowest-RSI tie-break — see open question §7.2).
            </li>
            <li>
              <strong>If neither condition is met: no trade today.</strong> This is a valid, expected
              outcome — not an error state.
            </li>
            <li>
              If the day's target order fails at the exchange (e.g., upper circuit), fall through
              to the next eligible candidate on the same day's list rather than retrying blindly.
            </li>
          </ol>
          <div className="rounded-md bg-muted/50 p-3 text-xs">
            <p className="font-semibold mb-1">Worked example</p>
            <p>
              Today's rank-5: <code>PSUBNKBEES</code> (#1), <code>FMCG</code> (#2),
              <code> AUTOBEES</code> (#3), <code>REALTYBEES</code> (#4), <code>MEDIABEES</code> (#5).
            </p>
            <p className="mt-1">
              You currently hold: <code>FMCG</code>, <code>AUTOBEES</code>, <code>REALTYBEES</code>.
              Walking down the list — <code>PSUBNKBEES</code> is not held → today's buy is
              <strong> PSUBNKBEES</strong>. Stop.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'm3',
      title: '3. The sell rule and the 4.57% target',
      duration: '3 min',
      content: (
        <div className="space-y-3 text-sm leading-relaxed">
          <p>At most <strong>one sell per trading day</strong>:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Per-position target: <strong>+{SELL_TARGET_PCT}%</strong> from that position's
              cost basis.
            </li>
            <li>
              Each day, of all positions currently at or above +{SELL_TARGET_PCT}%, sell only the
              single best performer (by % gain). Do <em>not</em> mass-exit the book.
            </li>
            <li>
              Positions below target are left alone, including ones that previously touched target
              and pulled back — no forced exit, no urgency; &ldquo;let the rest ripen.&rdquo;
            </li>
          </ol>
          <div className="rounded-md bg-muted/50 p-3 text-xs">
            <p className="font-semibold mb-1">Why {SELL_TARGET_PCT}% — the &ldquo;middle path&rdquo;</p>
            <p>
              The source material frames {SELL_TARGET_PCT}% as a deliberate middle path between
              3.14% and 6.28%. The reasoning matters as much as the number:
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                <strong>Too low</strong> (e.g., 3.14%): you exit too quickly, missing the larger
                rotations that the strategy depends on for compounding.
              </li>
              <li>
                <strong>Too high</strong> (e.g., 6.28%): positions rarely reach target, capital gets
                tied up, and the rotation cadence slows.
              </li>
              <li>
                <strong>{SELL_TARGET_PCT}%</strong>: a small enough target to fire often (keeping
                capital rotating), high enough to clear frictions (brokerage, STT, slippage) and
                leave a real return.
              </li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              This is what stops you from &ldquo;optimizing&rdquo; the target on your own without
              understanding the trade-off.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'm4',
      title: '4. Why paper trading is the default — and what graduation checks',
      duration: '3 min',
      content: (
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            The strategy is mechanical — the rules are simple enough to write down in a few
            paragraphs. The value the app adds isn't the rules themselves; it's
            <strong> reliable daily execution, an audit trail, and a hard safety gate</strong> so
            nobody's real money touches the market until the rules have proven themselves on
            paper.
          </p>
          <p>
            Paper mode runs the identical daily cycle (fetch prices → compute RSI → rank → evaluate
            rules → generate signal) against a <strong>simulated portfolio and simulated fills</strong>
            at real market prices. Same trail log, same UI, same daily signal card as live — the
            only difference is the execution adapter.
          </p>
          <p>
            <strong>Graduation isn't a threshold to game.</strong> The app tracks these signals
            and presents them — but the decision to go live stays with you:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Minimum 30 trading days of paper history</li>
            <li>Minimum 5 completed round-trips (buy → sell)</li>
            <li>Drawdown within your own risk-tolerance number</li>
            <li>This explainer completed</li>
            <li>Explicit risk acknowledgement signed</li>
          </ul>
          <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-3">
            None of these is framed as &ldquo;you're ready&rdquo; — only as &ldquo;here's
            what's happened so far.&rdquo;
          </p>
        </div>
      ),
    },
  ];

  const glossaryTerms = [
    { term: 'RSI (Relative Strength Index)', def: 'A momentum oscillator measuring the magnitude of recent price changes. Range 0–100. Here: 14-day Wilder\'s smoothing variant.' },
    { term: 'Cost basis', def: 'The average price you paid for a position. Used as the reference for the +4.57% sell target.' },
    { term: 'Last purchase price', def: 'The price of the most recent buy fill for a position. Used as the reference for the -3% averaging-down check — NOT the same as cost basis.' },
    { term: 'Round trip', def: 'A complete buy → sell cycle on one ETF. The graduation flow counts these to confirm the sell rule has actually fired.' },
    { term: 'Drawdown', def: 'The decline from a portfolio\'s historical peak value to its current value, expressed as a percentage. A risk-tolerance signal, not a strategy parameter.' },
    { term: 'Average down', def: 'Buying more of a position you already hold, when its current price is significantly below your last fill — adding at a lower price point.' },
    { term: 'Wilder\'s smoothing', def: 'An EMA-based method for averaging gains and losses in RSI calculation. Differs slightly from simple-moving-average RSI — the source specifies this variant.' },
    { term: 'Upper circuit', def: 'A daily exchange-imposed price ceiling. If an ETF hits its upper circuit, buy orders can\'t fill — the strategy falls through to the next eligible candidate.' },
    { term: 'Trail log', def: 'Append-only log of every stage of the daily cycle (auth, fetch prices, compute RSI, rank, evaluate rules, execute, log). One row per stage — failures are traceable.' },
    { term: 'Paper mode', def: 'The default un-skippable starting state. Simulated fills at real prices with modeled frictions (brokerage, STT, slippage). Identical rules engine to live.' },
    { term: 'Execution adapter', def: 'The mode-specific layer that handles fills. Paper adapter simulates; live adapter places real Shoonya orders. Both implement the same interface.' },
    { term: 'Rank-5 buy zone', def: 'The 5 ETFs in the universe with the lowest 14-day RSI. The buy rule walks down this list to find today\'s target.' },
  ];

  const certByType = (type: string) => certificates.find(c => c.type === type);
  const allModulesCompleted = instance.explainerCompleted;

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Always-available explainer</p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Learn the strategy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plain-language walk-through of the rules engine, with worked examples. This isn't a
          simplified teaching version — it describes the exact same rule engine the app runs.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="modules">
            <BookOpen className="h-3.5 w-3.5 mr-1" /> Modules
          </TabsTrigger>
          <TabsTrigger value="glossary">
            <Lightbulb className="h-3.5 w-3.5 mr-1" /> Glossary
          </TabsTrigger>
          <TabsTrigger value="certs">
            <Award className="h-3.5 w-3.5 mr-1" /> Awards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-3 mt-3">
          {modules.map((m) => (
            <Card key={m.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{m.title}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">{m.duration}</Badge>
                </div>
              </CardHeader>
              <CardContent>{m.content}</CardContent>
            </Card>
          ))}

          <Card className={cn('border-2', allModulesCompleted ? 'border-primary' : 'border-dashed')}>
            <CardContent className="pt-5 pb-5 text-center">
              {allModulesCompleted ? (
                <>
                  <CheckCircle2 className="h-8 w-8 mx-auto text-primary" />
                  <p className="font-semibold mt-2">Explainer completed</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This satisfies the explainer criterion in your graduation checklist.
                  </p>
                </>
              ) : (
                <>
                  <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="font-semibold mt-2">Mark all modules as read</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    This completes the explainer prerequisite for graduation. You can still paper
                    trade from day one — this just unlocks the readiness signal.
                  </p>
                  <Button onClick={() => markExplainerCompleted(instance.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> I've read all four modules
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Compliance note */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-2">
                <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  This explainer operationalizes a public strategy description (a popular honest
                  YouTuber's &ldquo;ETF Dukaan — Updated Method 2026&rdquo;). It does not
                  constitute investment advice. Users execute their own rules with their own
                  capital and their own judgment.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="glossary" className="mt-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Glossary</CardTitle>
              <CardDescription>Terms used elsewhere in the app — for quick reference.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {glossaryTerms.map((g) => (
                  <AccordionItem key={g.term} value={g.term}>
                    <AccordionTrigger className="text-sm">{g.term}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {g.def}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certs" className="space-y-3 mt-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Certificates
              </CardTitle>
              <CardDescription>
                Engagement &amp; process milestones only — never framed around returns, performance,
                or profit. Non-transferable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <CertRow
                title="Learn the Strategy — Completed"
                description="Finished all four explainer modules"
                cert={certByType('learn_completed')}
              />
              <CertRow
                title="30-Day Paper Milestone"
                description="Reached 30 trading days of paper history"
                cert={certByType('day_30_milestone')}
              />
              <CertRow
                title="First Round Trip"
                description="Completed your first buy → sell cycle"
                cert={certByType('first_round_trip')}
              />
              <CertRow
                title="Graduated to Live"
                description="Explicitly graduated from paper to live trading"
                cert={certByType('graduated_to_live')}
              />
            </CardContent>
          </Card>
          <p className="text-[11px] text-muted-foreground text-center px-4">
            Certificates are purely motivational. A certificate never reads like a performance claim
            (e.g., nothing resembling &ldquo;you earned X% — certified!&rdquo;).
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CertRow({
  title, description, cert,
}: {
  title: string;
  description: string;
  cert?: { id: string; issuedAt: string };
}) {
  return (
    <div className={cn(
      'flex items-center justify-between rounded-md p-3',
      cert ? 'bg-primary/5 border border-primary/30' : 'bg-muted/30 border border-dashed border-border'
    )}>
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
        {cert && (
          <div className="text-[10px] text-muted-foreground mt-1">
            Issued {new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        )}
      </div>
      {cert ? (
        <Badge variant="default" className="text-[10px]">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Earned
        </Badge>
      ) : (
        <Lock className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}
