import { Request, Response } from 'express';
import { formulasService } from '../../modules/formulas/formulas.service';
import logger from '../../infra/logging/logger';

export class FormulasController {
    async getCurrentFormula(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const result = await formulasService.getCurrentFormula(userId);

            if (!result) {
                return res.status(404).json({ error: 'No formula found for user' });
            }

            res.json(result);
        } catch (error) {
            logger.error('Error fetching current formula:', error);
            res.status(500).json({ error: 'Failed to fetch current formula' });
        }
    }

    async getFormulaHistory(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const history = await formulasService.getFormulaHistory(userId);
            res.json({ history });
        } catch (error) {
            logger.error('Error fetching formula history:', error);
            res.status(500).json({ error: 'Failed to fetch formula history' });
        }
    }

    async getFormulaVersion(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { formulaId } = req.params;
            const result = await formulasService.getFormulaVersion(userId, formulaId);

            if (!result) {
                return res.status(404).json({ error: 'Formula not found or access denied' });
            }

            res.json(result);
        } catch (error) {
            logger.error('Error fetching formula version:', error);
            res.status(500).json({ error: 'Failed to fetch formula version' });
        }
    }

    async compareFormulas(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { id1, id2 } = req.params;
            const comparison = await formulasService.compareFormulas(userId, id1, id2);
            res.json(comparison);
        } catch (error: any) {
            logger.error('Error comparing formulas:', error);
            if (error.message === 'One or both formulas not found') {
                return res.status(404).json({ error: error.message });
            }
            if (error.message === 'Access denied') {
                return res.status(403).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to compare formulas' });
        }
    }

    async revertFormula(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { formulaId, reason } = req.body;

            if (!formulaId || !reason) {
                return res.status(400).json({ error: 'Formula ID and revert reason are required' });
            }

            const result = await formulasService.revertFormula(userId, formulaId, reason);
            res.json({
                success: true,
                ...result
            });
        } catch (error: any) {
            logger.error('Error reverting formula:', error);
            if (error.message.includes('not found') || error.message.includes('access denied')) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes('maximum safe dosage')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to revert formula' });
        }
    }

    async customizeFormula(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { formulaId } = req.params;
            const { addedBases, addedIndividuals } = req.body;

            const updatedFormula = await formulasService.customizeFormula(userId, formulaId, addedBases, addedIndividuals);

            res.json({
                success: true,
                formula: updatedFormula,
                message: 'Formula customized successfully'
            });
        } catch (error: any) {
            logger.error('Error customizing formula:', error);
            if (error.message.includes('Invalid ingredient')) {
                return res.status(400).json({ error: error.message });
            }
            if (error.message.includes('not found') || error.message.includes('access denied')) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes('maximum safe dosage')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to customize formula' });
        }
    }

    async createCustomFormula(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { name, bases, individuals } = req.body;

            const newFormula = await formulasService.createCustomFormula(userId, name, bases, individuals);

            res.json({
                success: true,
                formula: newFormula,
                message: 'Custom formula created successfully'
            });
        } catch (error: any) {
            logger.error('Error creating custom formula:', error);
            if (error.message.includes('required') || error.message.includes('Invalid ingredient') || error.message.includes('dosage')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to create custom formula' });
        }
    }

    async renameFormula(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { formulaId } = req.params;
            const { name } = req.body;

            const updatedFormula = await formulasService.renameFormula(userId, formulaId, name);

            res.json({
                success: true,
                formula: updatedFormula,
                message: 'Formula renamed successfully'
            });
        } catch (error: any) {
            logger.error('Error renaming formula:', error);
            if (error.message.includes('required') || error.message.includes('characters or less')) {
                return res.status(400).json({ error: error.message });
            }
            if (error.message.includes('not found') || error.message.includes('access denied')) {
                return res.status(404).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to rename formula' });
        }
    }

    async archiveFormula(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { formulaId } = req.params;

            const archivedFormula = await formulasService.archiveFormula(userId, formulaId);

            res.json({
                success: true,
                formula: archivedFormula,
                message: 'Formula archived successfully'
            });
        } catch (error: any) {
            logger.error('Error archiving formula:', error);
            if (error.message.includes('not found') || error.message.includes('access denied')) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes('already archived')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to archive formula' });
        }
    }

    async restoreFormula(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { formulaId } = req.params;

            const restoredFormula = await formulasService.restoreFormula(userId, formulaId);

            res.json({
                success: true,
                formula: restoredFormula,
                message: 'Formula restored successfully'
            });
        } catch (error: any) {
            logger.error('Error restoring formula:', error);
            if (error.message.includes('not found') || error.message.includes('access denied')) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes('not archived')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to restore formula' });
        }
    }

    async getArchivedFormulas(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const archivedFormulas = await formulasService.getArchivedFormulas(userId);
            res.json({ archived: archivedFormulas });
        } catch (error) {
            logger.error('Error fetching archived formulas:', error);
            res.status(500).json({ error: 'Failed to fetch archived formulas' });
        }
    }

    async getReviewSchedule(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { formulaId } = req.params;
            const schedule = await formulasService.getReviewSchedule(userId, formulaId);
            res.json(schedule || null);
        } catch (error: any) {
            logger.error('Error fetching review schedule:', error);
            if (error.message === 'Formula not found') {
                return res.status(404).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to fetch review schedule' });
        }
    }

    async saveReviewSchedule(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { formulaId } = req.params;
            const schedule = await formulasService.saveReviewSchedule(userId, formulaId, req.body);
            res.json(schedule);
        } catch (error: any) {
            logger.error('Error saving review schedule:', error);
            if (error.message === 'Formula not found') {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes('Invalid frequency') || error.message.includes('daysBefore')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to save review schedule' });
        }
    }

    async deleteReviewSchedule(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { formulaId } = req.params;
            await formulasService.deleteReviewSchedule(userId, formulaId);
            res.json({ success: true });
        } catch (error: any) {
            logger.error('Error deleting review schedule:', error);
            if (error.message === 'Formula not found' || error.message === 'Review schedule not found') {
                return res.status(404).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to delete review schedule' });
        }
    }

    async downloadCalendar(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { formulaId } = req.params;
            const { content, filename } = await formulasService.generateCalendarFile(userId, formulaId);

            res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(content);
        } catch (error: any) {
            logger.error('Error generating calendar file:', error);
            if (error.message === 'Formula not found' || error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to generate calendar file' });
        }
    }

    async getSharedFormula(req: Request, res: Response) {
        try {
            const { formulaId } = req.params;
            const result = await formulasService.getSharedFormula(formulaId);

            if (!result) {
                return res.status(404).json({ error: 'Formula not found' });
            }

            res.json(result);
        } catch (error) {
            logger.error('Error fetching shared formula:', error);
            res.status(500).json({ error: 'Failed to fetch formula' });
        }
    }
}

export const formulasController = new FormulasController();
