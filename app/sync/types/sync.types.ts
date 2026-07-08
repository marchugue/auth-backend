import { z } from 'zod';

/** ---------- Constants ---------- */

export const SYNC_ENTITY_TYPES = ['record'] as const;
export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

export const MAX_SYNC_OPERATIONS_PER_BATCH = 500;
export const MAX_SYNC_PULL_LIMIT = 1000;
export const DEFAULT_SYNC_PULL_LIMIT = 200;

/** ---------- Request validation schemas ---------- */

export const registerDeviceSchema = z.object({
  body: z.object({
    deviceId: z.string().uuid('deviceId must be a valid UUID'),
    businessId: z.string().uuid('businessId must be a valid UUID').optional(),
    businessName: z.string().min(1).max(255).optional(),
    deviceName: z.string().min(1).max(255).optional(),
    deviceType: z.enum(['DESKTOP', 'MOBILE', 'POS', 'WEB']).default('DESKTOP'),
    platform: z.string().max(100).optional(),
    appVersion: z.string().max(50).optional(),
  }),
});

export const syncOperationSchema = z.object({
  clientMutationId: z.string().min(1).max(255),
  entityType: z.string().min(1).max(100),
  entityId: z.string().uuid('entityId must be a valid UUID'),
  operation: z.enum(['CREATE', 'UPDATE', 'DELETE']),
  baseVersion: z.number().int().nonnegative().nullable(),
  payload: z.record(z.unknown()).nullable(),
  clientTimestamp: z.string().datetime({ offset: true }).optional(),
});

export const syncPushSchema = z.object({
  body: z.object({
    businessId: z.string().uuid('businessId must be a valid UUID'),
    operations: z
      .array(syncOperationSchema)
      .min(1, 'At least one operation is required')
      .max(MAX_SYNC_OPERATIONS_PER_BATCH, `Maximum ${MAX_SYNC_OPERATIONS_PER_BATCH} operations per batch`),
  }),
});

export const syncPullSchema = z.object({
  query: z.object({
    businessId: z.string().uuid('businessId must be a valid UUID'),
    cursor: z.string().regex(/^\d+$/, 'cursor must be a non-negative integer string').optional().default('0'),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : DEFAULT_SYNC_PULL_LIMIT))
      .pipe(z.number().int().min(1).max(MAX_SYNC_PULL_LIMIT)),
    entityTypes: z
      .string()
      .optional()
      .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined)),
  }),
});

export const syncStatusSchema = z.object({
  query: z.object({
    businessId: z.string().uuid('businessId must be a valid UUID'),
  }),
});

export const syncConflictsSchema = z.object({
  query: z.object({
    businessId: z.string().uuid('businessId must be a valid UUID'),
    status: z.enum(['OPEN', 'RESOLVED', 'DISCARDED']).optional().default('OPEN'),
    page: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 1))
      .pipe(z.number().int().min(1)),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 50))
      .pipe(z.number().int().min(1).max(100)),
  }),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>['body'];
export type SyncPushInput = z.infer<typeof syncPushSchema>['body'];
export type SyncOperationInput = z.infer<typeof syncOperationSchema>;
export type SyncPullQuery = z.infer<typeof syncPullSchema>['query'];
export type SyncStatusQuery = z.infer<typeof syncStatusSchema>['query'];
export type SyncConflictsQuery = z.infer<typeof syncConflictsSchema>['query'];

/** ---------- Response DTOs ---------- */

export interface DeviceDto {
  id: string;
  businessId: string;
  userId: string;
  deviceName: string | null;
  deviceType: string;
  platform: string | null;
  appVersion: string | null;
  lastSyncAt: string | null;
  lastSeenAt: string | null;
  isRevoked: boolean;
  createdAt: string;
}

export interface SyncOperationResultDto {
  clientMutationId: string;
  status: 'APPLIED' | 'CONFLICT' | 'REJECTED' | 'SKIPPED';
  serverVersion?: string;
  entityId?: string;
  conflictId?: string;
  errorCode?: string;
}

export interface SyncConflictSummaryDto {
  conflictId: string;
  entityType: string;
  entityId: string;
  resolution: string;
  serverSnapshot: Record<string, unknown>;
}

export interface SyncPushResponseDto {
  batchId: string;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'PROCESSING';
  checkpoint: string;
  results: SyncOperationResultDto[];
  conflicts: SyncConflictSummaryDto[];
}

export interface SyncPullChangeDto {
  cursor: string;
  entityType: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  version: string;
  changedAt: string;
  payload: Record<string, unknown> | null;
}

export interface SyncPullResponseDto {
  changes: SyncPullChangeDto[];
  nextCursor: string;
  hasMore: boolean;
  serverTime: string;
}

export interface SyncStatusResponseDto {
  deviceId: string;
  businessId: string;
  lastSyncAt: string | null;
  checkpoint: string;
  latestServerCursor: string;
  pendingConflicts: number;
  lastBatch: {
    batchId: string;
    status: string;
    completedAt: string | null;
  } | null;
  serverTime: string;
}

export interface SyncConflictDto {
  id: string;
  entityType: string;
  entityId: string;
  deviceId: string;
  clientMutationId: string;
  serverVersion: string;
  clientBaseVersion: string | null;
  clientPayload: Record<string, unknown>;
  serverSnapshot: Record<string, unknown>;
  resolutionStrategy: string | null;
  resolutionStatus: string;
  createdAt: string;
}

export interface SyncConflictsListResponseDto {
  conflicts: SyncConflictDto[];
  page: number;
  limit: number;
  total: number;
}

/** ---------- Internal types ---------- */

export interface SyncContext {
  userId: string;
  deviceId: string;
  businessId: string;
  ipAddress?: string;
  idempotencyKey: string;
}

export interface BusinessAccess {
  businessId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'READONLY';
}

/** ---------- Express request augmentation ---------- */

declare global {
  namespace Express {
    interface Request {
      device?: {
        id: string;
        businessId: string;
        userId: string;
        isRevoked: boolean;
      };
      businessAccess?: BusinessAccess;
      idempotencyKey?: string;
    }
  }
}

export {};
