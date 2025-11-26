/**
 * Optimize Routes Module
 * 
 * Handles all /api/optimize/* endpoints:
 * - Nutrition, workout, and lifestyle plan generation
 * - Daily logs and streaks
 * - Meal logging and swapping
 * - Workout logging and exercise switching
 * - Grocery list management
 * - Recipe generation
 * - Workout analytics
 */

import { Router } from 'express';
import OpenAI from 'openai';
import { nanoid } from 'nanoid';
import { startOfWeek, format, differenceInDays, isSameDay } from 'date-fns';
import { storage } from '../storage';
import { requireAuth } from './middleware';
import { buildNutritionPlanPrompt, buildWorkoutPlanPrompt, buildLifestylePlanPrompt, buildRecipePrompt } from '../optimize-prompts';
import { parseAiJson } from '../utils/parseAiJson';
import { normalizePlanContent, DEFAULT_MEAL_TYPES } from '../optimize-normalizer';
import logger from '../logger';
import type { OptimizeDailyLog } from '@shared/schema';

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to build grocery items from plan content
type GroceryListItem = {
  id: string;
  item: string;
  amount?: string;
  unit?: string;
  category?: string;
  checked: boolean;
};

function mapIngredientToItem(value: any): GroceryListItem | null {
  if (!value) return null;
  if (typeof value === 'string') {
    return {
      id: nanoid(8),
      item: value,
      category: 'General',
      checked: false,
    };
  }

  const itemName = value.item || value.name || value.ingredient;
  if (!itemName) return null;

  return {
    id: nanoid(8),
    item: itemName,
    amount: value.quantity || value.amount || value.qty || undefined,
    unit: value.unit,
    category: value.category || value.type || 'General',
    checked: Boolean(value.checked && value.checked === true),
  };
}

function buildGroceryItemsFromPlanContent(content: any): GroceryListItem[] {
  if (Array.isArray(content?.shoppingList) && content.shoppingList.length > 0) {
    return content.shoppingList
      .map((item: any) => mapIngredientToItem(item))
      .filter((item: GroceryListItem | null): item is GroceryListItem => Boolean(item))
      .map((item: GroceryListItem) => ({ ...item, checked: false }));
  }

  const aggregated = new Map<string, GroceryListItem>();
  const weekPlan = Array.isArray(content?.weekPlan) ? content.weekPlan : [];

  weekPlan.forEach((day: any) => {
    if (!Array.isArray(day?.meals)) return;
    day.meals.forEach((meal: any) => {
      if (!Array.isArray(meal?.ingredients)) return;
      meal.ingredients.forEach((ingredient: any) => {
        const normalized = mapIngredientToItem(ingredient);
        if (!normalized) return;
        const key = normalized.item.toLowerCase();
        if (aggregated.has(key)) return;
        aggregated.set(key, normalized);
      });
    });
  });

  return Array.from(aggregated.values());
}

// Get user's optimize plans
router.get('/plans', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const plans = await storage.getOptimizePlans(userId);
    res.json(plans);
  } catch (error) {
    logger.error('Error fetching optimize plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Get user's streaks
router.get('/streaks', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const streaks = [];
    
    const streakTypes = ['overall', 'nutrition', 'workout', 'lifestyle'] as const;
    for (const type of streakTypes) {
      const streak = await storage.getUserStreak(userId, type);
      if (streak) {
        streaks.push(streak);
      }
    }
    
    res.json(streaks);
  } catch (error) {
    logger.error('Error fetching streaks:', error);
    res.status(500).json({ error: 'Failed to fetch streaks' });
  }
});

