import { Router } from 'express';
import { consentsController } from '../controller/consents.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

// Consent Operations
router.post('/grant', requireAuth, consentsController.grantConsent);
router.get('/', requireAuth, consentsController.getConsents);
router.post('/revoke/:consentType', requireAuth, consentsController.revokeConsent);

export default router;
