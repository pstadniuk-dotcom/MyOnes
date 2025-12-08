// Wellness Dashboard Types
// Central nervous system for health tracking

export interface TodayPlan {
  // Supplements - granular tracking
  supplementsTaken: boolean;
  supplementMorning: boolean;
  supplementAfternoon: boolean;
  supplementEvening: boolean;
  supplementDosesTaken: number; // 0-3
  supplementDosesTotal: number; // always 3
  capsulesPerDose: number;
  totalCapsules: number;
  formulaName?: string;
  dosageInfo?: string;
  
  // Today's workout
  hasWorkoutToday: boolean;
  workoutName?: string;
  workoutExerciseCount?: number;
  workoutDurationMinutes?: number;
  workoutCompleted: boolean;
  isRestDay?: boolean; // User manually marked as rest day
  
  // Today's meals
  hasMealPlan: boolean;
  mealsPlanned: number;
  mealsLogged: string[]; // ['breakfast', 'lunch']
  todaysMeals?: {
    type: string;
    name: string;
    calories?: number;
  }[];
  
  // Hydration
  waterIntakeOz: number;
  waterGoalOz: number;
  
  // Wellness ratings
  energyLevel?: number; // 1-5
  moodLevel?: number; // 1-5
  sleepQuality?: number; // 1-5
}

export interface WeeklyProgress {
  workouts: {
    completed: number;
    total: number;
    percentage: number;
  };
  nutrition: {
    daysLogged: number;
    totalDays: number;
    percentage: number;
  };
  supplements: {
    daysTaken: number;
    totalDays: number;
    percentage: number;
  };
  // Overall week score
  overallScore: number;
}

export interface StreakData {
  overall: {
    current: number;
    longest: number;
    lastLoggedDate?: string;
  };
  workout: {
    current: number;
    longest: number;
  };
  nutrition: {
    current: number;
    longest: number;
  };
  // 30-day activity map for heatmap
  activityMap: {
    date: string; // YYYY-MM-DD
    level: 0 | 1 | 2 | 3 | 4; // 0 = no activity, 4 = max activity
    activities: string[]; // ['workout', 'nutrition', 'supplements']
  }[];
}

// NEW: Enhanced streak summary for redesigned component
export interface StreakSummary {
  overall: { current: number; longest: number };
  nutrition: { current: number; longest: number };
  workout: { current: number; longest: number };
  supplements: { current: number; longest: number };
  lifestyle: { current: number; longest: number };
  todayScores: {
    nutrition: number;
    workout: number | null;
    supplements: number;
    lifestyle: number;
    overall: number;
  } | null;
  weeklyProgress: Array<{
    date: string;
    nutritionScore: number | null;
    workoutScore: number | null;
    supplementScore: number | null;
    lifestyleScore: number | null;
    dailyScore: number | null;
  }>;
}

export interface PersonalRecord {
  exerciseName: string;
  weight: number;
  previousWeight?: number;
  date: string;
  isNew: boolean; // Set within last 7 days
}

export interface WellnessInsight {
  id: string;
  type: 'improvement' | 'achievement' | 'suggestion' | 'streak';
  icon: string; // emoji
  message: string;
  metric?: string;
  change?: number; // +15%, -5%
}

export interface WellnessData {
  today: TodayPlan;
  weeklyProgress: WeeklyProgress;
  streaks: StreakData;
  personalRecords: PersonalRecord[];
  insights: WellnessInsight[];
  
  // Meta
  hasOptimizeSetup: boolean;
  hasWearableConnected: boolean;
  lastUpdated: string;
}

// Empty/default states
export const emptyTodayPlan: TodayPlan = {
  supplementsTaken: false,
  supplementMorning: false,
  supplementAfternoon: false,
  supplementEvening: false,
  supplementDosesTaken: 0,
  supplementDosesTotal: 3,
  capsulesPerDose: 2,
  totalCapsules: 6,
  hasWorkoutToday: false,
  workoutCompleted: false,
  hasMealPlan: false,
  mealsPlanned: 0,
  mealsLogged: [],
  waterIntakeOz: 0,
  waterGoalOz: 100,
};

export const emptyWeeklyProgress: WeeklyProgress = {
  workouts: { completed: 0, total: 0, percentage: 0 },
  nutrition: { daysLogged: 0, totalDays: 7, percentage: 0 },
  supplements: { daysTaken: 0, totalDays: 7, percentage: 0 },
  overallScore: 0,
};

export const emptyStreakData: StreakData = {
  overall: { current: 0, longest: 0 },
  workout: { current: 0, longest: 0 },
  nutrition: { current: 0, longest: 0 },
  activityMap: [],
};

export const emptyStreakSummary: StreakSummary = {
  overall: { current: 0, longest: 0 },
  nutrition: { current: 0, longest: 0 },
  workout: { current: 0, longest: 0 },
  supplements: { current: 0, longest: 0 },
  lifestyle: { current: 0, longest: 0 },
  todayScores: null,
  weeklyProgress: [],
};

export const emptyWellnessData: WellnessData = {
  today: emptyTodayPlan,
  weeklyProgress: emptyWeeklyProgress,
  streaks: emptyStreakData,
  personalRecords: [],
  insights: [],
  hasOptimizeSetup: false,
  hasWearableConnected: false,
  lastUpdated: new Date().toISOString(),
};
