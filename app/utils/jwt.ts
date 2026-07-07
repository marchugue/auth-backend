import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AccessTokenPayload, RefreshTokenPayload } from '../auth/types/auth.types';

export const signAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiry,
  } as SignOptions);
};

export const signRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiry,
  } as SignOptions);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenPayload;
};
