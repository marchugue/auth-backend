import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { env } from '../config/env';

const cloudEnv = dotenv.config({ path: path.resolve(process.cwd(), '.env.cloud') }).parsed || {};
const cloudUrl = env.cloudDatabaseUrl || cloudEnv.DATABASE_URL;

if (!cloudUrl) {
  throw new Error('CLOUD_DATABASE_URL or .env.cloud DATABASE_URL is required to initialize cloudPrisma.');
}

export const cloudPrisma = new PrismaClient({
  datasources: { db: { url: cloudUrl } },
});