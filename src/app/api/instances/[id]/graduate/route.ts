import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';
import { getOwnedInstance } from '@/lib/server/ownership';
import { serializeInstance, serializeCertificate } from '@/lib/server/serialize';

const GRAD_MIN_DAYS = 30;
const GRAD_MIN_ROUND_TRIPS = 5;

// Server-side gate — the client's readiness UI is advisory only. Graduating to live
// mode requires every signal to actually be true in the DB, including a verified payment.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const instance = await db.strategyInstance.findUnique({
    where: { id },
    include: { graduation: true },
  });
  if (!instance || instance.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (instance.mode !== 'paper') {
    return NextResponse.json({ error: 'Instance is not in paper mode' }, { status: 400 });
  }

  const g = instance.graduation;
  const dayGoalDone = (g?.daysElapsed ?? 0) >= GRAD_MIN_DAYS;
  const rtGoalDone = (g?.roundTripsCompleted ?? 0) >= GRAD_MIN_ROUND_TRIPS;
  const drawdownWithinLimit =
    g?.maxDrawdownTolerated === null ||
    g?.maxDrawdownTolerated === undefined ||
    (g?.currentDrawdown ?? 0) <= g.maxDrawdownTolerated;
  const ready =
    dayGoalDone &&
    rtGoalDone &&
    drawdownWithinLimit &&
    !!instance.explainerCompleted &&
    !!instance.acknowledgedRisk &&
    !!instance.brokerConnected &&
    !!instance.paymentCompleted;

  if (!ready) {
    return NextResponse.json({ error: 'Graduation criteria not met' }, { status: 400 });
  }

  const updated = await db.strategyInstance.update({
    where: { id },
    data: { mode: 'live', status: 'graduated' },
  });

  const alreadyIssued = await db.certificate.findFirst({
    where: { instanceId: id, type: 'graduated_to_live' },
  });
  const certificate = alreadyIssued
    ? null
    : await db.certificate.create({
        data: { instanceId: id, type: 'graduated_to_live', title: 'Graduated to Live Trading' },
      });

  return NextResponse.json({
    instance: serializeInstance(updated),
    certificate: certificate ? serializeCertificate(certificate) : null,
  });
}
