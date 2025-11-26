/**
 * Admin routes
 * Handles: dashboard stats, user management, support tickets, AI settings
 */

import { Router } from 'express';
import { storage } from '../storage';
import { logger } from '../logger';
import { requireAdmin } from './middleware';
import { sendNotificationEmail } from '../emailService';

const router = Router();

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await storage.getAdminStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching admin stats', { error });
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

/**
 * GET /api/admin/analytics/growth
 * Get user growth analytics
 */
router.get('/analytics/growth', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const growthData = await storage.getUserGrowthData(days);
    res.json(growthData);
  } catch (error) {
    logger.error('Error fetching growth data', { error });
    res.status(500).json({ error: 'Failed to fetch growth data' });
  }
});

/**
 * GET /api/admin/analytics/revenue
 * Get revenue analytics
 */
router.get('/analytics/revenue', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const revenueData = await storage.getRevenueData(days);
    res.json(revenueData);
  } catch (error) {
    logger.error('Error fetching revenue data', { error });
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

/**
 * GET /api/admin/users
 * Search and list users
 */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const filter = (req.query.filter as string) || 'all';
    
    const result = await storage.searchUsers(query, limit, offset, filter);
    
    // Sanitize users to remove sensitive fields
    const sanitizedUsers = result.users.map(({ password, ...user }) => user);
    
    res.json({
      users: sanitizedUsers,
      total: result.total
    });
  } catch (error) {
    logger.error('Error searching users', { error });
    res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * GET /api/admin/users/:id
 * Get detailed user information
 */
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await storage.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { password, ...sanitizedUser } = user;
    res.json(sanitizedUser);
  } catch (error) {
    logger.error('Error fetching user details', { error });
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

/**
 * GET /api/admin/users/:id/timeline
 * Get user's complete activity timeline
 */
router.get('/users/:id/timeline', requireAdmin, async (req, res) => {
  try {
    const timeline = await storage.getUserTimeline(req.params.id);
    const { password, ...sanitizedUser } = timeline.user;
    
    res.json({
      ...timeline,
      user: sanitizedUser
    });
  } catch (error) {
    logger.error('Error fetching user timeline', { error });
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to fetch user timeline' });
  }
});

/**
 * GET /api/admin/orders/today
 * Get today's orders
 */
router.get('/orders/today', requireAdmin, async (req, res) => {
  try {
    const orders = await storage.getTodaysOrders();
    res.json(orders);
  } catch (error) {
    logger.error('Error fetching today\'s orders', { error });
    res.status(500).json({ error: 'Failed to fetch today\'s orders' });
  }
});

/**
 * GET /api/admin/support-tickets
 * List all support tickets
 */
router.get('/support-tickets', requireAdmin, async (req, res) => {
  try {
    const status = (req.query.status as string) || 'all';
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await storage.listAllSupportTickets(status, limit, offset);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching support tickets', { error });
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

/**
 * GET /api/admin/support-tickets/:id
 * Get support ticket details with responses
 */
router.get('/support-tickets/:id', requireAdmin, async (req, res) => {
  try {
    const ticket = await storage.getSupportTicket(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    const responses = await storage.listSupportTicketResponses(req.params.id);
    const user = await storage.getUserById(ticket.userId);

    res.json({
      ticket,
      responses,
      user: user ? { id: user.id, name: user.name, email: user.email } : null
    });
  } catch (error) {
    logger.error('Error fetching support ticket details', { error });
    res.status(500).json({ error: 'Failed to fetch support ticket details' });
  }
});

/**
 * PATCH /api/admin/support-tickets/:id
 * Update support ticket
 */
router.patch('/support-tickets/:id', requireAdmin, async (req, res) => {
  try {
    const allowedUpdates = ['status', 'priority', 'adminNotes'];
    const updates: Record<string, any> = {};
    
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const ticket = await storage.updateSupportTicket(req.params.id, updates);
    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    logger.error('Error updating support ticket', { error });
    res.status(500).json({ error: 'Failed to update support ticket' });
  }
});

/**
 * POST /api/admin/support-tickets/:id/reply
 * Reply to support ticket
 */
router.post('/support-tickets/:id/reply', requireAdmin, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ticket = await storage.getSupportTicket(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    const response = await storage.createSupportTicketResponse({
      ticketId,
      userId: req.userId!,
      message,
      isStaff: true
    });

    // Send email notification to user
    try {
      const user = await storage.getUserById(ticket.userId);
      if (user) {
        const ticketUrl = `https://myones.ai/support/tickets/${ticketId}`;
        await sendNotificationEmail({
          to: user.email,
          subject: `Response to: ${ticket.subject}`,
          title: 'Support Team Response',
          content: `
            <strong>Ticket Subject:</strong> ${ticket.subject}<br/>
            <strong>Response:</strong> ${message}
          `,
          actionUrl: ticketUrl,
          actionText: 'View Ticket',
          type: 'system'
        });
        logger.info('Support response email sent', { userId: user.id, ticketId });
      }
    } catch (emailError) {
      logger.error('Failed to send response notification email', { error: emailError });
    }

    res.json({ response });
  } catch (error) {
    logger.error('Error replying to support ticket', { error });
    res.status(500).json({ error: 'Failed to reply to support ticket' });
  }
});

export default router;