// Generate optimize plans (nutrition, workout, lifestyle)
router.post('/plans/generate', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { planTypes, preferences } = req.body;
    
    logger.info('🎯 OPTIMIZE PLAN GENERATION STARTED', { userId, planTypes, preferences });
    
    if (!Array.isArray(planTypes) || planTypes.length === 0) {
      return res.status(400).json({ error: 'planTypes array is required' });
    }

    // Get user context
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const healthProfile = await storage.getHealthProfile(userId);
    const activeFormula = await storage.getCurrentFormulaByUser(userId);
    const labAnalyses = await storage.listLabAnalysesByUser(userId);

    logger.info('📊 Context loaded:', { hasProfile: !!healthProfile, hasFormula: !!activeFormula, labCount: labAnalyses.length });

    const labSummary = labAnalyses
      .map((analysis) => {
        if (analysis.aiInsights?.summary) {
          return analysis.aiInsights.summary;
        }
        const abnormalMarkers = analysis.extractedMarkers
          ?.filter((marker) => marker.status && marker.status !== 'normal')
          .map((marker) => `${marker.name}: ${marker.value}${marker.unit ?? ''} (${marker.status})`)
          .join(', ');
        return abnormalMarkers ? `Markers of concern: ${abnormalMarkers}` : '';
      })
      .filter(Boolean)
      .join('\n\n');

    const optimizeContext = {
      user: { id: user.id, name: user.name, email: user.email },
      healthProfile,
      activeFormula,
      labData: labAnalyses.length > 0 ? { reports: labAnalyses, summary: labSummary || 'Lab analyses available for personalization.' } : undefined,
      preferences: preferences || {},
    };

    const results: Record<string, any> = {};
    
    for (const planType of planTypes) {
      logger.info(`🤖 Generating ${planType} plan...`);
      let prompt: string;
      
      switch (planType) {
        case 'nutrition':
          prompt = buildNutritionPlanPrompt(optimizeContext);
          break;
        case 'workout':
          prompt = buildWorkoutPlanPrompt(optimizeContext);
          break;
        case 'lifestyle':
          prompt = buildLifestylePlanPrompt(optimizeContext);
          break;
        default:
          return res.status(400).json({ error: `Invalid plan type: ${planType}` });
      }

      logger.info(`📝 Prompt built, length: ${prompt.length} chars`);

      let planContent: any;
      let rationale = '';

      try {
        logger.info('⏳ Calling OpenAI API...');
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-2024-08-06',
          messages: [
            { role: 'system', content: "You are a clinical nutrition expert. You MUST generate a complete 7-day meal plan (Monday-Sunday). Do not stop early. The response must be valid JSON containing all 7 days." },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 16000,
        });

        if (response.usage) {
          logger.info(`📊 Token Usage: prompt=${response.usage.prompt_tokens}, completion=${response.usage.completion_tokens}`);
        }

        const content = response.choices[0].message.content || '{}';
        planContent = parseAiJson(content);
        rationale = planContent.weeklyGuidance || planContent.programOverview || planContent.focusAreas || 'Personalized plan generated';
        
        logger.info(`✅ AI response received, length: ${content.length} chars`);
      } catch (aiError) {
        logger.error(`❌ AI generation error for ${planType}:`, aiError);
        planContent = { error: 'Failed to generate plan', details: aiError instanceof Error ? aiError.message : 'Unknown error' };
        rationale = 'AI generation failed';
      }

      const normalizedContent = normalizePlanContent(planType as 'nutrition' | 'workout' | 'lifestyle', planContent);

      logger.info(`💾 Saving ${planType} plan to database...`);
      const plan = await storage.createOptimizePlan({
        userId,
        planType,
        content: normalizedContent,
        aiRationale: rationale,
        preferences: preferences || {},
        basedOnFormulaId: activeFormula?.id || null,
        basedOnLabs: labAnalyses.length > 0 ? labAnalyses[0] : null,
        isActive: true,
      });
      
      logger.info(`✅ ${planType} plan saved with ID: ${plan.id}`);
      results[planType] = plan;
    }

    // Auto-generate grocery list if nutrition plan was created
    if (results.nutrition && planTypes.includes('nutrition')) {
      logger.info('🛒 Auto-generating grocery list for nutrition plan...');
      try {
        const nutritionPlan = results.nutrition;
        const content = nutritionPlan.content as any;
        const weekPlan = content.weekPlan || [];
        
        let mealsText = '';
        weekPlan.forEach((day: any) => {
          mealsText += `\nDay ${day.day} (${day.dayName}):\n`;
          day.meals?.forEach((meal: any) => {
            const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients.join(', ') : '';
            mealsText += `- ${meal.name}: ${ingredients}\n`;
          });
        });

        const groceryPrompt = buildGroceryListPrompt(mealsText);
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: groceryPrompt }],
          temperature: 0.5,
          response_format: { type: "json_object" }
        });

        const responseContent = completion.choices[0].message.content || '{}';
        const parsed = JSON.parse(responseContent);
        
        const items = (parsed.items || []).map((item: any) => ({
          id: nanoid(8),
          item: item.item,
          amount: item.amount,
          unit: item.unit,
          category: item.category,
          checked: false
        }));

        if (items.length > 0) {
          const existingList = await storage.getActiveGroceryList(userId);
          const groceryList = existingList
            ? await storage.updateGroceryList(existingList.id, { optimizePlanId: nutritionPlan.id, items, generatedAt: new Date(), isArchived: false })
            : await storage.createGroceryList({ userId, optimizePlanId: nutritionPlan.id, items, generatedAt: new Date(), isArchived: false });
          
          logger.info(`✅ Grocery list auto-generated with ${items.length} items`);
          results.groceryList = groceryList;
        }
      } catch (groceryError) {
        logger.error('⚠️ Failed to auto-generate grocery list (non-fatal):', groceryError);
      }
    }
    
    res.json(results);
  } catch (error) {
    logger.error('❌ Error generating optimize plans:', error);
    res.status(500).json({ error: 'Failed to generate plans' });
  }
});

