import { ConflictResolutionStrategy } from '@prisma/client';

export type EntityConflictPolicy = {
  default: ConflictResolutionStrategy;
  autoResolve?: boolean;
};

/**
 * Per-entity-type conflict resolution policies.
 * Version-based detection is always used; these policies control auto-resolution.
 */
export const conflictPolicy: Record<string, EntityConflictPolicy> = {
  record: { default: 'SERVER_WINS', autoResolve: true },
};

export const getConflictPolicy = (entityType: string): EntityConflictPolicy => {
  return conflictPolicy[entityType] ?? { default: 'SERVER_WINS', autoResolve: true };
};

export const isWritableRole = (role: string): boolean => {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER';
};

export const isReadableRole = (role: string): boolean => {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER' || role === 'READONLY';
};
