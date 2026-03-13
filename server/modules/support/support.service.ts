import { supportRepository } from './support.repository';
import { usersRepository } from '../users/users.repository';
import { sendNotificationEmail } from '../../utils/emailService';
import logger from '../../infra/logging/logger';
import { type InsertSupportTicket, type InsertSupportTicketResponse } from '@shared/schema';

export class SupportService {
    async getFaqItems(category?: string) {
        return await supportRepository.listFaqItems(category);
    }

    async getFaqItem(id: string) {
        return await supportRepository.getFaqItem(id);
    }

    async getUserTickets(userId: string) {
        return await supportRepository.listSupportTicketsByUser(userId);
    }

    async getTicketWithResponses(ticketId: string, userId: string) {
        return await supportRepository.getSupportTicketWithResponses(ticketId, userId);
    }

    async createTicket(userId: string, ticketData: Partial<InsertSupportTicket>) {
        const ticket = await supportRepository.createSupportTicket({
            ...ticketData,
            userId
        } as InsertSupportTicket);

        // Send notification email
        try {
            const user = await usersRepository.getUser(userId);
            if (user) {
                // Notify support team
                await sendNotificationEmail({
                    to: 'support@ones.health',
                    subject: `New Support Ticket: ${ticket.subject}`,
                    title: 'New Support Ticket Received',
                    content: `
                        <strong>From:</strong> ${user.name} (${user.email})<br/>
                        <strong>Subject:</strong> ${ticket.subject}<br/>
                        <strong>Category:</strong> ${ticket.category}<br/>
                        <strong>Priority:</strong> ${ticket.priority}<br/>
                        <strong>Description:</strong> ${ticket.description}<br/>
                        <strong>Ticket ID:</strong> ${ticket.id}
                    `,
                    actionUrl: `https://ones.health/admin/support-tickets/${ticket.id}`,
                    actionText: 'View Ticket in Admin',
                    type: 'system'
                });

                // Send confirmation to user
                await sendNotificationEmail({
                    to: user.email,
                    subject: `Ticket Received: ${ticket.subject}`,
                    title: 'We Received Your Support Request',
                    content: `
                        <p>Hi ${user.name},</p>
                        <p>We've received your support request and our team will get back to you within 24 hours.</p>
                        <strong>Subject:</strong> ${ticket.subject}<br/>
                        <strong>Category:</strong> ${ticket.category}<br/>
                        <strong>Priority:</strong> ${ticket.priority}<br/>
                        <strong>Ticket ID:</strong> ${ticket.id}<br/>
                        <p style="margin-top: 12px;">You can track your ticket and reply to any updates from your Support dashboard.</p>
                    `,
                    actionUrl: 'https://ones.health/dashboard/support',
                    actionText: 'View My Tickets',
                    type: 'system'
                });
                logger.info(`📧 Support notification emails sent for ticket ${ticket.id}`);
            }
        } catch (error) {
            logger.error('Failed to send support notification email:', error);
        }

        return ticket;
    }

    async createTicketResponse(userId: string, ticketId: string, message: string) {
        const ticket = await supportRepository.getSupportTicket(ticketId);
        if (!ticket) throw new Error('Support ticket not found');
        if (ticket.userId !== userId) throw new Error('Unauthorized');

        const response = await supportRepository.createSupportTicketResponse({
            ticketId,
            userId,
            message,
            isStaff: false
        } as InsertSupportTicketResponse);

        // Send notification
        try {
            const user = await usersRepository.getUser(userId);
            if (user) {
                const adminTicketUrl = `https://ones.health/admin/support-tickets/${ticketId}`;
                await sendNotificationEmail({
                    to: 'support@ones.health',
                    subject: `New Response on Ticket: ${ticket.subject}`,
                    title: 'New Support Ticket Response',
                    content: `
                        <strong>From:</strong> ${user.name} (${user.email})<br/>
                        <strong>Ticket Subject:</strong> ${ticket.subject}<br/>
                        <strong>Ticket ID:</strong> ${ticketId}<br/>
                        <strong>New Message:</strong> ${message}
                    `,
                    actionUrl: adminTicketUrl,
                    actionText: 'Review Ticket',
                    type: 'system'
                });
                logger.info(`📧 Support response notification email sent for ticket ${ticketId}`);
            }
        } catch (error) {
            logger.error('Failed to send response notification email:', error);
        }

        return response;
    }

    async getHelpArticles(category?: string) {
        return await supportRepository.listHelpArticles(category);
    }

    async getHelpArticle(id: string) {
        const article = await supportRepository.getHelpArticle(id);
        if (article) {
            // Fire and forget view update
            supportRepository.incrementHelpArticleViewCount(id).catch(err => {
                logger.error('Failed to increment view count', err);
            });
        }
        return article;
    }
}

export const supportService = new SupportService();