// Helper function to build grocery list prompt
function buildGroceryListPrompt(mealsText: string): string {
  return `
You are a smart nutritionist assistant creating a PRACTICAL grocery shopping list.
The user needs to buy actual items/packages at the store, not individual tablespoons of ingredients.

RULES:
1. **Consolidate items** into purchasable units (e.g., "1 jar", "1 bag", "1 carton", "1 bottle").
2. **NO small measurements** like "tbsp", "tsp", "oz", or "cups" unless it's for produce count (e.g. "5 apples").
3. **Round up** to standard package sizes.
   - BAD: "2 tbsp Honey", "1/4 cup Pumpkin Seeds", "3 tbsp Olive Oil"
   - GOOD: "Honey (1 jar)", "Pumpkin Seeds (1 bag)", "Olive Oil (1 bottle)"
4. **Group items** by category (Produce, Meat/Seafood, Dairy/Eggs, Pantry, Bakery, Frozen, Other).
5. **Combine duplicates** intelligently (e.g. if 3 meals need eggs, list "Eggs (1 dozen)").

Meal Plan:
${mealsText}

Return a JSON object with this structure:
{
  "items": [
    { "item": "Eggs", "amount": "1", "unit": "dozen", "category": "Dairy/Eggs" },
    { "item": "Honey", "amount": "1", "unit": "jar", "category": "Pantry" }
  ]
}
IMPORTANT: Return ONLY valid JSON. No markdown formatting.
`;
}

// Get daily logs
router.get('/daily-logs', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { start, end } = req.query;

    const endDate = end ? new Date(String(end)) : new Date();
    if (Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid end date' });
    }
    endDate.setHours(23, 59, 59, 999);

    const startDate = start ? new Date(String(start)) : new Date(endDate);
    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start date' });
    }
    if (!start) {
      startDate.setDate(endDate.getDate() - 6);
    }
    startDate.setHours(0, 0, 0, 0);

    if (startDate > endDate) {
      return res.status(400).json({ error: 'start date must be before end date' });
    }

    const logs = await storage.listDailyLogs(userId, startDate, endDate);
    const normalizedLogs = logs
      .map((log) => ({ ...log, logDate: new Date(log.logDate).toISOString() }))
      .sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime());

    const logsByDate = normalizedLogs.reduce<Record<string, typeof normalizedLogs[number]>>((acc, log) => {
      acc[log.logDate.slice(0, 10)] = log;
      return acc;
    }, {});

    const streakTypes = ['overall', 'nutrition', 'workout', 'lifestyle'] as const;
    const streaks = {} as Record<typeof streakTypes[number], any>;
    for (const type of streakTypes) {
      streaks[type] = (await storage.getUserStreak(userId, type)) ?? null;
    }

    res.json({ range: { start: startDate.toISOString(), end: endDate.toISOString() }, logs: normalizedLogs, logsByDate, streaks });
  } catch (error) {
    logger.error('❌ Error fetching daily logs:', error);
    res.status(500).json({ error: 'Failed to fetch optimize logs' });
  }
});

