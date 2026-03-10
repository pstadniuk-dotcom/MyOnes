import { Router } from 'express';
import { requireAuth } from '../middleware/middleware';
import { billingController } from '../controller/billing.controller';
import { autoShipController } from '../controller/autoship.controller';

const router = Router();

router.get('/history', requireAuth, billingController.getHistory);
router.get('/invoices/:invoiceId', requireAuth, billingController.getInvoice);
router.get('/equivalent-stack', requireAuth, billingController.getEquivalentStack);

router.post('/checkout/session', requireAuth, billingController.createCheckoutSession);
router.post('/subscriptions/:subscriptionId/cancel', requireAuth, billingController.cancelSubscription);
router.post('/subscriptions/:subscriptionId/resume', requireAuth, billingController.resumeSubscription);
router.post('/webhooks/stripe', billingController.stripeWebhook);

// Auto-ship routes
router.get('/auto-ship', requireAuth, autoShipController.getStatus);
router.post('/auto-ship/pause', requireAuth, autoShipController.pause);
router.post('/auto-ship/resume', requireAuth, autoShipController.resume);
router.post('/auto-ship/cancel', requireAuth, autoShipController.cancel);
router.post('/auto-ship/skip-next', requireAuth, autoShipController.skipNext);

export default router;
