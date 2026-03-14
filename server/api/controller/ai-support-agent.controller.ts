/**
 * AI Support Agent Controller
 *
 * Admin endpoints to manage AI-generated draft responses:
 * - List pending/all drafts
 * - Get draft details
 * - Approve (send as-is)
 * - Edit & send
 * - Dismiss
 * - Manually trigger a scan
 */

import { Request, Response } from 'express';
import { db } from '../../infra/db/db';
import {
  aiSupportDrafts,
  supportTickets,
  supportTicketResponses,
  liveChatSessions,
  liveChatMessages,
  users,
} from '@shared/schema';
import { eq, and, desc, sql, or } from 'drizzle-orm';
import logger from '../../infra/logging/logger';
import { runAiSupportAgent } from '../../utils/aiSupportAgentScheduler';
import { z } from 'zod';

class AiSupportAgentController {

  /**
   * GET /api/admin/ai-support-agent/drafts
   * List drafts with optional status filter
   */
  async listDrafts(req: Request, res: Response) {
    try {
      const status = req.query.status as string | undefined;

      let whereClause;
      if (status && ['pending', 'approved', 'edited', 'dismissed'].includes(status)) {
        whereClause = eq(aiSupportDrafts.status, status as any);
      }

      const drafts = await db
        .select({
          id: aiSupportDrafts.id,
          source: aiSupportDrafts.source,
          sourceId: aiSupportDrafts.sourceId,
          userId: aiSupportDrafts.userId,
          summary: aiSupportDrafts.summary,
          draftResponse: aiSupportDrafts.draftResponse,
          editedResponse: aiSupportDrafts.editedResponse,
          status: aiSupportDrafts.status,
          model: aiSupportDrafts.model,
          reviewedBy: aiSupportDrafts.reviewedBy,
          reviewedAt: aiSupportDrafts.reviewedAt,
          metadata: aiSupportDrafts.metadata,
          createdAt: aiSupportDrafts.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(aiSupportDrafts)
        .leftJoin(users, eq(aiSupportDrafts.userId, users.id))
        .where(whereClause)
        .orderBy(desc(aiSupportDrafts.createdAt))
        .limit(100);

      res.json({ drafts });
    } catch (error) {
      logger.error('Error listing AI support drafts', { error });
      res.status(500).json({ error: 'Failed to list drafts' });
    }
  }

  /**
   * GET /api/admin/ai-support-agent/drafts/:id
   * Get a single draft with full conversation context
   */
  async getDraft(req: Request, res: Response) {
    try {
      const [draft] = await db
        .select()
        .from(aiSupportDrafts)
        .where(eq(aiSupportDrafts.id, req.params.id))
        .limit(1);

      if (!draft) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      // Fetch the original conversation for context
      let conversation: any[] = [];
      let sourceDetails: any = null;

      if (draft.source === 'ticket') {
        const [ticket] = await db
          .select()
          .from(supportTickets)
          .where(eq(supportTickets.id, draft.sourceId))
          .limit(1);
        sourceDetails = ticket;

        const responses = await db
          .select({
            id: supportTicketResponses.id,
            message: supportTicketResponses.message,
            isStaff: supportTicketResponses.isStaff,
            createdAt: supportTicketResponses.createdAt,
            userName: users.name,
          })
          .from(supportTicketResponses)
          .leftJoin(users, eq(supportTicketResponses.userId, users.id))
          .where(eq(supportTicketResponses.ticketId, draft.sourceId))
          .orderBy(supportTicketResponses.createdAt);

        conversation = responses;
      } else if (draft.source === 'live_chat') {
        const [session] = await db
          .select()
          .from(liveChatSessions)
          .where(eq(liveChatSessions.id, draft.sourceId))
          .limit(1);
        sourceDetails = session;

        const messages = await db
          .select()
          .from(liveChatMessages)
          .where(eq(liveChatMessages.sessionId, draft.sourceId))
          .orderBy(liveChatMessages.createdAt);

        conversation = messages;
      }

      // Get user info
      let userInfo = null;
      if (draft.userId) {
        const [user] = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, draft.userId))
          .limit(1);
        userInfo = user;
      }

      res.json({ draft, conversation, sourceDetails, user: userInfo });
    } catch (error) {
      logger.error('Error fetching AI support draft', { error });
      res.status(500).json({ error: 'Failed to fetch draft' });
    }
  }

