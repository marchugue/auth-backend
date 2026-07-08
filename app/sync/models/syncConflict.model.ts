import { ConflictResolutionStatus, Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export const createConflict = (
  data: Prisma.SyncConflictCreateInput,
  tx?: Prisma.TransactionClient
) => {
  const client = tx ?? prisma;
  return client.syncConflict.create({ data });
};

export const findOpenConflicts = (
  businessId: string,
  options: { status?: ConflictResolutionStatus; skip: number; take: number }
) => {
  const where: Prisma.SyncConflictWhereInput = {
    businessId,
    deletedAt: null,
    resolutionStatus: options.status ?? ConflictResolutionStatus.OPEN,
  };

  return prisma.$transaction([
    prisma.syncConflict.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: options.skip,
      take: options.take,
    }),
    prisma.syncConflict.count({ where }),
  ]);
};

export const countOpenConflicts = (businessId: string) =>
  prisma.syncConflict.count({
    where: {
      businessId,
      deletedAt: null,
      resolutionStatus: ConflictResolutionStatus.OPEN,
    },
  });

export const findConflictById = (id: string, businessId: string) =>
  prisma.syncConflict.findFirst({
    where: { id, businessId, deletedAt: null },
  });

export const resolveConflict = (
  id: string,
  data: Prisma.SyncConflictUpdateInput,
  tx?: Prisma.TransactionClient
) => {
  const client = tx ?? prisma;
  return client.syncConflict.update({ where: { id }, data });
};
