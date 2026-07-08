import {
  ConflictResolutionStatus,
  ConflictResolutionStrategy,
  Prisma,
  SyncOperationType,
} from '@prisma/client';
import { ApiError } from '../../utils/ApiError';
import { getConflictPolicy } from '../config/conflictPolicy';
import * as conflictModel from '../models/syncConflict.model';
import * as syncLogModel from '../models/syncLog.model';
import * as syncRecordModel from '../models/syncRecord.model';
import { SyncConflictDto, SyncOperationInput } from '../types/sync.types';
import { bigintToString } from '../utils/sync.utils';

export interface ConflictDetectionResult {
  isConflict: boolean;
  conflictId?: string;
  autoResolved?: boolean;
  serverVersion?: bigint;
}

export const detectVersionConflict = (
  serverVersion: bigint,
  baseVersion: bigint | null | undefined
): boolean => {
  if (baseVersion === null || baseVersion === undefined) return false;
  return serverVersion !== BigInt(baseVersion);
};

export const recordConflict = async (
  params: {
    businessId: string;
    entityType: string;
    entityId: string;
    deviceId: string;
    userId: string;
    clientMutationId: string;
    serverVersion: bigint;
    clientBaseVersion: bigint | null;
    clientPayload: Record<string, unknown>;
    serverSnapshot: Record<string, unknown>;
    resolutionStrategy: ConflictResolutionStrategy;
  },
  tx: Prisma.TransactionClient
) => {
  const conflict = await conflictModel.createConflict(
    {
      business: { connect: { id: params.businessId } },
      entityType: params.entityType,
      entityId: params.entityId,
      device: { connect: { id: params.deviceId } },
      user: { connect: { id: params.userId } },
      clientMutationId: params.clientMutationId,
      serverVersion: params.serverVersion,
      clientBaseVersion: params.clientBaseVersion,
      clientPayload: params.clientPayload as Prisma.InputJsonValue,
      serverSnapshot: params.serverSnapshot as Prisma.InputJsonValue,
      resolutionStrategy: params.resolutionStrategy,
      resolutionStatus: ConflictResolutionStatus.OPEN,
    },
    tx
  );

  await syncLogModel.createSyncLog(
    {
      businessId: params.businessId,
      action: 'CONFLICT_DETECTED',
      userId: params.userId,
      deviceId: params.deviceId,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: { conflictId: conflict.id, strategy: params.resolutionStrategy },
    },
    tx
  );

  return conflict;
};

export const tryAutoResolve = async (
  params: {
    businessId: string;
    entityType: string;
    entityId: string;
    deviceId: string;
    userId: string;
    operation: SyncOperationInput;
    serverRecord: {
      version: bigint;
      payload: unknown;
      deletedAt: Date | null;
    };
  },
  tx: Prisma.TransactionClient
): Promise<ConflictDetectionResult> => {
  const policy = getConflictPolicy(params.entityType);
  const serverVersion = params.serverRecord.version;
  const baseVersion =
    params.operation.baseVersion !== null && params.operation.baseVersion !== undefined
      ? BigInt(params.operation.baseVersion)
      : null;

  if (!detectVersionConflict(serverVersion, baseVersion)) {
    return { isConflict: false, serverVersion };
  }

  const serverSnapshot = {
    ...(typeof params.serverRecord.payload === 'object' && params.serverRecord.payload !== null
      ? (params.serverRecord.payload as Record<string, unknown>)
      : {}),
    version: serverVersion.toString(),
    deletedAt: params.serverRecord.deletedAt?.toISOString() ?? null,
  };

  if (policy.autoResolve && policy.default === 'LWW') {
    const clientTs = params.operation.clientTimestamp
      ? new Date(params.operation.clientTimestamp).getTime()
      : 0;
    const serverTs = params.serverRecord.deletedAt
      ? params.serverRecord.deletedAt.getTime()
      : Date.now();

    if (clientTs >= serverTs) {
      return { isConflict: false, serverVersion, autoResolved: true };
    }
  }

  if (policy.autoResolve && policy.default === 'SERVER_WINS') {
    const conflict = await recordConflict(
      {
        businessId: params.businessId,
        entityType: params.entityType,
        entityId: params.entityId,
        deviceId: params.deviceId,
        userId: params.userId,
        clientMutationId: params.operation.clientMutationId,
        serverVersion,
        clientBaseVersion: baseVersion,
        clientPayload: (params.operation.payload ?? {}) as Record<string, unknown>,
        serverSnapshot,
        resolutionStrategy: policy.default,
      },
      tx
    );
    return { isConflict: true, conflictId: conflict.id, serverVersion };
  }

  const conflict = await recordConflict(
    {
      businessId: params.businessId,
      entityType: params.entityType,
      entityId: params.entityId,
      deviceId: params.deviceId,
      userId: params.userId,
      clientMutationId: params.operation.clientMutationId,
      serverVersion,
      clientBaseVersion: baseVersion,
      clientPayload: (params.operation.payload ?? {}) as Record<string, unknown>,
      serverSnapshot,
      resolutionStrategy: policy.default,
    },
    tx
  );

  return { isConflict: true, conflictId: conflict.id, serverVersion };
};

