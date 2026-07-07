import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getDatabaseStatus } from '../services/status.service';

export const getDbStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = await getDatabaseStatus();
  const healthy = status.local.connected && status.cloud.connected;

  res.status(healthy ? 200 : 503).json({ success: healthy, ...status });
});