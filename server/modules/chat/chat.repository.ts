import { db } from '../../infra/db/db';
import { chatSessions, messages, type ChatSession, type InsertChatSession, type Message, type InsertMessage } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { encryptField, decryptField } from '../../infra/security/fieldEncryption';

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

    async renameChatSession(id: string, title: string): Promise<ChatSession | undefined> {
        const [session] = await db
            .update(chatSessions)
            .set({ title })
            .where(eq(chatSessions.id, id))
            .returning();
        return session || undefined;
    }

    async createMessage(insertMessage: any): Promise<Message> {
        // Encrypt message content (PHI) before storage
        const encryptedMessage = {
            ...insertMessage,
            content: insertMessage.content ? encryptField(insertMessage.content) : insertMessage.content,
        };
        const [message] = await db.insert(messages).values(encryptedMessage).returning();
        return this.decryptMessage(message);
    }

    async listMessagesBySession(sessionId: string): Promise<Message[]> {
        const rows = await db.select().from(messages).where(eq(messages.sessionId, sessionId)).orderBy(messages.createdAt);
        return rows.map(m => this.decryptMessage(m));
    }

    /**
     * Delete all messages in a session that were created at or after a specific message.
     * Used for editing/truncating a conversation (ChatGPT-style edit).
     */
    async deleteMessagesAfterId(sessionId: string, messageId: string): Promise<void> {
        // Find the creation time of the target message
        const [targetMessage] = await db
            .select({ createdAt: messages.createdAt })
            .from(messages)
            .where(eq(messages.id, messageId));

        if (!targetMessage) return;

        // Delete all messages in the session created at or after this message
        await db
            .delete(messages)
            .where(
                sql`${messages.sessionId} = ${sessionId} AND ${messages.createdAt} >= ${targetMessage.createdAt}`
            );
    }

    /**
     * Decrypt message content. Handles both encrypted and legacy plaintext messages.
     */
    private decryptMessage(message: Message): Message {
        if (!message.content) return message;
        try {
            return { ...message, content: decryptField(message.content) };
        } catch {
            // Legacy plaintext message — return as-is
            return message;
        }
    }
}

export const chatRepository = new ChatRepository();
