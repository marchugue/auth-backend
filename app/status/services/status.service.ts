import { prisma } from '../../utils/prisma';
import { cloudPrisma } from '../../utils/cloudPrisma';

interface DbStatus {
  connected: boolean;
  latencyMs: number | null;
  error?: string;
}

const checkDb = async (client: typeof prisma | typeof cloudPrisma): Promise<DbStatus> => {
  const start = Date.now();
  try {
    await client.$queryRaw`SELECT 1`;
    return { connected: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { connected: false, latencyMs: null, error: (err as Error).message };
  }
};

export const getDatabaseStatus = async () => {
  const [local, cloud, pendingSync] = await Promise.all([
    checkDb(prisma),
    checkDb(cloudPrisma),
    prisma.syncOutbox.count(),
  ]);

  const oldestPending = pendingSync > 0
    ? await prisma.syncOutbox.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } })
    : null;

  return {
    local,
    cloud,
    sync: {
      pendingCount: pendingSync,
      oldestPendingSince: oldestPending?.createdAt ?? null,
    },
    checkedAt: new Date().toISOString(),
  };
};