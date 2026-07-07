import { execSync } from 'child_process';

try {
  execSync('dotenv -e .env.cloud -- prisma migrate deploy', { stdio: 'inherit' });
} catch (err) {
  console.warn('\n⚠️  Cloud DB (Neon) unreachable — skipping cloud sync.');
  console.warn('   Local migration was still applied. Just run `npm run db:sync` again');
  console.warn('   once you\'re online — Prisma tracks applied migrations, so it resumes');
  console.warn('   from wherever it left off, no manual cleanup needed.\n');
  process.exit(0); // don't fail the whole chain when offline
}