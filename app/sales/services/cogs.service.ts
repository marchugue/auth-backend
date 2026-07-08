import { DailyCogsEntry } from '@prisma/client';
import * as cogsModel from '../models/cogs.model';
import { CogsDailySummaryDto, CogsEntryDto, CreateCogsInput } from '../types/sales.types';
import { formatIsoDate, parseIsoDate } from '../utils/date.utils';
import { decimalToNumber, roundMoney } from '../utils/metrics.utils';

const toCogsDto = (entry: DailyCogsEntry): CogsEntryDto => ({
  id: entry.id,
  businessId: entry.businessId,
  date: formatIsoDate(entry.entryDate),
  productItem: entry.productItem,
  quantity: decimalToNumber(entry.quantity),
  uom: entry.uom,
  cost: decimalToNumber(entry.cost),
  createdAt: entry.createdAt.toISOString(),
  updatedAt: entry.updatedAt.toISOString(),
});

export const createCogsEntry = async (input: CreateCogsInput): Promise<CogsEntryDto> => {
  const entry = await cogsModel.createCogsEntry({
    businessId: input.businessId,
    entryDate: parseIsoDate(input.date),
    productItem: input.productItem.trim(),
    quantity: input.quantity,
    uom: input.uom.trim(),
    cost: input.cost,
  });
  return toCogsDto(entry);
};

export const listCogsEntries = async (
  businessId: string,
  date?: string
): Promise<CogsEntryDto[]> => {
  const entries = await cogsModel.listCogsEntries(
    businessId,
    date ? { entryDate: parseIsoDate(date) } : undefined
  );
  return entries.map(toCogsDto);
};

export const getDailyCogsSummary = async (
  businessId: string,
  date: string
): Promise<CogsDailySummaryDto> => {
  const entryDate = parseIsoDate(date);
  const entries = await cogsModel.listCogsEntries(businessId, { entryDate });
  const totalCogs = roundMoney(
    entries.reduce((sum: number, e) => sum + decimalToNumber(e.cost), 0)
  );

  return {
    date,
    entries: entries.map(toCogsDto),
    totalCogs,
  };
};
