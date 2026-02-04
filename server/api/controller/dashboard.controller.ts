import { Request, Response } from 'express';
import { dashboardService } from '../../modules/dashboard/dashboard.service';
import logger from '../../infra/logging/logger';

export class DashboardController {
    async getDashboardData(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const data = await dashboardService.getMainDashboardData(userId);
            res.json(data);
        } catch (error) {
            logger.error('Error in getDashboardData controller:', error);
            res.status(500).json({ error: 'Failed to fetch dashboard data' });
        }
    }

    async getWellnessData(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const data = await dashboardService.getWellnessDashboardData(userId);
            res.json(data);
        } catch (error) {
            logger.error('Error in getWellnessData controller:', error);
            res.status(500).json({ error: 'Failed to fetch wellness data' });
        }
    }

    async getStreakSummary(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const data = await dashboardService.getStreakSummary(userId);
            res.json(data);
        } catch (error) {
            logger.error('Error in getStreakSummary controller:', error);
            res.status(500).json({ error: 'Failed to fetch streak summary' });
        }
    }
}

export const dashboardController = new DashboardController();
