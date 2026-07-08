import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as revenueService from '../services/revenue.service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const entry = await revenueService.createRevenueEntry(req.body);
  res.status(201).json({ success: true, data: entry });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.query.businessId as string;
  const date = req.query.date as string | undefined;
  const productId = req.query.productId as string | undefined;
  const entries = await revenueService.listRevenueEntries(businessId, { date, productId });
  res.status(200).json({ success: true, data: entries });
});

export const dailySummary = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.query.businessId as string;
  const date = req.query.date as string;
  const summary = await revenueService.getDailyRevenueSummary(businessId, date);
  res.status(200).json({ success: true, data: summary });
});
