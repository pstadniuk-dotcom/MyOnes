import { Request, Response } from 'express';
import { wearablesService } from '../../modules/wearables/wearables.service';
import logger from '../../infra/logging/logger';
import posthog, { syncUserProperties } from '../../infra/posthog';

export class WearablesController {
    private getFrontendBaseUrl = (req: Request): string => {
        const configured = process.env.FRONTEND_URL;
        if (configured) {
            return configured.replace(/\/$/, '');
        }

        const originHeader = req.get('origin');
        if (originHeader) {
            return originHeader.replace(/\/$/, '');
        }

        const referer = req.get('referer');
        if (referer) {
            try {
                const refererUrl = new URL(referer);
                return refererUrl.origin;
            } catch {
                // ignore malformed referrer and fall back to host
            }
        }

        return `${req.protocol}://${req.get('host')}`;
    }

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

    getConnectLink = async (req: Request, res: Response) => {
        try {
            const userId = req.userId!;
            const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
            const forceFreshUser = req.query.fresh === '1' || req.query.fresh === 'true';
            const frontendBaseUrl = this.getFrontendBaseUrl(req);
            const redirectUrl = `${frontendBaseUrl}/dashboard/wearables?connected=1`;
            const linkData = await wearablesService.getConnectLink(userId, provider, forceFreshUser, redirectUrl);
            posthog.capture({
                distinctId: userId,
                event: 'wearable_connect_started',
                properties: { provider: provider ?? null },
            });
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
            res.json(linkData);
        } catch (error) {
            logger.error('Error generating Junction link:', error);
            const message = error instanceof Error ? error.message : 'Failed to generate connection link';

            if (message.toLowerCase().includes('not currently supported')) {
                return res.status(400).json({ error: message });
            }

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

            posthog.capture({
                distinctId: userId,
                event: 'wearable_disconnected',
                properties: { connection_id: connectionId, source: 'user_initiated' },
            });
            void syncUserProperties(userId);

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
            if ((result as any).rateLimited) {
                return res.status(429).json(result);
            }
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

    async getPillars(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const pillars = await wearablesService.getPillars(userId);
            res.json(pillars);
        } catch (error) {
            logger.error('Error fetching pillars:', error);
            res.status(500).json({ activePillars: [], unlockablePillars: [] });
        }
    }

    async getHealthPulseSummary(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const summary = await wearablesService.getHealthPulseSummary(userId);
            res.json(summary);
        } catch (error) {
            logger.error('Error fetching health pulse summary:', error);
            res.status(500).json({ error: 'Failed to fetch health pulse summary' });
        }
    }

    async getAiAnalysis(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const days = parseInt(req.query.days as string) || 30;
            const analysis = await wearablesService.getAiAnalysis(userId, days);
            res.json(analysis);
        } catch (error) {
            logger.error('Error generating AI wearable analysis:', error);
            res.status(500).json({ error: 'Failed to generate analysis' });
        }
    }

    async getWeeklyBrief(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const brief = await wearablesService.getWeeklyBrief(userId);
            res.json(brief);
        } catch (error) {
            logger.error('Error generating weekly brief:', error);
            res.status(500).json({ error: 'Failed to generate weekly brief' });
        }
    }

    async getHealthPulseIntelligence(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const intelligence = await wearablesService.getHealthPulseIntelligence(userId);
            res.json(intelligence);
        } catch (error) {
            logger.error('Error generating health pulse intelligence:', error);
            res.status(500).json({ error: 'Failed to generate health pulse intelligence' });
        }
    }
}

export const wearablesController = new WearablesController();
