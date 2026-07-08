import { Prisma, SyncLogAction } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export const createSyncLog = (
  data: {
    businessId: string;
    action: SyncLogAction;
    userId?: string;
    deviceId?: string;
    batchId?: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  },
  tx?: Prisma.TransactionClient
) => {
  const client = tx ?? prisma;
  return client.syncLog.create({
    data: {
      businessId: data.businessId,
      action: data.action,
      userId: data.userId,
      deviceId: data.deviceId,
      batchId: data.batchId,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      ipAddress: data.ipAddress,
    },
  });
};

export const findSyncLogs = (businessId: string, limit = 100) =>
  prisma.syncLog.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