// Log a meal completion
router.post('/nutrition/log-meal', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { date, mealType } = req.body;

    if (!date || !mealType) {
      return res.status(400).json({ error: 'date and mealType are required' });
    }

    const logDate = new Date(date);
    if (Number.isNaN(logDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date value' });
    }

    const normalizedMealType = String(mealType).toLowerCase();
    const existingLog = await storage.getDailyLog(userId, logDate);
    const mealsLogged = new Set<string>(Array.isArray(existingLog?.mealsLogged) ? existingLog!.mealsLogged : []);
    mealsLogged.add(normalizedMealType);

    const nutritionCompleted = mealsLogged.size >= DEFAULT_MEAL_TYPES.length;
    let updatedLog = existingLog;

    if (existingLog) {
      updatedLog = await storage.updateDailyLog(existingLog.id, { mealsLogged: Array.from(mealsLogged), nutritionCompleted });
    } else {
      updatedLog = await storage.createDailyLog({ userId, logDate, mealsLogged: Array.from(mealsLogged), nutritionCompleted, workoutCompleted: false, supplementsTaken: false });
    }

    res.json({ success: true, log: updatedLog, mealsLogged: Array.from(mealsLogged), nutritionCompleted });
  } catch (error) {
    logger.error('❌ Error logging meal:', error);
    res.status(500).json({ error: 'Failed to log meal' });
  }
});

// Get workout logs history
router.get('/workout/logs', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await storage.listWorkoutLogs(userId, limit, offset);
    res.json({ logs, total: logs.length, limit, offset });
  } catch (error) {
    logger.error('❌ Error fetching workout logs:', error);
    res.status(500).json({ error: 'Failed to fetch workout logs' });
  }
});

// Create detailed workout log
router.post('/workout/logs', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { workoutId, completedAt, durationActual, difficultyRating, exercisesCompleted, notes } = req.body;

    logger.info('📝 Creating workout log:', { userId, workoutId, completedAt, exerciseCount: exercisesCompleted?.length });

    if (!completedAt) {
      return res.status(400).json({ error: 'completedAt is required' });
    }

    const log = await storage.createWorkoutLog({
      userId,
      workoutId: workoutId || null,
      completedAt: new Date(completedAt),
      durationActual: durationActual || null,
      difficultyRating: difficultyRating || null,
      exercisesCompleted: exercisesCompleted || [],
      notes: notes || null,
    });

    logger.info('✅ Workout log created:', log.id);

    // Also update daily log for backward compatibility
    try {
      const logDate = new Date(completedAt);
      logDate.setHours(0, 0, 0, 0);
      const existingDailyLog = await storage.getDailyLog(userId, logDate);
      
      if (existingDailyLog) {
        await storage.updateDailyLog(existingDailyLog.id, { workoutCompleted: true });
      } else {
        await storage.createDailyLog({ userId, logDate, mealsLogged: [], nutritionCompleted: false, workoutCompleted: true, supplementsTaken: false });
      }
    } catch (dailyLogError) {
      logger.warn('⚠️ Could not update daily log (non-fatal):', dailyLogError);
    }

    res.json({ log });
  } catch (error) {
    logger.error('❌ Error creating workout log:', error);
    res.status(500).json({ error: 'Failed to create workout log' });
  }
});

