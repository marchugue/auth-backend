import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { getDbStatus } from '../controller/status.controller';

const router = Router();

router.get('/db', authenticate, requireRole('ADMIN'), getDbStatus);

export default router;