  /**
   * POST /api/admin/ai-support-agent/drafts/:id/approve
   * Approve the draft as-is and send it as a response
   */
  async approveDraft(req: Request, res: Response) {
    try {
      const adminUserId = (req as any).userId;
      const [draft] = await db
        .select()
        .from(aiSupportDrafts)
        .where(eq(aiSupportDrafts.id, req.params.id))
        .limit(1);

      if (!draft) return res.status(404).json({ error: 'Draft not found' });
      if (draft.status !== 'pending') return res.status(400).json({ error: 'Draft already processed' });

      const responseText = draft.draftResponse;

      // Send the response to the appropriate channel
      if (draft.source === 'ticket') {
        await db.insert(supportTicketResponses).values({
          ticketId: draft.sourceId,
          userId: adminUserId,
          isStaff: true,
          message: responseText,
        });
        // Update ticket status to in_progress if it was open
        await db.update(supportTickets)
          .set({ status: 'in_progress', updatedAt: new Date(), assignedTo: adminUserId })
          .where(eq(supportTickets.id, draft.sourceId));
      } else if (draft.source === 'live_chat') {
        await db.insert(liveChatMessages).values({
          sessionId: draft.sourceId,
          sender: 'admin',
          senderId: adminUserId,
          content: responseText,
        });
        // Update session
        await db.update(liveChatSessions)
          .set({ status: 'active', assignedTo: adminUserId, lastMessageAt: new Date() })
          .where(eq(liveChatSessions.id, draft.sourceId));
      }

      // Mark draft as approved
      await db.update(aiSupportDrafts)
        .set({ status: 'approved', reviewedBy: adminUserId, reviewedAt: new Date() })
        .where(eq(aiSupportDrafts.id, draft.id));

      res.json({ success: true, message: 'Draft approved and sent' });
    } catch (error) {
      logger.error('Error approving AI support draft', { error });
      res.status(500).json({ error: 'Failed to approve draft' });
    }
  }

