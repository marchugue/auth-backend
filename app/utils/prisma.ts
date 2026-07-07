import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

// Prevent creating a new PrismaClient on every hot-reload in development.
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    log: env.isProduction ? ['error'] : ['error', 'warn'],
  });

if (!env.isProduction) {
  global.prismaGlobal = prisma;
}
