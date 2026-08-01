import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getSessionUserId } from '@/lib/session';
import { getOwnedInstance } from '@/lib/server/ownership';

/**
 * Creates a Razorpay order for the one-time graduation fee (Rs. 299).
 *
 * Flow (per Razorpay's standard integration):
 *   1. Server creates an order via Razorpay's orders API → returns order_id
 *   2. Client loads Razorpay Checkout with the order_id, amount, and key
 *   3. User pays in the Checkout modal
 *   4. Razorpay returns payment_id + razorpay_signature
 *   5. Client posts those to /api/razorpay/verify for server-side signature check
 *
 * If RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set in env, this route falls
 * back to "demo mode" — returns a mock order_id so the client can run a simulated
 * checkout. This keeps the app runnable in sandboxes without real Razorpay creds.
 */

const GRADUATION_FEE_PAISE = 299 * 100; // Rs. 299 in paise

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const instanceId = body?.instanceId as string | undefined;
    const userEmail = body?.email as string | undefined;
    const userName = body?.name as string | undefined;

    if (!instanceId) {
      return NextResponse.json(
        { error: 'instanceId is required' },
        { status: 400 }
      );
    }

    const instance = await getOwnedInstance(instanceId, userId);
    if (!instance) {
      return NextResponse.json({ error: 'Strategy instance not found' }, { status: 404 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Demo mode: no real Razorpay keys configured
    if (!keyId || !keySecret) {
      const mockOrderId = `order_demo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      return NextResponse.json({
        demo: true,
        orderId: mockOrderId,
        amount: GRADUATION_FEE_PAISE,
        currency: 'INR',
        keyId: 'rzp_test_DEMOKEY0001', // Razorpay's public test key placeholder
        message:
          'Running in demo mode — RAZORPAY_KEY_ID/SECRET not set. Payment will be simulated.',
      });
    }

    // Production mode: create a real Razorpay order
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: GRADUATION_FEE_PAISE,
      currency: 'INR',
      receipt: `grad_${instanceId.slice(-12)}_${Date.now()}`,
      notes: {
        instanceId,
        purpose: 'My ETF Shop graduation fee',
        ...(userEmail ? { email: userEmail } : {}),
        ...(userName ? { name: userName } : {}),
      },
    });

    return NextResponse.json({
      demo: false,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (err) {
    console.error('[razorpay/create-order] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create order', detail: message },
      { status: 500 }
    );
  }
}
