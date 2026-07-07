import { prisma } from './prisma';
import { cloudPrisma } from './cloudPrisma';

type Table = 'users' | 'sessions';
type Operation = 'upsert' | 'delete';

let isSyncing = false;

/** Call this from a model function right after every local write. Never blocks, never throws. */
export const queueChange = (tableName: Table, operation: Operation, payload: Record<string, any>) => {
  prisma.syncOutbox
    .create({ data: { tableName, operation, payload } })
    .then(() => trySync())
    .catch((err) => console.error('Failed to queue sync change:', err.message));
};

const isCloudReachable = async (): Promise<boolean> => {
  try {
    await cloudPrisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
};

const applyToCloud = async (tableName: Table, operation: Operation, payload: any) => {
  const client = tableName === 'users' ? cloudPrisma.user : cloudPrisma.session;
  if (operation === 'delete') {
    await (client as any).deleteMany({ where: { id: payload.id } });
  } else {
    await (client as any).upsert({ where: { id: payload.id }, create: payload, update: payload });
  }
};

/** Drains the outbox to Neon if reachable. Safe to call repeatedly/concurrently. */
export const trySync = async () => {
  if (isSyncing) return;
  isSyncing = true;

  try {
    if (!(await isCloudReachable())) return; // rows stay queued, next call retries

    const pending = await prisma.syncOutbox.findMany({ orderBy: { createdAt: 'asc' } });
    for (const row of pending) {
      await applyToCloud(row.tableName as Table, row.operation as Operation, row.payload);
      await prisma.syncOutbox.delete({ where: { id: row.id } });
    }
  } catch (err) {
    console.warn('⚠️  Cloud sync attempt failed, will retry:', (err as Error).message);
  } finally {
    isSyncing = false;
  }
};

/** Call once at server startup — retries anything left over from a previous offline period. */
export const startSyncWorker = (intervalMs = 30_000) => {
  setInterval(trySync, intervalMs);
};