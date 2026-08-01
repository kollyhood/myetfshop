import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';
import { getOwnedInstance } from '@/lib/server/ownership';
import { serializeInstance } from '@/lib/server/serialize';

/**
 * Verifies the Razorpay payment signature server-side, then marks the strategy
 * instance's graduation fee as paid. This is the only place paymentCompleted can be
 * set — the client can request it, but never set it directly (see instances/[id] PATCH).
 *
 * Razorpay signs every successful payment with HMAC-SHA256 over:
 *   `${razorpay_order_id}|${razorpay_payment_id}`
 * using your key_secret. The client posts the signature back to us; we recompute
 * the HMAC and compare. If they match, the payment is genuine.
 *
 * In demo mode (no RAZORPAY_KEY_SECRET), we accept any signature so the
 * simulated checkout can complete end-to-end.
 */

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { instanceId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body as {
      instanceId?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    if (!instanceId || !razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json(
        { error: 'instanceId, razorpay_order_id and razorpay_payment_id are required' },
        { status: 400 }
      );
    }

    const instance = await getOwnedInstance(instanceId, userId);
    if (!instance) {
      return NextResponse.json({ error: 'Strategy instance not found' }, { status: 404 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    let demo = false;

    if (!keySecret) {
      // Demo mode: accept any signature so the simulated checkout can complete end-to-end.
      demo = true;
    } else {
      if (!razorpay_signature) {
        return NextResponse.json(
          { error: 'razorpay_signature is required for verification' },
          { status: 400 }
        );
      }
      const expected = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      if (expected !== razorpay_signature) {
        return NextResponse.json(
          { verified: false, error: 'Signature mismatch — payment could not be verified.' },
          { status: 400 }
        );
      }
    }

    const updated = await db.strategyInstance.update({
      where: { id: instanceId },
      data: {
        paymentCompleted: true,
        paymentId: razorpay_payment_id,
        paymentOrderId: razorpay_order_id,
        paidAt: new Date(),
      },
    });

    return NextResponse.json({
      verified: true,
      demo,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      instance: serializeInstance(updated),
    });
  } catch (err) {
    console.error('[razorpay/verify] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Verification failed', detail: message },
      { status: 500 }
    );
  }
}
