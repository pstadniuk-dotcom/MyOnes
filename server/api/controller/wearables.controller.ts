import { Request, Response } from 'express';
import { wearablesService } from '../../modules/wearables/wearables.service';
import logger from '../../infra/logging/logger';

export class WearablesController {
    async getConnections(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const connections = await wearablesService.getConnections(userId);
            res.json(connections);
        } catch (error) {
            logger.error('Error fetching wearable connections:', error);
            res.status(500).json({ error: 'Failed to fetch wearable connections' });
        }
    }

    async getConnectLink(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const linkData = await wearablesService.getConnectLink(userId);
            res.json(linkData);
        } catch (error) {
            logger.error('Error generating Junction link:', error);
            res.status(500).json({ error: 'Failed to generate connection link' });
        }
    }

    async legacyConnect(req: Request, res: Response) {
        res.redirect('/api/wearables/connect');
    }

    async disconnectDevice(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { connectionId } = req.params;
            await wearablesService.disconnectDevice(userId, connectionId);
            res.json({ success: true });
        } catch (error: any) {
            logger.error('Error disconnecting wearable:', error);
            if (error.message === 'Invalid connection ID') {
                return res.status(400).json({ error: error.message });
            }
            if (error.message === 'Not authorized to disconnect this device') {
                return res.status(403).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to disconnect device' });
        }
    }

    async getBiometricData(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { startDate, endDate, provider } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ error: 'startDate and endDate are required' });
            }

            const data = await wearablesService.getBiometricData(
                userId,
                startDate as string,
                endDate as string,
                provider as string
            );
            res.json(data);
        } catch (error) {
            logger.error('Error fetching biometric data:', error);
            res.status(500).json({ error: 'Failed to fetch biometric data' });
        }
    }

    async getMergedBiometricData(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ error: 'startDate and endDate are required' });
            }

            const data = await wearablesService.getMergedBiometricData(
                userId,
                startDate as string,
                endDate as string
            );
            res.json(data);
        } catch (error) {
            logger.error('Error fetching merged biometric data:', error);
            res.status(500).json({ error: 'Failed to fetch merged biometric data' });
        }
    }

    async syncData(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const result = await wearablesService.syncData(userId);
            res.json(result);
        } catch (error: any) {
            logger.error('Error in manual sync:', error);
            if (error.message === 'No wearables connected') {
                return res.status(404).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to sync data' });
        }
    }

    async getInsights(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const days = parseInt(req.query.days as string) || 30;
            const insights = await wearablesService.getInsights(userId, days);
            res.json(insights);
        } catch (error) {
            logger.error('Error calculating insights:', error);
            res.status(500).json({ error: 'Failed to calculate insights' });
        }
    }

    async getAvailableProviders(req: Request, res: Response) {
        const providers = [
            { slug: 'garmin', name: 'Garmin', priority: 1, category: 'fitness', description: 'Fitness watches & GPS', logo: 'https://storage.googleapis.com/vital-assets/garmin.png', historicalDays: 90 },
            { slug: 'google_fit', name: 'Google Fit', priority: 2, category: 'fitness', description: 'Android health platform', logo: 'https://storage.googleapis.com/vital-assets/googlefit.png', historicalDays: 90 },
            { slug: 'fitbit', name: 'Fitbit', priority: 3, category: 'fitness', description: 'Activity trackers', logo: 'https://storage.googleapis.com/vital-assets/fitbit.png', historicalDays: 90 },
            { slug: 'oura', name: 'Oura Ring', priority: 4, category: 'sleep', description: 'Sleep & recovery tracking', logo: 'https://storage.googleapis.com/vital-assets/oura.png', historicalDays: 180 },
            { slug: 'whoop_v2', name: 'WHOOP', priority: 5, category: 'fitness', description: 'Strain & recovery coach', logo: 'https://storage.googleapis.com/vital-assets/whoop.png', historicalDays: 180 },
            { slug: 'peloton', name: 'Peloton', priority: 6, category: 'fitness', description: 'Connected fitness', logo: 'https://storage.googleapis.com/vital-assets/peloton.png', historicalDays: 180 },
            { slug: 'freestyle_libre', name: 'Freestyle Libre', priority: 7, category: 'cgm', description: 'Continuous glucose monitoring', logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgNDAiPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiIGZpbGw9IiMwMDQ4OGEiIHJ4PSI0Ii8+PHRleHQgeD0iNTAiIHk9IjI2IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QWJib3R0PC90ZXh0Pjwvc3ZnPg==', historicalDays: 90 },
        ];
        res.json({ providers });
    }

    async getHistoricalData(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const days = parseInt(req.query.days as string) || 90;
            const result = await wearablesService.getHistoricalData(userId, days);
            res.json(result);
        } catch (error) {
            logger.error('Error fetching historical data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch historical data',
                data: null,
            });
        }
    }
}

export const wearablesController = new WearablesController();
