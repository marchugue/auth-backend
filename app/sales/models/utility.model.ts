import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';

const notDeleted = { deletedAt: null };

export const createUtility = (data: {
  businessId: string;
  utilityName: string;
  monthlyCost: number;
  month: number;
  year: number;
}) =>
  prisma.utility.create({ data });

export const findUtilityById = (id: string, businessId: string) =>
  prisma.utility.findFirst({
    where: { id, businessId, ...notDeleted },
  });

export const listUtilities = (
  businessId: string,
  options?: { month?: number; year?: number }
) =>
  prisma.utility.findMany({
    where: {
      businessId,
      ...notDeleted,
      ...(options?.month !== undefined ? { month: options.month } : {}),
      ...(options?.year !== undefined ? { year: options.year } : {}),
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }, { utilityName: 'asc' }],
  });

export const updateUtility = (
  id: string,
  data: Prisma.UtilityUpdateInput
) =>
  prisma.utility.update({
    where: { id },
    data,
  });

export const softDeleteUtility = (id: string) =>
  prisma.utility.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

export const listUtilitiesForMonth = (businessId: string, month: number, year: number) =>
  listUtilities(businessId, { month, year });

export type UtilityRecord = Prisma.UtilityGetPayload<object>;
