import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Flame, 
  Trophy,
  Droplets,
  Utensils,
  Dumbbell,
  Pill,
  Moon,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format, parseISO, isToday, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TrackingPreferences } from '@/types/tracking';

// Types
export interface DayProgress {
  date: string;
  percentage: number;
  isRestDay: boolean;
  breakdown: {
    workout: { done: boolean; isRestDay: boolean };
    nutrition: { score: number; mealsLogged: number; mainMeals: number; goal: number };
    supplements: { taken: number; total: number };
    water: { current: number; goal: number };
    lifestyle: { sleepLogged: boolean; energyLogged: boolean; moodLogged: boolean; complete: boolean };
  };
}

export interface SmartStreakData {
  currentStreak: number;
  longestStreak: number;
  monthlyProgress: DayProgress[];
  todayBreakdown: DayProgress['breakdown'] | null;
}

interface SmartStreakCardProps {
  data: SmartStreakData;
  trackingPrefs: TrackingPreferences;
  onPrefsChange?: (prefs: TrackingPreferences) => void;
}

// Color scale based on percentage
function getPercentageColor(percentage: number, isRestDay: boolean): string {
  if (isRestDay) return 'bg-gray-100 border-2 border-dashed border-gray-300';
  if (percentage === 0) return 'bg-gray-200';
  if (percentage <= 25) return 'bg-red-300';
  if (percentage <= 50) return 'bg-orange-300';
  if (percentage <= 75) return 'bg-yellow-400';
  if (percentage < 100) return 'bg-lime-400';
  return 'bg-green-500';
}

function getPercentageTextColor(percentage: number, isRestDay: boolean): string {
  if (isRestDay) return 'text-gray-400';
  if (percentage === 0) return 'text-gray-500';
  if (percentage <= 50) return 'text-gray-800';
  return 'text-white';
}

// Category icons and labels
const categoryConfig = {
  workout: { icon: Dumbbell, label: 'Workouts', color: 'text-blue-600' },
  nutrition: { icon: Utensils, label: 'Nutrition', color: 'text-green-600' },
  supplements: { icon: Pill, label: 'Supplements', color: 'text-purple-600' },
  water: { icon: Droplets, label: 'Water', color: 'text-cyan-600' },
  lifestyle: { icon: Moon, label: 'Lifestyle', color: 'text-amber-600' },
};