// Switch/regenerate a single exercise
router.post('/workout/switch', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { dayIndex, exerciseIndex, reason } = req.body;

    logger.info('🔄 Switching exercise:', { userId, dayIndex, exerciseIndex, reason });

    if (dayIndex === undefined || exerciseIndex === undefined) {
      return res.status(400).json({ error: 'dayIndex and exerciseIndex are required' });
    }

    const workoutPlan = await storage.getActiveOptimizePlan(userId, 'workout');
    if (!workoutPlan) {
      return res.status(404).json({ error: 'No workout plan found' });
    }

    const weekPlan = (workoutPlan.content as any)?.weekPlan || [];
    if (dayIndex < 0 || dayIndex >= weekPlan.length) {
      return res.status(400).json({ error: 'Invalid dayIndex' });
    }

    const targetDay = weekPlan[dayIndex];
    if (targetDay.isRestDay) {
      return res.status(400).json({ error: 'Cannot switch exercise on a rest day' });
    }

    const exercises = targetDay.workout?.exercises || [];
    if (exerciseIndex < 0 || exerciseIndex >= exercises.length) {
      return res.status(400).json({ error: 'Invalid exerciseIndex' });
    }

    const currentExercise = exercises[exerciseIndex];
    const healthProfile = await storage.getHealthProfile(userId);
    const workoutPrefs = await storage.getWorkoutPreferences(userId);

    const prompt = `Generate a creative and distinct alternative exercise to replace the current one.

User Context:
- Fitness Level: ${(healthProfile as any)?.fitnessLevel || 'intermediate'}
- Equipment: ${(workoutPrefs as any)?.availableEquipment?.join(', ') || 'bodyweight, dumbbells'}
- Workout Type: ${targetDay.workout?.type || 'strength'}

${reason ? `Reason for switch: ${reason}` : ''}

Current exercise to replace:
${JSON.stringify(currentExercise, null, 2)}

Other exercises in this workout (avoid duplicates):
${exercises.filter((_: any, i: number) => i !== exerciseIndex).map((e: any) => e.name).join(', ')}

Generate ONE alternative exercise. Use LBS for weight, MILES for distance.
Return ONLY valid JSON:
{
  "name": "Exercise Name",
  "type": "strength" | "cardio" | "timed",
  "sets": ${currentExercise.sets || 3},
  "reps": ${currentExercise.reps || 10},
  "weight": ${currentExercise.weight || 0},
  "tempo": "${currentExercise.tempo || '2-0-2-0'}",
  "rest": "${currentExercise.rest || '60s'}",
  "notes": "Short cue",
  "healthBenefits": "Specific focus"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.9,
    });

    const newExercise = JSON.parse(response.choices[0].message.content || '{}');
    if (!newExercise.name) {
      throw new Error('Failed to generate alternative exercise');
    }

    logger.info('✅ Generated new exercise:', newExercise.name);

    exercises[exerciseIndex] = newExercise;
    const updatedPlan = await storage.updateOptimizePlan(workoutPlan.id, {
      content: { ...(workoutPlan.content as any), weekPlan } as any,
    });

    res.json({ plan: updatedPlan, newExercise });
  } catch (error) {
    logger.error('❌ Error switching exercise:', error);
    res.status(500).json({ error: 'Failed to switch exercise' });
  }
});

// Legacy workout log endpoint
router.post('/workout/log', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { date, completed } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }

    const logDate = new Date(date);
    if (Number.isNaN(logDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date value' });
    }

    const existingLog = await storage.getDailyLog(userId, logDate);
    let updatedLog = existingLog;

    if (existingLog) {
      updatedLog = await storage.updateDailyLog(existingLog.id, { workoutCompleted: Boolean(completed) });
    } else {
      updatedLog = await storage.createDailyLog({ userId, logDate, mealsLogged: [], nutritionCompleted: false, workoutCompleted: Boolean(completed), supplementsTaken: false });
    }

    res.json({ success: true, log: updatedLog, workoutCompleted: Boolean(completed) });
  } catch (error) {
    logger.error('❌ Error logging workout:', error);
    res.status(500).json({ error: 'Failed to log workout' });
  }
});

// General daily log endpoint (Quick Log)
router.post('/daily-logs', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { date, nutritionCompleted, workoutCompleted, supplementsTaken, waterIntakeOz, energyLevel, moodLevel, sleepQuality, notes } = req.body ?? {};

    const logDate = date ? new Date(date) : new Date();
    if (Number.isNaN(logDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date value' });
    }
    logDate.setHours(12, 0, 0, 0);

    const clampRating = (value: unknown) => {
      if (value === undefined || value === null || value === '') return null;
      const parsed = Number(value);
      if (Number.isNaN(parsed)) return null;
      return Math.min(5, Math.max(1, Math.round(parsed)));
    };

    const normalizeWater = (value: unknown) => {
      if (value === undefined || value === null || value === '') return null;
      const parsed = Number(value);
      if (Number.isNaN(parsed)) return null;
      return Math.max(0, Math.round(parsed));
    };

    const existingLog = await storage.getDailyLog(userId, logDate);

    const resolvedLog = {
      nutritionCompleted: typeof nutritionCompleted === 'boolean' ? nutritionCompleted : existingLog?.nutritionCompleted ?? false,
      workoutCompleted: typeof workoutCompleted === 'boolean' ? workoutCompleted : existingLog?.workoutCompleted ?? false,
      supplementsTaken: typeof supplementsTaken === 'boolean' ? supplementsTaken : existingLog?.supplementsTaken ?? false,
      waterIntakeOz: normalizeWater(waterIntakeOz) ?? existingLog?.waterIntakeOz ?? null,
      energyLevel: clampRating(energyLevel) ?? existingLog?.energyLevel ?? null,
      moodLevel: clampRating(moodLevel) ?? existingLog?.moodLevel ?? null,
      sleepQuality: clampRating(sleepQuality) ?? existingLog?.sleepQuality ?? null,
      notes: typeof notes === 'string' && notes.trim().length ? notes.trim() : existingLog?.notes ?? null,
    };

    let updatedLog: OptimizeDailyLog | undefined;
    if (existingLog) {
      updatedLog = await storage.updateDailyLog(existingLog.id, resolvedLog);
      await storage.updateUserStreak(userId, logDate);
    } else {
      updatedLog = await storage.createDailyLog({ userId, logDate, mealsLogged: [], ...resolvedLog });
    }

    const streakTypes = ['overall', 'nutrition', 'workout', 'lifestyle'] as const;
    const streaks = {} as Record<typeof streakTypes[number], any>;
    for (const type of streakTypes) {
      streaks[type] = (await storage.getUserStreak(userId, type)) ?? null;
    }

    res.json({ success: true, log: updatedLog, streaks });
  } catch (error) {
    logger.error('❌ Error saving daily log:', error);
    res.status(500).json({ error: 'Failed to save daily log' });
  }
});

// Swap a meal in nutrition plan
router.post('/nutrition/swap-meal', requireAuth, async (req, res) => {
  try {
    const { planId, dayIndex, mealType, currentMealName, mealIndex } = req.body;
    logger.info('🔄 Meal swap requested:', { userId: req.userId, planId, dayIndex, mealType, currentMealName, mealIndex });
    
    const plan = await storage.getOptimizePlan(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (plan.planType !== 'nutrition') {
      return res.status(400).json({ error: 'Can only swap meals in nutrition plans' });
    }

    const content = plan.content as any;
    const weekPlan = content?.weekPlan || [];
    if (!Array.isArray(weekPlan) || dayIndex < 0 || dayIndex >= weekPlan.length) {
      return res.status(400).json({ error: 'Invalid day index' });
    }

    const dayPlan = weekPlan[dayIndex];
    
    let currentMeal;
    if (typeof mealIndex === 'number' && dayPlan.meals?.[mealIndex]) {
      currentMeal = dayPlan.meals[mealIndex];
    } else if (currentMealName) {
      currentMeal = dayPlan.meals?.find((m: any) => m.name === currentMealName);
    } else {
      currentMeal = dayPlan.meals?.find((m: any) => m.mealType === mealType);
    }

    if (!currentMeal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    const existingMeals = new Set<string>();
    weekPlan.forEach((day: any) => {
      day.meals?.forEach((m: any) => {
        if (m.name) existingMeals.add(m.name);
      });
    });
    const avoidList = Array.from(existingMeals).join(', ');

    const swapPrompt = `You are a nutrition expert. The user wants to swap out this meal:

**Current Meal:**
- Type: ${currentMeal.mealType}
- Name: ${currentMeal.name}
- Calories: ${currentMeal.macros?.calories || 'N/A'}

**Constraints:**
1. DO NOT suggest any of these meals (already in plan): ${avoidList}
2. The new meal must be COMPLETELY DIFFERENT.
3. It must match the SAME macro targets (±50 calories).
4. **SNACK RULES:** If mealType is "snack", it MUST be simple (fruit, nuts, yogurt, etc.).

Return ONLY valid JSON:
{
  "mealType": "${mealType}",
  "name": "New Meal Name",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "macros": { "calories": 450, "protein": 35, "carbs": 40, "fats": 15 },
  "healthBenefits": "Brief explanation"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: swapPrompt }],
      temperature: 0.9,
      max_tokens: 800
    });

    const rawResponse = completion.choices[0]?.message?.content?.trim() || '{}';
    const newMeal = parseAiJson(rawResponse);

    if (!newMeal.name || !newMeal.macros || !newMeal.ingredients) {
      throw new Error('Invalid AI response structure');
    }

    const updatedWeekPlan = weekPlan.map((day: any, idx: number) => {
      if (idx !== dayIndex) return day;
      
      if (typeof mealIndex === 'number' && day.meals[mealIndex]) {
        const newMeals = [...day.meals];
        newMeals[mealIndex] = newMeal;
        return { ...day, meals: newMeals };
      }

      return {
        ...day,
        meals: day.meals.map((m: any) => {
          if (currentMealName) {
            return m.name === currentMealName ? newMeal : m;
          }
          return m.mealType === mealType ? newMeal : m;
        })
      };
    });

    await storage.updateOptimizePlan(planId, { content: { ...content, weekPlan: updatedWeekPlan } });

    logger.info('✅ Meal swapped successfully:', newMeal.name);
    res.json({ success: true, meal: newMeal, message: 'Meal swapped successfully' });
  } catch (error) {
    logger.error('❌ Error swapping meal:', error);
    res.status(500).json({ error: 'Failed to swap meal' });
  }
});

