import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import * as utilityService from '../services/utility.service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const utility = await utilityService.createUtility(req.body);
  res.status(201).json({ success: true, data: utility });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.query.businessId as string;
  const month = req.query.month as number | undefined;
  const year = req.query.year as number | undefined;
  const utilities = await utilityService.listUtilities(businessId, { month, year });
  res.status(200).json({ success: true, data: utilities });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const utility = await utilityService.updateUtility(
    req.params.id,
    req.body.businessId,
    req.body
  );
  res.status(200).json({ success: true, data: utility });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.businessAccess) throw ApiError.unauthorized();
  await utilityService.deleteUtility(req.params.id, req.businessAccess.businessId);
  res.status(200).json({ success: true, message: 'Utility deleted successfully' });
});
