/**
 * Support Routes Module
 * 
 * Handles all /api/support/* endpoints:
 * - FAQ items
 * - Help articles
 * - Support tickets (user-facing)
 */

import { Router } from 'express';
import { z } from 'zod';
import { supportService } from '../domains/support';
import { userService } from '../domains/users/user.service';
import { requireAuth } from './middleware';
import { insertSupportTicketSchema } from '@shared/schema';
import { sendNotificationEmail } from '../emailService';
import { logger } from '../infrastructure/logging/logger';

const router = Router();

// ==================== FAQ ENDPOINTS ====================

// Get all FAQ items (optionally filtered by category)
router.get('/faq', async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const faqItems = await supportService.getFaqs(category);
    res.json({ faqItems });
  } catch (error) {
    logger.error('Error fetching FAQ items:', error);
    res.status(500).json({ error: 'Failed to fetch FAQ items' });
  }
});

// Get single FAQ item by ID
router.get('/faq/:id', async (req, res) => {
  try {
    const faqItem = await supportService.getFaq(req.params.id);
    if (!faqItem) {
      return res.status(404).json({ error: 'FAQ item not found' });
    }
    res.json({ faqItem });
  } catch (error) {
    logger.error('Error fetching FAQ item:', error);
    res.status(500).json({ error: 'Failed to fetch FAQ item' });
  }
});

// ==================== SUPPORT TICKET ENDPOINTS ====================

// Get user's support tickets
router.get('/tickets', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const tickets = await supportService.getUserTickets(userId);
    res.json({ tickets });
  } catch (error) {
    logger.error('Error fetching support tickets:', error);
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

// Get single support ticket with responses
router.get('/tickets/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const ticketWithResponses = await supportService.getTicketWithResponses(req.params.id, userId);
    if (!ticketWithResponses) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }
    // Backward compatibility: storage returned merged object, we might want to keep it or separate
    // The repo returns { ticket, responses }. 
    // The previous implementation likely returned a merged object or specific structure.
    // Let's assume the frontend handles { ticket, responses } or we assume `ticketWithResponses` is the shape.
    // If legacy returned a flat object, we might need to adjust.
    // Checking previous code: `res.json(ticketWithResponses)`
    // If it was checking `!ticketWithResponses`, it implies it returns null/undefined if not found.
    // Our NEW implementation returns `{ ticket, responses }`.
    // We should send it as is.
    res.json(ticketWithResponses);
  } catch (error) {
    logger.error('Error fetching support ticket:', error);
    res.status(500).json({ error: 'Failed to fetch support ticket' });
  }
});

// Create new support ticket
router.post('/tickets', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;

    // Validate request body with Zod
    const validationResult = insertSupportTicketSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid ticket data',
        details: validationResult.error.errors
      });
    }

    const ticketData = {
      ...validationResult.data,
      userId
    };
    const ticket = await supportService.createTicket(ticketData);

    // Send email notification to support team
    try {
      const user = await userService.getUser(userId);
      if (user) {
        const adminActionUrl = 'https://myones.ai/admin';
        await sendNotificationEmail({
          to: 'support@myones.ai',
          subject: `New Support Ticket: ${ticket.subject}`,
          title: 'New Support Ticket Received',
          content: `
            <strong>From:</strong> ${user.name} (${user.email})<br/>
            <strong>Subject:</strong> ${ticket.subject}<br/>
            <strong>Category:</strong> ${ticket.category}<br/>
            <strong>Priority:</strong> ${ticket.priority}<br/>
            <strong>Description:</strong> ${ticket.description}<br/>
            <strong>Ticket ID:</strong> ${ticket.id}
          `,
          actionUrl: adminActionUrl,
          actionText: 'Open Admin Dashboard',
          type: 'system'
        });
        logger.info(`📧 Support notification email sent for ticket ${ticket.id}`);
      }
    } catch (emailError) {
      // Log but don't fail the ticket creation if email fails
      logger.error('Failed to send support notification email:', emailError);
    }

    res.json({ ticket });
  } catch (error) {
    logger.error('Error creating support ticket:', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

// Add response to support ticket
router.post('/tickets/:id/responses', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const ticketId = req.params.id;

    // Validate request body with Zod
    const messageValidation = z.object({
      message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long')
    }).safeParse(req.body);

    if (!messageValidation.success) {
      return res.status(400).json({
        error: 'Invalid message data',
        details: messageValidation.error.errors
      });
    }

    // Verify user owns the ticket
    const ticket = await supportService.getTicket(ticketId);
    if (!ticket || ticket.userId !== userId) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    const responseData = {
      ticketId,
      userId,
      message: messageValidation.data.message,
      isStaff: false
    };
    const response = await supportService.addTicketResponse(responseData);

    // Send email notification to support team about new user response
    try {
      const user = await userService.getUser(userId);
      if (user && ticket) {
        const adminTicketUrl = `https://myones.ai/admin/support/${ticketId}`;
        await sendNotificationEmail({
          to: 'support@myones.ai',
          subject: `New Response on Ticket: ${ticket.subject}`,
          title: 'New Support Ticket Response',
          content: `
            <strong>From:</strong> ${user.name} (${user.email})<br/>
            <strong>Ticket Subject:</strong> ${ticket.subject}<br/>
            <strong>Ticket ID:</strong> ${ticketId}<br/>
            <strong>New Message:</strong> ${messageValidation.data.message}
          `,
          actionUrl: adminTicketUrl,
          actionText: 'Review Ticket',
          type: 'system'
        });
        logger.info(`📧 Support response notification email sent for ticket ${ticketId}`);
      }
    } catch (emailError) {
      // Log but don't fail if email fails
      logger.error('Failed to send response notification email:', emailError);
    }

    res.json({ response });
  } catch (error) {
    logger.error('Error creating support ticket response:', error);
    res.status(500).json({ error: 'Failed to create response' });
  }
});

// ==================== HELP ARTICLE ENDPOINTS ====================

// Get all help articles (optionally filtered by category)
router.get('/help', async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const articles = await supportService.getHelpArticles(category);
    res.json({ articles });
  } catch (error) {
    logger.error('Error fetching help articles:', error);
    res.status(500).json({ error: 'Failed to fetch help articles' });
  }
});

// Get single help article by ID
router.get('/help/:id', async (req, res) => {
  try {
    // Attempt to get by ID first
    const article = await supportService.getHelpArticleById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Help article not found' });
    }

    // Increment view count
    await supportService.incrementHelpArticleViewCount(req.params.id);

    res.json({ article });
  } catch (error) {
    logger.error('Error fetching help article:', error);
    res.status(500).json({ error: 'Failed to fetch help article' });
  }
});

export default router;
