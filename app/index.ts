import { Router } from 'express';
import authRoutes from './auth/routes/auth.routes';
import statusRoutes from './status/routes/status.routes';
import syncRoutes from './sync/routes/sync.routes';
import productsRoutes from './sales/routes/products.routes';
import cogsRoutes from './sales/routes/cogs.routes';
import revenuesRoutes from './sales/routes/revenues.routes';
import utilitiesRoutes from './sales/routes/utilities.routes';
import metricsRoutes from './sales/routes/metrics.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/status', statusRoutes);
router.use('/v1/sync', syncRoutes);
router.use('/products', productsRoutes);
router.use('/cogs', cogsRoutes);
router.use('/revenues', revenuesRoutes);
router.use('/utilities', utilitiesRoutes);
router.use('/metrics', metricsRoutes);

// Mount additional feature routers here as the app grows, e.g.:
// router.use('/users', userRoutes);

export default router;
