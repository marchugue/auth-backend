import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import * as productService from '../services/product.service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ success: true, data: product });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.query.businessId as string;
  const products = await productService.listProducts(businessId);
  res.status(200).json({ success: true, data: products });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProduct(
    req.params.id,
    req.query.businessId as string
  );
  res.status(200).json({ success: true, data: product });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(
    req.params.id,
    req.body.businessId,
    req.body
  );
  res.status(200).json({ success: true, data: product });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.businessAccess) throw ApiError.unauthorized();
  await productService.deleteProduct(req.params.id, req.businessAccess.businessId);
  res.status(200).json({ success: true, message: 'Product deleted successfully' });
});
