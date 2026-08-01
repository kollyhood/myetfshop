import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';
import { getOwnedInstance } from '@/lib/server/ownership';
import { serializeInstance, serializeGraduation, serializeCertificate } from '@/lib/server/serialize';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const owned = await getOwnedInstance(id, userId);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const alreadyIssued = await db.certificate.findFirst({
    where: { instanceId: id, type: 'learn_completed' },
  });

  const [instance, graduation, certificate] = await db.$transaction([
    db.strategyInstance.update({ where: { id }, data: { explainerCompleted: true } }),
    db.graduationSnapshot.update({ where: { instanceId: id }, data: { explainerCompleted: true } }),
    ...(alreadyIssued
      ? []
      : [
          db.certificate.create({
            data: { instanceId: id, type: 'learn_completed', title: 'Learn the Strategy — Completed' },
          }),
        ]),
  ]);

  return NextResponse.json({
    instance: serializeInstance(instance),
    graduation: serializeGraduation(graduation),
    certificate: certificate ? serializeCertificate(certificate) : null,
  });
}
