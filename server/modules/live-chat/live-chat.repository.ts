import { db } from '../../infra/db/db';
import {
  liveChatSessions, liveChatMessages, liveChatCannedResponses, users, supportTickets,
  type LiveChatSession, type InsertLiveChatSession,
  type LiveChatMessage, type InsertLiveChatMessage,
  type LiveChatCannedResponse, type InsertLiveChatCannedResponse,
} from '@shared/schema';
import { eq, and, desc, gt, sql, or, ne, lt, gte, inArray } from 'drizzle-orm';
import crypto from 'crypto';

export class LiveChatRepository {
  // ─── Sessions ───────────────────────────────────────────────────

  async getSession(id: string): Promise<LiveChatSession | undefined> {
    const [session] = await db.select().from(liveChatSessions).where(eq(liveChatSessions.id, id));
    return session || undefined;
  }

  async getSessionByGuestToken(token: string): Promise<LiveChatSession | undefined> {
    const [session] = await db
      .select()
      .from(liveChatSessions)
      .where(eq(liveChatSessions.guestToken, token));
    return session || undefined;
  }

  async getActiveSessionForUser(userId: string): Promise<LiveChatSession | undefined> {
    const [session] = await db
      .select()
      .from(liveChatSessions)
      .where(and(
        eq(liveChatSessions.userId, userId),
        ne(liveChatSessions.status, 'closed')
      ))
      .orderBy(desc(liveChatSessions.createdAt))
      .limit(1);
    return session || undefined;
  }

  /**
   * Get closed sessions for a user (chat history).
   */
  async getSessionHistory(userId: string, limit = 10): Promise<LiveChatSession[]> {
    return db
      .select()
      .from(liveChatSessions)
      .where(and(
        eq(liveChatSessions.userId, userId),
        eq(liveChatSessions.status, 'closed')
      ))
      .orderBy(desc(liveChatSessions.createdAt))
      .limit(limit);
  }

  async createSession(data: InsertLiveChatSession): Promise<LiveChatSession> {
    const [session] = await db.insert(liveChatSessions).values(data as any).returning();
    return session;
  }

  async createGuestSession(data: InsertLiveChatSession): Promise<LiveChatSession & { guestToken: string }> {
    const guestToken = crypto.randomBytes(32).toString('hex');
    const [session] = await db.insert(liveChatSessions).values({
      ...data,
      guestToken,
    } as any).returning();
    return { ...session, guestToken };
  }

  async updateSession(id: string, updates: Partial<LiveChatSession>): Promise<LiveChatSession | undefined> {
    const [session] = await db
      .update(liveChatSessions)
      .set(updates)
      .where(eq(liveChatSessions.id, id))
      .returning();
    return session || undefined;
  }

  async closeSession(id: string, closedBy: string): Promise<LiveChatSession | undefined> {
    const [session] = await db
      .update(liveChatSessions)
      .set({ status: 'closed', closedAt: new Date(), closedBy })
      .where(eq(liveChatSessions.id, id))
      .returning();
    return session || undefined;
  }

  /**
   * Transfer session to a different admin.
   */
  async transferSession(id: string, newAdminId: string): Promise<LiveChatSession | undefined> {
    const [session] = await db
      .update(liveChatSessions)
      .set({ assignedTo: newAdminId })
      .where(eq(liveChatSessions.id, id))
      .returning();
    return session || undefined;
  }

  /**
   * List sessions for admin view with user info and unread count.
   */
  async listAdminSessions(status?: string): Promise<Array<LiveChatSession & { userName?: string; userEmail?: string; unreadCount: number }>> {
    const conditions = status
      ? eq(liveChatSessions.status, status as 'active' | 'waiting' | 'closed')
      : or(eq(liveChatSessions.status, 'active'), eq(liveChatSessions.status, 'waiting'));

    const sessions = await db
      .select({
        session: liveChatSessions,
        userName: users.name,
        userEmail: users.email,
      })
      .from(liveChatSessions)
      .leftJoin(users, eq(liveChatSessions.userId, users.id))
      .where(conditions)
      .orderBy(desc(liveChatSessions.lastMessageAt));

    const results = await Promise.all(sessions.map(async (row) => {
      const adminLastRead = row.session.adminLastReadAt || new Date(0);
      const [unreadResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(liveChatMessages)
        .where(and(
          eq(liveChatMessages.sessionId, row.session.id),
          eq(liveChatMessages.sender, 'user'),
          gt(liveChatMessages.createdAt, adminLastRead)
        ));

      return {
        ...row.session,
        userName: row.userName || row.session.guestName || undefined,
        userEmail: row.userEmail || row.session.guestEmail || undefined,
        unreadCount: unreadResult?.count || 0,
      };
    }));

    return results;
  }

  async getActiveChatCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(liveChatSessions)
      .where(or(eq(liveChatSessions.status, 'active'), eq(liveChatSessions.status, 'waiting')));
    return result?.count || 0;
  }

