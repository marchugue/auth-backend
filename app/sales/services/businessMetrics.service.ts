import * as cogsModel from '../models/cogs.model';
import * as revenueModel from '../models/revenue.model';
import { DailyMetricsDto } from '../types/sales.types';
import { getMonthYearFromDate, parseIsoDate } from '../utils/date.utils';
import { calculateDailyFinancials } from '../utils/metrics.utils';
import * as utilityService from './utility.service';

export const getDailyMetrics = async (
  businessId: string,
  date: string
): Promise<DailyMetricsDto> => {
  const entryDate = parseIsoDate(date);
  const { month, year } = getMonthYearFromDate(entryDate);

  const [totalRevenue, totalCogs, dailyFixedCost] = await Promise.all([
    revenueModel.sumRevenueForDate(businessId, entryDate),
    cogsModel.sumCogsForDate(businessId, entryDate),
    utilityService.calculateTotalDailyFixedCost(businessId, month, year),
  ]);

  const financials = calculateDailyFinancials({
    revenue: totalRevenue,
    cogs: totalCogs,
    dailyFixedCost,
  });

  return {
    date,
    revenue: financials.revenue,
    cogs: financials.cogs,
    grossProfit: financials.grossProfit,
    grossMargin: financials.grossMargin,
    grossMarginPercentage: financials.grossMarginPercentage,
    dailyFixedCost: financials.dailyFixedCost,
    breakEvenRevenue: financials.breakEvenRevenue,
    netProfit: financials.netProfit,
  };
};
