import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

/**
 * Generic validation middleware. Pass a zod schema shaped like:
 *   z.object({ body: z.object({...}), query: z.object({...}), params: z.object({...}) })
 *
 * Only the keys present in the schema are parsed/replaced on req; anything else
 * passes through untouched. On failure, forwards a 400 ApiError with field-level details.
 */
export const validate =
  (schema: AnyZodObject) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
          field: e.path.filter((p) => p !== 'body').join('.'),
          message: e.message,
        }));
        return next(ApiError.badRequest('Validation failed', details));
      }
      next(err);
    }
  };