  /**
   * List admin users (for transfer/assignment dropdown).
   */
  async listAdminUsers(): Promise<Array<{ id: string; name: string | null; email: string }>> {
    return db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.isAdmin, true));
  }

  // ─── Messages ───────────────────────────────────────────────────

  async createMessage(data: InsertLiveChatMessage): Promise<LiveChatMessage> {
    const [msg] = await db.insert(liveChatMessages).values(data as any).returning();

    await db
      .update(liveChatSessions)
      .set({ lastMessageAt: new Date() })
      .where(eq(liveChatSessions.id, data.sessionId));

    return msg;
  }

  async getMessages(sessionId: string, after?: string): Promise<LiveChatMessage[]> {
    const conditions = after
      ? and(eq(liveChatMessages.sessionId, sessionId), gt(liveChatMessages.createdAt, new Date(after)))
      : eq(liveChatMessages.sessionId, sessionId);

    return db
      .select()
      .from(liveChatMessages)
      .where(conditions)
      .orderBy(liveChatMessages.createdAt);
  }

  async markAdminRead(sessionId: string): Promise<void> {
    await db
      .update(liveChatSessions)
      .set({ adminLastReadAt: new Date() })
      .where(eq(liveChatSessions.id, sessionId));
  }

  async markUserRead(sessionId: string): Promise<void> {
    await db
      .update(liveChatSessions)
      .set({ userLastReadAt: new Date() })
      .where(eq(liveChatSessions.id, sessionId));
  }

  // ─── Canned Responses ──────────────────────────────────────────

  async listCannedResponses(): Promise<LiveChatCannedResponse[]> {
    return db
      .select()
      .from(liveChatCannedResponses)
      .orderBy(desc(liveChatCannedResponses.usageCount));
  }

  async getCannedResponseByShortcut(shortcut: string): Promise<LiveChatCannedResponse | undefined> {
    const [response] = await db
      .select()
      .from(liveChatCannedResponses)
      .where(eq(liveChatCannedResponses.shortcut, shortcut));
    return response || undefined;
  }

  async createCannedResponse(data: InsertLiveChatCannedResponse): Promise<LiveChatCannedResponse> {
    const [response] = await db
      .insert(liveChatCannedResponses)
      .values(data)
      .returning();
    return response;
  }

  async updateCannedResponse(id: string, updates: Partial<LiveChatCannedResponse>): Promise<LiveChatCannedResponse | undefined> {
    const [response] = await db
      .update(liveChatCannedResponses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(liveChatCannedResponses.id, id))
      .returning();
    return response || undefined;
  }

  async deleteCannedResponse(id: string): Promise<void> {
    await db.delete(liveChatCannedResponses).where(eq(liveChatCannedResponses.id, id));
  }

  async incrementCannedResponseUsage(id: string): Promise<void> {
    await db
      .update(liveChatCannedResponses)
      .set({
        usageCount: sql`${liveChatCannedResponses.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(liveChatCannedResponses.id, id));
  }

  // ─── Analytics ─────────────────────────────────────────────────

  async getAnalytics(startDate: Date, endDate: Date) {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(liveChatSessions)
      .where(and(gte(liveChatSessions.createdAt, startDate), lt(liveChatSessions.createdAt, endDate)));

    const statusCounts = await db
      .select({
        status: liveChatSessions.status,
        count: sql<number>`count(*)::int`,
      })
      .from(liveChatSessions)
      .where(and(gte(liveChatSessions.createdAt, startDate), lt(liveChatSessions.createdAt, endDate)))
      .groupBy(liveChatSessions.status);

    const [ratingResult] = await db
      .select({
        avgRating: sql<number>`avg((metadata->>'rating')::numeric)`,
        ratedCount: sql<number>`count(case when metadata->>'rating' is not null then 1 end)::int`,
      })
      .from(liveChatSessions)
      .where(and(gte(liveChatSessions.createdAt, startDate), lt(liveChatSessions.createdAt, endDate)));

    const [msgResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(liveChatMessages)
      .where(and(gte(liveChatMessages.createdAt, startDate), lt(liveChatMessages.createdAt, endDate)));

    const senderCounts = await db
      .select({
        sender: liveChatMessages.sender,
        count: sql<number>`count(*)::int`,
      })
      .from(liveChatMessages)
      .where(and(gte(liveChatMessages.createdAt, startDate), lt(liveChatMessages.createdAt, endDate)))
      .groupBy(liveChatMessages.sender);

    const avgResponseResult = await db.execute(sql`
      SELECT avg(response_time_seconds)::int as avg_seconds FROM (
        SELECT s.id,
          EXTRACT(EPOCH FROM (
            (SELECT min(created_at) FROM live_chat_messages WHERE session_id = s.id AND sender = 'admin')
            - (SELECT min(created_at) FROM live_chat_messages WHERE session_id = s.id AND sender = 'user')
          )) as response_time_seconds
        FROM live_chat_sessions s
        WHERE s.created_at >= ${startDate} AND s.created_at < ${endDate}
        AND EXISTS (SELECT 1 FROM live_chat_messages WHERE session_id = s.id AND sender = 'admin')
      ) sub WHERE response_time_seconds > 0
    `);
    const avgResponseTime = (avgResponseResult as unknown as any[])?.[0];

    const dailyVolume = await db.execute(sql`
      SELECT date_trunc('day', created_at)::date as date, count(*)::int as sessions
      FROM live_chat_sessions
      WHERE created_at >= ${startDate} AND created_at < ${endDate}
      GROUP BY date_trunc('day', created_at) ORDER BY date
    `);

    return {
      totalSessions: totalResult?.count || 0,
      statusBreakdown: Object.fromEntries(statusCounts.map(s => [s.status, s.count])),
      totalMessages: msgResult?.count || 0,
      messageBySender: Object.fromEntries(senderCounts.map(s => [s.sender, s.count])),
      averageRating: ratingResult?.avgRating ? Number(Number(ratingResult.avgRating).toFixed(1)) : null,
      ratedSessions: ratingResult?.ratedCount || 0,
      avgResponseTimeSeconds: (avgResponseTime as any)?.avg_seconds || null,
      dailyVolume: (dailyVolume as unknown as any[]) || [],
    };
  }

  // ─── Bulk Delete ───────────────────────────────────────────────

  async bulkDeleteSessions(sessionIds: string[]): Promise<number> {
    if (sessionIds.length === 0) return 0;
    // Messages cascade-delete via FK
    const deleted = await db.delete(liveChatSessions).where(inArray(liveChatSessions.id, sessionIds)).returning();
    return deleted.length;
  }

  async bulkCloseSessions(sessionIds: string[], closedBy: string): Promise<number> {
    if (sessionIds.length === 0) return 0;
    const updated = await db
      .update(liveChatSessions)
      .set({ status: 'closed', closedAt: new Date(), closedBy })
      .where(inArray(liveChatSessions.id, sessionIds))
      .returning();
    return updated.length;
  }

  // ─── Offline → Ticket ──────────────────────────────────────────

  async createTicketFromChat(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const messages = await this.getMessages(sessionId);
    const userMessages = messages.filter(m => m.sender === 'user');
    const firstMessage = userMessages[0]?.content || 'Live chat inquiry';
    const description = userMessages.map(m => m.content).join('\n\n');

    const [ticket] = await db.insert(supportTickets).values({
      userId: session.userId || '',
      subject: `Live Chat: ${firstMessage.slice(0, 100)}`,
      description,
      category: 'live-chat',
      priority: 'medium',
    } as any).returning();

    return ticket;
  }
}

export const liveChatRepository = new LiveChatRepository();
