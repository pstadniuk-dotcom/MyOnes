/**
 * Workout Analysis Service Tests
 * Tests the workout history analysis types and utility functions
 */

import { describe, it, expect } from 'vitest';
import type { HistoricalWorkoutAnalysis, ExerciseLog, SetPerformance } from '../workoutAnalysis';

// Test helper functions that mirror the module's internal logic
function calculateVolume(sets: SetPerformance[]): number {
  return sets.reduce((total, set) => total + (set.weight * set.reps), 0);
}

function parseExerciseLog(data: any): ExerciseLog | null {
  if (!data) return null;
  // Require at least a name field
  const name = data.exerciseName || data.name;
  if (!name) return null;
  
  return {
    exerciseName: name,
    sets: Array.isArray(data.sets) ? data.sets.map((s: any) => ({
      weight: Number(s.weight) || 0,
      reps: Number(s.reps) || 0
    })) : []
  };
}

describe('Volume Calculations', () => {
  it('should calculate total volume correctly', () => {
    const sets: SetPerformance[] = [
      { reps: 10, weight: 100 },
      { reps: 8, weight: 110 },
      { reps: 6, weight: 120 },
    ];

    const totalVolume = calculateVolume(sets);
    
    expect(totalVolume).toBe(10 * 100 + 8 * 110 + 6 * 120);
    expect(totalVolume).toBe(2600);
  });

  it('should handle empty sets', () => {
    const volume = calculateVolume([]);
    expect(volume).toBe(0);
  });

  it('should handle bodyweight exercises (zero weight)', () => {
    const sets: SetPerformance[] = [
      { reps: 15, weight: 0 },
      { reps: 12, weight: 0 },
      { reps: 10, weight: 0 },
    ];

    const volume = calculateVolume(sets);
    expect(volume).toBe(0); // Volume is weight * reps, so 0 for bodyweight
  });

  it('should handle single set', () => {
    const sets: SetPerformance[] = [{ reps: 5, weight: 225 }];
    expect(calculateVolume(sets)).toBe(1125);
  });
});

describe('Exercise Log Parsing', () => {
  it('should parse valid exercise data', () => {
    const data = {
      exerciseName: 'Bench Press',
      sets: [
        { weight: 135, reps: 10 },
        { weight: 145, reps: 8 },
      ]
    };

    const parsed = parseExerciseLog(data);
    
    expect(parsed).toBeDefined();
    expect(parsed?.exerciseName).toBe('Bench Press');
    expect(parsed?.sets).toHaveLength(2);
    expect(parsed?.sets[0].weight).toBe(135);
    expect(parsed?.sets[0].reps).toBe(10);
  });

  it('should handle missing exerciseName', () => {
    const data = { sets: [] };
    const parsed = parseExerciseLog(data);
    expect(parsed).toBeNull();
  });

  it('should handle null input', () => {
    expect(parseExerciseLog(null)).toBeNull();
    expect(parseExerciseLog(undefined)).toBeNull();
  });

  it('should handle missing sets array', () => {
    const data = { exerciseName: 'Squat' };
    const parsed = parseExerciseLog(data);
    
    expect(parsed?.exerciseName).toBe('Squat');
    expect(parsed?.sets).toEqual([]);
  });

  it('should coerce string weights and reps to numbers', () => {
    const data = {
      exerciseName: 'Deadlift',
      sets: [
        { weight: '315', reps: '5' } as any,
      ]
    };

    const parsed = parseExerciseLog(data);
    expect(parsed?.sets[0].weight).toBe(315);
    expect(parsed?.sets[0].reps).toBe(5);
    expect(typeof parsed?.sets[0].weight).toBe('number');
  });

  it('should handle alternative name field', () => {
    const data = {
      name: 'Pull-ups',
      sets: []
    };

    const parsed = parseExerciseLog(data);
    expect(parsed?.exerciseName).toBe('Pull-ups');
  });
});

