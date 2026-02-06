import { Request, Response } from 'express';
import { supportService } from '../../modules/support/support.service';
import { insertSupportTicketSchema } from '@shared/schema';
import logger from '../../infra/logging/logger';
import { z } from 'zod';

export class SupportController {
    async getFaqItems(req: Request, res: Response) {
        try {
            const category = req.query.category as string | undefined;
            const faqItems = await supportService.getFaqItems(category);
            res.json({ faqItems });
        } catch (error) {
            logger.error('Error fetching FAQ items:', error);
            res.status(500).json({ error: 'Failed to fetch FAQ items' });
        }
    }

    async getFaqItem(req: Request, res: Response) {
        try {
            const faqItem = await supportService.getFaqItem(req.params.id);
            if (!faqItem) {
                return res.status(404).json({ error: 'FAQ item not found' });
            }
            res.json({ faqItem });
        } catch (error) {
            logger.error('Error fetching FAQ item:', error);
            res.status(500).json({ error: 'Failed to fetch FAQ item' });
        }
    }

    async getUserTickets(req: Request, res: Response) {
        try {
            const tickets = await supportService.getUserTickets(req.userId!);
            res.json({ tickets });
        } catch (error) {
            logger.error('Error fetching support tickets:', error);
            res.status(500).json({ error: 'Failed to fetch support tickets' });
        }
    }

    async getTicket(req: Request, res: Response) {
        try {
            const result = await supportService.getTicketWithResponses(req.params.id, req.userId!);
            if (!result) {
                return res.status(404).json({ error: 'Support ticket not found' });
            }
            res.json(result);
        } catch (error) {
            logger.error('Error fetching support ticket:', error);
            res.status(500).json({ error: 'Failed to fetch support ticket' });
        }
    }

    async createTicket(req: Request, res: Response) {
        try {
            const validationResult = insertSupportTicketSchema.safeParse({ ...req.body, userId: req.userId! });
            if (!validationResult.success) {
                return res.status(400).json({
                    error: 'Invalid ticket data',
                    details: validationResult.error.errors
                });
            }

            const ticket = await supportService.createTicket(req.userId!, validationResult.data);
            res.json({ ticket });
        } catch (error) {
            logger.error('Error creating support ticket:', error);
            res.status(500).json({ error: 'Failed to create support ticket' });
        }
    }

    async addTicketResponse(req: Request, res: Response) {
        try {
            const messageValidation = z.object({
                message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long')
            }).safeParse(req.body);

            if (!messageValidation.success) {
                return res.status(400).json({
                    error: 'Invalid message data',
                    details: messageValidation.error.errors
                });
            }

            const response = await supportService.createTicketResponse(
                req.userId!,
                req.params.id,
                messageValidation.data.message
            );
            res.json({ response });
        } catch (error) {
            logger.error('Error creating support ticket response:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            if (message === 'Support ticket not found') {
                res.status(404).json({ error: message });
            } else if (message === 'Unauthorized') {
                res.status(403).json({ error: message });
            } else {
                res.status(500).json({ error: 'Failed to create response' });
            }
        }
    }

    async getHelpArticles(req: Request, res: Response) {
        try {
            const category = req.query.category as string | undefined;
            const articles = await supportService.getHelpArticles(category);
            res.json({ articles });
        } catch (error) {
            logger.error('Error fetching help articles:', error);
            res.status(500).json({ error: 'Failed to fetch help articles' });
        }
    }

    async getHelpArticle(req: Request, res: Response) {
        try {
            const article = await supportService.getHelpArticle(req.params.id);
            if (!article) {
                return res.status(404).json({ error: 'Help article not found' });
            }
            res.json({ article });
        } catch (error) {
            logger.error('Error fetching help article:', error);
            res.status(500).json({ error: 'Failed to fetch help article' });
        }
    }
}

export const supportController = new SupportController();
