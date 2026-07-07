import { hashPassword, comparePassword, generateSecureToken, hashToken } from '../../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { parseDurationToMs } from '../../utils/duration';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../utils/mailer';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import {
  findUserByEmail,
  findUserById,
  findUserByVerificationToken,
  findUserByResetToken,
  createUser,
  updateUser,
  resetPasswordAndRevokeSessions,
} from '../models/user.model';
import {
  createSessionRecord,
  updateSessionToken,
  findSessionById,
  deleteSessionById,
  deleteSessionsByUserId,
} from '../models/session.model';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
  ResendVerificationInput,
  PublicUser,
} from '../types/auth.types';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
  isEmailVerified: boolean;
  createdAt: Date;
}

const toPublicUser = (user: UserRecord): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
});

interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

const createSession = async (
  userId: string,
  email: string,
  role: 'USER' | 'ADMIN',
  meta: SessionMeta
): Promise<AuthTokens> => {
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.jwt.refreshExpiry));

  const session = await createSessionRecord({
    userId,
    refreshToken: '',
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
    expiresAt,
  });

  const refreshToken = signRefreshToken({ sub: userId, sessionId: session.id });
  const accessToken = signAccessToken({ sub: userId, email, role });

  await updateSessionToken(session.id, hashToken(refreshToken));

  return { accessToken, refreshToken, refreshTokenExpiresAt: expiresAt };
};

export const registerUser = async (input: RegisterInput, meta: SessionMeta) => {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const hashedPassword = await hashPassword(input.password);
  const { raw: verificationToken, hashed: hashedVerificationToken } = generateSecureToken();

  const user = await createUser({
    email: input.email,
    password: hashedPassword,
    name: input.name,
    emailVerificationToken: hashedVerificationToken,
    emailVerificationExpiry: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
  });

  await sendVerificationEmail(user.email, verificationToken);

  const tokens = await createSession(user.id, user.email, user.role, meta);

  return { user: toPublicUser(user), tokens };
};

export const loginUser = async (input: LoginInput, meta: SessionMeta) => {
  const user = await findUserByEmail(input.email);
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await comparePassword(input.password, user.password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (env.requireEmailVerification && !user.isEmailVerified) {
    throw ApiError.forbidden('Please verify your email before logging in');
  }

  const tokens = await createSession(user.id, user.email, user.role, meta);

  return { user: toPublicUser(user), tokens };
};

export const refreshSession = async (refreshTokenRaw: string, meta: SessionMeta) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshTokenRaw);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const session = await findSessionById(decoded.sessionId);

  const isValid =
    !!session && session.refreshToken === hashToken(refreshTokenRaw) && session.expiresAt > new Date();

  if (!isValid) {
    if (session) await deleteSessionById(session.id);
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await findUserById(session!.userId);
  if (!user) {
    await deleteSessionById(session!.id);
    throw ApiError.unauthorized('User no longer exists');
  }

  await deleteSessionById(session!.id);
  const tokens = await createSession(user.id, user.email, user.role, meta);

  return { user: toPublicUser(user), tokens };
};

export const logoutSession = async (refreshTokenRaw: string): Promise<void> => {
  try {
    const decoded = verifyRefreshToken(refreshTokenRaw);
    await deleteSessionById(decoded.sessionId);
  } catch {
    // Token already invalid/expired — nothing to clean up.
  }
};

export const logoutAllSessions = async (userId: string): Promise<void> => {
  await deleteSessionsByUserId(userId);
};

export const getCurrentUser = async (userId: string): Promise<PublicUser> => {
  const user = await findUserById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return toPublicUser(user);
};

export const verifyEmail = async (input: VerifyEmailInput): Promise<void> => {
  const hashed = hashToken(input.token);
  const user = await findUserByVerificationToken(hashed);

  if (!user) {
    throw ApiError.badRequest('Invalid or expired verification token');
  }

  await updateUser(user.id, {
    isEmailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpiry: null,
  });
};

export const resendVerification = async (input: ResendVerificationInput): Promise<void> => {
  const user = await findUserByEmail(input.email);
  if (!user || user.isEmailVerified) return;

  const { raw, hashed } = generateSecureToken();

  await updateUser(user.id, {
    emailVerificationToken: hashed,
    emailVerificationExpiry: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
  });

  await sendVerificationEmail(user.email, raw);
};

export const forgotPassword = async (input: ForgotPasswordInput): Promise<void> => {
  const user = await findUserByEmail(input.email);
  if (!user) return;

  const { raw, hashed } = generateSecureToken();

  await updateUser(user.id, {
    passwordResetToken: hashed,
    passwordResetExpiry: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  await sendPasswordResetEmail(user.email, raw);
};

export const resetPassword = async (input: ResetPasswordInput): Promise<void> => {
  const hashed = hashToken(input.token);
  const user = await findUserByResetToken(hashed);

  if (!user) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  const hashedPassword = await hashPassword(input.password);
  await resetPasswordAndRevokeSessions(user.id, hashedPassword);
};