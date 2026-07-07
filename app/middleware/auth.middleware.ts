import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Verifies the Bearer access token in the Authorization header and attaches
 * the decoded payload to req.user. Use on any route that requires a logged-in user.
 *
 *   router.get('/me', authenticate, controller.me);
 */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('No access token provided');
  }

  const token = header.split(' ')[1];

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token');
  }
});

/**
 * Optional role guard. Must run after `authenticate`.
 *
 *   router.delete('/users/:id', authenticate, requireRole('ADMIN'), controller.remove);
 */
export const requireRole =
  (...roles: Array<'USER' | 'ADMIN'>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
