import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';

const notDeleted = { deletedAt: null };

export const createRevenueEntry = (data: {
  businessId: string;
  entryDate: Date;
  productId: string;
  revenueAmount: number;
}) =>
  prisma.dailyRevenueEntry.create({
    data: {
      businessId: data.businessId,
      entryDate: data.entryDate,
      productId: data.productId,
      revenueAmount: data.revenueAmount,
    },
    include: { product: true },
  });

export const listRevenueEntries = (
  businessId: string,
  options?: { entryDate?: Date; productId?: string }
) =>
  prisma.dailyRevenueEntry.findMany({
    where: {
      businessId,
      ...notDeleted,
      ...(options?.entryDate ? { entryDate: options.entryDate } : {}),
      ...(options?.productId ? { productId: options.productId } : {}),
    },
    include: { product: true },
    orderBy: [{ entryDate: 'desc' }, { createdAt: 'asc' }],
  });

export const sumRevenueForDate = async (businessId: string, entryDate: Date): Promise<number> => {
  const result = await prisma.dailyRevenueEntry.aggregate({
    where: { businessId, entryDate, ...notDeleted },
    _sum: { revenueAmount: true },
  });
  return result._sum.revenueAmount?.toNumber() ?? 0;
};

export type RevenueEntryRecord = Prisma.DailyRevenueEntryGetPayload<{ include: { product: true } }>;
