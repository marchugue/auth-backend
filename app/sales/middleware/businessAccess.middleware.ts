import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { findBusinessById, findBusinessMember } from '../../sync/models/business.model';
import { isReadableRole, isWritableRole } from '../../sync/config/conflictPolicy';

const resolveBusinessId = (req: Request): string | undefined => {
  return (
    (req.body?.businessId as string | undefined) ??
    (req.query?.businessId as string | undefined)
  );
};

export const requireBusinessAccess = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized();

    const businessId = resolveBusinessId(req);
    if (!businessId) throw ApiError.badRequest('businessId is required');

    const business = await findBusinessById(businessId);
    if (!business) throw ApiError.notFound('Business not found');

    const member = await findBusinessMember(businessId, req.user.sub);
    if (!member || !isReadableRole(member.role)) {
      throw ApiError.forbidden('You do not have access to this business');
    }

    req.businessAccess = {
      businessId,
      userId: req.user.sub,
      role: member.role,
    };

    next();
  }
);

export const requireWriteAccess = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.businessAccess) {
    return next(ApiError.unauthorized('Business access required'));
  }
  if (!isWritableRole(req.businessAccess.role)) {
    return next(ApiError.forbidden('You do not have write permission for this business'));
  }
  next();
};
