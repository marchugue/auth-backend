import { Decimal } from '@prisma/client/runtime/library';

export const decimalToNumber = (value: Decimal | number): number => {
  if (typeof value === 'number') return value;
  return value.toNumber();
};

export const roundMoney = (value: number, decimals = 2): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const roundRatio = (value: number, decimals = 4): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const toPercentage = (ratio: number, decimals = 2): number => {
  return roundMoney(ratio * 100, decimals);
};

export interface DailyFinancialInputs {
  revenue: number;
  cogs: number;
  dailyFixedCost: number;
}

export interface DailyFinancialResult {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  grossMarginPercentage: number;
  dailyFixedCost: number;
  breakEvenRevenue: number | null;
  netProfit: number;
}

export const calculateDailyFinancials = (
  inputs: DailyFinancialInputs
): DailyFinancialResult => {
  const revenue = roundMoney(inputs.revenue);
  const cogs = roundMoney(inputs.cogs);
  const dailyFixedCost = roundMoney(inputs.dailyFixedCost);

  const grossProfit = roundMoney(revenue - cogs);
  const grossMargin = revenue > 0 ? roundRatio(grossProfit / revenue) : 0;
  const grossMarginPercentage = toPercentage(grossMargin);

  const breakEvenRevenue =
    grossMargin > 0 ? roundMoney(dailyFixedCost / grossMargin) : null;

  const netProfit = roundMoney(revenue - cogs - dailyFixedCost);

  return {
    revenue,
    cogs,
    grossProfit,
    grossMargin,
    grossMarginPercentage,
    dailyFixedCost,
    breakEvenRevenue,
    netProfit,
  };
};

export const calculateDailyUtilityCost = (
  monthlyCost: number,
  year: number,
  month: number
): number => {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return roundMoney(monthlyCost / days);
};
