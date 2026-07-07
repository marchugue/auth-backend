import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

/**
 * Wraps an async Express handler so that any rejected promise / thrown error
 * is forwarded to next(), instead of crashing the process or hanging the request.
 *
 *   router.get('/me', asyncHandler(async (req, res) => { ... }));
 */
export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
