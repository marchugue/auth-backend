import { z } from 'zod';

const businessIdField = z.string().uuid('businessId must be a valid UUID');

const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format');

const positiveDecimal = z
  .number({ invalid_type_error: 'must be a number' })
  .positive('must be greater than zero');

/** ---------- Products ---------- */

export const createProductSchema = z.object({
  body: z.object({
    businessId: businessIdField,
    name: z.string().min(1, 'name is required').max(255),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    businessId: businessIdField,
    name: z.string().min(1, 'name is required').max(255).optional(),
  }),
});

export const productIdParamsSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  query: z.object({ businessId: businessIdField }),
});

export const listProductsSchema = z.object({
  query: z.object({ businessId: businessIdField }),
});

/** ---------- COGS ---------- */

export const createCogsSchema = z.object({
  body: z.object({
    businessId: businessIdField,
    date: isoDateString,
    productItem: z.string().min(1, 'productItem is required').max(255),
    quantity: positiveDecimal,
    uom: z.string().min(1, 'uom is required').max(50),
    cost: positiveDecimal,
  }),
});

export const listCogsSchema = z.object({
  query: z.object({
    businessId: businessIdField,
    date: isoDateString.optional(),
  }),
});

export const cogsDailySummarySchema = z.object({
  query: z.object({
    businessId: businessIdField,
    date: isoDateString,
  }),
});

/** ---------- Revenue ---------- */

export const createRevenueSchema = z.object({
  body: z.object({
    businessId: businessIdField,
    date: isoDateString,
    productId: z.string().uuid('productId must be a valid UUID'),
    revenueAmount: positiveDecimal,
  }),
});

export const listRevenuesSchema = z.object({
  query: z.object({
    businessId: businessIdField,
    date: isoDateString.optional(),
    productId: z.string().uuid().optional(),
  }),
});

export const revenueDailySummarySchema = z.object({
  query: z.object({
    businessId: businessIdField,
    date: isoDateString,
  }),
});

/** ---------- Utilities ---------- */

export const createUtilitySchema = z.object({
  body: z.object({
    businessId: businessIdField,
    utilityName: z.string().min(1, 'utilityName is required').max(255),
    monthlyCost: positiveDecimal,
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
  }),
});

export const updateUtilitySchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    businessId: businessIdField,
    utilityName: z.string().min(1).max(255).optional(),
    monthlyCost: positiveDecimal.optional(),
    month: z.number().int().min(1).max(12).optional(),
    year: z.number().int().min(2000).max(2100).optional(),
  }),
});

export const utilityIdParamsSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  query: z.object({ businessId: businessIdField }),
});

export const listUtilitiesSchema = z.object({
  query: z.object({
    businessId: businessIdField,
    month: z
      .string()
      .optional()
      .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
      .pipe(z.number().int().min(1).max(12).optional()),
    year: z
      .string()
      .optional()
      .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
      .pipe(z.number().int().min(2000).max(2100).optional()),
  }),
});

/** ---------- Metrics ---------- */

export const dailyMetricsSchema = z.object({
  query: z.object({
    businessId: businessIdField,
    date: isoDateString,
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
export type CreateCogsInput = z.infer<typeof createCogsSchema>['body'];
export type CreateRevenueInput = z.infer<typeof createRevenueSchema>['body'];
export type CreateUtilityInput = z.infer<typeof createUtilitySchema>['body'];
export type UpdateUtilityInput = z.infer<typeof updateUtilitySchema>['body'];

/** ---------- Response DTOs ---------- */

export interface ProductDto {
  id: string;
  businessId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CogsEntryDto {
  id: string;
  businessId: string;
  date: string;
  productItem: string;
  quantity: number;
  uom: string;
  cost: number;
  createdAt: string;
  updatedAt: string;
}

export interface CogsDailySummaryDto {
  date: string;
  entries: CogsEntryDto[];
  totalCogs: number;
}

export interface RevenueEntryDto {
  id: string;
  businessId: string;
  date: string;
  productId: string;
  productName: string;
  revenueAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueDailySummaryDto {
  date: string;
  entries: RevenueEntryDto[];
  totalRevenue: number;
}

export interface UtilityDto {
  id: string;
  businessId: string;
  utilityName: string;
  monthlyCost: number;
  month: number;
  year: number;
  dailyCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyMetricsDto {
  date: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  grossMarginPercentage: number;
  dailyFixedCost: number;
  breakEvenRevenue: number | null;
  netProfit: number;
}
