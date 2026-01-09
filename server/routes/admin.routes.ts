/**
 * Admin routes
 * Handles: dashboard stats, user management, support tickets, AI settings, conversation intelligence
 */

import { Router } from 'express';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { storage } from '../storage';
import { logger } from '../logger';
import { requireAdmin } from './middleware';
import { sendNotificationEmail } from '../emailService';
import { INDIVIDUAL_INGREDIENTS, SYSTEM_SUPPORTS } from '@shared/ingredients';

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

// ========================================
// Conversation Intelligence Routes
// ========================================

/**
 * GET /api/admin/conversations/stats
 * Get conversation statistics
 * NOTE: Must be defined BEFORE /conversations/:sessionId to avoid route conflict
 */
router.get('/conversations/stats', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { total: totalMessages } = await storage.getAllUserMessages(1, startDate, endDate);
    const { total: totalConversations } = await storage.getAllConversations(1, 0, startDate, endDate);

    res.json({
      dateRange: { start: startDate, end: endDate },
      totalConversations,
      totalUserMessages: totalMessages,
      averageMessagesPerConversation: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0
    });
  } catch (error) {
    logger.error('Error fetching conversation stats', { error });
    res.status(500).json({ error: 'Failed to fetch conversation stats' });
  }
});

/**
 * GET /api/admin/conversations/insights/latest
 * Get the most recent AI-generated insights
 * NOTE: Must be defined BEFORE /conversations/:sessionId to avoid route conflict
 */
router.get('/conversations/insights/latest', requireAdmin, async (req, res) => {
  try {
    const insights = await storage.getLatestConversationInsights();

    if (!insights) {
      return res.json({
        hasInsights: false,
        message: 'No insights generated yet. Click "Generate Insights" to analyze conversations.'
      });
    }

    res.json({
      hasInsights: true,
      insights
    });
  } catch (error) {
    logger.error('Error fetching conversation insights', { error });
    res.status(500).json({ error: 'Failed to fetch conversation insights' });
  }
});

/**
 * POST /api/admin/conversations/insights/generate
 * Generate AI-powered insights from all user conversations
 * NOTE: Must be defined BEFORE /conversations/:sessionId to avoid route conflict
 */
router.post('/conversations/insights/generate', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.body.days as string) || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    logger.info('Generating conversation insights', { days, startDate, endDate });

    // Get all user messages in date range (limit to recent 2000 for context window)
    const { messages: userMessages, total: totalMessages } = await storage.getAllUserMessages(2000, startDate, endDate);

    if (userMessages.length === 0) {
      return res.json({
        success: true,
        insights: {
          generatedAt: new Date(),
          dateRange: { start: startDate, end: endDate },
          messageCount: 0,
          summary: 'No user messages found in the selected date range.',
          ingredientRequests: [],
          featureRequests: [],
          commonQuestions: [],
          sentimentOverview: { positive: 0, neutral: 0, negative: 0 },
          rawAnalysis: 'No data to analyze.'
        }
      });
    }

    // Build list of available ingredients for the AI to reference
    const availableIngredients = [
      ...Object.keys(SYSTEM_SUPPORTS),
      ...Object.keys(INDIVIDUAL_INGREDIENTS)
    ];

    // Prepare messages for AI analysis
    const messageTexts = userMessages.map(m => m.content).join('\n---\n');

    // Use GPT-4o for analysis (fast and capable)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const analysisPrompt = `You are analyzing user conversations from ONES AI, a personalized supplement platform. 
Users chat with an AI health practitioner to create custom supplement formulas.

Analyze these ${userMessages.length} user messages from the past ${days} days and provide product insights.

AVAILABLE INGREDIENTS IN OUR CATALOG:
${availableIngredients.slice(0, 100).join(', ')}... (and ${availableIngredients.length - 100} more)

USER MESSAGES TO ANALYZE:
${messageTexts.slice(0, 50000)} 

