import { Request, Response } from 'express';
import { optimizeService } from '../../modules/optimize/optimize.service';
import logger from '../../infra/logging/logger';

export class OptimizeController {
    async getPlans(req: Request, res: Response) {
        try {
            const plans = await optimizeService.getPlans(req.userId!);
            res.json(plans);
        } catch (error) {
            logger.error('Error in getPlans:', error);
            res.status(500).json({ error: 'Failed to fetch plans' });
        }
    }

    async getStreaks(req: Request, res: Response) {
        try {
            const streaks = await optimizeService.getStreaks(req.userId!);
            res.json(streaks);
        } catch (error) {
            logger.error('Error in getStreaks:', error);
            res.status(500).json({ error: 'Failed to fetch streaks' });
        }
    }

    async generatePlans(req: Request, res: Response) {
        try {
            const { planTypes, preferences } = req.body;
            const results = await optimizeService.generatePlans(req.userId!, planTypes, preferences);
            res.json({ success: true, results });
        } catch (error) {
            logger.error('Error in generatePlans:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate plans' });
        }
    }

    async getDailyLogs(req: Request, res: Response) {
        try {
            const { start, end } = req.query;
            const result = await optimizeService.getDailyLogs(req.userId!, start as string, end as string);
            res.json(result);
        } catch (error) {
            logger.error('Error in getDailyLogs:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch daily logs' });
        }
    }

    async logMealCompletion(req: Request, res: Response) {
        try {
            const { date, mealType } = req.body;
            const result = await optimizeService.logMealCompletion(req.userId!, date, mealType);
            res.json(result);
        } catch (error) {
            logger.error('Error in logMealCompletion:', error);
            res.status(500).json({ error: 'Failed to log meal completion' });
        }
    }

    async saveDailyLog(req: Request, res: Response) {
        try {
            const result = await optimizeService.saveDailyLog(req.userId!, req.body);
            res.json(result);
        } catch (error) {
            logger.error('Error in saveDailyLog:', error);
            res.status(500).json({ error: 'Failed to save daily log' });
        }
    }

    async createWorkoutLog(req: Request, res: Response) {
        try {
            const log = await optimizeService.createWorkoutLog(req.userId!, req.body);
            res.json(log);
        } catch (error) {
            logger.error('Error in createWorkoutLog:', error);
            res.status(500).json({ error: 'Failed to create workout log' });
        }
    }

    async generateRecipe(req: Request, res: Response) {
        try {
            const recipe = await optimizeService.generateRecipe(req.userId!, req.body);
            res.json(recipe);
        } catch (error) {
            logger.error('Error in generateRecipe:', error);
            res.status(500).json({ error: 'Failed to generate recipe' });
        }
    }

    async getWorkoutAnalytics(req: Request, res: Response) {
        try {
            const analytics = await optimizeService.getWorkoutAnalytics(req.userId!);
            res.json(analytics);
        } catch (error) {
            logger.error('Error in getWorkoutAnalytics:', error);
            res.status(500).json({ error: 'Failed to fetch workout analytics' });
        }
    }

    async swapMeal(req: Request, res: Response) {
        try {
            const result = await optimizeService.swapMeal(req.userId!, req.body);
            res.json(result);
        } catch (error) {
            logger.error('Error in swapMeal:', error);
            res.status(500).json({ error: 'Failed to swap meal' });
        }
    }

    async switchExercise(req: Request, res: Response) {
        try {
            const result = await optimizeService.switchExercise(req.userId!, req.body);
            res.json(result);
        } catch (error) {
            logger.error('Error in switchExercise:', error);
            res.status(500).json({ error: 'Failed to switch exercise' });
        }
    }

    async getTrackedPRs(req: Request, res: Response) {
        try {
            const prs = await optimizeService.getTrackedPRsForUser(req.userId!);
            res.json(prs);
        } catch (error) {
            logger.error('Error in getTrackedPRs:', error);
            res.status(500).json({ error: 'Failed to fetch PRs' });
        }
    }

    async getExerciseRecords(req: Request, res: Response) {
        try {
            const records = await optimizeService.getExerciseRecordsForUser(req.userId!);
            res.json(records);
        } catch (error) {
            logger.error('Error in getExerciseRecords:', error);
            res.status(500).json({ error: 'Failed to fetch exercise records' });
        }
    }

    async getExerciseRecord(req: Request, res: Response) {
        try {
            const record = await optimizeService.getExerciseRecordForUser(req.userId!, req.params.exerciseName);
            res.json(record);
        } catch (error) {
            logger.error('Error in getExerciseRecord:', error);
            res.status(500).json({ error: 'Failed to fetch exercise record' });
        }
    }

    async deleteWorkoutPR(req: Request, res: Response) {
        try {
            const success = await optimizeService.deleteExercisePRForUser(req.userId!, req.params.exerciseName);
            res.json({ success });
        } catch (error) {
            logger.error('Error in deleteWorkoutPR:', error);
            res.status(500).json({ error: 'Failed to delete PR' });
        }
    }
}

export const optimizeController = new OptimizeController();
