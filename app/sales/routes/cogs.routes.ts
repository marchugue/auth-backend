import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  requireBusinessAccess,
  requireWriteAccess,
} from '../middleware/businessAccess.middleware';
import * as cogsController from '../controller/cogs.controller';
import {
  createCogsSchema,
  listCogsSchema,
  cogsDailySummarySchema,
} from '../types/sales.types';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate(createCogsSchema),
  requireBusinessAccess,
  requireWriteAccess,
  cogsController.create
);

router.get('/', validate(listCogsSchema), requireBusinessAccess, cogsController.list);

router.get(
  '/daily-summary',
  validate(cogsDailySummarySchema),
  requireBusinessAccess,
  cogsController.dailySummary
);

export default router;