export const listConflicts = async (
  businessId: string,
  options: { status: ConflictResolutionStatus; page: number; limit: number }
): Promise<{ conflicts: SyncConflictDto[]; total: number }> => {
  const skip = (options.page - 1) * options.limit;
  const [rows, total] = await conflictModel.findOpenConflicts(businessId, {
    status: options.status,
    skip,
    take: options.limit,
  });

  return {
    total,
    conflicts: rows.map((c) => ({
      id: c.id,
      entityType: c.entityType,
      entityId: c.entityId,
      deviceId: c.deviceId,
      clientMutationId: c.clientMutationId,
      serverVersion: c.serverVersion.toString(),
      clientBaseVersion: bigintToString(c.clientBaseVersion) ?? null,
      clientPayload: c.clientPayload as Record<string, unknown>,
      serverSnapshot: c.serverSnapshot as Record<string, unknown>,
      resolutionStrategy: c.resolutionStrategy,
      resolutionStatus: c.resolutionStatus,
      createdAt: c.createdAt.toISOString(),
    })),
  };
};

export const countOpenConflicts = (businessId: string) =>
  conflictModel.countOpenConflicts(businessId);

export const applyMutationToRecord = async (
  params: {
    businessId: string;
    entityType: string;
    entityId: string;
    operation: SyncOperationType;
    payload: Record<string, unknown> | null;
    deviceId: string;
    userId: string;
  },
  tx: Prisma.TransactionClient
): Promise<{ version: bigint; record: Awaited<ReturnType<typeof syncRecordModel.findSyncRecord>> }> => {
  const existing = await syncRecordModel.findSyncRecord(
    params.businessId,
    params.entityType,
    params.entityId,
    tx
  );

  if (params.operation === 'CREATE') {
    if (existing && !existing.deletedAt) {
      throw ApiError.conflict('Entity already exists', { entityId: params.entityId });
    }
    const record = existing
      ? await syncRecordModel.updateSyncRecord(
          params.businessId,
          params.entityType,
          params.entityId,
          {
            payload: (params.payload ?? {}) as Prisma.InputJsonValue,
            version: existing.version + BigInt(1),
            deletedAt: null,
            lastModifiedByDevice: params.deviceId,
            lastModifiedByUser: params.userId,
          },
          tx
        )
      : await syncRecordModel.createSyncRecord(
          {
            businessId: params.businessId,
            entityType: params.entityType,
            entityId: params.entityId,
            payload: (params.payload ?? {}) as Prisma.InputJsonValue,
            lastModifiedByDevice: params.deviceId,
            lastModifiedByUser: params.userId,
          },
          tx
        );

    await syncRecordModel.appendChangeLog(
      {
        businessId: params.businessId,
        entityType: params.entityType,
        entityId: params.entityId,
        operation: 'CREATE',
        version: record.version,
        payload: record.payload as Prisma.InputJsonValue,
        deviceId: params.deviceId,
        userId: params.userId,
      },
      tx
    );

    return { version: record.version, record };
  }

  if (!existing || existing.deletedAt) {
    throw ApiError.notFound('Entity not found for update/delete', {
      entityType: params.entityType,
      entityId: params.entityId,
    });
  }

  if (params.operation === 'DELETE') {
    const newVersion = existing.version + BigInt(1);
    const record = await syncRecordModel.updateSyncRecord(
      params.businessId,
      params.entityType,
      params.entityId,
      {
        version: newVersion,
        deletedAt: new Date(),
        lastModifiedByDevice: params.deviceId,
        lastModifiedByUser: params.userId,
      },
      tx
    );

    await syncRecordModel.appendChangeLog(
      {
        businessId: params.businessId,
        entityType: params.entityType,
        entityId: params.entityId,
        operation: 'DELETE',
        version: newVersion,
        payload: record.payload as Prisma.InputJsonValue,
        deviceId: params.deviceId,
        userId: params.userId,
      },
      tx
    );

    return { version: newVersion, record };
  }

  const newVersion = existing.version + BigInt(1);
  const record = await syncRecordModel.updateSyncRecord(
    params.businessId,
    params.entityType,
    params.entityId,
    {
      payload: (params.payload ?? existing.payload) as Prisma.InputJsonValue,
      version: newVersion,
      lastModifiedByDevice: params.deviceId,
      lastModifiedByUser: params.userId,
    },
    tx
  );

  await syncRecordModel.appendChangeLog(
    {
      businessId: params.businessId,
      entityType: params.entityType,
      entityId: params.entityId,
      operation: 'UPDATE',
      version: newVersion,
      payload: record.payload as Prisma.InputJsonValue,
      deviceId: params.deviceId,
      userId: params.userId,
    },
    tx
  );

  return { version: newVersion, record };
};
