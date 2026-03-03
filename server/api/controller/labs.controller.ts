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
}

export const labsController = new LabsController();
