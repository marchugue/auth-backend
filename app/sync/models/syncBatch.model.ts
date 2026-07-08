import { Prisma, SyncBatchStatus } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export const findBatchByIdempotencyKey = (deviceId: string, idempotencyKey: string) =>
  prisma.syncBatch.findUnique({
    where: { deviceId_idempotencyKey: { deviceId, idempotencyKey } },
    include: { operations: true },
  });

export const findLatestBatchForDevice = (deviceId: string, businessId: string) =>
  prisma.syncBatch.findFirst({
    where: { deviceId, businessId },
    orderBy: { startedAt: 'desc' },
  });

export const createBatch = (
  data: Prisma.SyncBatchCreateInput,
  tx?: Prisma.TransactionClient
) => {
  const client = tx ?? prisma;
  return client.syncBatch.create({ data });
};

export const updateBatch = (
  id: string,
  data: Prisma.SyncBatchUpdateInput,
  tx?: Prisma.TransactionClient
) => {
  const client = tx ?? prisma;
  return client.syncBatch.update({ where: { id }, data });
};

export const createOperation = (
  data: Prisma.SyncOperationCreateInput,
  tx?: Prisma.TransactionClient
) => {
  const client = tx ?? prisma;
  return client.syncOperation.create({ data });
};

export const findStuckBatches = (olderThan: Date) =>
  prisma.syncBatch.findMany({
    where: { status: SyncBatchStatus.PROCESSING, startedAt: { lt: olderThan } },
  });
