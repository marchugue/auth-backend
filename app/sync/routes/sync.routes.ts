import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  requireDevice,
  requireIdempotencyKey,
  validateBusinessScope,
} from '../middleware/sync.middleware';
import * as syncController from '../controller/sync.controller';
import {
  registerDeviceSchema,
  syncPushSchema,
  syncPullSchema,
  syncStatusSchema,
  syncConflictsSchema,
} from '../types/sync.types';

const router = Router();

router.post(
  '/register-device',
  authenticate,
  validate(registerDeviceSchema),
  syncController.registerDevice
);

router.post(
  '/push',
  authenticate,
  requireDevice,
  requireIdempotencyKey,
  validate(syncPushSchema),
  validateBusinessScope,
  syncController.push
);

router.get(
  '/pull',
  authenticate,
  requireDevice,
  validate(syncPullSchema),
  validateBusinessScope,
  syncController.pull
);

router.get(
  '/status',
  authenticate,
  requireDevice,
  validate(syncStatusSchema),
  validateBusinessScope,
  syncController.status
);

router.get(
  '/conflicts',
  authenticate,
  requireDevice,
  validate(syncConflictsSchema),
  validateBusinessScope,
  syncController.conflicts
);

export default router;
