import { hashPassword, comparePassword, hashToken } from '../../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { parseDurationToMs } from '../../utils/duration';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import {
  findUserByUsername,
  findUserById,
  createUser,
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
  PublicUser,
} from '../types/auth.types';



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
  const existing = await findUserByUsername(input.username);
  if (existing) {
    throw ApiError.conflict('An account with this username already exists');
  }

  const hashedPassword = await hashPassword(input.password);

  const user = await createUser({
    username: input.username,
    password: hashedPassword,
    name: input.name,
  });

  const tokens = await createSession(user.id, user.email, user.role, meta);

  return { user: toPublicUser(user), tokens };
};

export const loginUser = async (input: LoginInput, meta: SessionMeta) => {
  const user = await findUserByUsername(input.username);
  if (!user) {
    throw ApiError.unauthorized('Invalid username or password');
  }

  const isMatch = await comparePassword(input.password, user.password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid username or password');
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
