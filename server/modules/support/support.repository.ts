import { db } from '../../infra/db/db';
import {
    faqItems, helpArticles, supportTickets, supportTicketResponses,
    type FaqItem, type InsertFaqItem,
    type HelpArticle, type InsertHelpArticle,
    type SupportTicket, type InsertSupportTicket,
    type SupportTicketResponse, type InsertSupportTicketResponse
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

type ContentStatusFilter = 'all' | 'published' | 'deleted';

export class SupportRepository {
    // FAQ operations
    async getFaqItem(id: string): Promise<FaqItem | undefined> {
        const [item] = await db
            .select()
            .from(faqItems)
            .where(and(eq(faqItems.id, id), eq(faqItems.isDeleted, false)));
        return item || undefined;
    }

    async listFaqItems(
        category?: string,
        options: { includeUnpublished?: boolean; status?: ContentStatusFilter } = {}
    ): Promise<FaqItem[]> {
        const includeUnpublished = options.includeUnpublished ?? false;
        const status = options.status ?? (includeUnpublished ? 'all' : 'published');

        const statusFilter =
            status === 'deleted'
                ? eq(faqItems.isDeleted, true)
                : status === 'published'
                    ? and(eq(faqItems.isPublished, true), eq(faqItems.isDeleted, false))
                    : undefined;

        return await db
            .select()
            .from(faqItems)
            .where(
                and(
                    statusFilter,
                    category ? eq(faqItems.category, category) : undefined
                )
            )
            .orderBy(faqItems.displayOrder);
    }

    async createFaqItem(insertFaqItem: InsertFaqItem): Promise<FaqItem> {
        const [item] = await db.insert(faqItems).values(insertFaqItem).returning();
        return item;
    }

    async updateFaqItem(id: string, updates: Partial<InsertFaqItem>): Promise<FaqItem | undefined> {
        const [item] = await db
            .update(faqItems)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(faqItems.id, id))
            .returning();
        return item || undefined;
    }

    async deleteFaqItem(id: string): Promise<boolean> {
        const result = await db
            .update(faqItems)
            .set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() })
            .where(eq(faqItems.id, id))
            .returning();
        return result.length > 0;
    }

    async restoreFaqItem(id: string): Promise<FaqItem | undefined> {
        const [item] = await db
            .update(faqItems)
            .set({ isDeleted: false, deletedAt: null, updatedAt: new Date() })
            .where(eq(faqItems.id, id))
            .returning();
        return item || undefined;
    }

    // Help Article operations
    async getHelpArticle(id: string): Promise<HelpArticle | undefined> {
        const [article] = await db
            .select()
            .from(helpArticles)
            .where(and(eq(helpArticles.id, id), eq(helpArticles.isDeleted, false)));
        return article || undefined;
    }

    async listHelpArticles(
        category?: string,
        options: { includeUnpublished?: boolean; status?: ContentStatusFilter } = {}
    ): Promise<HelpArticle[]> {
        const includeUnpublished = options.includeUnpublished ?? false;
        const status = options.status ?? (includeUnpublished ? 'all' : 'published');

        const statusFilter =
            status === 'deleted'
                ? eq(helpArticles.isDeleted, true)
                : status === 'published'
                    ? and(eq(helpArticles.isPublished, true), eq(helpArticles.isDeleted, false))
                    : undefined;

        return await db
            .select()
            .from(helpArticles)
            .where(
                and(
                    statusFilter,
                    category ? eq(helpArticles.category, category) : undefined
                )
            )
            .orderBy(helpArticles.displayOrder);
    }

    async createHelpArticle(insertArticle: InsertHelpArticle): Promise<HelpArticle> {
        const [article] = await db.insert(helpArticles).values(insertArticle).returning();
        return article;
    }

    async updateHelpArticle(id: string, updates: Partial<InsertHelpArticle>): Promise<HelpArticle | undefined> {
        const [article] = await db
            .update(helpArticles)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(helpArticles.id, id))
            .returning();
        return article || undefined;
    }

    async deleteHelpArticle(id: string): Promise<boolean> {
        const result = await db
            .update(helpArticles)
            .set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() })
            .where(eq(helpArticles.id, id))
            .returning();
        return result.length > 0;
    }

    async restoreHelpArticle(id: string): Promise<HelpArticle | undefined> {
        const [article] = await db
            .update(helpArticles)
            .set({ isDeleted: false, deletedAt: null, updatedAt: new Date() })
            .where(eq(helpArticles.id, id))
            .returning();
        return article || undefined;
    }

    async incrementHelpArticleViewCount(id: string): Promise<boolean> {
        const result = await db
            .update(helpArticles)
            .set({ viewCount: sql`${helpArticles.viewCount} + 1` })
            .where(and(eq(helpArticles.id, id), eq(helpArticles.isDeleted, false)))
            .returning();
        return result.length > 0;
    }

    // Support Ticket operations
    async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
        const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
        return ticket || undefined;
    }

    async listSupportTicketsByUser(userId: string): Promise<SupportTicket[]> {
        return await db
            .select()
            .from(supportTickets)
            .where(eq(supportTickets.userId, userId))
            .orderBy(desc(supportTickets.createdAt));
    }

    async createSupportTicket(insertTicket: InsertSupportTicket): Promise<SupportTicket> {
        const [ticket] = await db.insert(supportTickets).values(insertTicket).returning();
        return ticket;
    }

    async updateSupportTicket(id: string, updates: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
        const [ticket] = await db
            .update(supportTickets)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(supportTickets.id, id))
            .returning();
        return ticket || undefined;
    }

    async getSupportTicketWithResponses(id: string, userId: string): Promise<{ ticket: SupportTicket, responses: SupportTicketResponse[] } | undefined> {
        const [ticket] = await db
            .select()
            .from(supportTickets)
            .where(and(
                eq(supportTickets.id, id),
                eq(supportTickets.userId, userId)
            ));

        if (!ticket) return undefined;

        const responses = await db
            .select()
            .from(supportTicketResponses)
            .where(eq(supportTicketResponses.ticketId, id))
            .orderBy(supportTicketResponses.createdAt);

        return { ticket, responses };
    }

    // Support Ticket Response operations
    async createSupportTicketResponse(insertResponse: InsertSupportTicketResponse): Promise<SupportTicketResponse> {
        const [response] = await db.insert(supportTicketResponses).values(insertResponse).returning();
        return response;
    }

    async listSupportTicketResponses(ticketId: string): Promise<SupportTicketResponse[]> {
        return await db
            .select()
            .from(supportTicketResponses)
            .where(eq(supportTicketResponses.ticketId, ticketId))
            .orderBy(supportTicketResponses.createdAt);
    }
}

export const supportRepository = new SupportRepository();