// Generate recipe
router.post('/nutrition/recipe', requireAuth, async (req, res) => {
  try {
    const { mealName, ingredients, dietaryRestrictions } = req.body;
    
    if (!mealName) {
      return res.status(400).json({ error: 'Meal name is required' });
    }

    logger.info('👨‍🍳 Generating recipe for:', mealName);

    const prompt = buildRecipePrompt(mealName, ingredients || [], dietaryRestrictions || []);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    });

    const rawResponse = completion.choices[0]?.message?.content?.trim() || '{}';
    const recipe = parseAiJson(rawResponse);

    res.json(recipe);
  } catch (error) {
    logger.error('❌ Error generating recipe:', error);
    res.status(500).json({ error: 'Failed to generate recipe' });
  }
});

// Grocery list endpoints
router.get('/grocery-list', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const list = await storage.getActiveGroceryList(userId);
    res.json(list || null);
  } catch (error) {
    logger.error('❌ Error fetching grocery list:', error);
    res.status(500).json({ error: 'Failed to fetch grocery list' });
  }
});

router.post('/grocery-list/generate', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const plan = await storage.getActiveOptimizePlan(userId, 'nutrition');
    if (!plan || !plan.content) {
      return res.status(400).json({ error: 'Generate a nutrition plan before creating a grocery list' });
    }

    const content = plan.content as any;
    const weekPlan = content.weekPlan || [];
    
    let mealsText = '';
    weekPlan.forEach((day: any) => {
      mealsText += `\nDay ${day.day} (${day.dayName}):\n`;
      day.meals?.forEach((meal: any) => {
        const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients.join(', ') : '';
        mealsText += `- ${meal.name}: ${ingredients}\n`;
      });
    });

    logger.info('🥦 Generating grocery list for plan:', plan.id);

    const prompt = buildGroceryListPrompt(mealsText);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content || '{}';
    const parsed = JSON.parse(responseContent);
    
    const items = (parsed.items || []).map((item: any) => ({
      id: nanoid(8),
      item: item.item,
      amount: item.amount,
      unit: item.unit,
      category: item.category,
      checked: false
    }));

    if (items.length === 0) {
      logger.info('⚠️ AI returned empty list, falling back to simple extraction');
      const fallbackItems = buildGroceryItemsFromPlanContent(plan.content);
      if (fallbackItems.length > 0) {
        items.push(...fallbackItems);
      } else {
        return res.status(422).json({ error: 'Could not generate grocery list from this plan.' });
      }
    }

    const existingList = await storage.getActiveGroceryList(userId);
    const list = existingList
      ? await storage.updateGroceryList(existingList.id, { optimizePlanId: plan.id, items, generatedAt: new Date(), isArchived: false })
      : await storage.createGroceryList({ userId, optimizePlanId: plan.id, items, generatedAt: new Date(), isArchived: false });

    res.json(list);
  } catch (error) {
    logger.error('❌ Error generating grocery list:', error);
    res.status(500).json({ error: 'Failed to generate grocery list' });
  }
});

