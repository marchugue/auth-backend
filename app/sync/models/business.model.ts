import { prisma } from '../../utils/prisma';
import { BusinessMemberRole } from '@prisma/client';

export const findBusinessById = (id: string) =>
  prisma.business.findFirst({ where: { id, deletedAt: null } });

export const findBusinessMember = (businessId: string, userId: string) =>
  prisma.businessMember.findFirst({
    where: { businessId, userId, deletedAt: null },
  });

export const createBusinessWithOwner = async (name: string, userId: string) => {
  return prisma.business.create({
    data: {
      name,
      members: {
        create: { userId, role: BusinessMemberRole.OWNER },
      },
    },
    include: { members: true },
  });
};

export const ensureUserHasBusiness = async (userId: string, businessId?: string) => {
  if (businessId) {
    const member = await findBusinessMember(businessId, userId);
    if (!member) return null;
    return { businessId, role: member.role };
  }

  const existing = await prisma.businessMember.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return { businessId: existing.businessId, role: existing.role };

  const business = await createBusinessWithOwner('Default Business', userId);
  return { businessId: business.id, role: BusinessMemberRole.OWNER };
};
