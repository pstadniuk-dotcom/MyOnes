
import { eq, desc, and, count, sql } from "drizzle-orm";
import { db } from "../../infrastructure/database/db";
import {
    supportTickets, supportTicketResponses, faqItems, helpArticles,
    type SupportTicket, type InsertSupportTicket,
    type SupportTicketResponse, type InsertSupportTicketResponse,
    type FaqItem, type InsertFaqItem,
    type HelpArticle, type InsertHelpArticle
} from "@shared/schema";
import { BaseRepository } from "../../infrastructure/database/base.repository";
import { logger } from "../../infrastructure/logging/logger";

export class SupportRepository extends BaseRepository<typeof supportTickets, SupportTicket, InsertSupportTicket> {
    constructor(db: any) {
        super(db, supportTickets, "SupportRepository");
    }

    // --- Support Tickets ---

    async createSupportTicket(insertTicket: InsertSupportTicket): Promise<SupportTicket> {
        try {
            const [ticket] = await this.db.insert(supportTickets).values(insertTicket).returning();
            return ticket;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating support ticket:`, error);
            throw error;
        }
    }

    async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
        try {
            const [ticket] = await this.db.select().from(supportTickets).where(eq(supportTickets.id, id));
            return ticket || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting support ticket:`, error);
            throw error;
        }
    }

    async listSupportTicketsByUser(userId: string): Promise<SupportTicket[]> {
        try {
            return await this.db
                .select()
                .from(supportTickets)
                .where(eq(supportTickets.userId, userId))
                .orderBy(desc(supportTickets.createdAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing support tickets by user:`, error);
            throw error;
        }
    }


    async listAllSupportTickets(status: string, limit: number, offset: number): Promise<{ tickets: SupportTicket[], total: number }> {
        try {
            let whereClause = undefined;
            if (status !== 'all') {
                whereClause = eq(supportTickets.status, status as any);
            }

            const [countResult] = await this.db
                .select({ count: count() })
                .from(supportTickets)
                .where(whereClause);

            const tickets = await this.db
                .select()
                .from(supportTickets)
                .where(whereClause)
                .limit(limit)
                .offset(offset)
                .orderBy(desc(supportTickets.createdAt));

            return { tickets, total: Number(countResult?.count || 0) };
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing all support tickets:`, error);
            throw error;
        }
    }

    async updateSupportTicket(id: string, updates: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
        try {
            const [ticket] = await this.db
                .update(supportTickets)
                .set({ ...updates, updatedAt: new Date() })
                .where(eq(supportTickets.id, id))
                .returning();
            return ticket || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating support ticket:`, error);
            throw error;
        }
    }

    async updateSupportTicketStatus(id: string, status: string): Promise<SupportTicket | undefined> {
        try {
            const [ticket] = await this.db
                .update(supportTickets)
                .set({ status: status as any, updatedAt: new Date() })
                .where(eq(supportTickets.id, id))
                .returning();
            return ticket || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating support ticket status:`, error);
            throw error;
        }
    }

    // --- Ticket Responses ---

    async createTicketResponse(insertResponse: InsertSupportTicketResponse): Promise<SupportTicketResponse> {
        try {
            const [response] = await this.db.insert(supportTicketResponses).values(insertResponse).returning();
            return response;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating ticket response:`, error);
            throw error;
        }
    }

    async listTicketResponses(ticketId: string): Promise<SupportTicketResponse[]> {
        try {
            return await this.db
                .select()
                .from(supportTicketResponses)
                .where(eq(supportTicketResponses.ticketId, ticketId))
                .orderBy(supportTicketResponses.createdAt);
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing ticket responses:`, error);
            throw error;
        }
    }

    async getSupportTicketWithResponses(id: string, userId: string): Promise<{ ticket: SupportTicket, responses: SupportTicketResponse[] } | undefined> {
        try {
            const ticket = await this.getSupportTicket(id);
            if (!ticket || ticket.userId !== userId) return undefined;

            const responses = await this.listTicketResponses(id);
            return { ticket, responses };
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting support ticket with responses:`, error);
            throw error;
        }
    }

    async getTicketDetails(id: string): Promise<{ ticket: SupportTicket, responses: SupportTicketResponse[] } | undefined> {
        try {
            const ticket = await this.getSupportTicket(id);
            if (!ticket) return undefined;

            const responses = await this.listTicketResponses(id);
            return { ticket, responses };
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting ticket details:`, error);
            throw error;
        }
    }

    // --- FAQ Items ---

    async listFaqItems(category?: string): Promise<FaqItem[]> {
        try {
            const whereClause = category ? eq(faqItems.category, category) : undefined;
            return await this.db.select().from(faqItems).where(whereClause).orderBy(faqItems.displayOrder);
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing FAQ items:`, error);
            throw error;
        }
    }

    async createFaqItem(insertFaq: InsertFaqItem): Promise<FaqItem> {
        try {
            const [faq] = await this.db.insert(faqItems).values(insertFaq).returning();
            return faq;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating FAQ item:`, error);
            throw error;
        }
    }

    async updateFaqItem(id: string, updates: Partial<InsertFaqItem>): Promise<FaqItem | undefined> {
        try {
            const [faq] = await this.db
                .update(faqItems)
                .set({ ...updates, updatedAt: new Date() })
                .where(eq(faqItems.id, id))
                .returning();
            return faq || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating FAQ item:`, error);
            throw error;
        }
    }

    async deleteFaqItem(id: string): Promise<boolean> {
        try {
            const result = await this.db.delete(faqItems).where(eq(faqItems.id, id));
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.error(`[${this.domainName}] Error deleting FAQ item:`, error);
            return false;
        }
    }

    async getFaqItem(id: string): Promise<FaqItem | undefined> {
        try {
            const [faq] = await this.db.select().from(faqItems).where(eq(faqItems.id, id));
            return faq || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting FAQ item:`, error);
            throw error;
        }
    }

    // --- Help Articles ---

    async listHelpArticles(category?: string): Promise<HelpArticle[]> {
        try {
            const whereClause = category ? eq(helpArticles.category, category) : undefined;
            return await this.db.select().from(helpArticles).where(whereClause).orderBy(desc(helpArticles.updatedAt));
        } catch (error) {
            logger.error(`[${this.domainName}] Error listing help articles:`, error);
            throw error;
        }
    }

    // getHelpArticle removed - no slug field


    async createHelpArticle(insertArticle: InsertHelpArticle): Promise<HelpArticle> {
        try {
            const [article] = await this.db.insert(helpArticles).values(insertArticle).returning();
            return article;
        } catch (error) {
            logger.error(`[${this.domainName}] Error creating help article:`, error);
            throw error;
        }
    }

    async updateHelpArticle(id: string, updates: Partial<InsertHelpArticle>): Promise<HelpArticle | undefined> {
        try {
            const [article] = await this.db
                .update(helpArticles)
                .set({ ...updates, updatedAt: new Date() })
                .where(eq(helpArticles.id, id))
                .returning();
            return article || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error updating help article:`, error);
            throw error;
        }
    }

    async deleteHelpArticle(id: string): Promise<boolean> {
        try {
            const result = await this.db.delete(helpArticles).where(eq(helpArticles.id, id));
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.error(`[${this.domainName}] Error deleting help article:`, error);
            return false;
        }
    }

    async getHelpArticleById(id: string): Promise<HelpArticle | undefined> {
        try {
            const [article] = await this.db.select().from(helpArticles).where(eq(helpArticles.id, id));
            return article || undefined;
        } catch (error) {
            logger.error(`[${this.domainName}] Error getting help article by ID:`, error);
            throw error;
        }
    }

    async incrementHelpArticleViewCount(id: string): Promise<void> {
        try {
            // Use raw SQL for atomic increment if possible, or simple update
            // Drizzle doesn't have a simple increment method in the query builder yet without sql operator
            // but we can use update with sql
            await this.db
                .update(helpArticles)
                .set({ viewCount: sql`${helpArticles.viewCount} + 1` })
                .where(eq(helpArticles.id, id));
        } catch (error) {
            logger.error(`[${this.domainName}] Error incrementing help article view count:`, error);
            // Don't throw for this, it's non-critical
        }
    }
}
