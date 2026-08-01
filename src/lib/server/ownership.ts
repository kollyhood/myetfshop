import { db } from '@/lib/db';

/** Fetch a StrategyInstance, returning null if it doesn't exist or isn't owned by userId. */
export async function getOwnedInstance(instanceId: string, userId: string) {
  const instance = await db.strategyInstance.findUnique({ where: { id: instanceId } });
  if (!instance || instance.userId !== userId) return null;
  return instance;
}
