import { Router } from 'express';
import { supportController } from '../controller/support.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

// FAQ endpoints
router.get('/faq', supportController.getFaqItems);
router.get('/faq/:id', supportController.getFaqItem);

// Support ticket endpoints
router.get('/tickets', requireAuth, supportController.getUserTickets);
router.get('/tickets/:id', requireAuth, supportController.getTicket);
router.post('/tickets', requireAuth, supportController.createTicket);
router.post('/tickets/:id/responses', requireAuth, supportController.addTicketResponse);

// Help article endpoints
router.get('/help', supportController.getHelpArticles);
router.get('/help/:id', supportController.getHelpArticle);

export default router;
