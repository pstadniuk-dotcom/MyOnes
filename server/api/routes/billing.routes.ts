import { Router } from 'express';
import { requireAuth } from '../middleware/middleware';
import { billingController } from '../controller/billing.controller';

const router = Router();

router.get('/history', requireAuth, billingController.getHistory);
router.get('/invoices/:invoiceId', requireAuth, billingController.getInvoice);
router.get('/equivalent-stack', requireAuth, billingController.getEquivalentStack);

router.post('/checkout/session', requireAuth, billingController.createCheckoutSession);
router.post('/subscriptions/:subscriptionId/cancel', requireAuth, billingController.cancelSubscription);
router.post('/subscriptions/:subscriptionId/resume', requireAuth, billingController.resumeSubscription);
router.post('/webhooks/stripe', billingController.stripeWebhook);

export default router;
