import { Router } from 'express';
import * as authController from '../controller/auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../types/auth.types';

const router = Router();

// --- Public routes ---
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post(
  '/resend-verification',
  validate(resendVerificationSchema),
  authController.resendVerification
);

router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// --- Protected routes (require a valid access token) ---
router.get('/me', authenticate, authController.me);
router.post('/logout-all', authenticate, authController.logoutAll);

export default router;
