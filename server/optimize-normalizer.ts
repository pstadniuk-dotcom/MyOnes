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

type PlanType = 'nutrition' | 'workout' | 'lifestyle';

type AnyRecord = Record<string, any>;

export const DEFAULT_MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'snack', 'dinner'];

const PLACEHOLDER_COPY = {
  message: 'Plan data missing for this day. Regenerate your plan to receive full guidance.',
  regenerateHint: 'Open the Optimize tab and select "Regenerate" to refresh your plan.',
};

function titleCase(value: string | undefined, fallback: string) {
  if (!value || typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function normalizeDayIndex(day: AnyRecord | undefined, fallbackIndex: number) {
  if (!day) return fallbackIndex;
  if (typeof day.day === 'number' && day.day >= 1 && day.day <= 7) {
    return day.day - 1;
  }
  if (typeof day.dayOfWeek === 'number' && day.dayOfWeek >= 1 && day.dayOfWeek <= 7) {
    return day.dayOfWeek - 1;
  }
  const rawName = day.dayName || day.name;
  if (typeof rawName === 'string') {
    const normalized = rawName.toLowerCase().trim();
    const idx = WEEKDAY_KEYS.findIndex((key) => normalized === key || normalized.startsWith(key.slice(0, 3)));
    if (idx >= 0) {
      return idx;
    }
  }
  return fallbackIndex;
}

function ensureMacros(macros: AnyRecord | undefined) {
  if (macros && typeof macros === 'object') {
    return {
      calories: Number(macros.calories) || 0,
      protein: Number(macros.protein) || 0,
      carbs: Number(macros.carbs) || 0,
      fats: Number(macros.fats) || Number(macros.fat) || 0,
    };
  }
  return { calories: 0, protein: 0, carbs: 0, fats: 0 };
}

function createPlaceholderMeal(mealType: string) {
  return {
    mealType,
    name: 'Meal data unavailable',
    ingredients: [],
    instructions: PLACEHOLDER_COPY.regenerateHint,
    prepTimeMinutes: 0,
    macros: ensureMacros(undefined),
    healthBenefits: PLACEHOLDER_COPY.message,
  };
}

function normalizeMeals(meals: any) {
  if (!Array.isArray(meals) || meals.length === 0) {
    return DEFAULT_MEAL_TYPES.map((mealType) => createPlaceholderMeal(mealType));
  }
  return meals.map((meal: AnyRecord) => ({
    mealType: meal?.mealType || DEFAULT_MEAL_TYPES[0],
    name: meal?.name || 'Meal data unavailable',
    ingredients: Array.isArray(meal?.ingredients) ? meal.ingredients : [],
    instructions:
      typeof meal?.instructions === 'string'
        ? meal.instructions
        : Array.isArray(meal?.instructions)
          ? meal.instructions.join('\n')
          : PLACEHOLDER_COPY.regenerateHint,
    prepTimeMinutes: Number(meal?.prepTimeMinutes) || 0,
    macros: ensureMacros(meal?.macros),
    healthBenefits: meal?.healthBenefits || PLACEHOLDER_COPY.message,
  }));
}

function createPlaceholderWorkout() {
  return {
    name: 'Workout not available',
    durationMinutes: 0,
    estimatedCalories: 0,
    type: 'rest',
    focus: PLACEHOLDER_COPY.message,
    exercises: [],
  };
}

function normalizeWorkout(workout: AnyRecord | undefined) {
  if (!workout || typeof workout !== 'object') {
    return createPlaceholderWorkout();
  }
  return {
    name: workout.name || 'Structured session',
    durationMinutes: Number(workout.durationMinutes) || 45,
    estimatedCalories: Number(workout.estimatedCalories) || 350,
    type: workout.type || 'training',
    focus: workout.focus || PLACEHOLDER_COPY.message,
    exercises: Array.isArray(workout.exercises)
      ? workout.exercises.map((exercise: AnyRecord, idx: number) => ({
          name: exercise?.name || `Exercise ${idx + 1}`,
          sets: exercise?.sets || 3,
          reps: exercise?.reps || '8-12',
          restSeconds: exercise?.restSeconds || 60,
          notes: exercise?.notes || 'Maintain good form and control tempo.',
          healthBenefits: exercise?.healthBenefits || 'Supports your fitness goals.',
        }))
      : [],
  };
}

function createPlaceholderLifestyleDay(dayIndex: number) {
  return {
    day: dayIndex + 1,
    dayName: WEEKDAY_NAMES[dayIndex],
    focusArea: 'Lifestyle guidance unavailable',
    morningProtocol: PLACEHOLDER_COPY.regenerateHint,
    eveningProtocol: PLACEHOLDER_COPY.regenerateHint,
    nervousSystemSupport: [],
    breathwork: [],
  };
}

function normalizeLifestyleDay(day: AnyRecord | undefined, dayIndex: number) {
  if (!day || typeof day !== 'object') {
    return createPlaceholderLifestyleDay(dayIndex);
  }
  return {
    day: typeof day.day === 'number' ? day.day : dayIndex + 1,
    dayName: titleCase(day.dayName, WEEKDAY_NAMES[dayIndex]),
    focusArea: day.focusArea || 'Daily protocol',
    morningProtocol: day.morningProtocol || PLACEHOLDER_COPY.message,
    eveningProtocol: day.eveningProtocol || PLACEHOLDER_COPY.message,
    nervousSystemSupport: Array.isArray(day.nervousSystemSupport) ? day.nervousSystemSupport : [],
    breathwork: Array.isArray(day.breathwork) ? day.breathwork : [],
  };
}

function normalizeNutritionDay(day: AnyRecord | undefined, dayIndex: number) {
  const normalized = day && typeof day === 'object' ? { ...day } : {};
  return {
    day: typeof normalized.day === 'number' ? normalized.day : dayIndex + 1,
    dayName: titleCase(normalized.dayName, WEEKDAY_NAMES[dayIndex]),
    meals: normalizeMeals(normalized.meals),
    dailyTotals: normalized.dailyTotals || null,
  };
}

function normalizeWorkoutDay(day: AnyRecord | undefined, dayIndex: number) {
  if (!day || typeof day !== 'object') {
    return {
      day: dayIndex + 1,
      dayName: WEEKDAY_NAMES[dayIndex],
      workout: createPlaceholderWorkout(),
      isRestDay: true,
    };
  }
  const workout = normalizeWorkout(day.workout);
  const isRestDay = Boolean(day.isRestDay || workout.type === 'rest');
  return {
    day: typeof day.day === 'number' ? day.day : dayIndex + 1,
    dayName: titleCase(day.dayName, WEEKDAY_NAMES[dayIndex]),
    workout,
    isRestDay,
    scheduledType: day.scheduledType || (isRestDay ? 'rest' : 'training'),
  };
}

function buildSevenDayPlan(
  sourceDays: AnyRecord[],
  planType: PlanType,
  normalizer: (day: AnyRecord | undefined, index: number) => AnyRecord,
) {
  const bucket: Array<AnyRecord | undefined> = new Array(7).fill(undefined);

  sourceDays.forEach((day, idx) => {
    const targetIndex = normalizeDayIndex(day, idx);
    if (bucket[targetIndex]) {
      return;
    }
    bucket[targetIndex] = day;
  });

  return bucket.map((existing, index) => normalizer(existing, index));
}

export function normalizePlanContent(planType: PlanType, content: AnyRecord | undefined): AnyRecord {
  const safeContent: AnyRecord = content && typeof content === 'object' ? { ...content } : {};
  const weekPlan = Array.isArray(safeContent.weekPlan) ? safeContent.weekPlan : [];
  const autoHealMeta = {
    ...(safeContent.autoHealMeta || {}),
    missingDays: weekPlan.length !== 7,
  };

  switch (planType) {
    case 'nutrition':
      safeContent.weekPlan = buildSevenDayPlan(weekPlan, planType, normalizeNutritionDay);
      safeContent.macroTargets = safeContent.macroTargets || null;
      safeContent.shoppingList = Array.isArray(safeContent.shoppingList) ? safeContent.shoppingList : [];
      safeContent.autoHealMeta = autoHealMeta;
      safeContent.mealPrepTips = Array.isArray(safeContent.mealPrepTips) ? safeContent.mealPrepTips : [];
      break;
    case 'workout':
      safeContent.weekPlan = buildSevenDayPlan(weekPlan, planType, normalizeWorkoutDay);
      safeContent.programOverview = safeContent.programOverview || {
        daysPerWeek: 3,
        durationWeeks: 4,
        targetAudience: 'intermediate',
        focus: PLACEHOLDER_COPY.message,
      };
      safeContent.autoHealMeta = autoHealMeta;
      safeContent.recoveryTips = Array.isArray(safeContent.recoveryTips) ? safeContent.recoveryTips : [];
      break;
    case 'lifestyle':
    default:
      safeContent.weekPlan = buildSevenDayPlan(weekPlan, planType, normalizeLifestyleDay);
      safeContent.autoHealMeta = autoHealMeta;
      safeContent.sleepProtocols = Array.isArray(safeContent.sleepProtocols) ? safeContent.sleepProtocols : [];
      safeContent.stressProtocols = Array.isArray(safeContent.stressProtocols) ? safeContent.stressProtocols : [];
      break;
  }

  return safeContent;
}
