import { Request, Response } from 'express';
import { liveChatService } from '../../modules/live-chat/live-chat.service';
import { liveChatEventBus } from '../../modules/live-chat/live-chat.events';
import logger from '../../infra/logging/logger';
import { z } from 'zod';
import { stripHtml } from '../../utils/sanitize';

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long').transform(stripHtml),
  attachments: z.array(z.object({
    name: z.string().transform(stripHtml),
    url: z.string().url(),
    type: z.string(),
    size: z.number(),
  })).optional(),
});

const startGuestChatSchema = z.object({
  name: z.string().min(1).max(100).transform(stripHtml).refine(v => v.length >= 1, { message: 'Name cannot be empty' }),
  email: z.string().email(),
});

const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

const transcriptSchema = z.object({
  email: z.string().email(),
});

const cannedResponseSchema = z.object({
  shortcut: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  category: z.string().max(100).optional(),
});

const transferSchema = z.object({
  adminId: z.string().min(1),
});

export class LiveChatController {
  // ─── User-facing endpoints ─────────────────────────────────────

  /** GET /api/live-chat/session */
  async getOrCreateSession(req: Request, res: Response) {
    try {
      const metadata = {
        userAgent: req.headers['user-agent'],
        page: req.query.page as string || undefined,
        referrer: req.headers.referer || undefined,
        device: parseDevice(req.headers['user-agent'] || ''),
      };
      const session = await liveChatService.getOrCreateSession(req.userId!, metadata);
      const messages = await liveChatService.getMessages(session.id);
      res.json({ session, messages });
    } catch (error) {
      logger.error('Error getting/creating live chat session:', error);
      res.status(500).json({ error: 'Failed to start chat session' });
    }
  }

  /** GET /api/live-chat/history — Get closed sessions for returning users */
  async getSessionHistory(req: Request, res: Response) {
    try {
      const sessions = await liveChatService.getSessionHistory(req.userId!);
      res.json({ sessions });
    } catch (error) {
      logger.error('Error getting chat history:', error);
      res.status(500).json({ error: 'Failed to get chat history' });
    }
  }

