import { BusinessMemberRole } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';
import { createBusinessWithOwner, ensureUserHasBusiness } from '../models/business.model';

export interface BusinessDto {
  id: string;
  name: string;
  role: BusinessMemberRole;
  createdAt: string;
}

export const getOrCreateUserBusiness = async (
  userId: string,
  businessName?: string
): Promise<BusinessDto> => {
  const existing = await ensureUserHasBusiness(userId);
  if (existing) {
    return {
      id: existing.businessId,
      name: 'Default Business',
      role: existing.role,
      createdAt: new Date().toISOString(),
    };
  }

  const business = await createBusinessWithOwner(businessName ?? 'Default Business', userId);
  const member = business.members[0];
  if (!member) throw ApiError.internal('Failed to create business membership');

  return {
    id: business.id,
    name: business.name,
    role: member.role,
    createdAt: business.createdAt.toISOString(),
  };
};
