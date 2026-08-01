'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldCheck, CheckCircle2, AlertCircle, Lock, Sparkles } from 'lucide-react';

/**
 * Razorpay payment modal for the one-time graduation fee (Rs. 299).
 *
 * Flow:
 *   1. User taps "Pay Rs. 299 & go live" → modal opens
 *   2. Modal calls /api/razorpay/create-order to get an order_id
 *   3. Modal loads Razorpay Checkout script (https://checkout.razorpay.com/v1/checkout.js)
 *   4. Opens Razorpay's hosted checkout with order_id, amount, key
 *   5. User completes payment in Razorpay's modal
 *   6. Razorpay returns payment_id + signature → posted to /api/razorpay/verify
 *   7. On verified → store marks paymentCompleted, onPaid callback fires
 *
 * If Razorpay keys aren't configured, the API returns demo:true and we run a
 * simulated success flow (brief delay + fake payment_id) so the UX is testable.
 */

const RAZORPAY_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
const GRADUATION_FEE_RUPEES = 299;

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string;
  instanceName: string;
  userEmail?: string;
  userName?: string;
  onPaid: (paymentId: string, orderId: string) => void;
}

type Phase =
  | 'idle'
  | 'creating-order'
  | 'opening-checkout'
  | 'verifying'
  | 'success'
  | 'error';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number; // paise
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature?: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  on?: (event: string, handler: () => void) => void;
}

export function PaymentModal({
  open, onOpenChange, instanceId, instanceName, userEmail, userName, onPaid,
}: PaymentModalProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [demoMode, setDemoMode] = useState(false);
  const [orderId, setOrderId] = useState<string>('');
  const [keyId, setKeyId] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');

  // Pre-load Razorpay checkout script when modal first opens
  useEffect(() => {
    if (!open) return;
    if (window.Razorpay) return;
    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_URL;
    script.async = true;
    document.body.appendChild(script);
  }, [open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setPhase('idle');
        setErrorMsg('');
        setOrderId('');
        setPaymentId('');
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const startPayment = async () => {
    setPhase('creating-order');
    setErrorMsg('');
    try {
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, email: userEmail, name: userName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Order creation failed (${res.status})`);
      }
      const data = await res.json();
      setDemoMode(!!data.demo);
      setOrderId(data.orderId);
      setKeyId(data.keyId);

      if (data.demo) {
        // Demo mode: simulate a successful payment after a short delay
        setPhase('opening-checkout');
        setTimeout(() => {
          const fakePaymentId = `pay_demo_${Date.now()}`;
          setPaymentId(fakePaymentId);
          setPhase('verifying');
          // Skip real verification in demo mode — call verify endpoint anyway for symmetry
          setTimeout(async () => {
            try {
              const vRes = await fetch('/api/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  instanceId,
                  razorpay_order_id: data.orderId,
                  razorpay_payment_id: fakePaymentId,
                  razorpay_signature: 'demo_signature',
                }),
              });
              const vData = await vRes.json();
              if (!vData.verified) throw new Error('Verification failed');
              setPhase('success');
              setTimeout(() => {
                onPaid(fakePaymentId, data.orderId);
              }, 900);
            } catch (e) {
              setErrorMsg(e instanceof Error ? e.message : 'Verification failed');
              setPhase('error');
            }
          }, 600);
        }, 1200);
        return;
      }

      // Real Razorpay checkout
      if (!window.Razorpay) {
        throw new Error('Razorpay checkout script failed to load. Check your network.');
      }
      setPhase('opening-checkout');
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: 'My ETF Shop',
        description: 'One-time graduation fee — go live',
        prefill: {
          name: userName,
          email: userEmail,
        },
        notes: {
          instanceId,
          purpose: 'Graduation fee',
        },
        theme: { color: '#10b981' },
        handler: async (response) => {
          setPaymentId(response.razorpay_payment_id);
          setPhase('verifying');
          try {
            const vRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                instanceId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const vData = await vRes.json();
            if (!vData.verified) {
              throw new Error(vData.error ?? 'Signature verification failed');
            }
            setPhase('success');
            setTimeout(() => {
              onPaid(response.razorpay_payment_id, response.razorpay_order_id);
            }, 900);
          } catch (e) {
            setErrorMsg(e instanceof Error ? e.message : 'Verification failed');
            setPhase('error');
          }
        },
        modal: {
          ondismiss: () => {
            // User closed the Razorpay modal without paying
            setPhase('idle');
          },
        },
      });
      rzp.open();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
      setPhase('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Go Live — Graduation Fee
          </DialogTitle>
          <DialogDescription>
            One-time payment of <span className="font-semibold text-foreground">Rs. {GRADUATION_FEE_RUPEES}</span> to
            unlock live trading for <span className="font-semibold text-foreground">{instanceName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* What you get */}
          <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Live order execution via Shoonya</div>
                <div className="text-xs text-muted-foreground">
                  Real orders at real exchange prices, with tap-to-confirm safety.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Run paper &amp; live side by side</div>
                <div className="text-xs text-muted-foreground">
                  Keep testing rule changes on paper without touching real capital.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Full audit trail continues</div>
                <div className="text-xs text-muted-foreground">
                  Every live decision logged with the same per-stage trail as paper.
                </div>
              </div>
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Secured by Razorpay. We never see or store your card/UPI details.
              Payment is verified server-side via HMAC signature.
            </span>
          </div>

          {/* Demo mode banner */}
          {demoMode && phase !== 'idle' && phase !== 'error' && (
            <Alert className="bg-amber-500/10 border-amber-500/40">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-amber-600 text-sm">Demo mode</AlertTitle>
              <AlertDescription className="text-xs">
                Razorpay keys are not configured in this environment. Your payment will be
                simulated — no real money will be charged. Set <code className="px-1 py-0.5 rounded bg-muted">RAZORPAY_KEY_ID</code> and{' '}
                <code className="px-1 py-0.5 rounded bg-muted">RAZORPAY_KEY_SECRET</code> in .env to accept real payments.
              </AlertDescription>
            </Alert>
          )}

          {/* Phase: creating order */}
          {phase === 'creating-order' && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating payment order...
            </div>
          )}

          {/* Phase: opening checkout */}
          {phase === 'opening-checkout' && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {demoMode ? 'Simulating payment...' : 'Opening Razorpay checkout...'}
            </div>
          )}

          {/* Phase: verifying */}
          {phase === 'verifying' && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying payment signature...
            </div>
          )}

          {/* Phase: success */}
          {phase === 'success' && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="font-semibold">Payment successful</div>
              <div className="text-xs text-muted-foreground mt-1 font-mono">
                {paymentId}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Unlocking live mode...
              </div>
            </div>
          )}

          {/* Phase: error */}
          {phase === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Payment failed</AlertTitle>
              <AlertDescription className="text-sm">{errorMsg}</AlertDescription>
            </Alert>
          )}

          {/* Order id (for audit/debug) */}
          {orderId && phase !== 'error' && (
            <div className="text-[10px] text-muted-foreground font-mono text-center">
              Order: {orderId}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {phase === 'idle' || phase === 'error' ? (
            <>
              <Button
                onClick={startPayment}
                className="w-full"
                size="lg"
              >
                Pay Rs. {GRADUATION_FEE_RUPEES} &amp; go live
              </Button>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Not now
              </Button>
            </>
          ) : (
            <div className="text-[11px] text-muted-foreground text-center">
              {phase === 'success'
                ? 'You can close this dialog — your strategy is being upgraded.'
                : 'Please complete the payment in the checkout window.'}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
