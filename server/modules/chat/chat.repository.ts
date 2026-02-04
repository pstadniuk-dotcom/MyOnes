import { db } from '../../infra/db/db';
import { chatSessions, messages, type ChatSession, type InsertChatSession, type Message, type InsertMessage } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

export class ChatRepository {
    async getChatSession(id: string): Promise<ChatSession | undefined> {
        const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
        return session || undefined;
    }

    async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
        const [session] = await db.insert(chatSessions).values(insertSession).returning();
        return session;
    }

    async listChatSessionsByUser(userId: string): Promise<ChatSession[]> {
        return await db.select().from(chatSessions).where(eq(chatSessions.userId, userId)).orderBy(desc(chatSessions.createdAt));
    }

    async updateChatSessionStatus(id: string, status: 'active' | 'completed' | 'archived'): Promise<ChatSession | undefined> {
        const [session] = await db
            .update(chatSessions)
            .set({ status })
            .where(eq(chatSessions.id, id))
            .returning();
        return session || undefined;
    }

    async deleteChatSession(id: string): Promise<void> {
        // Delete associated messages first (if not cascading)
        await db.delete(messages).where(eq(messages.sessionId, id));
        // Delete the session
        await db.delete(chatSessions).where(eq(chatSessions.id, id));
    }

    async createMessage(insertMessage: any): Promise<Message> {
        const [message] = await db.insert(messages).values(insertMessage).returning();
        return message;
    }

    async listMessagesBySession(sessionId: string): Promise<Message[]> {
        return await db.select().from(messages).where(eq(messages.sessionId, sessionId)).orderBy(messages.createdAt);
    }
}

export const chatRepository = new ChatRepository();
