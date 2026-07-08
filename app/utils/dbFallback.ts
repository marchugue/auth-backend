import { PrismaClient } from '@prisma/client';
import { prisma } from './prisma';
import { cloudPrisma } from './cloudPrisma';
import { env } from '../config/env';

export type DbTarget = 'local' | 'cloud';

const isReachable = async (client: PrismaClient): Promise<boolean> => {
  try {
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
};

export const isLocalDbReachable = async (): Promise<boolean> => isReachable(prisma);

export const isCloudDbReachable = async (): Promise<boolean> => {
  if (!env.cloudDatabaseUrl) return false;
  return isReachable(cloudPrisma);
};

export const executeRead = async <T>(operation: (db: PrismaClient) => Promise<T>): Promise<{ result: T; target: DbTarget }> => {
  if (await isLocalDbReachable()) {
    return { result: await operation(prisma), target: 'local' };
  }

  if (await isCloudDbReachable()) {
    return { result: await operation(cloudPrisma), target: 'cloud' };
  }

  throw new Error('No reachable database available for read operation.');
};

export const executeWrite = async <T>(operation: (db: PrismaClient) => Promise<T>): Promise<{ result: T; target: DbTarget }> => {
  if (await isLocalDbReachable()) {
    return { result: await operation(prisma), target: 'local' };
  }

  if (await isCloudDbReachable()) {
    return { result: await operation(cloudPrisma), target: 'cloud' };
  }

  throw new Error('No reachable database available for write operation.');
};
