'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Shield, AlertTriangle, Flame, Trophy, Settings as SettingsIcon, User, Database, Trash2,
  CheckCircle2, Link as LinkIcon, Unlink, Zap, Pause, Play, GraduationCap, CreditCard, Lock,
  LogOut,
} from 'lucide-react';
import {
  useAppStore, useActiveInstance, useActiveGraduation, useActiveStreak, useActiveCertificates,
} from '@/lib/store';
import { StrategySetupFlow } from '@/components/strategy/setup-flow';
import { PaymentModal } from '@/components/settings/payment-modal';

const GRAD_MIN_DAYS = 30;
const GRAD_MIN_ROUND_TRIPS = 5;

export function Settings() {
  const { data: session } = useSession();
  const instance = useActiveInstance();
  const graduation = useActiveGraduation();
  const streak = useActiveStreak();
  const certificates = useActiveCertificates();
  const instances = useAppStore((s) => s.instances);
  const setActiveInstance = useAppStore((s) => s.setActiveInstance);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const acknowledgeRisk = useAppStore((s) => s.acknowledgeRisk);
  const graduateInstance = useAppStore((s) => s.graduateInstance);
  const markPaymentCompletedAction = useAppStore((s) => s.markPaymentCompleted);
  const pauseInstance = useAppStore((s) => s.pauseInstance);
  const resumeInstance = useAppStore((s) => s.resumeInstance);
  const updateInstance = useAppStore((s) => s.updateInstance);
  const resetAll = useAppStore((s) => s.resetAll);
  const [confirmText, setConfirmText] = useState('');
  const [brokerForm, setBrokerForm] = useState({
    userid: '', password: '', vendorCode: '', apiKey: '', imee: '',
  });
  const [paymentOpen, setPaymentOpen] = useState(false);

  if (!instance) return <StrategySetupFlow />;

  // Graduation readiness
  const dayGoalDone = (graduation?.daysElapsed ?? 0) >= GRAD_MIN_DAYS;
  const rtGoalDone = (graduation?.roundTripsCompleted ?? 0) >= GRAD_MIN_ROUND_TRIPS;
  const drawdownWithinLimit =
    graduation?.maxDrawdownTolerated === null ||
    graduation?.maxDrawdownTolerated === undefined ||
    (graduation?.currentDrawdown ?? 0) <= graduation.maxDrawdownTolerated;
  const explainerDone = !!instance.explainerCompleted;
  const acknowledged = !!instance.acknowledgedRisk;
  const allGraduationMet = dayGoalDone && rtGoalDone && drawdownWithinLimit && explainerDone && acknowledged;
  const readyToGraduate = allGraduationMet && instance.mode === 'paper' && instance.brokerConnected;
  const paid = !!instance.paymentCompleted;
  const canGraduate = readyToGraduate && paid;

  const handleAcknowledge = () => {
    if (confirmText.trim().toUpperCase() === 'I UNDERSTAND') {
      acknowledgeRisk(instance.id);
      setConfirmText('');
    }
  };

  const handleConnectBroker = () => {
    // In production, this would call Shoonya's login endpoint with the multi-factor auth flow
    // (userid, password, TOTP, vendor code, API key, IMEI) — §4.3.
    // Here we just mark the broker as connected (mock).
    updateInstance(instance.id, { brokerConnected: true });
  };

  const handleGraduate = () => {
    graduateInstance(instance.id);
    setActiveTab('dashboard');
  };

  const handlePaid = (paymentId: string, orderId: string) => {
    markPaymentCompletedAction(instance.id, paymentId, orderId);
    setPaymentOpen(false);
    // Auto-graduate immediately after successful payment — user has already
    // confirmed intent by paying; the actual mode switch happens here.
    setTimeout(() => {
      graduateInstance(instance.id);
      setActiveTab('dashboard');
    }, 400);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">More</p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Settings</h1>
      </div>

      {/* Account */}
      <Card>
        <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Logged in as</div>
            <div className="text-sm font-medium truncate">{session?.user?.email}</div>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>
            <LogOut className="h-3.5 w-3.5 mr-1" /> Log out
          </Button>
        </CardContent>
      </Card>

      {/* Strategy instances */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Your strategies
          </CardTitle>
          <CardDescription>You can run paper and live instances side by side.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {instances.length === 0 && (
            <p className="text-sm text-muted-foreground">No strategies yet.</p>
          )}
          {instances.map((inst) => {
            const isActive = inst.id === instance.id;
            return (
              <button
                key={inst.id}
                onClick={() => setActiveInstance(inst.id)}
                className={`w-full text-left rounded-md border p-3 transition-colors ${
                  isActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm truncate">{inst.name}</div>
                  <div className="flex items-center gap-1">
                    <Badge variant={inst.mode === 'live' ? 'destructive' : 'secondary'} className="text-[9px]">
                      {inst.mode}
                    </Badge>
                    {inst.status === 'paused' && (
                      <Badge variant="outline" className="text-[9px]">paused</Badge>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  ₹{inst.capitalAllocated.toLocaleString('en-IN')} · {inst.numParts} parts
                </div>
              </button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => setActiveInstance(null)}
          >
            + Create new strategy
          </Button>
        </CardContent>
      </Card>

      {/* Active strategy config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            {instance.name}
          </CardTitle>
          <CardDescription>Configuration for the active strategy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Capital allocated</Label>
              <div className="font-mono">₹{instance.capitalAllocated.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Number of parts</Label>
              <div className="font-mono">{instance.numParts}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Per-part size</Label>
              <div className="font-mono">₹{(instance.capitalAllocated / instance.numParts).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Created</Label>
              <div className="text-xs">{new Date(instance.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <Label>Auto-execute (paper mode)</Label>
              <p className="text-xs text-muted-foreground">Paper signals auto-fire; live requires tap-to-confirm.</p>
            </div>
            <Switch
              checked={instance.mode === 'paper'}
              disabled
            />
          </div>
          {instance.status === 'active' ? (
            <Button variant="outline" size="sm" className="w-full" onClick={() => pauseInstance(instance.id)}>
              <Pause className="h-3.5 w-3.5 mr-1" /> Pause strategy
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="w-full" onClick={() => resumeInstance(instance.id)}>
              <Play className="h-3.5 w-3.5 mr-1" /> Resume strategy
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Graduation flow */}
      {instance.mode === 'paper' && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Graduation flow
            </CardTitle>
            <CardDescription>
              Going live requires broker connection, re-confirmation of position sizing, and a
              restated risk disclosure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Readiness summary */}
            <div className="space-y-2 text-sm">
              <ReadinessRow done={dayGoalDone} label={`30 trading days (${graduation?.daysElapsed ?? 0}/${GRAD_MIN_DAYS})`} />
              <ReadinessRow done={rtGoalDone} label={`5 round trips (${graduation?.roundTripsCompleted ?? 0}/${GRAD_MIN_ROUND_TRIPS})`} />
              <ReadinessRow done={drawdownWithinLimit} label={`Drawdown within limit (${(graduation?.currentDrawdown ?? 0).toFixed(1)}% / ${graduation?.maxDrawdownTolerated ?? 'no limit'}%)`} />
              <ReadinessRow done={explainerDone} label="Learn explainer completed" />
              <ReadinessRow done={acknowledged} label="Risk acknowledgement signed" />
              <ReadinessRow done={instance.brokerConnected} label="Broker account connected (Shoonya)" />
              <ReadinessRow done={paid} label={paid ? `Graduation fee paid (Rs. 299)` : 'Graduation fee pending (Rs. 299 via Razorpay)'} />
            </div>

            {/* Broker connection */}
            {!instance.brokerConnected ? (
              <Accordion type="single" collapsible>
                <AccordionItem value="broker">
                  <AccordionTrigger className="text-sm">Connect Shoonya broker account</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Required only for live mode. Shoonya (Finvasia, Noren OMS) uses multi-factor
                      auth: userid, password, TOTP, vendor code, API key, IMEI. Credentials are
                      stored as broker secrets — never in the trail log or plaintext config.
                    </p>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">User ID</Label>
                        <Input value={brokerForm.userid} onChange={(e) => setBrokerForm({ ...brokerForm, userid: e.target.value })} placeholder="Shoonya user ID" />
                      </div>
                      <div>
                        <Label className="text-xs">Vendor code</Label>
                        <Input value={brokerForm.vendorCode} onChange={(e) => setBrokerForm({ ...brokerForm, vendorCode: e.target.value })} placeholder="Vendor code" />
                      </div>
                      <div>
                        <Label className="text-xs">API key</Label>
                        <Input value={brokerForm.apiKey} onChange={(e) => setBrokerForm({ ...brokerForm, apiKey: e.target.value })} placeholder="API key" />
                      </div>
                      <div>
                        <Label className="text-xs">IMEI / device ID</Label>
                        <Input value={brokerForm.imee} onChange={(e) => setBrokerForm({ ...brokerForm, imee: e.target.value })} placeholder="Device identifier" />
                      </div>
                    </div>
                    <Button size="sm" onClick={handleConnectBroker} className="w-full">
                      <LinkIcon className="h-3.5 w-3.5 mr-1" /> Connect (mock)
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">
                      Demo only — no real Shoonya call is made in this build.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              <div className="rounded-md bg-primary/5 border border-primary/30 p-3 text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Shoonya broker connected.</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-xs h-7"
                  onClick={() => updateInstance(instance.id, { brokerConnected: false })}
                >
                  <Unlink className="h-3 w-3 mr-1" /> Disconnect
                </Button>
              </div>
            )}

            {/* Risk acknowledgement */}
            {!acknowledged ? (
              <Alert className="bg-destructive/5 border-destructive/30">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertTitle className="text-destructive">Risk acknowledgement required</AlertTitle>
                <AlertDescription className="space-y-3 mt-2">
                  <p className="text-sm">
                    My ETF Shop is not a SEBI-registered investment adviser, research analyst, or
                    portfolio manager. This is educational, rules-based tooling — not investment
                    advice or a recommendation. Losses are possible.
                    Type <code className="bg-muted px-1 py-0.5 rounded">I UNDERSTAND</code> below to
                    sign the acknowledgement.
                  </p>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type I UNDERSTAND"
                  />
                  <Button size="sm" onClick={handleAcknowledge} disabled={confirmText.trim().toUpperCase() !== 'I UNDERSTAND'}>
                    Sign acknowledgement
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="rounded-md bg-primary/5 border border-primary/30 p-3 text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>Risk acknowledgement signed.</span>
              </div>
            )}

            {/* Payment + Graduate */}
            {!readyToGraduate ? (
              <>
                <Button
                  size="lg"
                  className="w-full"
                  disabled
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Not ready to graduate yet
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  All readiness signals must be met, plus broker connection and risk acknowledgement,
                  before the Rs. 299 graduation fee unlocks live mode.
                </p>
              </>
            ) : !paid ? (
              <>
                <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <span className="font-semibold">One-time graduation fee</span>
                    <Badge variant="secondary" className="ml-auto">Rs. 299</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All graduation criteria met. Pay a one-time fee of Rs. 299 via Razorpay to unlock
                    live trading for this strategy. The fee is per-strategy — paper trading stays free forever.
                  </p>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => setPaymentOpen(true)}
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Pay Rs. 299 &amp; go live
                  </Button>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Secured by Razorpay · UPI, cards, netbanking
                  </div>
                </div>
                <Alert className="bg-amber-500/10 border-amber-500/40">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-sm">
                    Live mode does <strong>not</strong> silently replace paper mode. You can run both
                    side by side. Switching back from live to paper (pausing real trading) is always
                    possible without losing history.
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <>
                <div className="rounded-md bg-primary/5 border border-primary/30 p-3 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <div>
                    <span>Payment received.</span>
                    {instance.paymentId && (
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {instance.paymentId} · paid {instance.paidAt ? new Date(instance.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleGraduate}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Graduate to live trading
                </Button>
              </>
            )}

            <PaymentModal
              open={paymentOpen}
              onOpenChange={setPaymentOpen}
              instanceId={instance.id}
              instanceName={instance.name}
              onPaid={handlePaid}
            />
          </CardContent>
        </Card>
      )}

      {/* Streak details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-500" />
            Streak
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current streak</span>
            <span className="font-mono font-bold">{streak?.currentStreak ?? 0} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Longest streak</span>
            <span className="font-mono">{streak?.longestStreak ?? 0} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last reviewed</span>
            <span className="text-xs">{streak?.lastReviewedDate ?? 'Never'}</span>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            Defined as consecutive trading days you opened the app and reviewed that day's signal —
            <strong> not</strong> consecutive days a trade fired. A no-trade day counts identically
            toward the streak as a day with a buy or sell.
          </p>
        </CardContent>
      </Card>

      {/* Certificates earned */}
      {certificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Certificates earned ({certificates.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {certificates.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md p-2 bg-muted/30">
                <div>
                  <div className="text-sm font-medium">{c.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(c.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Compliance + danger zone */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-2">
            <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              My ETF Shop is not a SEBI-registered investment adviser, research analyst, or
              portfolio manager. This is educational, rules-based tooling — not investment advice
              or a recommendation. Users execute their own rules with their own capital and their
              own judgment.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Reset all data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset everything?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all strategy instances, positions, trades, trail log, graduation
                  snapshots, streaks, and certificates from this device. Cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Reset all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center">
        My ETF Shop · v1 MVP · Built per §6 spec scope
      </p>
    </div>
  );
}

function ReadinessRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
      )}
      <span className={done ? '' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}