router.patch('/grocery-list/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const listId = req.params.id;
    const list = await storage.getGroceryList(listId);

    if (!list || list.userId !== userId) {
      return res.status(404).json({ error: 'Grocery list not found' });
    }

    const updates: any = {};
    if (Array.isArray(req.body.items)) {
      updates.items = req.body.items;
    }
    if (typeof req.body.isArchived === 'boolean') {
      updates.isArchived = req.body.isArchived;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const updated = await storage.updateGroceryList(listId, updates);
    res.json(updated);
  } catch (error) {
    logger.error('❌ Error updating grocery list:', error);
    res.status(500).json({ error: 'Failed to update grocery list' });
  }
});

// Workout Analytics
router.get('/analytics/workout', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const logs = await storage.getAllWorkoutLogs(userId);

    const volumeByWeek: Record<string, number> = {};
    const personalRecords: Record<string, { weight: number, date: string }> = {};
    const workoutsByWeek: Record<string, number> = {};
    const exerciseCounts: Record<string, number> = {};
    
    const currentWeekStart = startOfWeek(new Date());
    let durationThisWeek = 0;

    logs.forEach(log => {
      const date = new Date(log.completedAt);
      const weekStart = format(startOfWeek(date), 'yyyy-MM-dd');
      
      if (date >= currentWeekStart) {
        durationThisWeek += (log.durationActual || 0);
      }

      let logVolume = 0;
      const exercises = log.exercisesCompleted as any;
      if (exercises && Array.isArray(exercises)) {
        exercises.forEach((ex: any) => {
          exerciseCounts[ex.name] = (exerciseCounts[ex.name] || 0) + 1;

          if (ex.sets && Array.isArray(ex.sets)) {
            ex.sets.forEach((set: any) => {
              const weight = Number(set.weight) || 0;
              const reps = Number(set.reps) || 0;
              logVolume += weight * reps;

              if (weight > 0) {
                if (!personalRecords[ex.name] || weight > personalRecords[ex.name].weight) {
                  personalRecords[ex.name] = { weight, date: log.completedAt.toISOString() };
                }
              }
            });
          }
        });
      }

      volumeByWeek[weekStart] = (volumeByWeek[weekStart] || 0) + logVolume;
      workoutsByWeek[weekStart] = (workoutsByWeek[weekStart] || 0) + 1;
    });

    const volumeChartData = Object.entries(volumeByWeek)
      .map(([date, volume]) => ({ date, volume }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const consistencyData = Object.entries(workoutsByWeek)
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

    let currentStreak = 0;
    if (logs.length > 0) {
      const sortedLogs = [...logs].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      
      const today = new Date();
      const lastWorkoutDate = new Date(sortedLogs[0].completedAt);
      
      const todayStart = new Date(today.setHours(0,0,0,0));
      const lastWorkoutStart = new Date(new Date(lastWorkoutDate).setHours(0,0,0,0));
      
      if (differenceInDays(todayStart, lastWorkoutStart) <= 1) {
        currentStreak = 1;
        let currentDate = lastWorkoutStart;
        
        for (let i = 1; i < sortedLogs.length; i++) {
          const logDate = new Date(sortedLogs[i].completedAt);
          const logDateStart = new Date(new Date(logDate).setHours(0,0,0,0));
          
          if (isSameDay(currentDate, logDateStart)) {
            continue;
          }
          
          if (differenceInDays(currentDate, logDateStart) === 1) {
            currentStreak++;
            currentDate = logDateStart;
          } else {
            break;
          }
        }
      }
    }

    const topExercises = Object.entries(exerciseCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      volumeChartData,
      personalRecords,
      consistencyData,
      currentStreak,
      totalWorkouts: logs.length,
      topExercises,
      durationThisWeek
    });
  } catch (error) {
    logger.error('Error fetching workout analytics:', error);
    res.status(500).json({ error: 'Failed to fetch workout analytics' });
  }
});

export default router;
