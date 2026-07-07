import app from './app';
 import { env } from './app/config/env';
 import { prisma } from './app/utils/prisma';
 import { cloudPrisma } from './app/utils/cloudPrisma';
 import { startSyncWorker } from './app/utils/syncQueue';

 const server = app.listen(env.port, () => {
   console.log(`🚀 Server running in ${env.nodeEnv} mode on http://localhost:${env.port}`);
   startSyncWorker();
   console.log('🔄 Cloud sync worker started (retries every 30s if offline).');
 });

 const shutdown = (signal: string): void => {
   console.log(`\n${signal} received. Shutting down gracefully...`);
   server.close(async () => {
     await prisma.$disconnect();
     await cloudPrisma.$disconnect();
     console.log('✅ Server closed, DB connection released.');
     process.exit(0);
   });
 };