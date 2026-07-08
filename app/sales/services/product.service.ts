import { Product } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';
import * as productModel from '../models/product.model';
import { CreateProductInput, ProductDto, UpdateProductInput } from '../types/sales.types';

const toProductDto = (product: Product): ProductDto => ({
  id: product.id,
  businessId: product.businessId,
  name: product.name,
  createdAt: product.createdAt.toISOString(),
  updatedAt: product.updatedAt.toISOString(),
});

export const createProduct = async (input: CreateProductInput): Promise<ProductDto> => {
  const product = await productModel.createProduct({
    businessId: input.businessId,
    name: input.name.trim(),
  });
  return toProductDto(product);
};

export const listProducts = async (businessId: string): Promise<ProductDto[]> => {
  const products = await productModel.listProducts(businessId);
  return products.map(toProductDto);
};

export const getProduct = async (id: string, businessId: string): Promise<ProductDto> => {
  const product = await productModel.findProductById(id, businessId);
  if (!product) throw ApiError.notFound('Product not found');
  return toProductDto(product);
};

export const updateProduct = async (
  id: string,
  businessId: string,
  input: UpdateProductInput
): Promise<ProductDto> => {
  const existing = await productModel.findProductById(id, businessId);
  if (!existing) throw ApiError.notFound('Product not found');

  const product = await productModel.updateProduct(id, businessId, {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
  });
  return toProductDto(product);
};

export const deleteProduct = async (id: string, businessId: string): Promise<void> => {
  const existing = await productModel.findProductById(id, businessId);
  if (!existing) throw ApiError.notFound('Product not found');
  await productModel.softDeleteProduct(id);
};
