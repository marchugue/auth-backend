import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import * as deviceService from '../services/device.service';
import * as syncService from '../services/sync.service';
import * as conflictService from '../services/conflict.service';
import { ConflictResolutionStatus } from '@prisma/client';

import {
  SyncPullQuery,
  SyncConflictsQuery,
} from '../types/sync.types';

export const registerDevice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();

  const device = await deviceService.registerDevice(req.user.sub, req.body, {
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    message: 'Device registered successfully',
    data: device,
  });
});

export const push = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.device || !req.idempotencyKey) throw ApiError.unauthorized();

  const result = await syncService.processPush(
    {
      userId: req.user.sub,
      deviceId: req.device.id,
      businessId: req.body.businessId,
      ipAddress: req.ip,
      idempotencyKey: req.idempotencyKey,
    },
    req.body
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const pull = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.device) throw ApiError.unauthorized();

  const query = req.query as unknown as SyncPullQuery;

  const result = await syncService.processPull(
    {
      userId: req.user.sub,
      deviceId: req.device.id,
      businessId: query.businessId,
      ipAddress: req.ip,
      idempotencyKey: '',
    },
    query
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const status = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.device) throw ApiError.unauthorized();

  const result = await syncService.getSyncStatus(
    {
      userId: req.user.sub,
      deviceId: req.device.id,
      businessId: req.query.businessId as string,
      ipAddress: req.ip,
      idempotencyKey: '',
    },
    req.query.businessId as string
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const conflicts = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || !req.device) throw ApiError.unauthorized();

  const query = req.query as unknown as SyncConflictsQuery;

  await deviceService.validateBusinessAccess(query.businessId, req.user.sub);

  const result = await conflictService.listConflicts(query.businessId, {
    status: query.status as ConflictResolutionStatus,
    page: query.page,
    limit: query.limit,
  });

  res.status(200).json({
    success: true,
    data: {
      conflicts: result.conflicts,
      page: query.page,
      limit: query.limit,
      total: result.total,
    },
  });
});
