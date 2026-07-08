import { z } from 'zod';

/** ---------- Zod validation schemas ---------- */
/** Each schema validates the shape { body, query, params } — see validate.middleware.ts */

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    username: z.string().min(1, 'Username is required'),
    password: z
      .string()
      .min(5, 'Password must be at least 5 characters'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];

/** ---------- JWT payloads ---------- */

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  role: 'USER' | 'ADMIN';
}

export interface RefreshTokenPayload {
  sub: string; // user id
  sessionId: string; // Session row id in the database
}

/** ---------- Public-facing user shape (never includes password or tokens) ---------- */

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
  isEmailVerified: boolean;
  createdAt: Date;
}

/** ---------- Express request augmentation ---------- */
/** Populated by the `authenticate` middleware after verifying the access token. */

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}
