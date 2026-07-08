import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  requireBusinessAccess,
  requireWriteAccess,
} from '../middleware/businessAccess.middleware';
import * as utilityController from '../controller/utility.controller';
import {
  createUtilitySchema,
  updateUtilitySchema,
  utilityIdParamsSchema,
  listUtilitiesSchema,
} from '../types/sales.types';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate(createUtilitySchema),
  requireBusinessAccess,
  requireWriteAccess,
  utilityController.create
);

router.get('/', validate(listUtilitiesSchema), requireBusinessAccess, utilityController.list);

router.patch(
  '/:id',
  validate(updateUtilitySchema),
  requireBusinessAccess,
  requireWriteAccess,
  utilityController.update
);

router.delete(
  '/:id',
  validate(utilityIdParamsSchema),
  requireBusinessAccess,
  requireWriteAccess,
  utilityController.remove
);

export default router;
