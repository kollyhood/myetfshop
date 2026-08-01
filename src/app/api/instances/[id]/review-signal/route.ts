import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';
import { getOwnedInstance } from '@/lib/server/ownership';
import { serializeStreak } from '@/lib/server/serialize';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Consecutive trading days the user opened the app and reviewed that day's signal —
// NOT consecutive days a trade fired. A no-trade day counts identically toward the streak.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const owned = await getOwnedInstance(id, userId);
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const today = todayISO();
  const existing = await db.streakState.findUnique({ where: { instanceId: id } });
  if (!existing) return NextResponse.json({ error: 'Streak state missing' }, { status: 500 });

  if (existing.lastReviewedDate === today) {
    return NextResponse.json({ streak: serializeStreak(existing) });
  }

  const newStreak = existing.currentStreak + 1;
  const history = [
    ...(existing.reviewHistory as { date: string; reviewed: boolean }[]),
    { date: today, reviewed: true },
  ].slice(-100);

  const updated = await db.streakState.update({
    where: { instanceId: id },
    data: {
      currentStreak: newStreak,
      longestStreak: Math.max(existing.longestStreak, newStreak),
      lastReviewedDate: today,
      reviewHistory: history,
    },
  });

  return NextResponse.json({ streak: serializeStreak(updated) });
}