  /** GET /api/live-chat/history/:id/messages — Get messages for a historical session */
  async getHistoryMessages(req: Request, res: Response) {
    try {
      const session = await liveChatService.getSession(req.params.id);
      if (!session) return res.status(404).json({ error: 'Session not found' });
      if (session.userId !== req.userId) return res.status(403).json({ error: 'Unauthorized' });
      const messages = await liveChatService.getMessages(req.params.id);
      res.json({ session, messages });
    } catch (error) {
      logger.error('Error getting history messages:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }

  /** POST /api/live-chat/guest — Start a guest chat with secure token */
  async startGuestChat(req: Request, res: Response) {
    try {
      const validation = startGuestChatSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid data', details: validation.error.errors });
      }
      const { name, email } = validation.data;
      // Defense-in-depth: reject if sanitized name is empty
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name cannot be empty after sanitization' });
      }
      const metadata = {
        userAgent: req.headers['user-agent'],
        page: req.query.page as string || undefined,
        referrer: req.headers.referer || undefined,
        device: parseDevice(req.headers['user-agent'] || ''),
      };
      const result = await liveChatService.createGuestSession(name, email, metadata);
      const messages = await liveChatService.getMessages(result.id);
      // Return the guestToken for subsequent requests
      res.json({ session: result, messages, guestToken: result.guestToken });
    } catch (error) {
      logger.error('Error starting guest chat:', error);
      res.status(500).json({ error: 'Failed to start chat session' });
    }
  }

  /** POST /api/live-chat/sessions/:id/messages */
  async sendMessage(req: Request, res: Response) {
    try {
      const validation = sendMessageSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid message', details: validation.error.errors });
      }
      const message = await liveChatService.sendUserMessage(
        req.params.id,
        req.userId || null,
        validation.data.content,
        validation.data.attachments
      );
      res.json({ message });
    } catch (error: any) {
      logger.error('Error sending live chat message:', error);
      const msg = error.message || 'Failed to send message';
      if (msg === 'Chat session not found') return res.status(404).json({ error: msg });
      if (msg === 'Chat session is closed') return res.status(400).json({ error: msg });
      if (msg === 'Unauthorized') return res.status(403).json({ error: msg });
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  /** GET /api/live-chat/sessions/:id/messages — Poll for new messages */
  async getMessages(req: Request, res: Response) {
    try {
      const after = req.query.after as string | undefined;
      const messages = await liveChatService.getMessages(req.params.id, after);

      if (req.userId) {
        await liveChatService.markUserRead(req.params.id);
      }

      res.json({ messages });
    } catch (error) {
      logger.error('Error fetching live chat messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  /** POST /api/live-chat/sessions/:id/close */
  async closeSession(req: Request, res: Response) {
    try {
      const session = await liveChatService.closeSession(req.params.id, req.userId || 'guest');
      res.json({ session });
    } catch (error) {
      logger.error('Error closing live chat session:', error);
      res.status(500).json({ error: 'Failed to close chat session' });
    }
  }

  /** POST /api/live-chat/sessions/:id/rating */
  async submitRating(req: Request, res: Response) {
    try {
      const validation = ratingSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid rating', details: validation.error.errors });
      }
      const result = await liveChatService.submitRating(req.params.id, validation.data.rating, validation.data.comment);
      res.json(result);
    } catch (error: any) {
      logger.error('Error submitting rating:', error);
      if (error.message === 'Chat session not found') return res.status(404).json({ error: error.message });
      res.status(500).json({ error: 'Failed to submit rating' });
    }
  }

  /** POST /api/live-chat/sessions/:id/transcript */
  async sendTranscript(req: Request, res: Response) {
    try {
      const validation = transcriptSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid email', details: validation.error.errors });
      }
      const result = await liveChatService.sendTranscript(req.params.id, validation.data.email);
      res.json(result);
    } catch (error: any) {
      logger.error('Error sending transcript:', error);
      if (error.message === 'Chat session not found') return res.status(404).json({ error: error.message });
      res.status(500).json({ error: 'Failed to send transcript' });
    }
  }

  /** GET /api/live-chat/business-hours */
  async getBusinessHours(_req: Request, res: Response) {
    try {
      const info = liveChatService.getBusinessHours();
      res.json(info);
    } catch (error) {
      logger.error('Error getting business hours:', error);
      res.status(500).json({ error: 'Failed to get business hours' });
    }
  }

  // ─── SSE Streaming ─────────────────────────────────────────────

  /** GET /api/live-chat/sessions/:id/stream — SSE for user */
  async streamSession(req: Request, res: Response) {
    try {
      const sessionId = req.params.id;
      liveChatEventBus.addClient(req, res, sessionId, 'user');
    } catch (error) {
      logger.error('Error starting SSE stream:', error);
      res.status(500).json({ error: 'Failed to start stream' });
    }
  }

  /** POST /api/live-chat/sessions/:id/typing — User typing indicator */
  async userTyping(req: Request, res: Response) {
    try {
      liveChatService.emitTyping(req.params.id, 'user');
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }

  /** POST /api/live-chat/sessions/:id/stop-typing — User stop typing */
  async userStopTyping(req: Request, res: Response) {
    try {
      liveChatService.emitStopTyping(req.params.id, 'user');
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }

  // ─── Guest endpoints with token auth ───────────────────────────

  /** Middleware: validate guest token from header */
  async validateGuestToken(req: Request, res: Response, next: Function) {
    // Support token via header or query param (EventSource can't set headers)
    const token = (req.headers['x-guest-token'] as string) || (req.query.guestToken as string);
    if (!token) {
      return res.status(401).json({ error: 'Guest token required' });
    }
    const session = await liveChatService.getSessionByGuestToken(token);
    if (!session || session.id !== req.params.id) {
      return res.status(403).json({ error: 'Invalid guest token' });
    }
    next();
  }

  // ─── Admin endpoints ───────────────────────────────────────────

  /** GET /api/admin/live-chats */
  async adminListSessions(req: Request, res: Response) {
    try {
      const status = req.query.status as string | undefined;
      const sessions = await liveChatService.listAdminSessions(status);
      res.json({ sessions });
    } catch (error) {
      logger.error('Error listing admin live chat sessions:', error);
      res.status(500).json({ error: 'Failed to fetch live chat sessions' });
    }
  }

  /** GET /api/admin/live-chats/count */
  async adminGetChatCount(req: Request, res: Response) {
    try {
      const count = await liveChatService.getActiveChatCount();
      res.json({ count });
    } catch (error) {
      logger.error('Error getting live chat count:', error);
      res.status(500).json({ error: 'Failed to get chat count' });
    }
  }

  /** GET /api/admin/live-chats/stream — SSE for admin (all sessions) */
  async adminStream(req: Request, res: Response) {
    try {
      // Admin subscribes to a special "all" channel
      liveChatEventBus.addClient(req, res, '__admin__', 'admin');
    } catch (error) {
      logger.error('Error starting admin SSE stream:', error);
      res.status(500).json({ error: 'Failed to start stream' });
    }
  }

  /** GET /api/admin/live-chats/:id */
  async adminGetSession(req: Request, res: Response) {
    try {
      const session = await liveChatService.getSession(req.params.id);
      if (!session) return res.status(404).json({ error: 'Chat session not found' });

      const messages = await liveChatService.getMessages(req.params.id);
      await liveChatService.markAdminRead(req.params.id);
      res.json({ session, messages });
    } catch (error) {
      logger.error('Error getting admin live chat session:', error);
      res.status(500).json({ error: 'Failed to fetch chat session' });
    }
  }

  /** GET /api/admin/live-chats/:id/messages */
  async adminGetMessages(req: Request, res: Response) {
    try {
      const after = req.query.after as string | undefined;
      const messages = await liveChatService.getMessages(req.params.id, after);
      await liveChatService.markAdminRead(req.params.id);
      res.json({ messages });
    } catch (error) {
      logger.error('Error fetching admin live chat messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  /** POST /api/admin/live-chats/:id/messages */
  async adminSendMessage(req: Request, res: Response) {
    try {
      const validation = sendMessageSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid message', details: validation.error.errors });
      }
      const message = await liveChatService.sendAdminMessage(
        req.params.id,
        req.userId!,
        validation.data.content,
        validation.data.attachments
      );
      res.json({ message });
    } catch (error: any) {
      logger.error('Error sending admin live chat message:', error);
      if (error.message === 'Chat session not found') return res.status(404).json({ error: error.message });
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  /** POST /api/admin/live-chats/:id/close */
  async adminCloseSession(req: Request, res: Response) {
    try {
      const session = await liveChatService.closeSession(req.params.id, req.userId!);
      res.json({ session });
    } catch (error) {
      logger.error('Error closing admin live chat session:', error);
      res.status(500).json({ error: 'Failed to close chat session' });
    }
  }

  /** POST /api/admin/live-chats/bulk-delete */
  async adminBulkDeleteSessions(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }
      const count = await liveChatService.bulkDeleteSessions(ids);
      res.json({ deleted: count });
    } catch (error) {
      logger.error('Error bulk deleting live chat sessions:', error);
      res.status(500).json({ error: 'Failed to delete chat sessions' });
    }
  }

  /** POST /api/admin/live-chats/bulk-close */
  async adminBulkCloseSessions(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }
      const count = await liveChatService.bulkCloseSessions(ids, req.userId!);
      res.json({ closed: count });
    } catch (error) {
      logger.error('Error bulk closing live chat sessions:', error);
      res.status(500).json({ error: 'Failed to close chat sessions' });
    }
  }

  /** GET /api/admin/live-chats/:id/stream — SSE for admin on a specific session */
  async adminStreamSession(req: Request, res: Response) {
    try {
      liveChatEventBus.addClient(req, res, req.params.id, 'admin');
    } catch (error) {
      logger.error('Error starting admin session SSE:', error);
      res.status(500).json({ error: 'Failed to start stream' });
    }
  }

  /** POST /api/admin/live-chats/:id/typing */
  async adminTyping(req: Request, res: Response) {
    try {
      liveChatService.emitTyping(req.params.id, 'admin');
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }

  /** POST /api/admin/live-chats/:id/stop-typing */
  async adminStopTyping(req: Request, res: Response) {
    try {
      liveChatService.emitStopTyping(req.params.id, 'admin');
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }

  /** POST /api/admin/live-chats/:id/transfer */
  async adminTransferSession(req: Request, res: Response) {
    try {
      const validation = transferSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid data', details: validation.error.errors });
      }
      const session = await liveChatService.transferSession(
        req.params.id,
        validation.data.adminId,
        req.userId!
      );
      res.json({ session });
    } catch (error: any) {
      logger.error('Error transferring session:', error);
      res.status(500).json({ error: 'Failed to transfer session' });
    }
  }

  /** GET /api/admin/live-chats/admins — List admin users for assignment */
  async adminListAdmins(req: Request, res: Response) {
    try {
      const admins = await liveChatService.listAdminUsers();
      res.json({ admins });
    } catch (error) {
      logger.error('Error listing admins:', error);
      res.status(500).json({ error: 'Failed to list admins' });
    }
  }

  // ─── Canned Responses ──────────────────────────────────────────

  /** GET /api/admin/live-chats/canned-responses */
  async listCannedResponses(req: Request, res: Response) {
    try {
      const responses = await liveChatService.listCannedResponses();
      res.json({ responses });
    } catch (error) {
      logger.error('Error listing canned responses:', error);
      res.status(500).json({ error: 'Failed to fetch canned responses' });
    }
  }

  /** POST /api/admin/live-chats/canned-responses */
  async createCannedResponse(req: Request, res: Response) {
    try {
      const validation = cannedResponseSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid data', details: validation.error.errors });
      }
      const response = await liveChatService.createCannedResponse({
        ...validation.data,
        createdBy: req.userId!,
      });
      res.json({ response });
    } catch (error) {
      logger.error('Error creating canned response:', error);
      res.status(500).json({ error: 'Failed to create canned response' });
    }
  }

  /** PATCH /api/admin/live-chats/canned-responses/:id */
  async updateCannedResponse(req: Request, res: Response) {
    try {
      const validation = cannedResponseSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid data', details: validation.error.errors });
      }
      const response = await liveChatService.updateCannedResponse(req.params.id, validation.data);
      if (!response) return res.status(404).json({ error: 'Canned response not found' });
      res.json({ response });
    } catch (error) {
      logger.error('Error updating canned response:', error);
      res.status(500).json({ error: 'Failed to update canned response' });
    }
  }

  /** DELETE /api/admin/live-chats/canned-responses/:id */
  async deleteCannedResponse(req: Request, res: Response) {
    try {
      await liveChatService.deleteCannedResponse(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting canned response:', error);
      res.status(500).json({ error: 'Failed to delete canned response' });
    }
  }

  /** POST /api/admin/live-chats/canned-responses/use — Resolve shortcut to content */
  async useCannedResponse(req: Request, res: Response) {
    try {
      const { shortcut } = req.body;
      if (!shortcut) return res.status(400).json({ error: 'Shortcut required' });
      const content = await liveChatService.useCannedResponse(shortcut);
      if (!content) return res.status(404).json({ error: 'Canned response not found' });
      res.json({ content });
    } catch (error) {
      logger.error('Error using canned response:', error);
      res.status(500).json({ error: 'Failed to use canned response' });
    }
  }

  // ─── Analytics ─────────────────────────────────────────────────

  /** GET /api/admin/live-chats/analytics */
  async getAnalytics(req: Request, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const analytics = await liveChatService.getAnalytics(startDate, endDate);
      res.json(analytics);
    } catch (error) {
      logger.error('Error getting analytics:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function parseDevice(ua: string): string {
  if (/mobile|android|iphone|ipad/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
}

export const liveChatController = new LiveChatController();
