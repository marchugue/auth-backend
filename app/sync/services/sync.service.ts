import { Prisma, SyncBatchStatus, SyncOperationStatus } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { ApiError } from '../../utils/ApiError';
import { isWritableRole } from '../config/conflictPolicy';
import * as batchModel from '../models/syncBatch.model';
import * as syncLogModel from '../models/syncLog.model';
import * as syncRecordModel from '../models/syncRecord.model';
import * as checkpointService from './checkpoint.service';
import * as conflictService from './conflict.service';
import * as deviceService from './device.service';
import {
  SyncContext,
  SyncOperationInput,
  SyncOperationResultDto,
  SyncPullQuery,
  SyncPullResponseDto,
  SyncPushInput,
  SyncPushResponseDto,
  SyncStatusResponseDto,
  SyncConflictSummaryDto,
} from '../types/sync.types';
import { hashPayload, toSyncRecordPayload } from '../utils/sync.utils';

const validateOperation = (op: SyncOperationInput): void => {
  if (op.operation === 'CREATE' && op.baseVersion !== null) {
    throw ApiError.badRequest('CREATE operations must have baseVersion null', {
      clientMutationId: op.clientMutationId,
    });
  }
  if ((op.operation === 'UPDATE' || op.operation === 'DELETE') && op.baseVersion === null) {
    throw ApiError.badRequest('UPDATE/DELETE operations require baseVersion', {
      clientMutationId: op.clientMutationId,
    });
  }
  if (op.operation === 'DELETE' && op.payload !== null) {
    throw ApiError.badRequest('DELETE operations must have null payload', {
      clientMutationId: op.clientMutationId,
    });
  }
  if ((op.operation === 'CREATE' || op.operation === 'UPDATE') && op.payload === null) {
    throw ApiError.badRequest('CREATE/UPDATE operations require payload', {
      clientMutationId: op.clientMutationId,
    });
  }
};

const mapBatchStatus = (
  applied: number,
  conflicts: number,
  errors: number,
  total: number
): SyncBatchStatus => {
  if (errors > 0 && applied === 0) return SyncBatchStatus.FAILED;
  if (conflicts > 0 || errors > 0) return SyncBatchStatus.PARTIAL;
  if (applied === total) return SyncBatchStatus.COMPLETED;
  return SyncBatchStatus.PARTIAL;
};

