import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';

const notDeleted = { deletedAt: null };

export const createCogsEntry = (data: {
  businessId: string;
  entryDate: Date;
  productItem: string;
  quantity: number;
  uom: string;
  cost: number;
}) =>
  prisma.dailyCogsEntry.create({
    data: {
      businessId: data.businessId,
      entryDate: data.entryDate,
      productItem: data.productItem,
      quantity: data.quantity,
      uom: data.uom,
      cost: data.cost,
    },
  });

export const listCogsEntries = (
  businessId: string,
  options?: { entryDate?: Date }
) =>
  prisma.dailyCogsEntry.findMany({
    where: {
      businessId,
      ...notDeleted,
      ...(options?.entryDate ? { entryDate: options.entryDate } : {}),
    },
    orderBy: [{ entryDate: 'desc' }, { createdAt: 'asc' }],
  });

export const sumCogsForDate = async (businessId: string, entryDate: Date): Promise<number> => {
  const result = await prisma.dailyCogsEntry.aggregate({
    where: { businessId, entryDate, ...notDeleted },
    _sum: { cost: true },
  });
  return result._sum.cost?.toNumber() ?? 0;
};

export const findCogsEntryById = (id: string, businessId: string) =>
  prisma.dailyCogsEntry.findFirst({
    where: { id, businessId, ...notDeleted },
  });

export const softDeleteCogsEntry = (id: string) =>
  prisma.dailyCogsEntry.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

export type CogsEntryRecord = Prisma.DailyCogsEntryGetPayload<object>;
