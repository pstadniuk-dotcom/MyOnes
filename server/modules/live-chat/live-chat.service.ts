import { liveChatRepository } from './live-chat.repository';
import { getBusinessHoursInfo } from './business-hours';
import { liveChatEventBus } from './live-chat.events';
import { generateBotResponse, isExplicitHumanRequest } from './ai-chat-bot';
import { sendNotificationEmail } from '../../utils/emailService';
import logger from '../../infra/logging/logger';
import type { InsertLiveChatSession, InsertLiveChatMessage } from '@shared/schema';

export class LiveChatService {
  // ─── Session Lifecycle ──────────────────────────────────────────

  /**
   * Start or resume a chat session for a logged-in user.
   */
  async getOrCreateSession(userId: string, metadata?: Record<string, any>) {
    const existing = await liveChatRepository.getActiveSessionForUser(userId);
    if (existing) return existing;

    const session = await liveChatRepository.createSession({
      userId,
      status: 'active',
      metadata: metadata || {},
    } as InsertLiveChatSession);

    // Send welcome with AI-first context
    const hours = getBusinessHoursInfo();
    const greeting = `Hi! 👋 Welcome to Ones Support. I can help with questions about our supplements, pricing, shipping, your account, and more.\n\nIf I can't resolve something, I'll connect you with a team member right away.${!hours.isOnline ? `\n\n_Our team is currently offline but will follow up when they're back (${hours.nextOpenTime || 'next business day'})._` : ''}\n\nHow can I help you today?`;

    const welcomeMsg = await liveChatRepository.createMessage({
      sessionId: session.id,
      sender: 'bot',
      content: greeting,
    } as InsertLiveChatMessage);

    liveChatEventBus.emitMessage(session.id, welcomeMsg);

    this.notifyAdminNewChat(session.id).catch(err => {
      logger.error('Failed to notify admin of new live chat', { error: err });
    });

    return session;
  }

  /**
   * Start a guest chat session with secure token (pre-auth users).
   */
  async createGuestSession(guestName: string, guestEmail: string, metadata?: Record<string, any>) {
    const result = await liveChatRepository.createGuestSession({
      guestName,
      guestEmail,
      status: 'active',
      metadata: metadata || {},
    } as InsertLiveChatSession);

    const hours = getBusinessHoursInfo();
    const greeting = `Hi ${guestName}! 👋 Welcome to Ones Support. I can help with questions about our supplements, pricing, shipping, and more.\n\nIf I can't resolve something, I'll connect you with a team member right away.${!hours.isOnline ? `\n\n_Our team is currently offline but will follow up when they're back (${hours.nextOpenTime || 'next business day'})._` : ''}\n\nWhat can I help you with?`;

    const welcomeMsg = await liveChatRepository.createMessage({
      sessionId: result.id,
      sender: 'bot',
      content: greeting,
    } as InsertLiveChatMessage);

    liveChatEventBus.emitMessage(result.id, welcomeMsg);

    this.notifyAdminNewChat(result.id).catch(err => {
      logger.error('Failed to notify admin of new guest chat', { error: err });
    });

    return result; // includes guestToken
  }

  // ─── Message Handling with Auto-Response ───────────────────────

