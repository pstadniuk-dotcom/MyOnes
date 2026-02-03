
import { InsertFormula } from "@shared/schema";

const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const WEEKDAY_KEYS = WEEKDAY_NAMES.map((name) => name.toLowerCase());

export type PlanType = 'nutrition' | 'workout' | 'lifestyle';

export type AnyRecord = Record<string, any>;

export const DEFAULT_MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'snack', 'dinner'];

const PLACEHOLDER_COPY = {
  message: 'Plan data missing for this day. Regenerate your plan to receive full guidance.',
  regenerateHint: 'Open the Optimize tab and select "Regenerate" to refresh your plan.',
};

function titleCase(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function normalizeDayIndex(day: AnyRecord | undefined, fallbackIndex: number): number {
  if (typeof day?.day === 'number') return day.day;
  const dayName = typeof day?.dayName === 'string' ? day.dayName.toLowerCase() : '';
  const index = WEEKDAY_KEYS.indexOf(dayName);
  return index !== -1 ? index + 1 : fallbackIndex;
}

function ensureMacros(macros: AnyRecord | undefined): AnyRecord {
  return {
    calories: Number(macros?.calories) || 0,
    protein: Number(macros?.protein) || 0,
    carbs: Number(macros?.carbs) || 0,
    fats: Number(macros?.fats) || 0,
  };
}

function createPlaceholderMeal(mealType: string): AnyRecord {
  return {
    name: 'Meal Not Generated',
    mealType,
    time: 'TBD',
    ingredients: [],
    instructions: [PLACEHOLDER_COPY.message],
    macros: ensureMacros(undefined),
  };
}

function normalizeMeals(meals: any): AnyRecord[] {
  if (!Array.isArray(meals)) {
    return DEFAULT_MEAL_TYPES.map(createPlaceholderMeal);
  }

  // Ensure we have at least standard meals, or use provided ones
  // If AI provided fewer meals, we presume that's the plan. 
  // But let's basic validation.
  return meals.map((meal) => ({
    name: titleCase(meal.name, 'Unnamed Meal'),
    mealType: titleCase(meal.mealType, 'snack'),
    time: meal.time || 'Flexible',
    ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
    instructions: Array.isArray(meal.instructions) ? meal.instructions : [],
    macros: ensureMacros(meal.macros),
    alternatives: Array.isArray(meal.alternatives) ? meal.alternatives : undefined,
  }));
}

function createPlaceholderWorkout(): AnyRecord {
  return {
    type: 'Rest',
    focus: 'Recovery',
    exercises: [],
    warmup: [],
    cooldown: [],
  };
}

function normalizeWorkout(workout: AnyRecord | undefined): AnyRecord {
  if (!workout) return createPlaceholderWorkout();

  return {
    type: titleCase(workout.type, 'Mixed'),
    focus: titleCase(workout.focus, 'General Fitness'),
    durationMinutes: Number(workout.durationMinutes) || 30,
    exercises: Array.isArray(workout.exercises) ? workout.exercises : [],
    warmup: Array.isArray(workout.warmup) ? workout.warmup : [],
    cooldown: Array.isArray(workout.cooldown) ? workout.cooldown : [],
  };
}

function createPlaceholderLifestyleDay(dayIndex: number): AnyRecord {
  return {
    day: dayIndex,
    dayName: WEEKDAY_NAMES[dayIndex - 1] || 'Day ' + dayIndex,
    morningRoutine: [],
    eveningRoutine: [],
    habitFocus: 'General Wellness',
    sleepTarget: '8 hours',
  };
}

function normalizeLifestyleDay(day: AnyRecord | undefined, dayIndex: number): AnyRecord {
  const finalIndex = normalizeDayIndex(day, dayIndex);
  if (!day) return createPlaceholderLifestyleDay(finalIndex);

  return {
    day: finalIndex,
    dayName: WEEKDAY_NAMES[finalIndex - 1] || 'Day ' + finalIndex,
    morningRoutine: Array.isArray(day.morningRoutine) ? day.morningRoutine : [],
    eveningRoutine: Array.isArray(day.eveningRoutine) ? day.eveningRoutine : [],
    workProductivity: Array.isArray(day.workProductivity) ? day.workProductivity : undefined,
    mindfulness: Array.isArray(day.mindfulness) ? day.mindfulness : undefined,
    habitFocus: day.habitFocus || 'Wellness',
    sleepTarget: day.sleepTarget || '8 hours',
  };
}

function normalizeNutritionDay(day: AnyRecord | undefined, dayIndex: number): AnyRecord {
  const finalIndex = normalizeDayIndex(day, dayIndex);

  return {
    day: finalIndex,
    dayName: WEEKDAY_NAMES[finalIndex - 1] || 'Day ' + finalIndex,
    meals: normalizeMeals(day?.meals),
    dailyHydrationGoal: day?.dailyHydrationGoal || '8 glasses',
    dailySummary: day?.dailySummary || 'Follow the meal plan.',
  };
}

function normalizeWorkoutDay(day: AnyRecord | undefined, dayIndex: number): AnyRecord {
  const finalIndex = normalizeDayIndex(day, dayIndex);

  return {
    day: finalIndex,
    dayName: WEEKDAY_NAMES[finalIndex - 1] || 'Day ' + finalIndex,
    isRestDay: Boolean(day?.isRestDay),
    workout: normalizeWorkout(day?.workout),
    activeRecovery: day?.activeRecovery,
    notes: day?.notes,
  };
}

export function buildSevenDayPlan(
  sourceDays: AnyRecord[],
  planType: PlanType,
  normalizer: (day: AnyRecord | undefined, index: number) => AnyRecord,
): AnyRecord {
  const daysMap = new Map<number, AnyRecord>();
  if (Array.isArray(sourceDays)) {
    sourceDays.forEach((day, idx) => {
      // Try to determine day index
      const dIndex = normalizeDayIndex(day, idx + 1);
      daysMap.set(dIndex, day);
    });
  }

  const resultDays = [];
  for (let i = 1; i <= 7; i++) {
    const dayData = daysMap.get(i);
    resultDays.push(normalizer(dayData, i));
  }
  return { weekPlan: resultDays };
}

export function normalizePlanContent(planType: PlanType, content: AnyRecord | undefined): AnyRecord {
  if (!content) return { weekPlan: [] };

  const sourceDays = Array.isArray(content.weekPlan) ? content.weekPlan : [];

  switch (planType) {
    case 'nutrition':
      return buildSevenDayPlan(sourceDays, 'nutrition', normalizeNutritionDay);
    case 'workout':
      return buildSevenDayPlan(sourceDays, 'workout', normalizeWorkoutDay);
    case 'lifestyle':
      return buildSevenDayPlan(sourceDays, 'lifestyle', normalizeLifestyleDay);
    default:
      return content;
  }
}

// ==========================================
// Formula Normalization Helpers
// ==========================================

export interface FormulaIngredientPayload {
  ingredient: string;
  amount: number;
  unit: string;
  purpose?: string;
}

export interface FormulaCustomizationItemPayload {
  ingredient: string;
  amount: number;
  unit: string;
}

export interface FormulaCustomizationPayload {
  addedBases?: FormulaCustomizationItemPayload[];
  addedIndividuals?: FormulaCustomizationItemPayload[];
}

export function normalizeFormulaCustomizations(customizations?: { addedBases?: any[]; addedIndividuals?: any[] }): FormulaCustomizationPayload | undefined {
  const normalizeItem = (item: any): FormulaCustomizationItemPayload => ({
    ingredient: typeof item?.ingredient === 'string' ? item.ingredient : 'unknown',
    amount: typeof item?.amount === 'number' ? item.amount : Number(item?.amount) || 0,
    unit: typeof item?.unit === 'string' ? item.unit : 'mg'
  });

  const result: FormulaCustomizationPayload = {};

  const mapItems = (items?: any[]): FormulaCustomizationItemPayload[] | undefined => {
    if (!Array.isArray(items) || items.length === 0) {
      return undefined;
    }
    const normalized: FormulaCustomizationItemPayload[] = items.map(item => normalizeItem(item));
    return normalized;
  };

  const addedBases = mapItems(customizations?.addedBases);
  if (addedBases) {
    result.addedBases = addedBases;
  }

  const addedIndividuals = mapItems(customizations?.addedIndividuals);
  if (addedIndividuals) {
    result.addedIndividuals = addedIndividuals;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export function normalizeFormulaInsertPayload(formula: InsertFormula): InsertFormula {
  const normalizeIngredient = (item: any): FormulaIngredientPayload => ({
    ingredient: typeof item?.ingredient === 'string' ? item.ingredient : 'unknown',
    amount: typeof item?.amount === 'number' ? item.amount : Number(item?.amount) || 0,
    unit: typeof item?.unit === 'string' ? item.unit : 'mg',
    purpose: typeof item?.purpose === 'string' ? item.purpose : undefined
  });

  const normalizedBases = Array.isArray(formula.bases)
    ? formula.bases.map<FormulaIngredientPayload>(normalizeIngredient)
    : [];
  const normalizedAdditions = Array.isArray(formula.additions)
    ? formula.additions.map<FormulaIngredientPayload>(normalizeIngredient)
    : [];
  const normalizedCustomizations = formula.userCustomizations ? normalizeFormulaCustomizations(formula.userCustomizations as any) : undefined;

  return {
    ...formula,
    bases: normalizedBases as InsertFormula['bases'],
    additions: normalizedAdditions as InsertFormula['additions'],
    userCustomizations: (normalizedCustomizations ?? undefined) as InsertFormula['userCustomizations']
  };
}

export function normalizeFormulaIngredients(list?: any[]): FormulaIngredientPayload[] | undefined {
  if (!Array.isArray(list)) {
    return undefined;
  }

  return list.map<FormulaIngredientPayload>(item => ({
    ingredient: typeof item?.ingredient === 'string' ? item.ingredient : 'unknown',
    amount: typeof item?.amount === 'number' ? item.amount : Number(item?.amount) || 0,
    unit: typeof item?.unit === 'string' ? item.unit : 'mg',
    purpose: typeof item?.purpose === 'string' ? item.purpose : undefined
  }));
}
