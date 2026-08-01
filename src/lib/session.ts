import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
