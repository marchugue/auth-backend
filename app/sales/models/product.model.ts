import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';

const notDeleted = { deletedAt: null };

export const createProduct = (data: { businessId: string; name: string }) =>
  prisma.product.create({ data });

export const findProductById = (id: string, businessId: string) =>
  prisma.product.findFirst({
    where: { id, businessId, ...notDeleted },
  });

export const listProducts = (businessId: string) =>
  prisma.product.findMany({
    where: { businessId, ...notDeleted },
    orderBy: { name: 'asc' },
  });

export const updateProduct = (id: string, businessId: string, data: Prisma.ProductUpdateInput) =>
  prisma.product.update({
    where: { id },
    data,
  });

export const softDeleteProduct = (id: string) =>
  prisma.product.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
