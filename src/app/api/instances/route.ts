import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';
import {
  serializeInstance, serializeGraduation, serializeStreak, serializeCertificate,
} from '@/lib/server/serialize';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const instances = await db.strategyInstance.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { graduation: true, streak: true, certificates: true },
  });

  return NextResponse.json(
    instances.map((i) => ({
      instance: serializeInstance(i),
      graduation: i.graduation ? serializeGraduation(i.graduation) : null,
      streak: i.streak ? serializeStreak(i.streak) : null,
      certificates: i.certificates.map(serializeCertificate),
    }))
  );
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = (body?.name as string | undefined)?.trim() || 'My ETF Strategy';
  const capitalAllocated = Number(body?.capitalAllocated);
  const numParts = Number(body?.numParts);
  const maxDrawdownTolerated =
    body?.maxDrawdownTolerated === null || body?.maxDrawdownTolerated === undefined
      ? null
      : Number(body.maxDrawdownTolerated);

  if (!Number.isFinite(capitalAllocated) || capitalAllocated < 1000) {
    return NextResponse.json({ error: 'capitalAllocated must be at least 1000' }, { status: 400 });
  }
  if (!Number.isFinite(numParts) || numParts < 3) {
    return NextResponse.json({ error: 'numParts must be at least 3' }, { status: 400 });
  }

  const instance = await db.strategyInstance.create({
    data: {
      userId,
      name,
      mode: 'paper', // paper-first by default — un-skippable, enforced server-side
      capitalAllocated,
      numParts,
      status: 'active',
      graduation: {
        create: {
          daysElapsed: 0,
          roundTripsCompleted: 0,
          currentDrawdown: 0,
          maxDrawdownTolerated,
          acknowledged: false,
          explainerCompleted: false,
        },
      },
      streak: {
        create: {
          currentStreak: 0,
          longestStreak: 0,
          reviewHistory: [],
        },
      },
    },
    include: { graduation: true, streak: true },
  });

  return NextResponse.json({
    instance: serializeInstance(instance),
    graduation: instance.graduation ? serializeGraduation(instance.graduation) : null,
    streak: instance.streak ? serializeStreak(instance.streak) : null,
  });
}
