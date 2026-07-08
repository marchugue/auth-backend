import { ApiError } from '../../utils/ApiError';
import * as productModel from '../models/product.model';
import * as revenueModel from '../models/revenue.model';
import { CreateRevenueInput, RevenueDailySummaryDto, RevenueEntryDto } from '../types/sales.types';
import { formatIsoDate, parseIsoDate } from '../utils/date.utils';
import { decimalToNumber, roundMoney } from '../utils/metrics.utils';

const toRevenueDto = (entry: revenueModel.RevenueEntryRecord): RevenueEntryDto => ({
  id: entry.id,
  businessId: entry.businessId,
  date: formatIsoDate(entry.entryDate),
  productId: entry.productId,
  productName: entry.product.name,
  revenueAmount: decimalToNumber(entry.revenueAmount),
  createdAt: entry.createdAt.toISOString(),
  updatedAt: entry.updatedAt.toISOString(),
});

export const createRevenueEntry = async (input: CreateRevenueInput): Promise<RevenueEntryDto> => {
  const product = await productModel.findProductById(input.productId, input.businessId);
  if (!product) throw ApiError.notFound('Product not found');

  const entry = await revenueModel.createRevenueEntry({
    businessId: input.businessId,
    entryDate: parseIsoDate(input.date),
    productId: input.productId,
    revenueAmount: input.revenueAmount,
  });
  return toRevenueDto(entry);
};

export const listRevenueEntries = async (
  businessId: string,
  options?: { date?: string; productId?: string }
): Promise<RevenueEntryDto[]> => {
  const entries = await revenueModel.listRevenueEntries(businessId, {
    entryDate: options?.date ? parseIsoDate(options.date) : undefined,
    productId: options?.productId,
  });
  return entries.map(toRevenueDto);
};

export const getDailyRevenueSummary = async (
  businessId: string,
  date: string
): Promise<RevenueDailySummaryDto> => {
  const entryDate = parseIsoDate(date);
  const entries = await revenueModel.listRevenueEntries(businessId, { entryDate });
  const totalRevenue = roundMoney(
    entries.reduce((sum: number, e) => sum + decimalToNumber(e.revenueAmount), 0)
  );

  return {
    date,
    entries: entries.map(toRevenueDto),
    totalRevenue,
  };
};
