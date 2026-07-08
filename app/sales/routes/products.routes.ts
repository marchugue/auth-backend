import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  requireBusinessAccess,
  requireWriteAccess,
} from '../middleware/businessAccess.middleware';
import * as productController from '../controller/product.controller';
import {
  createProductSchema,
  updateProductSchema,
  productIdParamsSchema,
  listProductsSchema,
} from '../types/sales.types';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate(createProductSchema),
  requireBusinessAccess,
  requireWriteAccess,
  productController.create
);

router.get('/', validate(listProductsSchema), requireBusinessAccess, productController.list);

router.get(
  '/:id',
  validate(productIdParamsSchema),
  requireBusinessAccess,
  productController.getById
);

router.patch(
  '/:id',
  validate(updateProductSchema),
  requireBusinessAccess,
  requireWriteAccess,
  productController.update
);

router.delete(
  '/:id',
  validate(productIdParamsSchema),
  requireBusinessAccess,
  requireWriteAccess,
  productController.remove
);

export default router;
