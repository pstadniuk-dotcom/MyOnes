import { Router } from 'express';
import { chatController } from '../controller/chat.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

// Streaming AI Chat
router.post('/stream', requireAuth, chatController.streamChat);

// Consultation Management
router.get('/consultations/history', requireAuth, chatController.getHistory);
router.get('/consultations/:sessionId', requireAuth, chatController.getSession);
router.delete('/consultations/:sessionId', requireAuth, chatController.deleteConsultation);

// Session Management (General)
router.get('/sessions', requireAuth, chatController.listSessions);
router.get('/sessions/:sessionId', requireAuth, chatController.getSession); // Reuse getSession for consistency
router.post('/sessions', requireAuth, chatController.createSession);
router.delete('/sessions/:sessionId', requireAuth, chatController.deleteConsultation); // Reuse delete for consistency

export default router;
