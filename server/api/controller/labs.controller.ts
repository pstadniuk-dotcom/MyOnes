import { Request, Response } from 'express';
import { labsService } from '../../modules/labs/labs.service';
import logger from '../../infra/logging/logger';

export class LabsController {
    async getBiomarkersDashboard(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const dashboard = await labsService.getBiomarkersDashboard(userId);
            res.json(dashboard);
        } catch (error) {
            logger.error('Error fetching biomarkers dashboard:', error);
            res.status(500).json({ error: 'Failed to fetch biomarkers dashboard' });
        }
    }

    async getMarkerInsights(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { markerKeys } = req.body;
            if (!Array.isArray(markerKeys) || markerKeys.length === 0 || markerKeys.length > 50) {
                return res.status(400).json({ error: 'markerKeys must be an array of 1-50 strings' });
            }
            // Validate all keys are strings
            if (!markerKeys.every((k: unknown) => typeof k === 'string' && k.length > 0 && k.length < 200)) {
                return res.status(400).json({ error: 'Invalid marker key format' });
            }
            const insights = await labsService.getMarkerInsightsOnDemand(userId, markerKeys);
            res.json({ insights });
        } catch (error) {
            logger.error('Error generating marker insights:', error);
            res.status(500).json({ error: 'Failed to generate marker insights' });
        }
    }
}

export const labsController = new LabsController();
