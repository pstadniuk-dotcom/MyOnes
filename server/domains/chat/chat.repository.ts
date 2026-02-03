import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { db } from "../../infrastructure/database/db";
import {
    chatSessions, messages, conversationInsights, users,
    type ChatSession, type InsertChatSession,
    type Message, type InsertMessage
} from "@shared/schema";

export class ChatRepository {
    async getChatSession(id: string): Promise<ChatSession | undefined> {
        try {
            const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
            return session || undefined;
        } catch (error) {
            console.error('Error getting chat session:', error);
            return undefined;
        }
    }

    async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
        try {
            const [session] = await db.insert(chatSessions).values(insertSession).returning();
            return session;
        } catch (error) {
            console.error('Error creating chat session:', error);
            throw new Error('Failed to create chat session');
        }
    }

    async listChatSessionsByUser(userId: string): Promise<ChatSession[]> {
        try {
            return await db.select().from(chatSessions).where(eq(chatSessions.userId, userId)).orderBy(desc(chatSessions.createdAt));
        } catch (error) {
            console.error('Error listing chat sessions:', error);
            return [];
        }
    }

    async updateChatSessionStatus(id: string, status: 'active' | 'completed' | 'archived'): Promise<ChatSession | undefined> {
        try {
            const [session] = await db
                .update(chatSessions)
                .set({ status })
                .where(eq(chatSessions.id, id))
                .returning();
            return session || undefined;
        } catch (error) {
            console.error('Error updating chat session status:', error);
            return undefined;
        }
    }

    async deleteChatSession(id: string): Promise<void> {
        try {
            // Delete associated messages first
            await db.delete(messages).where(eq(messages.sessionId, id));
            // Delete the session
            await db.delete(chatSessions).where(eq(chatSessions.id, id));
        } catch (error) {
            console.error('Error deleting chat session:', error);
            throw new Error('Failed to delete chat session');
        }
    }

    async getMessage(id: string): Promise<Message | undefined> {
        try {
            const [message] = await db.select().from(messages).where(eq(messages.id, id));
            return message || undefined;
        } catch (error) {
            console.error('Error getting message:', error);
            return undefined;
        }
    }

    async createMessage(insertMessage: any): Promise<Message> {
        try {
            const [message] = await db.insert(messages).values(insertMessage).returning();
            return message;
        } catch (error) {
            console.error('Error creating message:', error);
            throw new Error('Failed to create message');
        }
    }

    async listMessagesBySession(sessionId: string): Promise<Message[]> {
        try {
            return await db.select().from(messages).where(eq(messages.sessionId, sessionId)).orderBy(messages.createdAt);
        } catch (error) {
            console.error('Error listing messages by session:', error);
            return [];
        }
    }
    // --- Admin / Analytics Methods ---

    async getAllUserMessages(limit: number, startDate: Date, endDate: Date) {
        try {
            const userMessages = await db
                .select()
                .from(messages)
                .where(and(
                    eq(messages.role, 'user'),
                    gte(messages.createdAt, startDate),
                    lte(messages.createdAt, endDate)
                ))
                .limit(limit)
                .orderBy(desc(messages.createdAt));

            // Get total count (separate query usually needed or window function)
            // For simplicity/performance in this context, we'll just return the fetched messages length as total if we hit limit? 
            // Better to do a count query if needed.
            const [countResult] = await db
                .select({ count: sql`count(*)` })
                .from(messages)
                .where(and(
                    eq(messages.role, 'user'),
                    gte(messages.createdAt, startDate),
                    lte(messages.createdAt, endDate)
                ));

            return {
                messages: userMessages,
                total: Number(countResult.count)
            };
        } catch (error) {
            console.error('Error getting all user messages:', error);
            return { messages: [], total: 0 };
        }
    }

    async getAllConversations(limit: number, offset: number, startDate?: Date, endDate?: Date) {
        try {
            let whereClause = undefined;
            if (startDate && endDate) {
                whereClause = and(
                    gte(chatSessions.createdAt, startDate),
                    lte(chatSessions.createdAt, endDate)
                );
            }

            const sessions = await db
                .select()
                .from(chatSessions)
                .where(whereClause)
                .limit(limit)
                .offset(offset)
                .orderBy(desc(chatSessions.createdAt));

            const totalResult = await db
                .select({ count: sql`count(*)` })
                .from(chatSessions)
                .where(whereClause);

            // Enhance with user and message count
            const conversations = await Promise.all(sessions.map(async (session) => {
                const [user] = await db.select().from(users).where(eq(users.id, session.userId));
                const [msgCount] = await db.select({ count: sql`count(*)` }).from(messages).where(eq(messages.sessionId, session.id));
                const msgs = await db.select().from(messages).where(eq(messages.sessionId, session.id)).orderBy(messages.createdAt).limit(1); // just first message or few

                return {
                    session,
                    user: user || null,
                    messageCount: Number(msgCount.count),
                    messages: msgs
                };
            }));

            return {
                conversations,
                total: Number(totalResult[0].count)
            };
        } catch (error) {
            console.error('Error getting all conversations:', error);
            return { conversations: [], total: 0 };
        }
    }

    async getConversationDetails(sessionId: string) {
        try {
            const session = await this.getChatSession(sessionId);
            if (!session) return null;

            const msgs = await this.listMessagesBySession(sessionId);
            const [user] = await db.select().from(users).where(eq(users.id, session.userId));

            return {
                session,
                user: user || null,
                messages: msgs
            };
        } catch (error) {
            console.error('Error getting conversation details:', error);
            return null;
        }
    }

    async getLatestConversationInsights() {
        try {
            const [insight] = await db
                .select()
                .from(conversationInsights)
                .orderBy(desc(conversationInsights.generatedAt))
                .limit(1);
            return insight || null;
        } catch (error) {
            console.error('Error getting latest conversation insights:', error);
            return null;
        }
    }

    async saveConversationInsights(insights: any) {
        try {
            // Ensure generatedAt is Date
            const data = {
                ...insights,
                generatedAt: insights.generatedAt || new Date()
            };
            const [saved] = await db.insert(conversationInsights).values(data).returning();
            return saved;
        } catch (error) {
            console.error('Error saving conversation insights:', error);
            throw error;
        }
    }
}

export const chatRepository = new ChatRepository();
