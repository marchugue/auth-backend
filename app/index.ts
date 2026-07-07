import { Router } from 'express';
import authRoutes from './auth/routes/auth.routes';

const router = Router();

router.use('/auth', authRoutes);

// Mount additional feature routers here as the app grows, e.g.:
// router.use('/users', userRoutes);

export default router;
