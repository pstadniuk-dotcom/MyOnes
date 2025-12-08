import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Flame, 
  TrendingUp, 
  Utensils, 
  Dumbbell, 
  Pill, 
  Moon,
  Calendar,
  Trophy,
  Target,
  AlertCircle
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { TrackingPillBar } from './TrackingPillBar';
import { PausedBanner } from './PausedBanner';
import type { TrackingPreferences } from '@/types/tracking';

// Types for the new streak summary from API
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
  isPaused?: boolean;
}

interface StreakConsistencyCardProps {
  data: StreakSummary;
  trackingPrefs?: TrackingPreferences;
}

// Category config
const categories = [
  { 
    key: 'nutrition' as const, 
    label: 'Nutrition', 
    icon: Utensils, 
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    progressColor: 'bg-green-500',
    description: 'Log meals & hit calorie goals'
  },
  { 
    key: 'workout' as const, 
    label: 'Workouts', 
    icon: Dumbbell, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    progressColor: 'bg-blue-500',
    description: 'Complete planned workouts'
  },
  { 
    key: 'supplements' as const, 
    label: 'Supplements', 
    icon: Pill, 
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    progressColor: 'bg-purple-500',
    description: 'Take AM/Noon/PM doses'
  },
  { 
    key: 'lifestyle' as const, 
    label: 'Lifestyle', 
    icon: Moon, 
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    progressColor: 'bg-amber-500',
    description: 'Sleep, hydration & wellness'
  },
];

// Get color intensity based on score (0-1)
function getScoreColor(score: number | null): string {
  if (score === null) return 'bg-gray-100';
  if (score >= 0.75) return 'bg-[#1B4332]';
  if (score >= 0.50) return 'bg-[#52796F]/70';
  if (score >= 0.25) return 'bg-[#52796F]/40';
  if (score > 0) return 'bg-[#52796F]/20';
  return 'bg-gray-100';
}

// Get text color based on score
function getScoreTextColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 0.75) return 'text-white';
  if (score >= 0.50) return 'text-white';
  return 'text-[#1B4332]';
}

// Format score as percentage
function formatScore(score: number | null): string {
  if (score === null) return '--';
  return `${Math.round(score * 100)}%`;
}

