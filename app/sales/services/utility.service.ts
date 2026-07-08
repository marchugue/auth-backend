import { Utility } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';
import * as utilityModel from '../models/utility.model';
import { CreateUtilityInput, UpdateUtilityInput, UtilityDto } from '../types/sales.types';
import { calculateDailyUtilityCost, decimalToNumber, roundMoney } from '../utils/metrics.utils';

const toUtilityDto = (utility: Utility): UtilityDto => ({
  id: utility.id,
  businessId: utility.businessId,
  utilityName: utility.utilityName,
  monthlyCost: decimalToNumber(utility.monthlyCost),
  month: utility.month,
  year: utility.year,
  dailyCost: calculateDailyUtilityCost(
    decimalToNumber(utility.monthlyCost),
    utility.year,
    utility.month
  ),
  createdAt: utility.createdAt.toISOString(),
  updatedAt: utility.updatedAt.toISOString(),
});

export const createUtility = async (input: CreateUtilityInput): Promise<UtilityDto> => {
  try {
    const utility = await utilityModel.createUtility({
      businessId: input.businessId,
      utilityName: input.utilityName.trim(),
      monthlyCost: input.monthlyCost,
      month: input.month,
      year: input.year,
    });
    return toUtilityDto(utility);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw ApiError.conflict(
        'A utility with this name already exists for the given month and year'
      );
    }
    throw err;
  }
};

export const listUtilities = async (
  businessId: string,
  options?: { month?: number; year?: number }
): Promise<UtilityDto[]> => {
  const utilities = await utilityModel.listUtilities(businessId, options);
  return utilities.map(toUtilityDto);
};

export const updateUtility = async (
  id: string,
  businessId: string,
  input: UpdateUtilityInput
): Promise<UtilityDto> => {
  const existing = await utilityModel.findUtilityById(id, businessId);
  if (!existing) throw ApiError.notFound('Utility not found');

  try {
    const utility = await utilityModel.updateUtility(id, {
      ...(input.utilityName !== undefined ? { utilityName: input.utilityName.trim() } : {}),
      ...(input.monthlyCost !== undefined ? { monthlyCost: input.monthlyCost } : {}),
      ...(input.month !== undefined ? { month: input.month } : {}),
      ...(input.year !== undefined ? { year: input.year } : {}),
    });
    return toUtilityDto(utility);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw ApiError.conflict(
        'A utility with this name already exists for the given month and year'
      );
    }
    throw err;
  }
};

export const deleteUtility = async (id: string, businessId: string): Promise<void> => {
  const existing = await utilityModel.findUtilityById(id, businessId);
  if (!existing) throw ApiError.notFound('Utility not found');
  await utilityModel.softDeleteUtility(id);
};

export const calculateTotalDailyFixedCost = async (
  businessId: string,
  month: number,
  year: number
): Promise<number> => {
  const utilities = await utilityModel.listUtilitiesForMonth(businessId, month, year);
  const total = utilities.reduce(
    (sum: number, u) =>
      sum + calculateDailyUtilityCost(decimalToNumber(u.monthlyCost), u.year, u.month),
    0
  );
  return roundMoney(total);
};
