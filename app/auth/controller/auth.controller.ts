import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';
import * as authService from '../services/auth.service';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax' as const,
  path: '/api/auth', // only sent back on auth routes (refresh/logout)
};

const setRefreshCookie = (res: Response, token: string, expiresAt: Date): void => {
  res.cookie(env.jwt.refreshCookieName, token, {
    ...REFRESH_COOKIE_OPTIONS,
    expires: expiresAt,
  });
};

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(env.jwt.refreshCookieName, REFRESH_COOKIE_OPTIONS);
};

const getSessionMeta = (req: Request) => ({
  userAgent: req.headers['user-agent'],
  ipAddress: req.ip,
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.registerUser(req.body, getSessionMeta(req));
  setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt);

  res.status(201).json({
    success: true,
    message: 'Account created. Please check your email to verify your address.',
    data: { user, accessToken: tokens.accessToken },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.loginUser(req.body, getSessionMeta(req));
  setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt);

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: { user, accessToken: tokens.accessToken },
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[env.jwt.refreshCookieName];
  if (!token) {
    throw ApiError.unauthorized('No refresh token provided');
  }

  const { user, tokens } = await authService.refreshSession(token, getSessionMeta(req));
  setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt);

  res.status(200).json({
    success: true,
    message: 'Session refreshed',
    data: { user, accessToken: tokens.accessToken },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[env.jwt.refreshCookieName];
  if (token) {
    await authService.logoutSession(token);
  }
  clearRefreshCookie(res);

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await authService.logoutAllSessions(req.user.sub);
  clearRefreshCookie(res);

  res.status(200).json({ success: true, message: 'Logged out from all devices' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await authService.getCurrentUser(req.user.sub);

  res.status(200).json({ success: true, data: { user } });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.body);
  res.status(200).json({ success: true, message: 'Email verified successfully' });
});

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  await authService.resendVerification(req.body);
  res.status(200).json({
    success: true,
    message: 'If an account with that email exists and is unverified, a new link has been sent.',
  });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body);
  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body);
  res.status(200).json({
    success: true,
    message: 'Password reset successfully. Please log in again.',
  });
});
