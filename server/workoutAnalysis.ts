/**
 * Workout Analysis Service
 * 
 * Analyzes historical workout data to provide intelligent context
 * for AI-powered workout plan generation and progression.
 */

import { storage } from "./storage";
import type { WorkoutLog } from "@shared/schema";

// Types for exercise performance tracking
export interface SetPerformance {
  weight: number;
  reps: number;
}

export interface ExerciseLog {
  exerciseName: string;
  sets: SetPerformance[];
}

export interface ExercisePerformance {
  exerciseName: string;
  avgWeight: number;
  avgReps: number;
  totalVolume: number; // weight * reps across all sets
  maxWeight: number;
  maxReps: number;
  setCount: number;
}

export interface WeeklyPerformanceAnalysis {
  weekStart: string; // ISO date string
  weekEnd: string;
  workoutsCompleted: number;
  workoutsPlanned: number;
  completionRate: number;
  totalVolume: number; // sum of weight * reps for all exercises
  volumeChangePercent: number | null; // vs previous week (null if first week)
  avgDifficulty: number | null;
  totalMinutes: number;
  exercisePerformance: ExercisePerformance[];
  newPRs: string[]; // Exercise names where PRs were set
}

export interface MonthlyProgressByExercise {
  exerciseName: string;
  volumeChange: number; // percentage change over period
  maxWeightChange: number; // change in max weight
  trend: 'improving' | 'plateau' | 'declining';
}

export interface PersonalRecord {
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
  type: 'weight' | 'volume' | 'reps'; // what kind of PR
}

export interface HistoricalWorkoutAnalysis {
  // Last 7 days summary
  lastWeek: WeeklyPerformanceAnalysis | null;
  
  // Last 4 weeks comparison
  last4Weeks: {
    weeklyVolumes: number[];
    volumeTrend: 'increasing' | 'stable' | 'decreasing';
    avgCompletionRate: number;
    exercisesUsed: string[]; // unique exercises performed
    avgDifficulty: number | null;
  } | null;
  
  // Last 3 months strength progress
  last3Months: {
    strengthProgressByExercise: MonthlyProgressByExercise[];
    plateauExercises: string[]; // exercises showing no progress
    improvingExercises: string[];
  } | null;
  
  // All-time summary
  allTime: {
    totalWorkouts: number;
    totalMinutes: number;
    personalRecords: PersonalRecord[];
    mostFrequentExercises: { name: string; count: number }[];
    avgWorkoutsPerWeek: number;
  };
  
  // Recommendations based on analysis
  recommendations: {
    shouldProgressWeight: string[]; // exercises ready for weight increase
    shouldDeload: string[]; // exercises showing decline
    undertrainedMuscleGroups: string[];
    suggestionText: string;
  };
}

/**
 * Parse exercisesCompleted JSON from workout log
 */
function parseExercises(log: WorkoutLog): ExerciseLog[] {
  if (!log.exercisesCompleted) return [];
  
  const exercises = log.exercisesCompleted as any;
  if (!Array.isArray(exercises)) return [];
  
  return exercises.map((ex: any) => ({
    exerciseName: ex.exerciseName || ex.name || 'Unknown',
    sets: Array.isArray(ex.sets) ? ex.sets.map((s: any) => ({
      weight: Number(s.weight) || 0,
      reps: Number(s.reps) || 0
    })) : []
  }));
}

/**
 * Calculate total volume for an exercise (weight * reps across all sets)
 */
function calculateVolume(exercise: ExerciseLog): number {
  return exercise.sets.reduce((total, set) => total + (set.weight * set.reps), 0);
}

/**
 * Get the start of the week (Sunday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the week (Saturday) for a given date
 */
