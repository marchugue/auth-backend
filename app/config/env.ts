import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  REFRESH_TOKEN_COOKIE_NAME: z.string().default('refresh_token'),

  CLIENT_URL: z.string().default('http://localhost:3000'),

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.string().optional().default('587'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default('No Reply <no-reply@example.com>'),

  REQUIRE_EMAIL_VERIFICATION: z.string().optional().default('false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast and loudly if required env vars are missing/invalid.
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

export const env = {
  nodeEnv: data.NODE_ENV,
  port: parseInt(data.PORT, 10),
  isProduction: data.NODE_ENV === 'production',

  databaseUrl: data.DATABASE_URL,

  jwt: {
    accessSecret: data.JWT_ACCESS_SECRET,
    accessExpiry: data.JWT_ACCESS_EXPIRY,
    refreshSecret: data.JWT_REFRESH_SECRET,
    refreshExpiry: data.JWT_REFRESH_EXPIRY,
    refreshCookieName: data.REFRESH_TOKEN_COOKIE_NAME,
  },

  clientUrl: data.CLIENT_URL,

  smtp: {
    host: data.SMTP_HOST,
    port: parseInt(data.SMTP_PORT, 10),
    user: data.SMTP_USER,
    pass: data.SMTP_PASS,
    from: data.SMTP_FROM,
  },

  requireEmailVerification: data.REQUIRE_EMAIL_VERIFICATION === 'true',
};
