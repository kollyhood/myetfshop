import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';
import { getOwnedInstance } from '@/lib/server/ownership';
import {
  serializeInstance, serializePosition, serializeTrade, serializeTrail,
  serializeGraduation, serializeStreak, serializeCertificate,
} from '@/lib/server/serialize';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const instance = await db.strategyInstance.findUnique({
    where: { id },
    include: {
      positions: true,
      trades: { orderBy: { timestamp: 'desc' } },
      trail: { orderBy: { timestamp: 'desc' }, take: 200 },
      graduation: true,
      streak: true,
      certificates: true,
    },
  });
  if (!instance || instance.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    instance: serializeInstance(instance),
    positions: instance.positions.map(serializePosition),
    trades: instance.trades.map(serializeTrade),
    trail: instance.trail.map(serializeTrail),
    graduation: instance.graduation ? serializeGraduation(instance.graduation) : null,
    streak: instance.streak ? serializeStreak(instance.streak) : null,
    certificates: instance.certificates.map(serializeCertificate),
  });
}

// Fields a client is allowed to update directly. Money/trade/payment state is never
// patchable here — it only changes through daily-cycle, acknowledge-risk, graduate,
// and the Razorpay verify routes.
const PATCHABLE_FIELDS = ['name', 'status', 'brokerConnected'] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const owned = await getOwnedInstance(id, userId);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  for (const field of PATCHABLE_FIELDS) {
    if (field in body) patch[field] = body[field];
  }
  if (patch.status && !['active', 'paused'].includes(patch.status as string)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updated = await db.strategyInstance.update({ where: { id }, data: patch });
  return NextResponse.json({ instance: serializeInstance(updated) });
}
