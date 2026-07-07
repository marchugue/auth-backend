import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

const cloudEnv = dotenv.config({ path: path.resolve(process.cwd(), '.env.cloud') }).parsed || {};

export const cloudPrisma = new PrismaClient({
  datasources: { db: { url: cloudEnv.DATABASE_URL } },
});