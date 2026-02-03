
import { SupportRepository } from "./support.repository";
import {
    type InsertSupportTicket, type InsertSupportTicketResponse,
    type InsertFaqItem, type InsertHelpArticle
} from "@shared/schema";

export class SupportService {
    constructor(private supportRepository: SupportRepository) { }

    // --- Tickets ---
    async createTicket(ticket: InsertSupportTicket) {
        return this.supportRepository.createSupportTicket(ticket);
    }

    async getTicket(id: string) {
        return this.supportRepository.getSupportTicket(id);
    }

    async getUserTickets(userId: string) {
        return this.supportRepository.listSupportTicketsByUser(userId);
    }

    async updateTicketStatus(id: string, status: string) {
        return this.supportRepository.updateSupportTicketStatus(id, status);
    }

    async listAllTickets(status: string, limit: number, offset: number) {
        return this.supportRepository.listAllSupportTickets(status, limit, offset);
    }

    async updateTicket(id: string, updates: any) {
        return this.supportRepository.updateSupportTicket(id, updates);
    }

    // --- Responses ---
    async addTicketResponse(response: InsertSupportTicketResponse) {
        return this.supportRepository.createTicketResponse(response);
    }

    async getTicketResponses(ticketId: string) {
        return this.supportRepository.listTicketResponses(ticketId);
    }

    // --- FAQs ---
    async getFaqs(category?: string) {
        return this.supportRepository.listFaqItems(category);
    }

    async createFaq(faq: InsertFaqItem) {
        return this.supportRepository.createFaqItem(faq);
    }

    async updateFaq(id: string, updates: Partial<InsertFaqItem>) {
        return this.supportRepository.updateFaqItem(id, updates);
    }

    async deleteFaq(id: string) {
        return this.supportRepository.deleteFaqItem(id);
    }

    // --- Help Articles ---
    async getHelpArticles(category?: string) {
        return this.supportRepository.listHelpArticles(category);
    }

    // async getHelpArticle(slug: string) {
    //     return this.supportRepository.getHelpArticle(slug);
    // }

    async createHelpArticle(article: InsertHelpArticle) {
        return this.supportRepository.createHelpArticle(article);
    }

    async updateHelpArticle(id: string, updates: Partial<InsertHelpArticle>) {
        return this.supportRepository.updateHelpArticle(id, updates);
    }

    async deleteHelpArticle(id: string) {
        return this.supportRepository.deleteHelpArticle(id);
    }

    async getFaq(id: string) {
        return this.supportRepository.getFaqItem(id);
    }

    async getTicketWithResponses(id: string, userId: string) {
        return this.supportRepository.getSupportTicketWithResponses(id, userId);
    }

    async getTicketDetails(id: string) {
        return this.supportRepository.getTicketDetails(id);
    }

    async getHelpArticleById(id: string) {
        return this.supportRepository.getHelpArticleById(id);
    }

    async incrementHelpArticleViewCount(id: string) {
        return this.supportRepository.incrementHelpArticleViewCount(id);
    }
}
