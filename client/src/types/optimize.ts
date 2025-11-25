export interface OptimizeDailyLog {
  id: string;
  logDate: string;
  nutritionCompleted: boolean;
  mealsLogged?: string[] | null;
  workoutCompleted: boolean;
  supplementsTaken: boolean;
  waterIntakeOz?: number | null;
  energyLevel?: number | null;
  moodLevel?: number | null;
  sleepQuality?: number | null;
}

export interface Exercise {
  name: string;
  type?: 'strength' | 'cardio' | 'timed' | 'recovery';
  sets: number;
  reps: string | number; // Can be "12" or "20 mins"
  weight?: number;
  tempo?: string;
  rest?: string;
  restSeconds?: number;
  notes?: string;
  healthBenefits?: string;
}

export interface OptimizeStreak {
  id: string;
  streakType: 'overall' | 'nutrition' | 'workout' | 'lifestyle';
  currentStreak: number;
  longestStreak: number;
  lastLoggedDate?: string | null;
}

export type OptimizeLogsByDate = Record<string, OptimizeDailyLog>;

export interface OptimizeLogsResponse {
  range: {
    start: string;
    end: string;
  };
  logs: OptimizeDailyLog[];
  logsByDate: OptimizeLogsByDate;
  streaks: Record<'overall' | 'nutrition' | 'workout' | 'lifestyle', OptimizeStreak | null>;
}
