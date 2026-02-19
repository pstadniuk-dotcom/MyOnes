import { Router } from 'express';
import { authController } from '../controller/auth.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

// Authentication
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/facebook', authController.facebookLogin);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.getMe);

// Password Management
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Email Verification
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', requireAuth, authController.resendVerification);

export default router;
