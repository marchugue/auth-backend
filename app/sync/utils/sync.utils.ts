import { createHash } from 'crypto';
import { Device } from '@prisma/client';
import { DeviceDto } from '../types/sync.types';

export const hashPayload = (payload: unknown): string => {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
};

export const toDeviceDto = (device: Device): DeviceDto => ({
  id: device.id,
  businessId: device.businessId,
  userId: device.userId,
  deviceName: device.deviceName,
  deviceType: device.deviceType,
  platform: device.platform,
  appVersion: device.appVersion,
  lastSyncAt: device.lastSyncAt?.toISOString() ?? null,
  lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
  isRevoked: device.isRevoked,
  createdAt: device.createdAt.toISOString(),
});

export const bigintToString = (value: bigint | null | undefined): string | undefined => {
  if (value === null || value === undefined) return undefined;
  return value.toString();
};

export const toSyncRecordPayload = (
  record: {
    entityId: string;
    entityType: string;
    payload: unknown;
    version: bigint;
    deletedAt: Date | null;
    updatedAt: Date;
  }
): Record<string, unknown> => {
  const base =
    typeof record.payload === 'object' && record.payload !== null
      ? (record.payload as Record<string, unknown>)
      : {};
  return {
    ...base,
    id: record.entityId,
    entityType: record.entityType,
    version: record.version.toString(),
    deletedAt: record.deletedAt?.toISOString() ?? null,
    updatedAt: record.updatedAt.toISOString(),
  };
};