Provide a JSON response with the following structure:
{
  "summary": "A 2-3 sentence executive summary of what users are discussing and asking for",
  "ingredientRequests": [
    {"name": "Ingredient Name", "count": 5, "available": true/false, "context": "Why users want it"}
  ],
  "featureRequests": [
    {"feature": "Feature description", "count": 3, "category": "one of: supplements, workouts, nutrition, tracking, ui, other"}
  ],
  "commonQuestions": [
    {"question": "What users commonly ask", "count": 10}
  ],
  "sentimentOverview": {
    "positive": 65,
    "neutral": 25, 
    "negative": 10
  },
  "topThemes": ["theme1", "theme2", "theme3"],
  "actionableInsights": [
    "Specific recommendation for product improvement"
  ]
}

Focus on:
1. Ingredients users request that we DON'T have (product gaps)
2. Features users want (meal plans, workouts, wearables, etc.)
3. Common health concerns and goals
4. Pain points or frustrations
5. Positive feedback and what's working well

Be specific and quantify where possible. Return ONLY valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: analysisPrompt }],
      max_completion_tokens: 4000,
      temperature: 0.3 // Lower temp for more consistent analysis
    });

    const rawAnalysis = completion.choices[0]?.message?.content || '';
    
    // Parse the JSON response
    let analysisData;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = rawAnalysis.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawAnalysis];
      analysisData = JSON.parse(jsonMatch[1] || rawAnalysis);
    } catch (parseError) {
      logger.warn('Failed to parse AI analysis JSON, using raw response', { parseError });
      analysisData = {
        summary: rawAnalysis.slice(0, 500),
        ingredientRequests: [],
        featureRequests: [],
        commonQuestions: [],
        sentimentOverview: { positive: 33, neutral: 34, negative: 33 },
        topThemes: [],
        actionableInsights: []
      };
    }

    // Build final insights object
    const insights = {
      generatedAt: new Date(),
      dateRange: { start: startDate, end: endDate },
      messageCount: totalMessages,
      summary: analysisData.summary || 'Analysis completed.',
      ingredientRequests: analysisData.ingredientRequests || [],
      featureRequests: analysisData.featureRequests || [],
      commonQuestions: analysisData.commonQuestions || [],
      sentimentOverview: analysisData.sentimentOverview || { positive: 0, neutral: 0, negative: 0 },
      topThemes: analysisData.topThemes || [],
      actionableInsights: analysisData.actionableInsights || [],
      rawAnalysis
    };

    // Save insights to database
    await storage.saveConversationInsights(insights);

    logger.info('Conversation insights generated successfully', { 
      messageCount: totalMessages, 
      ingredientRequests: insights.ingredientRequests.length,
      featureRequests: insights.featureRequests.length
    });

    res.json({
      success: true,
      insights
    });
  } catch (error) {
    logger.error('Error generating conversation insights', { error });
    res.status(500).json({ error: 'Failed to generate conversation insights' });
  }
});

/**
 * GET /api/admin/conversations
 * List all conversations with messages (paginated)
 */
router.get('/conversations', requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await storage.getAllConversations(limit, offset, startDate, endDate);

    res.json({
      conversations: result.conversations.map(conv => ({
        sessionId: conv.session.id,
        status: conv.session.status,
        createdAt: conv.session.createdAt,
        user: conv.user,
        messageCount: conv.messageCount,
        // Include first user message as preview
        preview: conv.messages.find(m => m.role === 'user')?.content?.slice(0, 150) || 'No messages'
      })),
      total: result.total,
      limit,
      offset
    });
  } catch (error) {
    logger.error('Error fetching conversations', { error });
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * GET /api/admin/conversations/:sessionId
 * Get full conversation details with all messages
 * NOTE: Must be defined AFTER all other /conversations/* routes to avoid conflicts
 */
router.get('/conversations/:sessionId', requireAdmin, async (req, res) => {
  try {
    const result = await storage.getConversationDetails(req.params.sessionId);

    if (!result) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      session: result.session,
      user: result.user,
      messages: result.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        model: m.model,
        formula: m.formula,
        createdAt: m.createdAt
      }))
    });
  } catch (error) {
    logger.error('Error fetching conversation details', { error });
    res.status(500).json({ error: 'Failed to fetch conversation details' });
  }
});

export default router;
