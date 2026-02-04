import { Router } from 'express';
import { optimizeController } from '../controller/optimize.controller';
import { requireAuth } from '../middleware/middleware';

const router = Router();

// Optimize Plans
router.get('/plans', requireAuth, optimizeController.getPlans);
router.post('/plans/generate', requireAuth, optimizeController.generatePlans);

// Streaks & Daily Logs
router.get('/streaks', requireAuth, optimizeController.getStreaks);
router.get('/daily-logs', requireAuth, optimizeController.getDailyLogs);
router.post('/daily-logs', requireAuth, optimizeController.saveDailyLog);

// Nutrition
router.post('/nutrition/log-meal', requireAuth, optimizeController.logMealCompletion);
router.post('/nutrition/swap-meal', requireAuth, optimizeController.swapMeal);
router.post('/nutrition/recipe', requireAuth, optimizeController.generateRecipe);

// Workouts
router.get('/analytics/workout', requireAuth, optimizeController.getWorkoutAnalytics);
router.post('/workout/logs', requireAuth, optimizeController.createWorkoutLog);
router.post('/workout/switch', requireAuth, optimizeController.switchExercise);

// Exercise Records / PRs
router.get('/exercise-records/prs', requireAuth, optimizeController.getTrackedPRs);
router.get('/exercise-records', requireAuth, optimizeController.getExerciseRecords);
router.get('/exercise-records/:exerciseName', requireAuth, optimizeController.getExerciseRecord);
router.delete('/exercise-records/pr/:exerciseName', requireAuth, optimizeController.deleteWorkoutPR);

export default router;
