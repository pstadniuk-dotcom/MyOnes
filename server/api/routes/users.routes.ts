import { Router } from 'express';
import { usersController } from '../controller/users.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

// Formula endpoints
router.get('/me/formula', requireAuth, usersController.getCurrentFormula);

// Health Profile endpoints
router.get('/me/health-profile', requireAuth, usersController.getHealthProfile);
router.post('/me/health-profile', requireAuth, usersController.saveHealthProfile);
router.post('/me/health-profile/medication-disclosure', requireAuth, usersController.saveMedicationDisclosure);
router.post('/me/health-profile/scan-supplement-label', requireAuth, usersController.scanSupplementLabel);

// User Profile endpoints
router.patch('/me/profile', requireAuth, usersController.updateProfile);
router.patch('/me/password', requireAuth, usersController.changePassword);
router.patch('/me/timezone', requireAuth, usersController.updateTimezone);

// Order endpoints
router.get('/me/orders', requireAuth, usersController.getOrders);
router.get('/me/billing-history', requireAuth, usersController.getBillingHistory);

// Subscription endpoints
router.get('/me/subscription', requireAuth, usersController.getSubscription);
router.patch('/me/subscription', requireAuth, usersController.updateSubscription);

// Dashboard metric preferences
router.get('/me/metric-preferences', requireAuth, usersController.getMetricPreferences);
router.put('/me/metric-preferences', requireAuth, usersController.updateMetricPreferences);

// Chat Session endpoints
router.get('/me/sessions', requireAuth, usersController.getChatSessions);

// Payment Method endpoints
router.get('/me/payment-methods', requireAuth, usersController.getPaymentMethods);
router.post('/me/payment-methods', requireAuth, usersController.addPaymentMethod);
router.delete('/me/payment-methods/:id', requireAuth, usersController.deletePaymentMethod);

export default router;
