import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as cogsService from '../services/cogs.service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const entry = await cogsService.createCogsEntry(req.body);
  res.status(201).json({ success: true, data: entry });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.query.businessId as string;
  const date = req.query.date as string | undefined;
  const entries = await cogsService.listCogsEntries(businessId, date);
  res.status(200).json({ success: true, data: entries });
});

export const dailySummary = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.query.businessId as string;
  const date = req.query.date as string;
  const summary = await cogsService.getDailyCogsSummary(businessId, date);
  res.status(200).json({ success: true, data: summary });
});