function getWeekEnd(date: Date): Date {
  const d = getWeekStart(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Analyze a week of workouts
 */
function analyzeWeek(
  logs: WorkoutLog[], 
  weekStart: Date, 
  weekEnd: Date,
  previousWeekVolume: number | null,
  allTimePRs: Map<string, { weight: number; volume: number; reps: number }>
): WeeklyPerformanceAnalysis {
  const weekLogs = logs.filter(log => {
    const completedAt = new Date(log.completedAt);
    return completedAt >= weekStart && completedAt <= weekEnd;
  });
  
  const exerciseMap = new Map<string, ExercisePerformance>();
  const newPRs: string[] = [];
  let totalVolume = 0;
  let totalMinutes = 0;
  let difficultySum = 0;
  let difficultyCount = 0;
  
  for (const log of weekLogs) {
    const exercises = parseExercises(log);
    
    for (const ex of exercises) {
      const volume = calculateVolume(ex);
      totalVolume += volume;
      
      const existing = exerciseMap.get(ex.exerciseName);
      const maxWeight = Math.max(...ex.sets.map(s => s.weight), 0);
      const maxReps = Math.max(...ex.sets.map(s => s.reps), 0);
      
      // Check for PRs
      const currentPR = allTimePRs.get(ex.exerciseName);
      if (currentPR) {
        if (maxWeight > currentPR.weight) {
          newPRs.push(`${ex.exerciseName} (weight: ${maxWeight}lbs)`);
        }
        if (volume > currentPR.volume) {
          newPRs.push(`${ex.exerciseName} (volume)`);
        }
      }
      
      if (existing) {
        existing.totalVolume += volume;
        existing.maxWeight = Math.max(existing.maxWeight, maxWeight);
        existing.maxReps = Math.max(existing.maxReps, maxReps);
        existing.setCount += ex.sets.length;
        // Update averages
        const allSets = existing.setCount;
        existing.avgWeight = (existing.avgWeight * (allSets - ex.sets.length) + ex.sets.reduce((s, set) => s + set.weight, 0)) / allSets;
        existing.avgReps = (existing.avgReps * (allSets - ex.sets.length) + ex.sets.reduce((s, set) => s + set.reps, 0)) / allSets;
      } else {
        exerciseMap.set(ex.exerciseName, {
          exerciseName: ex.exerciseName,
          avgWeight: ex.sets.length > 0 ? ex.sets.reduce((s, set) => s + set.weight, 0) / ex.sets.length : 0,
          avgReps: ex.sets.length > 0 ? ex.sets.reduce((s, set) => s + set.reps, 0) / ex.sets.length : 0,
          totalVolume: volume,
          maxWeight,
          maxReps,
          setCount: ex.sets.length
        });
      }
    }
    
    if (log.durationActual) {
      totalMinutes += log.durationActual;
    }
    
    if (log.difficultyRating) {
      difficultySum += log.difficultyRating;
      difficultyCount++;
    }
  }
  
  const volumeChangePercent = previousWeekVolume !== null && previousWeekVolume > 0
    ? ((totalVolume - previousWeekVolume) / previousWeekVolume) * 100
    : null;
  
  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    workoutsCompleted: weekLogs.length,
    workoutsPlanned: 0, // Would need to check workout plan
    completionRate: 0, // Placeholder - needs workout plan data
    totalVolume,
    volumeChangePercent,
    avgDifficulty: difficultyCount > 0 ? difficultySum / difficultyCount : null,
    totalMinutes,
    exercisePerformance: Array.from(exerciseMap.values()),
    newPRs: [...new Set(newPRs)] // Remove duplicates
  };
}

/**
 * Calculate all-time personal records for each exercise
 */
function calculatePRs(logs: WorkoutLog[]): Map<string, { weight: number; volume: number; reps: number; date: string }> {
  const prs = new Map<string, { weight: number; volume: number; reps: number; date: string }>();
  
  for (const log of logs) {
    const exercises = parseExercises(log);
    const date = new Date(log.completedAt).toISOString();
    
    for (const ex of exercises) {
      const maxWeight = Math.max(...ex.sets.map(s => s.weight), 0);
      const maxReps = Math.max(...ex.sets.map(s => s.reps), 0);
      const volume = calculateVolume(ex);
      
      const current = prs.get(ex.exerciseName);
      if (!current) {
        prs.set(ex.exerciseName, { weight: maxWeight, volume, reps: maxReps, date });
      } else {
        if (maxWeight > current.weight) {
          current.weight = maxWeight;
          current.date = date;
        }
        if (volume > current.volume) {
          current.volume = volume;
        }
        if (maxReps > current.reps) {
          current.reps = maxReps;
        }
      }
    }
  }
  
  return prs;
}

/**
 * Identify muscle groups from exercise names
 */
function identifyMuscleGroup(exerciseName: string): string[] {
  const name = exerciseName.toLowerCase();
  const groups: string[] = [];
  
  // Push/chest
  if (name.includes('bench') || name.includes('push') || name.includes('chest') || name.includes('fly')) {
    groups.push('chest');
  }
  // Shoulders
  if (name.includes('shoulder') || name.includes('press') || name.includes('lateral') || name.includes('delt')) {
    groups.push('shoulders');
  }
  // Back/pull
  if (name.includes('row') || name.includes('pull') || name.includes('lat') || name.includes('back')) {
    groups.push('back');
  }
  // Arms
  if (name.includes('curl') || name.includes('bicep')) {
    groups.push('biceps');
  }
  if (name.includes('tricep') || name.includes('extension') || name.includes('pushdown')) {
    groups.push('triceps');
  }
  // Legs
  if (name.includes('squat') || name.includes('leg') || name.includes('quad')) {
    groups.push('quadriceps');
  }
  if (name.includes('deadlift') || name.includes('hamstring') || name.includes('rdl')) {
    groups.push('hamstrings');
  }
  if (name.includes('calf') || name.includes('calves')) {
    groups.push('calves');
  }
  if (name.includes('glute') || name.includes('hip thrust')) {
    groups.push('glutes');
  }
  // Core
  if (name.includes('ab') || name.includes('core') || name.includes('plank') || name.includes('crunch')) {
    groups.push('core');
  }
  
  return groups.length > 0 ? groups : ['other'];
}

/**
 * Main analysis function - generates comprehensive workout history analysis
 */
export async function analyzeWorkoutHistory(userId: string): Promise<HistoricalWorkoutAnalysis> {
  // Fetch all workout logs for the user
  const allLogs = await storage.getAllWorkoutLogs(userId);
  
  if (allLogs.length === 0) {
    return {
      lastWeek: null,
      last4Weeks: null,
      last3Months: null,
      allTime: {
        totalWorkouts: 0,
        totalMinutes: 0,
        personalRecords: [],
        mostFrequentExercises: [],
        avgWorkoutsPerWeek: 0
      },
      recommendations: {
        shouldProgressWeight: [],
        shouldDeload: [],
        undertrainedMuscleGroups: ['chest', 'back', 'shoulders', 'legs', 'core'],
        suggestionText: "No workout history yet. Start logging workouts to get personalized recommendations!"
      }
    };
  }
  
  const now = new Date();
  const allTimePRs = calculatePRs(allLogs);
  
  // ============ LAST WEEK ANALYSIS ============
  const thisWeekStart = getWeekStart(now);
  const thisWeekEnd = getWeekEnd(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
  lastWeekEnd.setHours(23, 59, 59, 999);
  
  // Get previous week's volume for comparison
  const twoWeeksAgoStart = new Date(lastWeekStart);
  twoWeeksAgoStart.setDate(twoWeeksAgoStart.getDate() - 7);
  const twoWeeksAgoEnd = new Date(lastWeekStart);
  twoWeeksAgoEnd.setDate(twoWeeksAgoEnd.getDate() - 1);
  
  const twoWeeksAgoLogs = allLogs.filter(log => {
    const d = new Date(log.completedAt);
    return d >= twoWeeksAgoStart && d <= twoWeeksAgoEnd;
  });
  
  let twoWeeksAgoVolume: number | null = null;
  if (twoWeeksAgoLogs.length > 0) {
    twoWeeksAgoVolume = twoWeeksAgoLogs.reduce((total, log) => {
      const exercises = parseExercises(log);
      return total + exercises.reduce((sum, ex) => sum + calculateVolume(ex), 0);
    }, 0);
  }
  
  const lastWeek = analyzeWeek(allLogs, lastWeekStart, lastWeekEnd, twoWeeksAgoVolume, allTimePRs);
  
  // ============ LAST 4 WEEKS ANALYSIS ============
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  
  const last4WeeksLogs = allLogs.filter(log => new Date(log.completedAt) >= fourWeeksAgo);
  
  let last4Weeks = null;
  if (last4WeeksLogs.length > 0) {
    const weeklyVolumes: number[] = [];
    const exercisesUsed = new Set<string>();
    let totalDifficulty = 0;
    let difficultyCount = 0;
    
    // Calculate weekly volumes
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(fourWeeksAgo);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekLogs = last4WeeksLogs.filter(log => {
        const d = new Date(log.completedAt);
        return d >= weekStart && d <= weekEnd;
      });
      
      let weekVolume = 0;
      for (const log of weekLogs) {
        const exercises = parseExercises(log);
        for (const ex of exercises) {
          exercisesUsed.add(ex.exerciseName);
          weekVolume += calculateVolume(ex);
        }
        if (log.difficultyRating) {
          totalDifficulty += log.difficultyRating;
          difficultyCount++;
        }
      }
      weeklyVolumes.push(weekVolume);
    }
    
    // Determine volume trend
    let volumeTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (weeklyVolumes.length >= 2) {
      const recentAvg = (weeklyVolumes[2] + weeklyVolumes[3]) / 2;
      const olderAvg = (weeklyVolumes[0] + weeklyVolumes[1]) / 2;
      if (olderAvg > 0) {
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        if (change > 10) volumeTrend = 'increasing';
        else if (change < -10) volumeTrend = 'decreasing';
      }
    }
    
    const avgCompletionRate = last4WeeksLogs.length / 4 / 3 * 100; // Assuming 3 workouts per week planned
    
    last4Weeks = {
      weeklyVolumes,
      volumeTrend,
      avgCompletionRate: Math.min(avgCompletionRate, 100),
      exercisesUsed: Array.from(exercisesUsed),
      avgDifficulty: difficultyCount > 0 ? totalDifficulty / difficultyCount : null
    };
  }
  
  // ============ LAST 3 MONTHS ANALYSIS ============
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const last3MonthsLogs = allLogs.filter(log => new Date(log.completedAt) >= threeMonthsAgo);
  
  let last3Months = null;
  if (last3MonthsLogs.length >= 5) { // Need minimum data for meaningful analysis
    // Split into first half and second half for progress comparison
    const midpoint = new Date(threeMonthsAgo);
    midpoint.setDate(midpoint.getDate() + 45); // ~1.5 months
    
    const firstHalf = last3MonthsLogs.filter(log => new Date(log.completedAt) < midpoint);
    const secondHalf = last3MonthsLogs.filter(log => new Date(log.completedAt) >= midpoint);
    
    // Calculate progress by exercise
    const exerciseFirstHalf = new Map<string, { totalVolume: number; maxWeight: number; count: number }>();
    const exerciseSecondHalf = new Map<string, { totalVolume: number; maxWeight: number; count: number }>();
    
    for (const log of firstHalf) {
      const exercises = parseExercises(log);
      for (const ex of exercises) {
        const existing = exerciseFirstHalf.get(ex.exerciseName) || { totalVolume: 0, maxWeight: 0, count: 0 };
        existing.totalVolume += calculateVolume(ex);
        existing.maxWeight = Math.max(existing.maxWeight, ...ex.sets.map(s => s.weight));
        existing.count++;
        exerciseFirstHalf.set(ex.exerciseName, existing);
      }
    }
    
    for (const log of secondHalf) {
      const exercises = parseExercises(log);
      for (const ex of exercises) {
        const existing = exerciseSecondHalf.get(ex.exerciseName) || { totalVolume: 0, maxWeight: 0, count: 0 };
        existing.totalVolume += calculateVolume(ex);
        existing.maxWeight = Math.max(existing.maxWeight, ...ex.sets.map(s => s.weight));
        existing.count++;
        exerciseSecondHalf.set(ex.exerciseName, existing);
      }
    }
    
    const strengthProgressByExercise: MonthlyProgressByExercise[] = [];
    const plateauExercises: string[] = [];
    const improvingExercises: string[] = [];
    
    for (const [name, second] of exerciseSecondHalf) {
      const first = exerciseFirstHalf.get(name);
      if (!first || first.count < 2 || second.count < 2) continue;
      
      const avgVolumeFirst = first.totalVolume / first.count;
      const avgVolumeSecond = second.totalVolume / second.count;
      const volumeChange = avgVolumeFirst > 0 ? ((avgVolumeSecond - avgVolumeFirst) / avgVolumeFirst) * 100 : 0;
      const maxWeightChange = second.maxWeight - first.maxWeight;
      
      let trend: 'improving' | 'plateau' | 'declining' = 'plateau';
      if (volumeChange > 10 || maxWeightChange > 5) {
        trend = 'improving';
        improvingExercises.push(name);
      } else if (volumeChange < -10 || maxWeightChange < -5) {
        trend = 'declining';
      } else {
        plateauExercises.push(name);
      }
      
      strengthProgressByExercise.push({
        exerciseName: name,
        volumeChange: Math.round(volumeChange),
        maxWeightChange,
        trend
      });
    }
    
    last3Months = {
      strengthProgressByExercise,
      plateauExercises,
      improvingExercises
    };
  }
  
  // ============ ALL-TIME ANALYSIS ============
  const totalMinutes = allLogs.reduce((sum, log) => sum + (log.durationActual || 0), 0);
  
  // Most frequent exercises
  const exerciseFrequency = new Map<string, number>();
  for (const log of allLogs) {
    const exercises = parseExercises(log);
    for (const ex of exercises) {
      exerciseFrequency.set(ex.exerciseName, (exerciseFrequency.get(ex.exerciseName) || 0) + 1);
    }
  }
  
  const mostFrequentExercises = Array.from(exerciseFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
  
  // Calculate average workouts per week
  const firstWorkout = new Date(Math.min(...allLogs.map(l => new Date(l.completedAt).getTime())));
  const weeksActive = Math.max(1, (now.getTime() - firstWorkout.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const avgWorkoutsPerWeek = allLogs.length / weeksActive;
  
  // Convert PRs to array format
  const personalRecords: PersonalRecord[] = Array.from(allTimePRs.entries()).map(([name, pr]) => ({
    exerciseName: name,
    weight: pr.weight,
    reps: pr.reps,
    date: pr.date,
    type: 'weight' as const
  })).slice(0, 15); // Limit to top 15 exercises
  
  // ============ RECOMMENDATIONS ============
  const shouldProgressWeight: string[] = [];
  const shouldDeload: string[] = [];
  
  // Check for exercises ready for progression or needing deload
  if (last3Months) {
    for (const progress of last3Months.strengthProgressByExercise) {
      if (progress.trend === 'improving' && progress.volumeChange > 15) {
        shouldProgressWeight.push(progress.exerciseName);
      } else if (progress.trend === 'declining') {
        shouldDeload.push(progress.exerciseName);
      }
    }
  }
  
  // Identify undertrained muscle groups
  const trainedMuscleGroups = new Set<string>();
  if (last4Weeks) {
    for (const exercise of last4Weeks.exercisesUsed) {
      const groups = identifyMuscleGroup(exercise);
      groups.forEach(g => trainedMuscleGroups.add(g));
    }
  }
  
  const allMuscleGroups = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'core'];
  const undertrainedMuscleGroups = allMuscleGroups.filter(g => !trainedMuscleGroups.has(g));
  
  // Generate suggestion text
  let suggestionText = '';
  if (lastWeek.workoutsCompleted === 0) {
    suggestionText = "No workouts logged this past week. Get back on track with your next session!";
  } else if (shouldProgressWeight.length > 0) {
    suggestionText = `Great progress! Consider increasing weight on: ${shouldProgressWeight.slice(0, 3).join(', ')}.`;
  } else if (shouldDeload.length > 0) {
    suggestionText = `Consider a deload week for: ${shouldDeload.slice(0, 3).join(', ')}. Recovery is key to progress!`;
  } else if (undertrainedMuscleGroups.length > 2) {
    suggestionText = `Consider adding exercises for: ${undertrainedMuscleGroups.slice(0, 3).join(', ')} for balanced development.`;
  } else if (last4Weeks?.volumeTrend === 'increasing') {
    suggestionText = "Excellent! Your training volume is trending upward. Keep the momentum going!";
  } else {
    suggestionText = "Consistent training detected. Consider progressive overload to continue making gains.";
  }
  
  return {
    lastWeek: lastWeek.workoutsCompleted > 0 ? lastWeek : null,
    last4Weeks,
    last3Months,
    allTime: {
      totalWorkouts: allLogs.length,
      totalMinutes,
      personalRecords,
      mostFrequentExercises,
      avgWorkoutsPerWeek: Math.round(avgWorkoutsPerWeek * 10) / 10
    },
    recommendations: {
      shouldProgressWeight,
      shouldDeload,
      undertrainedMuscleGroups,
      suggestionText
    }
  };
}

/**
 * Generate a concise summary for the AI prompt
 * This formats the analysis into a text block suitable for including in workout plan prompts
 */
export function formatAnalysisForPrompt(analysis: HistoricalWorkoutAnalysis): string {
  const lines: string[] = [];
  
  lines.push("=== WORKOUT HISTORY ANALYSIS ===");
  
  // All-time summary
  lines.push(`\nAll-Time: ${analysis.allTime.totalWorkouts} workouts logged, averaging ${analysis.allTime.avgWorkoutsPerWeek} per week`);
  
  // Last week
  if (analysis.lastWeek) {
    lines.push(`\nLast Week Performance:`);
    lines.push(`- ${analysis.lastWeek.workoutsCompleted} workouts completed`);
    lines.push(`- Total volume: ${Math.round(analysis.lastWeek.totalVolume).toLocaleString()} lbs`);
    if (analysis.lastWeek.volumeChangePercent !== null) {
      const changeDir = analysis.lastWeek.volumeChangePercent >= 0 ? '+' : '';
      lines.push(`- Volume change from prior week: ${changeDir}${Math.round(analysis.lastWeek.volumeChangePercent)}%`);
    }
    if (analysis.lastWeek.avgDifficulty !== null) {
      lines.push(`- Average perceived difficulty: ${analysis.lastWeek.avgDifficulty.toFixed(1)}/5`);
    }
    if (analysis.lastWeek.newPRs.length > 0) {
      lines.push(`- New PRs set: ${analysis.lastWeek.newPRs.join(', ')}`);
    }
  } else {
    lines.push(`\nLast Week: No workouts logged`);
  }
  
  // 4-week trend
  if (analysis.last4Weeks) {
    lines.push(`\n4-Week Trend:`);
    lines.push(`- Volume trend: ${analysis.last4Weeks.volumeTrend}`);
    lines.push(`- Exercises used: ${analysis.last4Weeks.exercisesUsed.slice(0, 10).join(', ')}`);
    if (analysis.last4Weeks.avgDifficulty !== null) {
      lines.push(`- Average difficulty rating: ${analysis.last4Weeks.avgDifficulty.toFixed(1)}/5`);
    }
  }
  
  // 3-month progress
  if (analysis.last3Months) {
    if (analysis.last3Months.improvingExercises.length > 0) {
      lines.push(`\nImproving Exercises (3mo): ${analysis.last3Months.improvingExercises.slice(0, 5).join(', ')}`);
    }
    if (analysis.last3Months.plateauExercises.length > 0) {
      lines.push(`Plateau Exercises: ${analysis.last3Months.plateauExercises.slice(0, 5).join(', ')}`);
    }
  }
  
  // Top personal records
  if (analysis.allTime.personalRecords.length > 0) {
    lines.push(`\nTop Personal Records:`);
    for (const pr of analysis.allTime.personalRecords.slice(0, 5)) {
      lines.push(`- ${pr.exerciseName}: ${pr.weight}lbs x ${pr.reps} reps`);
    }
  }
  
  // Recommendations
  lines.push(`\nRecommendations:`);
  if (analysis.recommendations.shouldProgressWeight.length > 0) {
    lines.push(`- Ready for weight increase: ${analysis.recommendations.shouldProgressWeight.join(', ')}`);
  }
  if (analysis.recommendations.shouldDeload.length > 0) {
    lines.push(`- Consider deload: ${analysis.recommendations.shouldDeload.join(', ')}`);
  }
  if (analysis.recommendations.undertrainedMuscleGroups.length > 0) {
    lines.push(`- Undertrained areas: ${analysis.recommendations.undertrainedMuscleGroups.join(', ')}`);
  }
  lines.push(`- ${analysis.recommendations.suggestionText}`);
  
  return lines.join('\n');
}
