import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';
import { getOwnedInstance } from '@/lib/server/ownership';
import { serializeInstance, serializeGraduation } from '@/lib/server/serialize';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const owned = await getOwnedInstance(id, userId);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [instance, graduation] = await db.$transaction([
    db.strategyInstance.update({ where: { id }, data: { acknowledgedRisk: true } }),
    db.graduationSnapshot.update({ where: { instanceId: id }, data: { acknowledged: true } }),
  ]);

  return NextResponse.json({
    instance: serializeInstance(instance),
    graduation: serializeGraduation(graduation),
  });
}
