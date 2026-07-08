import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { requireBusinessAccess } from '../middleware/businessAccess.middleware';
import * as metricsController from '../controller/metrics.controller';
import { dailyMetricsSchema } from '../types/sales.types';

const router = Router();

router.use(authenticate);

router.get('/daily', validate(dailyMetricsSchema), requireBusinessAccess, metricsController.daily);

export default router;
