import { Router } from 'express';
import authRoutes from './auth/routes/auth.routes';
import statusRoutes from './status/routes/status.routes'

const router = Router();

router.use('/auth', authRoutes);
router.use('/status', statusRoutes)

// Mount additional feature routers here as the app grows, e.g.:
// router.use('/users', userRoutes);

export default router;
