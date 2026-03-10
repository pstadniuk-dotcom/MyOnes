import { Router } from 'express';
import { liveChatController } from '../controller/live-chat.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

// ─── Authenticated user endpoints ────────────────────────────
router.get('/session', requireAuth, liveChatController.getOrCreateSession);
router.get('/history', requireAuth, liveChatController.getSessionHistory);
router.get('/history/:id/messages', requireAuth, liveChatController.getHistoryMessages);
router.post('/sessions/:id/messages', requireAuth, liveChatController.sendMessage);
router.get('/sessions/:id/messages', requireAuth, liveChatController.getMessages);
router.get('/sessions/:id/stream', requireAuth, liveChatController.streamSession);
router.post('/sessions/:id/typing', requireAuth, liveChatController.userTyping);
router.post('/sessions/:id/stop-typing', requireAuth, liveChatController.userStopTyping);
router.post('/sessions/:id/close', requireAuth, liveChatController.closeSession);
router.post('/sessions/:id/rating', liveChatController.submitRating);
router.post('/sessions/:id/transcript', liveChatController.sendTranscript);

// ─── Public endpoints (no auth) ──────────────────────────────
router.get('/business-hours', liveChatController.getBusinessHours);

// ─── Guest endpoints (token auth via x-guest-token header) ───
router.post('/guest', liveChatController.startGuestChat);
router.post('/guest/sessions/:id/messages',
  liveChatController.validateGuestToken,
  liveChatController.sendMessage
);
router.get('/guest/sessions/:id/messages',
  liveChatController.validateGuestToken,
  liveChatController.getMessages
);
router.get('/guest/sessions/:id/stream',
  liveChatController.validateGuestToken,
  liveChatController.streamSession
);
router.post('/guest/sessions/:id/typing',
  liveChatController.validateGuestToken,
  liveChatController.userTyping
);
router.post('/guest/sessions/:id/stop-typing',
  liveChatController.validateGuestToken,
  liveChatController.userStopTyping
);
router.post('/guest/sessions/:id/close',
  liveChatController.validateGuestToken,
  liveChatController.closeSession
);
router.post('/guest/sessions/:id/rating',
  liveChatController.validateGuestToken,
  liveChatController.submitRating
);

export default router;
