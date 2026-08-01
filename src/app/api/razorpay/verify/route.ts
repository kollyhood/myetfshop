import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Verifies the Razorpay payment signature server-side.
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
    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    if (!razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json(
        { error: 'razorpay_order_id and razorpay_payment_id are required' },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Demo mode: accept any signature
    if (!keySecret) {
      return NextResponse.json({
        verified: true,
        demo: true,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        message: 'Demo mode — signature not checked (RAZORPAY_KEY_SECRET not set).',
      });
    }

    // Production mode: verify HMAC-SHA256 signature
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

    const verified = expected === razorpay_signature;

    if (!verified) {
      return NextResponse.json(
        { verified: false, error: 'Signature mismatch — payment could not be verified.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      verified: true,
      demo: false,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
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
