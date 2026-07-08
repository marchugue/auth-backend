import { DeviceType, Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export const findDeviceById = (deviceId: string, businessId: string) =>
  prisma.device.findFirst({
    where: { id: deviceId, businessId, deletedAt: null },
  });

export const findDeviceForUser = (deviceId: string, userId: string) =>
  prisma.device.findFirst({
    where: { id: deviceId, userId, deletedAt: null, isRevoked: false },
  });

export const upsertDevice = (data: {
  id: string;
  businessId: string;
  userId: string;
  sessionId?: string;
  deviceName?: string;
  deviceType: DeviceType;
  platform?: string;
  appVersion?: string;
}) =>
  prisma.device.upsert({
    where: { businessId_id: { businessId: data.businessId, id: data.id } },
    create: {
      id: data.id,
      businessId: data.businessId,
      userId: data.userId,
      sessionId: data.sessionId,
      deviceName: data.deviceName,
      deviceType: data.deviceType,
      platform: data.platform,
      appVersion: data.appVersion,
      lastSeenAt: new Date(),
    },
    update: {
      deviceName: data.deviceName,
      deviceType: data.deviceType,
      platform: data.platform,
      appVersion: data.appVersion,
      lastSeenAt: new Date(),
      isRevoked: false,
      deletedAt: null,
    },
  });

export const updateDeviceLastSync = (deviceId: string) =>
  prisma.device.update({
    where: { id: deviceId },
    data: { lastSyncAt: new Date(), lastSeenAt: new Date() },
  });

export const updateDeviceMetadata = (
  deviceId: string,
  data: Prisma.DeviceUpdateInput
) =>
  prisma.device.update({
    where: { id: deviceId },
    data: { ...data, lastSeenAt: new Date() },
  });
