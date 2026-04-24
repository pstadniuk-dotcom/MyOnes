import { Request, Response } from 'express';
import { labsService } from '../../modules/labs/labs.service';
import { canonicalKey } from '../../modules/labs/biomarker-aliases';
import { usersRepository } from '../../modules/users/users.repository';
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

    /**
     * Get the user's hidden-marker list (canonical keys).
     * Hidden markers are still visible on the dashboard but excluded from
     * the lab data sent to the AI practitioner.
     */
    async getHiddenMarkers(req: Request, res: Response) {
        try {
            const user = await usersRepository.getUser(req.userId!);
            const hidden: string[] = Array.isArray(user?.hiddenMarkers) ? (user!.hiddenMarkers as string[]) : [];
            res.json({ hiddenMarkers: hidden });
        } catch (error) {
            logger.error('Error fetching hidden markers:', error);
            res.status(500).json({ error: 'Failed to fetch hidden markers' });
        }
    }

    /**
     * Hide a biomarker from the AI. Body: { markerKey: string } where markerKey
     * is the canonical key (e.g. "bilirubin direct"). Idempotent.
     */
    async hideMarker(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { markerKey } = req.body;
            if (typeof markerKey !== 'string' || markerKey.length === 0 || markerKey.length > 200) {
                return res.status(400).json({ error: 'markerKey must be a non-empty string' });
            }
            const normalized = canonicalKey(markerKey);
            const user = await usersRepository.getUser(userId);
            const current: string[] = Array.isArray(user?.hiddenMarkers) ? (user!.hiddenMarkers as string[]) : [];
            if (current.includes(normalized)) {
                return res.json({ hiddenMarkers: current });
            }
            const updated = [...current, normalized];
            await usersRepository.updateUser(userId, { hiddenMarkers: updated } as any);
            res.json({ hiddenMarkers: updated });
        } catch (error) {
            logger.error('Error hiding marker:', error);
            res.status(500).json({ error: 'Failed to hide marker' });
        }
    }

    /**
     * Un-hide a biomarker. Body: { markerKey: string }. Idempotent.
     */
    async unhideMarker(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { markerKey } = req.body;
            if (typeof markerKey !== 'string' || markerKey.length === 0 || markerKey.length > 200) {
                return res.status(400).json({ error: 'markerKey must be a non-empty string' });
            }
            const normalized = canonicalKey(markerKey);
            const user = await usersRepository.getUser(userId);
            const current: string[] = Array.isArray(user?.hiddenMarkers) ? (user!.hiddenMarkers as string[]) : [];
            const updated = current.filter(k => k !== normalized);
            await usersRepository.updateUser(userId, { hiddenMarkers: updated } as any);
            res.json({ hiddenMarkers: updated });
        } catch (error) {
            logger.error('Error unhiding marker:', error);
            res.status(500).json({ error: 'Failed to unhide marker' });
        }
    }
}

export const labsController = new LabsController();
