import { z } from 'zod';

/** ---------- Zod validation schemas ---------- */
/** Each schema validates the shape { body, query, params } — see validate.middleware.ts */

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
  }),
});

export const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>['body'];
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>['body'];

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
