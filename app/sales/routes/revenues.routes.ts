import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  requireBusinessAccess,
  requireWriteAccess,
} from '../middleware/businessAccess.middleware';
import * as revenueController from '../controller/revenue.controller';
import {
  createRevenueSchema,
  listRevenuesSchema,
  revenueDailySummarySchema,
} from '../types/sales.types';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate(createRevenueSchema),
  requireBusinessAccess,
  requireWriteAccess,
  revenueController.create
);

router.get('/', validate(listRevenuesSchema), requireBusinessAccess, revenueController.list);

router.get(
  '/daily-summary',
  validate(revenueDailySummarySchema),
  requireBusinessAccess,
  revenueController.dailySummary
);

export default router;
