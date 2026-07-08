import { Prisma, SyncOperationType } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export const findSyncRecord = (
  businessId: string,
  entityType: string,
  entityId: string,
  tx?: Prisma.TransactionClient
) => {
  const client = tx ?? prisma;
  return client.syncRecord.findUnique({
    where: { businessId_entityType_entityId: { businessId, entityType, entityId } },
  });
};

export const createSyncRecord = (
  data: {
    businessId: string;
    entityType: string;
    entityId: string;
    payload: Prisma.InputJsonValue;
    lastModifiedByDevice?: string;
    lastModifiedByUser?: string;
  },
  tx?: Prisma.TransactionClient
) => {
  const client = tx ?? prisma;
  return client.syncRecord.create({
    data: {
      businessId: data.businessId,
      entityType: data.entityType,
      entityId: data.entityId,
      payload: data.payload,
      version: BigInt(1),
      lastModifiedByDevice: data.lastModifiedByDevice,
      lastModifiedByUser: data.lastModifiedByUser,
    },
  });
};

export const updateSyncRecord = (
  businessId: string,
  entityType: string,
  entityId: string,
  data: {
    payload?: Prisma.InputJsonValue;
    version: bigint;
    deletedAt?: Date | null;
    lastModifiedByDevice?: string;
    lastModifiedByUser?: string;
  },
  tx?: Prisma.TransactionClient
) => {
  const client = tx ?? prisma;
  return client.syncRecord.update({
    where: { businessId_entityType_entityId: { businessId, entityType, entityId } },
    data: {
      payload: data.payload,
      version: data.version,
      deletedAt: data.deletedAt,
      lastModifiedByDevice: data.lastModifiedByDevice,
      lastModifiedByUser: data.lastModifiedByUser,
    },
  });
};

export const appendChangeLog = (
  data: {
    businessId: string;
    entityType: string;
    entityId: string;
    operation: SyncOperationType;
    version: bigint;
    payload?: Prisma.InputJsonValue;
    deviceId?: string;
    userId?: string;
  },
  tx?: Prisma.TransactionClient
) => {
  const client = tx ?? prisma;
  return client.syncChangeLog.create({ data });
};

export const findChangesSince = (
  businessId: string,
  cursor: bigint,
  limit: number,
  entityTypes?: string[]
) =>
  prisma.syncChangeLog.findMany({
    where: {
      businessId,
      id: { gt: cursor },
      ...(entityTypes?.length ? { entityType: { in: entityTypes } } : {}),
    },
    orderBy: { id: 'asc' },
    take: limit + 1,
  });

export const findAppliedMutation = (
  deviceId: string,
  clientMutationId: string,
  tx?: Prisma.TransactionClient
) => {
  const client = tx ?? prisma;
  return client.appliedMutation.findUnique({
    where: { deviceId_clientMutationId: { deviceId, clientMutationId } },
  });
};

export const createAppliedMutation = (
  data: { deviceId: string; clientMutationId: string; batchId: string },
  tx?: Prisma.TransactionClient
) => {
  const client = tx ?? prisma;
  return client.appliedMutation.create({ data });
};