  /**
   * POST /api/admin/ai-support-agent/drafts/:id/edit
   * Edit the draft and send the edited version
   */
  async editAndSendDraft(req: Request, res: Response) {
    try {
      const adminUserId = (req as any).userId;
      const schema = z.object({ editedResponse: z.string().min(1).max(5000) });
      const { editedResponse } = schema.parse(req.body);

      const [draft] = await db
        .select()
        .from(aiSupportDrafts)
        .where(eq(aiSupportDrafts.id, req.params.id))
        .limit(1);

      if (!draft) return res.status(404).json({ error: 'Draft not found' });
      if (draft.status !== 'pending') return res.status(400).json({ error: 'Draft already processed' });

      // Send the edited response
      if (draft.source === 'ticket') {
        await db.insert(supportTicketResponses).values({
          ticketId: draft.sourceId,
          userId: adminUserId,
          isStaff: true,
          message: editedResponse,
        });
        await db.update(supportTickets)
          .set({ status: 'in_progress', updatedAt: new Date(), assignedTo: adminUserId })
          .where(eq(supportTickets.id, draft.sourceId));
      } else if (draft.source === 'live_chat') {
        await db.insert(liveChatMessages).values({
          sessionId: draft.sourceId,
          sender: 'admin',
          senderId: adminUserId,
          content: editedResponse,
        });
        await db.update(liveChatSessions)
          .set({ status: 'active', assignedTo: adminUserId, lastMessageAt: new Date() })
          .where(eq(liveChatSessions.id, draft.sourceId));
      }

      // Mark draft as edited
      await db.update(aiSupportDrafts)
        .set({
          status: 'edited',
          editedResponse,
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
        })
        .where(eq(aiSupportDrafts.id, draft.id));

      res.json({ success: true, message: 'Edited draft sent' });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid response text', details: error.errors });
      }
      logger.error('Error editing AI support draft', { error });
      res.status(500).json({ error: 'Failed to edit and send draft' });
    }
  }

  /**
   * POST /api/admin/ai-support-agent/drafts/:id/dismiss
   * Dismiss the draft (admin decided not to use it)
   */
  async dismissDraft(req: Request, res: Response) {
    try {
      const adminUserId = (req as any).userId;
      const [draft] = await db
        .select()
        .from(aiSupportDrafts)
        .where(eq(aiSupportDrafts.id, req.params.id))
        .limit(1);

      if (!draft) return res.status(404).json({ error: 'Draft not found' });
      if (draft.status !== 'pending') return res.status(400).json({ error: 'Draft already processed' });

      await db.update(aiSupportDrafts)
        .set({ status: 'dismissed', reviewedBy: adminUserId, reviewedAt: new Date() })
        .where(eq(aiSupportDrafts.id, draft.id));

      res.json({ success: true, message: 'Draft dismissed' });
    } catch (error) {
      logger.error('Error dismissing AI support draft', { error });
      res.status(500).json({ error: 'Failed to dismiss draft' });
    }
  }

  /**
   * POST /api/admin/ai-support-agent/run
   * Manually trigger the AI support agent scan (on-demand)
   */
  async triggerScan(req: Request, res: Response) {
    try {
      const result = await runAiSupportAgent();
      res.json({
        success: true,
        message: `Scan complete: ${result.ticketDrafts} ticket drafts, ${result.chatDrafts} chat drafts created`,
        ...result,
      });
    } catch (error) {
      logger.error('Error running AI support agent manually', { error });
      res.status(500).json({ error: 'Failed to run AI support agent' });
    }
  }

  /**
   * GET /api/admin/ai-support-agent/stats
   * Get summary stats for the dashboard
   */
  async getStats(req: Request, res: Response) {
    try {
      const [pending] = await db
        .select({ count: sql<number>`count(*)` })
        .from(aiSupportDrafts)
        .where(eq(aiSupportDrafts.status, 'pending'));

      const [approved] = await db
        .select({ count: sql<number>`count(*)` })
        .from(aiSupportDrafts)
        .where(eq(aiSupportDrafts.status, 'approved'));

      const [edited] = await db
        .select({ count: sql<number>`count(*)` })
        .from(aiSupportDrafts)
        .where(eq(aiSupportDrafts.status, 'edited'));

      const [dismissed] = await db
        .select({ count: sql<number>`count(*)` })
        .from(aiSupportDrafts)
        .where(eq(aiSupportDrafts.status, 'dismissed'));

      const [total] = await db
        .select({ count: sql<number>`count(*)` })
        .from(aiSupportDrafts);

      // Open tickets + waiting chats (actionable items)
      const [openTickets] = await db
        .select({ count: sql<number>`count(*)` })
        .from(supportTickets)
        .where(or(eq(supportTickets.status, 'open'), eq(supportTickets.status, 'in_progress')));

      const [waitingChats] = await db
        .select({ count: sql<number>`count(*)` })
        .from(liveChatSessions)
        .where(eq(liveChatSessions.status, 'waiting'));

      res.json({
        pending: Number(pending.count),
        approved: Number(approved.count),
        edited: Number(edited.count),
        dismissed: Number(dismissed.count),
        total: Number(total.count),
        openTickets: Number(openTickets.count),
        waitingChats: Number(waitingChats.count),
      });
    } catch (error) {
      logger.error('Error fetching AI support agent stats', { error });
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  }
}

export const aiSupportAgentController = new AiSupportAgentController();