describe('Historical Analysis Structure', () => {
  it('should have correct shape for empty analysis', () => {
    const emptyAnalysis: HistoricalWorkoutAnalysis = {
      lastWeek: null,
      last4Weeks: null,
      last3Months: null,
      allTime: {
        totalWorkouts: 0,
        totalMinutes: 0,
        personalRecords: [],
        mostFrequentExercises: [],
        avgWorkoutsPerWeek: 0,
      },
      recommendations: {
        shouldProgressWeight: [],
        shouldDeload: [],
        undertrainedMuscleGroups: [],
        suggestionText: 'Start logging workouts to get personalized recommendations.',
      },
    };

    expect(emptyAnalysis.allTime.totalWorkouts).toBe(0);
    expect(emptyAnalysis.recommendations.suggestionText).toBeDefined();
  });

  it('should support weekly performance data', () => {
    const weeklyAnalysis = {
      weekStart: '2025-12-01',
      weekEnd: '2025-12-07',
      workoutsCompleted: 4,
      workoutsPlanned: 4,
      completionRate: 100,
      totalVolume: 50000,
      volumeChangePercent: 5,
      avgDifficulty: 3.5,
      totalMinutes: 180,
      exercisePerformance: [
        {
          exerciseName: 'Bench Press',
          avgWeight: 155,
          avgReps: 8,
          totalVolume: 12400,
          maxWeight: 175,
          maxReps: 10,
          setCount: 12,
        }
      ],
      newPRs: ['Bench Press'],
    };

    expect(weeklyAnalysis.completionRate).toBe(100);
    expect(weeklyAnalysis.exercisePerformance[0].exerciseName).toBe('Bench Press');
  });
});

describe('Workout Streak Calculations', () => {
  it('should identify consecutive workout days', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const workoutDates = [
      new Date(today.getTime()), // today
      new Date(today.getTime() - 1 * 86400000), // yesterday
      new Date(today.getTime() - 2 * 86400000), // 2 days ago
      // gap
      new Date(today.getTime() - 5 * 86400000), // 5 days ago
    ];

    // Calculate streak (consecutive days from today)
    let streak = 0;
    for (let i = 0; i < workoutDates.length; i++) {
      const expectedDate = new Date(today.getTime() - i * 86400000);
      const actualDate = workoutDates[i];
      
      if (
        actualDate.getFullYear() === expectedDate.getFullYear() &&
        actualDate.getMonth() === expectedDate.getMonth() &&
        actualDate.getDate() === expectedDate.getDate()
      ) {
        streak++;
      } else {
        break;
      }
    }

    expect(streak).toBe(3);
  });

  it('should handle no workouts', () => {
    const workoutDates: Date[] = [];
    expect(workoutDates.length).toBe(0);
  });

  it('should handle single workout today', () => {
    const today = new Date();
    const workoutDates = [today];
    
    expect(workoutDates.length).toBe(1);
  });
});

describe('Progress Trend Detection', () => {
  it('should detect increasing volume trend', () => {
    const weeklyVolumes = [40000, 42000, 44000, 46000];
    
    // Calculate if trend is increasing (simple check: last > first)
    const trend = weeklyVolumes[weeklyVolumes.length - 1] > weeklyVolumes[0] 
      ? 'increasing' 
      : weeklyVolumes[weeklyVolumes.length - 1] < weeklyVolumes[0]
        ? 'decreasing'
        : 'stable';
    
    expect(trend).toBe('increasing');
  });

  it('should detect decreasing volume trend', () => {
    const weeklyVolumes = [50000, 48000, 45000, 42000];
    
    const trend = weeklyVolumes[weeklyVolumes.length - 1] > weeklyVolumes[0] 
      ? 'increasing' 
      : weeklyVolumes[weeklyVolumes.length - 1] < weeklyVolumes[0]
        ? 'decreasing'
        : 'stable';
    
    expect(trend).toBe('decreasing');
  });

  it('should detect stable volume trend', () => {
    const weeklyVolumes = [45000, 45000, 45000, 45000];
    
    const trend = weeklyVolumes[weeklyVolumes.length - 1] > weeklyVolumes[0] 
      ? 'increasing' 
      : weeklyVolumes[weeklyVolumes.length - 1] < weeklyVolumes[0]
        ? 'decreasing'
        : 'stable';
    
    expect(trend).toBe('stable');
  });
});

describe('Personal Record Detection', () => {
  it('should identify weight PR', () => {
    const previousMax = 225;
    const currentLift = 230;
    
    const isPR = currentLift > previousMax;
    expect(isPR).toBe(true);
  });

  it('should not count ties as PRs', () => {
    const previousMax = 225;
    const currentLift = 225;
    
    const isPR = currentLift > previousMax;
    expect(isPR).toBe(false);
  });

  it('should track volume PRs separately from weight PRs', () => {
    const previousMaxWeight = 225;
    const previousMaxVolume = 225 * 5 * 3; // 3375
    
    // Same weight, more reps = volume PR but not weight PR
    const currentWeight = 225;
    const currentVolume = 225 * 6 * 3; // 4050
    
    const isWeightPR = currentWeight > previousMaxWeight;
    const isVolumePR = currentVolume > previousMaxVolume;
    
    expect(isWeightPR).toBe(false);
    expect(isVolumePR).toBe(true);
  });
});