  /**
   * Send a message from the user side, with intelligent auto-response.
   */
  async sendUserMessage(sessionId: string, userId: string | null, content: string, attachments?: any[]) {
    const session = await liveChatRepository.getSession(sessionId);
    if (!session) throw new Error('Chat session not found');
    if (session.status === 'closed') throw new Error('Chat session is closed');

    if (userId && session.userId && session.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const messageData: any = {
      sessionId,
      sender: 'user',
      senderId: userId || undefined,
      content,
    };
    if (attachments?.length) {
      messageData.attachments = attachments;
    }

    const message = await liveChatRepository.createMessage(messageData as InsertLiveChatMessage);

    // Broadcast via SSE
    liveChatEventBus.emitMessage(sessionId, message);
    liveChatEventBus.emitStopTyping(sessionId, 'user');

    // If a human admin is assigned and recently active, don't auto-respond (admin handles it)
    if (session.assignedTo) {
      const recentMessages = await liveChatRepository.getMessages(sessionId);
      const lastAdminMsg = recentMessages.filter((m: any) => m.sender === 'admin').pop();
      if (lastAdminMsg) {
        const timeSinceAdmin = Date.now() - new Date(lastAdminMsg.createdAt).getTime();
        if (timeSinceAdmin < 5 * 60 * 1000) {
          // Admin was active < 5 min ago — mark as waiting and let admin continue
          await liveChatRepository.updateSession(sessionId, { status: 'waiting' });
          liveChatEventBus.emitSessionUpdate(sessionId, { status: 'waiting' });
          return message;
        }
      }
    }

    // AI bot handles the conversation (async — don't block the response)
    logger.info(`sendUserMessage: about to call handleBotConversation for session ${sessionId}, assignedTo=${session.assignedTo}, status=${session.status}`);
    this.handleBotConversation(sessionId, content).catch(err => {
      logger.error('Bot conversation handler failed', { sessionId, error: String(err) });
    });

    return message;
  }

  /**
   * AI-first conversation handler.
   *
   * The bot handles the full conversation using conversation history for context.
   * When it can't help, it escalates to a human admin automatically.
   */
  private async handleBotConversation(sessionId: string, userMessage: string) {
    // Show bot typing indicator via SSE
    liveChatEventBus.emitTyping(sessionId, 'bot');

    // Fast path: explicit "talk to a human" request
    if (isExplicitHumanRequest(userMessage)) {
      await this.delay(800);
      await this.escalateToHuman(
        sessionId,
        `Absolutely! Let me connect you with a member of our support team right away. They'll be with you shortly! 🙌`,
        'User explicitly requested a human agent'
      );
      return;
    }

    // Full AI conversation — send entire history for context
    try {
      await this.delay(1000); // Natural typing delay

      const allMessages = await liveChatRepository.getMessages(sessionId);
      logger.info(`Bot handler: fetched ${allMessages.length} messages for session ${sessionId}`);

      const conversationHistory = allMessages.map((m: any) => ({
        sender: m.sender as string,
        content: m.content as string,
        createdAt: m.createdAt,
      }));

      logger.info(`Bot handler: calling AI for session ${sessionId}`);
      const botResponse = await generateBotResponse(conversationHistory, userMessage);
      logger.info(`Bot handler: AI responded for session ${sessionId}, escalate=${botResponse.shouldEscalate}`);

      // Save and broadcast the bot's response
      const botMsg = await liveChatRepository.createMessage({
        sessionId,
        sender: 'bot',
        content: botResponse.content,
      } as InsertLiveChatMessage);

      liveChatEventBus.emitStopTyping(sessionId, 'bot');
      liveChatEventBus.emitMessage(sessionId, botMsg);

      // Handle escalation
      if (botResponse.shouldEscalate) {
        await this.escalateToHuman(sessionId, null, botResponse.escalationReason || 'AI decided to escalate');
      }
    } catch (err) {
      logger.error('AI bot conversation failed', { sessionId, error: err });

      // On error, send friendly fallback and escalate
      const hours = getBusinessHoursInfo();
      const fallback = hours.isOnline
        ? `I'm having a moment — let me connect you with our support team who can help! They'll be right with you. 🙏`
        : `I'm having a moment, and our team is currently offline. They'll see your message first thing when they're back (${hours.nextOpenTime || 'next business day'}). We'll also email you when we reply! 📧`;

      const botMsg = await liveChatRepository.createMessage({
        sessionId,
        sender: 'bot',
        content: fallback,
      } as InsertLiveChatMessage);

      liveChatEventBus.emitStopTyping(sessionId, 'bot');
      liveChatEventBus.emitMessage(sessionId, botMsg);

      await this.escalateToHuman(sessionId, null, 'AI error — auto-escalated');

      // If offline, also create a ticket
      if (!hours.isOnline) {
        this.createTicketFromChat(sessionId).catch(ticketErr => {
          logger.error('Failed to create ticket from chat', { error: ticketErr });
        });
      }
    }
  }

  /**
   * Escalate a session from bot to human admin.
   * Sets status to 'waiting', notifies admins via SSE and email.
   */
  private async escalateToHuman(sessionId: string, handoffMessage: string | null, reason: string) {
    logger.info(`🔄 Escalating session ${sessionId} to human: ${reason}`);

    // If there's a handoff message, send it as a bot message
    if (handoffMessage) {
      const botMsg = await liveChatRepository.createMessage({
        sessionId,
        sender: 'bot',
        content: handoffMessage,
      } as InsertLiveChatMessage);
      liveChatEventBus.emitStopTyping(sessionId, 'bot');
      liveChatEventBus.emitMessage(sessionId, botMsg);
    }

    // Update session status to waiting (signals admin dashboard)
    await liveChatRepository.updateSession(sessionId, { status: 'waiting' });
    liveChatEventBus.emitSessionUpdate(sessionId, { status: 'waiting' });

    // Broadcast escalation event to admin SSE clients
    liveChatEventBus.broadcastToAdmins({
      type: 'escalation',
      data: { sessionId, reason },
    });

    // Notify admins via email
    this.notifyAdminEscalation(sessionId, reason).catch(err => {
      logger.error('Failed to send escalation notification', { error: err });
    });
  }

  /**
   * Send email notification to admins about an escalated chat.
   */
  private async notifyAdminEscalation(sessionId: string, reason: string) {
    try {
      const session = await liveChatRepository.getSession(sessionId);
      if (!session) return;

      const name = session.guestName || 'A user';
      await sendNotificationEmail({
        to: 'support@ones.health',
        subject: `⚡ Chat Escalation — ${name} needs help`,
        title: 'Chat Escalated to Human',
        content: `
          <strong>From:</strong> ${name}${session.guestEmail ? ` (${session.guestEmail})` : ''}<br/>
          <strong>Reason:</strong> ${reason}<br/>
          <strong>Session ID:</strong> ${sessionId}<br/>
          <strong>Time:</strong> ${new Date().toLocaleString()}
        `,
        actionUrl: `https://ones.health/admin/live-chats`,
        actionText: 'Handle This Chat',
        type: 'system',
      });
    } catch (error) {
      logger.error('Failed to send escalation email', { error });
    }
  }

  // ─── Admin Message Handling ────────────────────────────────────

  /**
   * Send a message from admin side.
   */
  async sendAdminMessage(sessionId: string, adminId: string, content: string, attachments?: any[]) {
    const session = await liveChatRepository.getSession(sessionId);
    if (!session) throw new Error('Chat session not found');

    if (session.status === 'waiting') {
      await liveChatRepository.updateSession(sessionId, {
        status: 'active',
        assignedTo: adminId,
      });
      liveChatEventBus.emitSessionUpdate(sessionId, { status: 'active', assignedTo: adminId });
    }

    const messageData: any = {
      sessionId,
      sender: 'admin',
      senderId: adminId,
      content,
    };
    if (attachments?.length) {
      messageData.attachments = attachments;
    }

    const message = await liveChatRepository.createMessage(messageData as InsertLiveChatMessage);

    // Broadcast via SSE
    liveChatEventBus.emitMessage(sessionId, message);
    liveChatEventBus.emitStopTyping(sessionId, 'admin');
    await liveChatRepository.markAdminRead(sessionId);
    return message;
  }

  // ─── Typing Indicators ─────────────────────────────────────────

  emitTyping(sessionId: string, who: 'user' | 'admin') {
    liveChatEventBus.emitTyping(sessionId, who);
  }

  emitStopTyping(sessionId: string, who: 'user' | 'admin') {
    liveChatEventBus.emitStopTyping(sessionId, who);
  }

  // ─── Rating ────────────────────────────────────────────────────

  async submitRating(sessionId: string, rating: number, comment?: string) {
    const session = await liveChatRepository.getSession(sessionId);
    if (!session) throw new Error('Chat session not found');

    const metadata = (session.metadata as Record<string, any>) || {};
    metadata.rating = rating;
    metadata.ratingComment = comment || null;
    metadata.ratedAt = new Date().toISOString();

    await liveChatRepository.updateSession(sessionId, { metadata } as any);

    const botMsg = await liveChatRepository.createMessage({
      sessionId,
      sender: 'bot',
      content: rating >= 4
        ? `Thank you for your feedback! ⭐ We're glad we could help. Have a great day!`
        : `Thank you for your feedback. We're sorry we didn't fully meet your expectations. Your input helps us improve! 💙`,
    } as InsertLiveChatMessage);

    liveChatEventBus.emitMessage(sessionId, botMsg);
    return { success: true };
  }

  // ─── Transcript ────────────────────────────────────────────────

  async sendTranscript(sessionId: string, email: string) {
    const session = await liveChatRepository.getSession(sessionId);
    if (!session) throw new Error('Chat session not found');

    const messages = await liveChatRepository.getMessages(sessionId);
    const transcriptHtml = messages.map((msg: any) => {
      const sender = msg.sender === 'user' ? 'You'
        : msg.sender === 'admin' ? 'Support Team'
        : 'Ones Support';
      const time = new Date(msg.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
      let content = msg.content.replace(/\n/g, '<br/>');

      // Add attachment links
      const attachments = (msg as any).attachments as any[] | null;
      if (attachments?.length) {
        content += '<br/>' + attachments.map((a: any) =>
          `📎 <a href="${a.url}">${a.name}</a>`
        ).join('<br/>');
      }

      return `<div style="margin-bottom:12px;"><strong>${sender}</strong> <span style="color:#999;font-size:12px;">${time}</span><br/>${content}</div>`;
    }).join('');

    await sendNotificationEmail({
      to: email,
      subject: 'Your Ones Support Chat Transcript',
      title: 'Chat Transcript',
      content: `
        <p>Here's a copy of your support conversation:</p>
        <div style="background:#f9f9f9;padding:16px;border-radius:8px;margin:16px 0;">
          ${transcriptHtml}
        </div>
        <p style="color:#999;font-size:12px;">Session ID: ${sessionId}</p>
      `,
      actionUrl: 'https://ones.health/dashboard',
      actionText: 'Go to Dashboard',
      type: 'system',
    });

    return { success: true };
  }

  // ─── Session Management ────────────────────────────────────────

  async getMessages(sessionId: string, after?: string) {
    return await liveChatRepository.getMessages(sessionId, after);
  }

  async getSession(sessionId: string) {
    return await liveChatRepository.getSession(sessionId);
  }

  async getSessionByGuestToken(token: string) {
    return await liveChatRepository.getSessionByGuestToken(token);
  }

  async closeSession(sessionId: string, closedBy: string) {
    const session = await liveChatRepository.closeSession(sessionId, closedBy);
    liveChatEventBus.emitSessionClosed(sessionId, closedBy);
    return session;
  }

  async getSessionHistory(userId: string) {
    return await liveChatRepository.getSessionHistory(userId);
  }

  async listAdminSessions(status?: string) {
    return await liveChatRepository.listAdminSessions(status);
  }

  async getActiveChatCount() {
    return await liveChatRepository.getActiveChatCount();
  }

  async markAdminRead(sessionId: string) {
    return await liveChatRepository.markAdminRead(sessionId);
  }

  async markUserRead(sessionId: string) {
    return await liveChatRepository.markUserRead(sessionId);
  }

  // ─── Agent Assignment/Transfer ─────────────────────────────────

  async transferSession(sessionId: string, newAdminId: string, transferredBy: string) {
    const session = await liveChatRepository.transferSession(sessionId, newAdminId);
    if (!session) throw new Error('Session not found');

    // Add system message about transfer
    const systemMsg = await liveChatRepository.createMessage({
      sessionId,
      sender: 'bot',
      content: `This conversation has been transferred to another team member. They'll be with you shortly! 🔄`,
    } as InsertLiveChatMessage);

    liveChatEventBus.emitMessage(sessionId, systemMsg);
    liveChatEventBus.emitSessionUpdate(sessionId, { assignedTo: newAdminId });

    return session;
  }

  async listAdminUsers() {
    return await liveChatRepository.listAdminUsers();
  }

  // ─── Canned Responses ──────────────────────────────────────────

  async listCannedResponses() {
    return await liveChatRepository.listCannedResponses();
  }

  async createCannedResponse(data: any) {
    return await liveChatRepository.createCannedResponse(data);
  }

  async updateCannedResponse(id: string, updates: any) {
    return await liveChatRepository.updateCannedResponse(id, updates);
  }

  async deleteCannedResponse(id: string) {
    return await liveChatRepository.deleteCannedResponse(id);
  }

  async useCannedResponse(shortcut: string): Promise<string | null> {
    const response = await liveChatRepository.getCannedResponseByShortcut(shortcut);
    if (!response) return null;
    await liveChatRepository.incrementCannedResponseUsage(response.id);
    return response.content;
  }

  // ─── Offline → Ticket ──────────────────────────────────────────

  async createTicketFromChat(sessionId: string) {
    return await liveChatRepository.createTicketFromChat(sessionId);
  }

  // ─── Analytics ─────────────────────────────────────────────────

  async getAnalytics(startDate: Date, endDate: Date) {
    return await liveChatRepository.getAnalytics(startDate, endDate);
  }

  /**
   * Get business hours status (exposed for API).
   */
  getBusinessHours() {
    return getBusinessHoursInfo();
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async notifyAdminNewChat(sessionId: string) {
    try {
      const session = await liveChatRepository.getSession(sessionId);
      if (!session) return;

      // Broadcast to all admin SSE connections
      liveChatEventBus.broadcastToAdmins({
        type: 'session_update',
        data: { type: 'new_session', sessionId, session },
      });

      const name = session.guestName || 'A user';
      await sendNotificationEmail({
        to: 'support@ones.health',
        subject: `New Live Chat from ${name}`,
        title: 'New Live Chat Started',
        content: `
          <strong>From:</strong> ${name}<br/>
          <strong>Session ID:</strong> ${sessionId}<br/>
          <strong>Started:</strong> ${new Date().toLocaleString()}
        `,
        actionUrl: `https://ones.health/admin/live-chats`,
        actionText: 'Open Live Chats',
        type: 'system',
      });
      logger.info(`📧 Live chat notification sent for session ${sessionId}`);
    } catch (error) {
      logger.error('Failed to send live chat notification email', { error });
    }
  }
}

export const liveChatService = new LiveChatService();
