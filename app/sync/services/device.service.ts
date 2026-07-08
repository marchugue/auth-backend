import { DeviceType } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';
import {
  findBusinessById,
  findBusinessMember,
  ensureUserHasBusiness,
  createBusinessWithOwner,
} from '../models/business.model';
import * as deviceModel from '../models/device.model';
import * as syncLogModel from '../models/syncLog.model';
import { RegisterDeviceInput, DeviceDto } from '../types/sync.types';
import { isReadableRole } from '../config/conflictPolicy';
import { toDeviceDto } from '../utils/sync.utils';

export const registerDevice = async (
  userId: string,
  input: RegisterDeviceInput,
  meta: { sessionId?: string; ipAddress?: string }
): Promise<DeviceDto> => {
  let businessId = input.businessId;

  if (!businessId) {
    const existing = await ensureUserHasBusiness(userId);
    if (existing) {
      businessId = existing.businessId;
    } else {
      const business = await createBusinessWithOwner(
        input.businessName ?? 'Default Business',
        userId
      );
      businessId = business.id;
    }
  }

  const business = await findBusinessById(businessId);
  if (!business) throw ApiError.notFound('Business not found');

  const member = await findBusinessMember(businessId, userId);
  if (!member || !isReadableRole(member.role)) {
    throw ApiError.forbidden('You do not have access to this business');
  }

  const device = await deviceModel.upsertDevice({
    id: input.deviceId,
    businessId,
    userId,
    sessionId: meta.sessionId,
    deviceName: input.deviceName,
    deviceType: input.deviceType as DeviceType,
    platform: input.platform,
    appVersion: input.appVersion,
  });

  await syncLogModel.createSyncLog({
    businessId,
    action: 'DEVICE_REGISTERED',
    userId,
    deviceId: device.id,
    metadata: { deviceType: device.deviceType },
    ipAddress: meta.ipAddress,
  });

  return toDeviceDto(device);
};

export const validateDeviceAccess = async (
  deviceId: string,
  userId: string,
  businessId: string
) => {
  const device = await deviceModel.findDeviceById(deviceId, businessId);
  if (!device) throw ApiError.notFound('Device not registered for this business');
  if (device.userId !== userId) throw ApiError.forbidden('Device does not belong to this user');
  if (device.isRevoked) throw ApiError.forbidden('Device has been revoked');
  if (device.deletedAt) throw ApiError.forbidden('Device has been deleted');

  return device;
};

export const validateBusinessAccess = async (businessId: string, userId: string) => {
  const business = await findBusinessById(businessId);
  if (!business) throw ApiError.notFound('Business not found');

  const member = await findBusinessMember(businessId, userId);
  if (!member || !isReadableRole(member.role)) {
    throw ApiError.forbidden('You do not have access to this business');
  }

  return { business, member };
};

export const updateDeviceMetadata = async (
  deviceId: string,
  businessId: string,
  userId: string,
  data: { deviceName?: string; appVersion?: string; platform?: string }
) => {
  await validateDeviceAccess(deviceId, userId, businessId);
  const device = await deviceModel.updateDeviceMetadata(deviceId, data);

  await syncLogModel.createSyncLog({
    businessId,
    action: 'DEVICE_UPDATED',
    userId,
    deviceId,
    metadata: data,
  });

  return toDeviceDto(device);
};
