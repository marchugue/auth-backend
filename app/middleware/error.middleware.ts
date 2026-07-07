import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

// Must keep all four parameters — Express only recognizes this as an error
// handler (rather than regular middleware) when the arity is exactly 4.
export const errorHandler = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: unknown;
  let isOperational = false;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
    isOperational = err.isOperational;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
    isOperational = true;
  } else if (err.message) {
    message = err.message;
  }

  if (!isOperational) {
    // Unexpected errors are always logged server-side, regardless of environment.
    console.error('🔥 Unhandled error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(!env.isProduction && !isOperational ? { stack: err.stack } : {}),
  });
};