export const processPush = async (
  ctx: SyncContext,
  input: SyncPushInput
): Promise<SyncPushResponseDto> => {
  const { member } = await deviceService.validateBusinessAccess(input.businessId, ctx.userId);
  if (!isWritableRole(member.role)) {
    throw ApiError.forbidden('You do not have write permission for this business');
  }

  await deviceService.validateDeviceAccess(ctx.deviceId, ctx.userId, input.businessId);

  const payloadHash = hashPayload(input);
  const existingBatch = await batchModel.findBatchByIdempotencyKey(ctx.deviceId, ctx.idempotencyKey);

  if (existingBatch) {
    if (existingBatch.requestPayloadHash && existingBatch.requestPayloadHash !== payloadHash) {
      throw ApiError.conflict('Idempotency key reused with different payload');
    }
    if (existingBatch.responseSnapshot) {
      return existingBatch.responseSnapshot as unknown as SyncPushResponseDto;
    }
    if (existingBatch.status === SyncBatchStatus.PROCESSING) {
      throw ApiError.conflict('Batch is still processing');
    }
  }

  input.operations.forEach(validateOperation);

  const results: SyncOperationResultDto[] = [];
  const conflictSummaries: SyncConflictSummaryDto[] = [];
  let appliedCount = 0;
  let conflictCount = 0;
  let errorCount = 0;

  const response = await prisma.$transaction(async (tx) => {
    const batch = existingBatch
      ? existingBatch
      : await batchModel.createBatch(
          {
            idempotencyKey: ctx.idempotencyKey,
            requestPayloadHash: payloadHash,
            operationCount: input.operations.length,
            status: SyncBatchStatus.PROCESSING,
            device: { connect: { id: ctx.deviceId } },
            business: { connect: { id: input.businessId } },
            user: { connect: { id: ctx.userId } },
          },
          tx
        );

    for (const op of input.operations) {
      const priorApplied = await syncRecordModel.findAppliedMutation(
        ctx.deviceId,
        op.clientMutationId,
        tx
      );

      if (priorApplied) {
        results.push({
          clientMutationId: op.clientMutationId,
          status: 'SKIPPED',
          entityId: op.entityId,
        });
        continue;
      }

      try {
        const existing = await syncRecordModel.findSyncRecord(
          input.businessId,
          op.entityType,
          op.entityId,
          tx
        );

        if (existing && !existing.deletedAt) {
          const conflictCheck = await conflictService.tryAutoResolve(
            {
              businessId: input.businessId,
              entityType: op.entityType,
              entityId: op.entityId,
              deviceId: ctx.deviceId,
              userId: ctx.userId,
              operation: op,
              serverRecord: {
                version: existing.version,
                payload: existing.payload,
                deletedAt: existing.deletedAt,
              },
            },
            tx
          );

          if (conflictCheck.isConflict) {
            conflictCount++;
            await batchModel.createOperation(
              {
                batch: { connect: { id: batch.id } },
                clientMutationId: op.clientMutationId,
                entityType: op.entityType,
                entityId: op.entityId,
                operation: op.operation,
                baseVersion:
                  op.baseVersion !== null && op.baseVersion !== undefined
                    ? BigInt(op.baseVersion)
                    : null,
                payload: op.payload as Prisma.InputJsonValue,
                status: SyncOperationStatus.CONFLICT,
                serverVersion: conflictCheck.serverVersion,
                errorCode: 'VERSION_CONFLICT',
              },
              tx
            );

            results.push({
              clientMutationId: op.clientMutationId,
              status: 'CONFLICT',
              conflictId: conflictCheck.conflictId,
              serverVersion: conflictCheck.serverVersion?.toString(),
              entityId: op.entityId,
              errorCode: 'VERSION_CONFLICT',
            });

            if (conflictCheck.conflictId && existing) {
              conflictSummaries.push({
                conflictId: conflictCheck.conflictId,
                entityType: op.entityType,
                entityId: op.entityId,
                resolution: 'SERVER_WINS',
                serverSnapshot: toSyncRecordPayload({
                  entityId: existing.entityId,
                  entityType: existing.entityType,
                  payload: existing.payload,
                  version: existing.version,
                  deletedAt: existing.deletedAt,
                  updatedAt: existing.updatedAt,
                }),
              });
            }
            continue;
          }
        }

        const { version } = await conflictService.applyMutationToRecord(
          {
            businessId: input.businessId,
            entityType: op.entityType,
            entityId: op.entityId,
            operation: op.operation,
            payload: op.payload,
            deviceId: ctx.deviceId,
            userId: ctx.userId,
          },
          tx
        );

        await syncRecordModel.createAppliedMutation(
          {
            deviceId: ctx.deviceId,
            clientMutationId: op.clientMutationId,
            batchId: batch.id,
          },
          tx
        );

        await batchModel.createOperation(
          {
            batch: { connect: { id: batch.id } },
            clientMutationId: op.clientMutationId,
            entityType: op.entityType,
            entityId: op.entityId,
            operation: op.operation,
            baseVersion:
              op.baseVersion !== null && op.baseVersion !== undefined
                ? BigInt(op.baseVersion)
                : null,
            payload: op.payload as Prisma.InputJsonValue,
            status: SyncOperationStatus.APPLIED,
            serverVersion: version,
          },
          tx
        );

        appliedCount++;
        results.push({
          clientMutationId: op.clientMutationId,
          status: 'APPLIED',
          serverVersion: version.toString(),
          entityId: op.entityId,
        });
      } catch (err) {
        errorCount++;
        const errorCode = err instanceof ApiError ? String(err.statusCode) : 'INTERNAL_ERROR';
        const message = err instanceof Error ? err.message : 'Unknown error';

        await batchModel.createOperation(
          {
            batch: { connect: { id: batch.id } },
            clientMutationId: op.clientMutationId,
            entityType: op.entityType,
            entityId: op.entityId,
            operation: op.operation,
            baseVersion:
              op.baseVersion !== null && op.baseVersion !== undefined
                ? BigInt(op.baseVersion)
                : null,
            payload: op.payload as Prisma.InputJsonValue,
            status: SyncOperationStatus.REJECTED,
            errorCode,
          },
          tx
        );

        results.push({
          clientMutationId: op.clientMutationId,
          status: 'REJECTED',
          entityId: op.entityId,
          errorCode: message,
        });
      }
    }

    const checkpoint = await checkpointService.getLatestServerCursor(input.businessId);
    const batchStatus = mapBatchStatus(
      appliedCount,
      conflictCount,
      errorCount,
      input.operations.length
    );

    const pushResponse: SyncPushResponseDto = {
      batchId: batch.id,
      status: batchStatus as SyncPushResponseDto['status'],
      checkpoint,
      results,
      conflicts: conflictSummaries,
    };

    await batchModel.updateBatch(
      batch.id,
      {
        status: batchStatus,
        appliedCount,
        conflictCount,
        errorCount,
        completedAt: new Date(),
        responseSnapshot: pushResponse as unknown as Prisma.InputJsonValue,
      },
      tx
    );

    await syncLogModel.createSyncLog(
      {
        businessId: input.businessId,
        action: batchStatus === SyncBatchStatus.FAILED ? 'SYNC_BATCH_FAILED' : 'SYNC_BATCH_COMPLETED',
        userId: ctx.userId,
        deviceId: ctx.deviceId,
        batchId: batch.id,
        metadata: { appliedCount, conflictCount, errorCount },
        ipAddress: ctx.ipAddress,
      },
      tx
    );

    await syncLogModel.createSyncLog(
      {
        businessId: input.businessId,
        action: 'SYNC_PUSH',
        userId: ctx.userId,
        deviceId: ctx.deviceId,
        batchId: batch.id,
        metadata: { operationCount: input.operations.length },
        ipAddress: ctx.ipAddress,
      },
      tx
    );

    return pushResponse;
  });

  await checkpointService.updateCheckpoint(ctx.deviceId, input.businessId, response.checkpoint);

  return response;
};

