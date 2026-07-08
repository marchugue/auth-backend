import * as checkpointModel from '../models/syncCheckpoint.model';
import * as deviceModel from '../models/device.model';
import { SyncPullResponseDto } from '../types/sync.types';
import { bigintToString } from '../utils/sync.utils';

export const getCheckpoint = async (deviceId: string, _businessId: string) => {
  const checkpoint = await checkpointModel.findCheckpoint(deviceId);
  if (!checkpoint) {
    return { cursor: '0', serverVersion: '0' };
  }
  return {
    cursor: checkpoint.cursor,
    serverVersion: checkpoint.serverVersion.toString(),
  };
};

export const updateCheckpoint = async (
  deviceId: string,
  businessId: string,
  cursor: string,
  serverVersion?: bigint
) => {
  await checkpointModel.upsertCheckpoint({
    deviceId,
    businessId,
    cursor,
    serverVersion,
  });
  await deviceModel.updateDeviceLastSync(deviceId);
};

export const getLatestServerCursor = (businessId: string) =>
  checkpointModel.getLatestServerCursor(businessId);

export const buildPullCursorState = async (
  deviceId: string,
  businessId: string,
  nextCursor: string
): Promise<Pick<SyncPullResponseDto, 'nextCursor'>> => {
  await updateCheckpoint(deviceId, businessId, nextCursor);
  return { nextCursor };
};

export const formatChangeCursor = (id: bigint): string => id.toString();

export const parseChangeCursor = (cursor: string): bigint => {
  try {
    return BigInt(cursor);
  } catch {
    return BigInt(0);
  }
};

export { bigintToString };