export function StreakConsistencyCard({ data, trackingPrefs }: StreakConsistencyCardProps) {
  // Check if tracking is paused
  const isPaused = trackingPrefs?.pauseUntil 
    ? new Date(trackingPrefs.pauseUntil) >= new Date(new Date().toDateString())
    : false;

  const enabledCategories = categories.filter((cat) => {
    if (cat.key === 'nutrition') return trackingPrefs?.trackNutrition ?? true;
    if (cat.key === 'workout') return trackingPrefs?.trackWorkouts ?? true;
    if (cat.key === 'supplements') return trackingPrefs?.trackSupplements ?? true;
    if (cat.key === 'lifestyle') return trackingPrefs?.trackLifestyle ?? true;
    return true;
  });

  const allCategoriesDisabled = enabledCategories.length === 0;

  // Calculate week totals
  const weekDays = 7;
  const activeDays = data.weeklyProgress.filter(d => d.dailyScore && d.dailyScore > 0).length;
  const avgWeekScore = data.weeklyProgress.length > 0
    ? data.weeklyProgress.reduce((sum, d) => sum + (d.dailyScore || 0), 0) / data.weeklyProgress.length
    : 0;

  // Get best streak across all categories
  const bestCurrentStreak = enabledCategories.length
    ? Math.max(
        ...enabledCategories.map((cat) => {
          const streak = data[cat.key];
          return streak?.current ?? 0;
        })
      )
    : 0;

  // Generate last 7 days for weekly view
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = data.weeklyProgress.find(d => d.date === dateStr);
    return {
      dateObj: date, // Keep as Date object
      dateStr,
      dayName: format(date, 'EEE'),
      dayNum: format(date, 'd'),
      dailyScore: dayData?.dailyScore ?? null,
      nutritionScore: dayData?.nutritionScore ?? null,
      workoutScore: dayData?.workoutScore ?? null,
      supplementScore: dayData?.supplementScore ?? null,
      lifestyleScore: dayData?.lifestyleScore ?? null,
    };
  });

  // If all categories disabled, show empty state
  if (allCategoriesDisabled) {
    return (
      <Card className="border-[#1B4332]/10 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-[#1B4332] flex items-center gap-2">
            <Flame className="h-5 w-5 text-gray-400" />
            Streaks & Consistency
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <AlertCircle className="h-8 w-8 text-amber-500 mb-3" />
          <h3 className="font-medium text-[#1B4332] mb-1">No categories tracked</h3>
          <p className="text-sm text-[#52796F] max-w-xs">
            Enable at least one category in tracking settings to see your streaks.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#1B4332]/10 hover:border-[#1B4332]/20 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-[#1B4332] flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Streaks & Consistency
            </CardTitle>
            {/* Tracking pill bar – shows which categories are active */}
            {trackingPrefs && <TrackingPillBar prefs={trackingPrefs} />}
          </div>
          {bestCurrentStreak > 0 && !isPaused && (
            <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
              🔥 {bestCurrentStreak} day{bestCurrentStreak !== 1 ? 's' : ''}
            </Badge>
          )}
          {isPaused && (
            <Badge variant="outline" className="border-amber-300 text-amber-600">
              Paused
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Paused banner */}
        {isPaused && trackingPrefs?.pauseUntil && (
          <PausedBanner until={trackingPrefs.pauseUntil} />
        )}
        {/* Weekly Progress Summary */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-[#1B4332]/5 to-[#52796F]/5 border border-[#1B4332]/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#1B4332]">This Week</span>
            <span className="text-lg font-bold text-[#1B4332]">
              {activeDays}/{weekDays} days
            </span>
          </div>
          <Progress 
            value={(activeDays / weekDays) * 100} 
            className="h-2 bg-gray-100"
          />
          <p className="text-[10px] text-[#52796F] mt-1">Avg score: {formatScore(avgWeekScore)}</p>
        </div>

        {/* Category Streaks Grid */}
        <div className="grid grid-cols-2 gap-3">
          {enabledCategories.map((cat) => {
            const streak = data[cat.key];
            const Icon = cat.icon;
            
            return (
              <div 
                key={cat.key}
                className={cn(
                  "p-3 rounded-lg border transition-all hover:shadow-sm",
                  streak.current > 0 ? "border-[#1B4332]/20 bg-white" : "border-gray-100 bg-gray-50/50"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={cn("p-1.5 rounded-md", cat.bgColor)}>
                    <Icon className={cn("h-4 w-4", cat.color)} />
                  </div>
                  {streak.current > 0 && (
                    <div className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-400" />
                      <span className="text-xs font-semibold text-orange-600">{streak.current}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-[#1B4332] mb-1">{cat.label}</p>
                <span className="text-[10px] text-[#52796F]">
                  Best: {streak.longest} day{streak.longest !== 1 ? 's' : ''}
                </span>
              </div>
            );
          })}
        </div>

        {/* Weekly Mini Heatmap */}
        <div className="space-y-2 pt-2 border-t border-[#1B4332]/10">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#52796F] flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              This Week
            </p>
            <p className="text-xs text-[#52796F]">
              {activeDays}/{weekDays} days active
            </p>
          </div>
          
          {/* Day columns */}
          <div className="flex gap-1">
            {last7Days.map((day, i) => (
              <div key={i} className="flex-1 text-center">
                <p className="text-[10px] text-[#52796F] mb-1">{day.dayName}</p>
                <div 
                  className={cn(
                    "aspect-square rounded-md flex items-center justify-center transition-all cursor-default",
                    getScoreColor(day.dailyScore ?? null),
                    "hover:ring-2 hover:ring-[#1B4332]/20"
                  )}
                  title={`${format(day.dateObj, 'MMM d')}: ${formatScore(day.dailyScore ?? null)}`}
                >
                  <span className={cn("text-[10px] font-medium", getScoreTextColor(day.dailyScore ?? null))}>
                    {day.dayNum}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-end gap-1 pt-1">
            <span className="text-[10px] text-[#52796F] mr-1">0%</span>
            {[0, 0.25, 0.50, 0.75, 1.0].map((level) => (
              <div
                key={level}
                className={cn("w-3 h-3 rounded-sm", getScoreColor(level))}
              />
            ))}
            <span className="text-[10px] text-[#52796F] ml-1">100%</span>
          </div>
        </div>

        {/* Weekly Average */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1B4332]/10">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#52796F]" />
            <span className="text-xs text-[#52796F]">Weekly Average</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#1B4332]">
              {formatScore(avgWeekScore)}
            </span>
            {avgWeekScore >= 0.7 && (
              <Trophy className="h-4 w-4 text-amber-500" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Detailed view with tabs for each category
export function StreakConsistencyCardDetailed({ data }: StreakConsistencyCardProps) {
  return (
    <Card className="border-[#1B4332]/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-[#1B4332] flex items-center gap-2">
            <Target className="h-5 w-5 text-[#52796F]" />
            Consistency Tracker
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="overview" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="nutrition" className="text-xs">🍽️</TabsTrigger>
            <TabsTrigger value="workout" className="text-xs">🏋️</TabsTrigger>
            <TabsTrigger value="supplements" className="text-xs">💊</TabsTrigger>
            <TabsTrigger value="lifestyle" className="text-xs">🌙</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            {/* Overall Summary */}
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => {
                const streak = data[cat.key];
                const Icon = cat.icon;
                return (
                  <div key={cat.key} className="text-center p-2 rounded-lg bg-gray-50">
                    <Icon className={cn("h-4 w-4 mx-auto mb-1", cat.color)} />
                    <p className="text-lg font-bold text-[#1B4332]">{streak.current}</p>
                    <p className="text-[10px] text-[#52796F]">day streak</p>
                  </div>
                );
              })}
            </div>
            
            {/* Weekly Progress Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-[#52796F] font-medium">Day</th>
                    {categories.map((cat) => (
                      <th key={cat.key} className="text-center py-2">
                        <cat.icon className={cn("h-3 w-3 mx-auto", cat.color)} />
                      </th>
                    ))}
                    <th className="text-center py-2 text-[#52796F] font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weeklyProgress.slice(-7).map((day, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 text-[#1B4332]">
                        {format(parseISO(day.date), 'EEE d')}
                      </td>
                      <td className="text-center py-2">
                        <span className={cn(
                          "inline-block w-5 h-5 rounded-sm text-[10px] leading-5",
                          getScoreColor(day.nutritionScore),
                          getScoreTextColor(day.nutritionScore)
                        )}>
                          {day.nutritionScore ? Math.round(day.nutritionScore * 100) : '-'}
                        </span>
                      </td>
                      <td className="text-center py-2">
                        <span className={cn(
                          "inline-block w-5 h-5 rounded-sm text-[10px] leading-5",
                          getScoreColor(day.workoutScore),
                          getScoreTextColor(day.workoutScore)
                        )}>
                          {day.workoutScore !== null ? Math.round(day.workoutScore * 100) : '-'}
                        </span>
                      </td>
                      <td className="text-center py-2">
                        <span className={cn(
                          "inline-block w-5 h-5 rounded-sm text-[10px] leading-5",
                          getScoreColor(day.supplementScore),
                          getScoreTextColor(day.supplementScore)
                        )}>
                          {day.supplementScore ? Math.round(day.supplementScore * 100) : '-'}
                        </span>
                      </td>
                      <td className="text-center py-2">
                        <span className={cn(
                          "inline-block w-5 h-5 rounded-sm text-[10px] leading-5",
                          getScoreColor(day.lifestyleScore),
                          getScoreTextColor(day.lifestyleScore)
                        )}>
                          {day.lifestyleScore ? Math.round(day.lifestyleScore * 100) : '-'}
                        </span>
                      </td>
                      <td className="text-center py-2">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded text-[10px] font-medium",
                          (day.dailyScore ?? 0) >= 0.75 ? "bg-green-100 text-green-700" :
                          (day.dailyScore ?? 0) >= 0.50 ? "bg-yellow-100 text-yellow-700" :
                          (day.dailyScore ?? 0) > 0 ? "bg-orange-100 text-orange-700" :
                          "bg-gray-100 text-gray-500"
                        )}>
                          {formatScore(day.dailyScore)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          
          {/* Individual Category Tabs */}
          {categories.map((cat) => (
            <TabsContent key={cat.key} value={cat.key} className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className={cn("p-2 rounded-lg", cat.bgColor)}>
                  <cat.icon className={cn("h-5 w-5", cat.color)} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1B4332]">{cat.label}</h3>
                  <p className="text-xs text-[#52796F]">{cat.description}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-[#1B4332]/5">
                  <p className="text-2xl font-bold text-[#1B4332]">{data[cat.key].current}</p>
                  <p className="text-xs text-[#52796F]">Current Streak</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-[#D4A574]/10">
                  <p className="text-2xl font-bold text-[#D4A574]">{data[cat.key].longest}</p>
                  <p className="text-xs text-[#52796F]">Best Streak</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-[#52796F]/10">
                  <p className="text-2xl font-bold text-[#52796F]">
                    {data.weeklyProgress.filter(d => {
                      const score = d[`${cat.key}Score` as keyof typeof d] as number | null;
                      return score !== null && score >= 0.5;
                    }).length}
                  </p>
                  <p className="text-xs text-[#52796F]">This Week</p>
                </div>
              </div>
              
              {/* Weekly breakdown for this category */}
              <div className="flex gap-1">
                {data.weeklyProgress.slice(-7).map((day, i) => {
                  const score = day[`${cat.key}Score` as keyof typeof day] as number | null;
                  return (
                    <div key={i} className="flex-1 text-center">
                      <p className="text-[10px] text-[#52796F] mb-1">
                        {format(parseISO(day.date), 'EEE')}
                      </p>
                      <div 
                        className={cn(
                          "aspect-square rounded-md flex items-center justify-center",
                          getScoreColor(score)
                        )}
                      >
                        <span className={cn("text-xs font-medium", getScoreTextColor(score))}>
                          {score !== null ? Math.round(score * 100) : '-'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Empty state
export function StreakConsistencyCardEmpty() {
  return (
    <Card className="border-[#1B4332]/10 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <Flame className="h-8 w-8 text-gray-300 mb-3" />
        <h3 className="font-semibold text-[#1B4332] mb-1">Start Building Streaks</h3>
        <p className="text-sm text-[#52796F] max-w-xs mb-4">
          Track your consistency across nutrition, workouts, supplements, and lifestyle goals.
        </p>
        <div className="flex gap-2">
          {categories.map((cat) => (
            <div key={cat.key} className={cn("p-2 rounded-lg", cat.bgColor)}>
              <cat.icon className={cn("h-4 w-4", cat.color)} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