export const processPull = async (
  ctx: SyncContext,
  query: SyncPullQuery
): Promise<SyncPullResponseDto> => {
  const { member } = await deviceService.validateBusinessAccess(query.businessId, ctx.userId);
  if (!member) throw ApiError.forbidden();

  await deviceService.validateDeviceAccess(ctx.deviceId, ctx.userId, query.businessId);

  const cursor = checkpointService.parseChangeCursor(query.cursor);
  const rows = await syncRecordModel.findChangesSince(
    query.businessId,
    cursor,
    query.limit,
    query.entityTypes
  );

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  const changes = page.map((row) => ({
    cursor: row.id.toString(),
    entityType: row.entityType,
    entityId: row.entityId,
    operation: row.operation as 'CREATE' | 'UPDATE' | 'DELETE',
    version: row.version.toString(),
    changedAt: row.changedAt.toISOString(),
    payload: row.payload as Record<string, unknown> | null,
  }));

  const nextCursor = changes.length > 0 ? changes[changes.length - 1].cursor : query.cursor;

  if (changes.length > 0) {
    await checkpointService.updateCheckpoint(ctx.deviceId, query.businessId, nextCursor);
  }

  await syncLogModel.createSyncLog({
    businessId: query.businessId,
    action: 'SYNC_PULL',
    userId: ctx.userId,
    deviceId: ctx.deviceId,
    metadata: { cursor: query.cursor, nextCursor, count: changes.length },
    ipAddress: ctx.ipAddress,
  });

  return {
    changes,
    nextCursor,
    hasMore,
    serverTime: new Date().toISOString(),
  };
};

export const getSyncStatus = async (
  ctx: SyncContext,
  businessId: string
): Promise<SyncStatusResponseDto> => {
  await deviceService.validateBusinessAccess(businessId, ctx.userId);
  await deviceService.validateDeviceAccess(ctx.deviceId, ctx.userId, businessId);

  const [checkpoint, latestCursor, pendingConflicts, lastBatch, device] = await Promise.all([
    checkpointService.getCheckpoint(ctx.deviceId, businessId),
    checkpointService.getLatestServerCursor(businessId),
    conflictService.countOpenConflicts(businessId),
    batchModel.findLatestBatchForDevice(ctx.deviceId, businessId),
    prisma.device.findUnique({ where: { id: ctx.deviceId } }),
  ]);

  return {
    deviceId: ctx.deviceId,
    businessId,
    lastSyncAt: device?.lastSyncAt?.toISOString() ?? null,
    checkpoint: checkpoint.cursor,
    latestServerCursor: latestCursor,
    pendingConflicts,
    lastBatch: lastBatch
      ? {
          batchId: lastBatch.id,
          status: lastBatch.status,
          completedAt: lastBatch.completedAt?.toISOString() ?? null,
        }
      : null,
    serverTime: new Date().toISOString(),
  };
};
