import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';

/** Global (all-entity) checkpoints use an empty string entity type. */
const GLOBAL_ENTITY_TYPE = '';

export const findCheckpoint = (deviceId: string, entityType: string = GLOBAL_ENTITY_TYPE) =>
  prisma.syncCheckpoint.findUnique({
    where: { deviceId_entityType: { deviceId, entityType } },
  });

export const upsertCheckpoint = (
  data: {
    deviceId: string;
    businessId: string;
    entityType?: string;
    cursor: string;
    serverVersion?: bigint;
  },
  tx?: Prisma.TransactionClient
) => {
  const client = tx ?? prisma;
  const entityType = data.entityType ?? GLOBAL_ENTITY_TYPE;
  return client.syncCheckpoint.upsert({
    where: { deviceId_entityType: { deviceId: data.deviceId, entityType } },
    create: {
      deviceId: data.deviceId,
      businessId: data.businessId,
      entityType,
      cursor: data.cursor,
      serverVersion: data.serverVersion ?? BigInt(0),
    },
    update: {
      cursor: data.cursor,
      serverVersion: data.serverVersion,
    },
  });
};

export const getLatestServerCursor = async (businessId: string): Promise<string> => {
  const latest = await prisma.syncChangeLog.findFirst({
    where: { businessId },
    orderBy: { id: 'desc' },
    select: { id: true },
  });
  return latest ? latest.id.toString() : '0';
};
