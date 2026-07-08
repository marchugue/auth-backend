import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import * as deviceModel from '../models/device.model';

const DEVICE_HEADER = 'x-device-id';

/**
 * Validates X-Device-Id header and attaches device context to the request.
 * Must run after authenticate.
 */
export const requireDevice = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized();

    const deviceId = req.headers[DEVICE_HEADER];
    if (!deviceId || typeof deviceId !== 'string') {
      throw ApiError.badRequest(`Missing required header: ${DEVICE_HEADER}`);
    }

    const device = await deviceModel.findDeviceForUser(deviceId, req.user.sub);
    if (!device) {
      throw ApiError.forbidden('Device not registered or access denied');
    }
    if (device.isRevoked) {
      throw ApiError.forbidden('Device has been revoked');
    }

    req.device = {
      id: device.id,
      businessId: device.businessId,
      userId: device.userId,
      isRevoked: device.isRevoked,
    };

    next();
  }
);

/**
 * Extracts and validates Idempotency-Key header for push requests.
 */
export const requireIdempotencyKey = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const key = req.headers['idempotency-key'];
  if (!key || typeof key !== 'string' || key.length < 1 || key.length > 255) {
    return next(ApiError.badRequest('Missing or invalid Idempotency-Key header'));
  }
  req.idempotencyKey = key;
  next();
};

/**
 * Ensures the businessId in the request matches the registered device business
 * when both are present. Prevents cross-tenant replay.
 */
export const validateBusinessScope = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.device) return next(ApiError.unauthorized('Device context required'));

  const businessId =
    (req.body?.businessId as string | undefined) ??
    (req.query?.businessId as string | undefined);

  if (businessId && businessId !== req.device.businessId) {
    return next(ApiError.forbidden('Business scope does not match registered device'));
  }

  next();
};
