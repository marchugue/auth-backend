import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as businessMetricsService from '../services/businessMetrics.service';

export const daily = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.query.businessId as string;
  const date = req.query.date as string;
  const metrics = await businessMetricsService.getDailyMetrics(businessId, date);
  res.status(200).json({ success: true, data: metrics });
});