export function SmartStreakCard({ data, trackingPrefs }: SmartStreakCardProps) {
  const [selectedDay, setSelectedDay] = useState<DayProgress | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();

  // Get enabled categories from prefs
  const enabledCategories = {
    workout: trackingPrefs.trackWorkouts !== false,
    nutrition: trackingPrefs.trackNutrition !== false,
    supplements: trackingPrefs.trackSupplements !== false,
    water: true,
    lifestyle: trackingPrefs.trackLifestyle !== false,
  };

  // Count enabled categories for percentage calculation
  const enabledCount = Object.values(enabledCategories).filter(Boolean).length;

  // Calculate today's percentage based on enabled categories
  const calculateTodayPercentage = () => {
    if (!data.todayBreakdown || enabledCount === 0) return 0;
    
    let completed = 0;
    const breakdown = data.todayBreakdown;

    if (enabledCategories.workout) {
      if (breakdown.workout.isRestDay || breakdown.workout.done) completed++;
    }
    if (enabledCategories.nutrition && breakdown.nutrition.mealsLogged > 0) completed++;
    if (enabledCategories.supplements && breakdown.supplements.taken >= breakdown.supplements.total) completed++;
    if (enabledCategories.water && breakdown.water.current >= breakdown.water.goal) completed++;
    if (enabledCategories.lifestyle && breakdown.lifestyle.complete) completed++;

    return Math.round((completed / enabledCount) * 100);
  };

  const todayPercentage = calculateTodayPercentage();

  // Build tracking labels for header
  const trackingLabels = Object.entries(enabledCategories)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => categoryConfig[key as keyof typeof categoryConfig].label)
    .join(' · ');

  // Generate calendar days for current month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get the starting day of week (0 = Sunday)
  const startDayOfWeek = getDay(monthStart);
  
  // Create empty slots for days before the month starts
  const emptySlots = Array.from({ length: startDayOfWeek }, (_, i) => null);

  const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card className="border-[#1B4332]/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-[#1B4332] flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Streaks & Consistency
          </CardTitle>
        </div>
        
        {/* Tracking pills */}
        <p className="text-sm text-[#52796F] mt-1">
          Tracking: {trackingLabels || 'Nothing selected'}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-medium text-[#1B4332]">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            disabled={isSameMonth(currentMonth, today)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Monthly Calendar */}
        <div className="space-y-1">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1">
            {weekDayLabels.map((label) => (
              <div key={label} className="text-center text-xs text-[#52796F] font-medium py-1">
                {label}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots */}
            {emptySlots.map((_, index) => (
              <div key={`empty-${index}`} className="h-9" />
            ))}
            
            {/* Days */}
            {daysInMonth.map((day) => {
              const dayData = data.monthlyProgress?.find(d => 
                isSameDay(parseISO(d.date), day)
              );
              const percentage = dayData?.percentage ?? 0;
              const isRestDay = dayData?.isRestDay ?? false;
              const isDayToday = isToday(day);
              const isFuture = day > today;
              const hasData = !!dayData;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => hasData && !isFuture ? setSelectedDay(dayData) : null}
                  disabled={isFuture || !hasData}
                  className={cn(
                    "h-9 w-full rounded-md flex items-center justify-center text-xs font-medium transition-all",
                    isFuture 
                      ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                      : hasData
                        ? cn(
                            getPercentageColor(percentage, isRestDay),
                            getPercentageTextColor(percentage, isRestDay),
                            "cursor-pointer hover:ring-2 hover:ring-[#1B4332]/30"
                          )
                        : "bg-gray-100 text-gray-400",
                    isDayToday && "ring-2 ring-[#1B4332] ring-offset-1"
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 justify-center text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-200" />
            <span className="text-[#52796F]">0%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-300" />
            <span className="text-[#52796F]">1-25%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-300" />
            <span className="text-[#52796F]">26-50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-400" />
            <span className="text-[#52796F]">51-75%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-lime-400" />
            <span className="text-[#52796F]">76-99%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-[#52796F]">100%</span>
          </div>
        </div>

        {/* Streak Stats */}
        <div className="flex items-center justify-between p-3 bg-[#1B4332]/5 rounded-lg">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm font-semibold text-[#1B4332]">
                {data.currentStreak} day{data.currentStreak !== 1 ? 's' : ''} streak
              </p>
              <p className="text-xs text-[#52796F]">Keep it going!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <div className="text-right">
              <p className="text-sm font-semibold text-[#1B4332]">
                {data.longestStreak} days
              </p>
              <p className="text-xs text-[#52796F]">Best streak</p>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                selectedDay && getPercentageColor(selectedDay.percentage, selectedDay.isRestDay),
                selectedDay && getPercentageTextColor(selectedDay.percentage, selectedDay.isRestDay)
              )}>
                {selectedDay?.percentage}%
              </div>
              {selectedDay && format(parseISO(selectedDay.date), 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDay && (
            <div className="space-y-3 py-2">
              {enabledCategories.workout && (
                <BreakdownItem
                  icon={Dumbbell}
                  label="Workout"
                  isRestDay={selectedDay.breakdown.workout.isRestDay}
                  done={selectedDay.breakdown.workout.done || selectedDay.breakdown.workout.isRestDay}
                  detail={selectedDay.breakdown.workout.isRestDay ? 'Rest day' : 
                    selectedDay.breakdown.workout.done ? 'Completed' : 'Not completed'}
                  color="text-blue-600"
                />
              )}
              {enabledCategories.nutrition && (
                <BreakdownItem
                  icon={Utensils}
                  label="Nutrition"
                  done={selectedDay.breakdown.nutrition.mealsLogged > 0}
                  detail={`${selectedDay.breakdown.nutrition.mealsLogged} meal${selectedDay.breakdown.nutrition.mealsLogged !== 1 ? 's' : ''} logged`}
                  color="text-green-600"
                />
              )}
              {enabledCategories.supplements && (
                <BreakdownItem
                  icon={Pill}
                  label="Supplements"
                  done={selectedDay.breakdown.supplements.taken >= selectedDay.breakdown.supplements.total}
                  detail={`${selectedDay.breakdown.supplements.taken}/${selectedDay.breakdown.supplements.total} doses`}
                  color="text-purple-600"
                />
              )}
              {enabledCategories.water && (
                <BreakdownItem
                  icon={Droplets}
                  label="Water"
                  done={selectedDay.breakdown.water.current >= selectedDay.breakdown.water.goal}
                  detail={`${selectedDay.breakdown.water.current}/${selectedDay.breakdown.water.goal} oz`}
                  color="text-cyan-600"
                />
              )}
              {enabledCategories.lifestyle && (
                <BreakdownItem
                  icon={Moon}
                  label="Lifestyle"
                  done={selectedDay.breakdown.lifestyle.complete}
                  detail={selectedDay.breakdown.lifestyle.complete 
                    ? 'Sleep, energy & mood logged' 
                    : `${[selectedDay.breakdown.lifestyle.sleepLogged, selectedDay.breakdown.lifestyle.energyLogged, selectedDay.breakdown.lifestyle.moodLogged].filter(Boolean).length}/3 logged`}
                  color="text-amber-600"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Breakdown item component
function BreakdownItem({ 
  icon: Icon, 
  label, 
  done, 
  detail, 
  color,
  isRestDay = false 
}: { 
  icon: typeof Dumbbell;
  label: string;
  done: boolean;
  detail: string;
  color: string;
  isRestDay?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-gray-50">
      <div className="flex items-center gap-2">
        {done ? (
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center",
            isRestDay ? "bg-gray-200" : "bg-green-100"
          )}>
            <Check className={cn("w-3 h-3", isRestDay ? "text-gray-500" : "text-green-600")} />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-3 h-3 text-gray-400" />
          </div>
        )}
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-sm text-[#1B4332]">{label}</span>
      </div>
      <span className={cn(
        "text-xs",
        done ? "text-green-600" : "text-[#52796F]"
      )}>
        {detail}
      </span>
    </div>
  );
}

// Empty state component
export function SmartStreakCardEmpty() {
  return (
    <Card className="border-[#1B4332]/10">
      <CardHeader>
        <CardTitle className="text-lg text-[#1B4332] flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Streaks & Consistency
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Flame className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-[#52796F] mb-2">Start tracking to build your streak!</p>
          <p className="text-sm text-[#52796F]/70">
            Log workouts, meals, supplements, and water to see your progress here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
