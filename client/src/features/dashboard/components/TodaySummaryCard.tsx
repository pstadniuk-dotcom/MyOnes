import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  Dumbbell,
  Utensils,
  Pill,
  Droplets,
  Check,
  Circle,
  Calendar
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { TodayPlan } from '@/types/wellness';

interface TodaySummaryCardProps {
  data: TodayPlan;
}

export function TodaySummaryCard({ data }: TodaySummaryCardProps) {
  // Calculate completion status for each category
  const supplementsComplete = data.supplementMorning && data.supplementAfternoon && data.supplementEvening;
  const supplementsPartial = data.supplementMorning || data.supplementAfternoon || data.supplementEvening;
  const workoutComplete = data.workoutCompleted;
  const workoutScheduled = data.hasWorkoutToday;
  const nutritionComplete = data.mealsLogged.length >= data.mealsPlanned && data.mealsPlanned > 0;
  const nutritionPartial = data.mealsLogged.length > 0;
  const hydrationComplete = data.waterIntakeOz >= data.waterGoalOz;
  const hydrationPartial = data.waterIntakeOz > 0;

  // Calculate overall daily score
  const completedItems = [
    supplementsComplete,
    workoutComplete || !workoutScheduled, // Rest day counts as complete
    nutritionComplete || (!data.hasMealPlan), // No plan = no requirement
    hydrationComplete
  ].filter(Boolean).length;

  const totalItems = 4;
  const dailyScore = Math.round((completedItems / totalItems) * 100);

  const items = [
    {
      key: 'supplements',
      label: 'Supplements',
      Icon: Pill,
      complete: supplementsComplete,
      partial: supplementsPartial,
      detail: supplementsComplete
        ? 'All doses taken'
        : `${[data.supplementMorning, data.supplementAfternoon, data.supplementEvening].filter(Boolean).length}/3 doses`,
      show: !!data.formulaName
    },
    {
      key: 'workout',
      label: 'Workout',
      Icon: Dumbbell,
      complete: workoutComplete,
      partial: false,
      detail: workoutScheduled
        ? (workoutComplete ? 'Completed' : data.workoutName || 'Scheduled')
        : 'Rest day',
      show: true
    },
    {
      key: 'nutrition',
      label: 'Nutrition',
      Icon: Utensils,
      complete: nutritionComplete,
      partial: nutritionPartial,
      detail: data.hasMealPlan
        ? `${data.mealsLogged.length}/${data.mealsPlanned} meals logged`
        : 'No meal plan',
      show: true
    },
    {
      key: 'hydration',
      label: 'Hydration',
      Icon: Droplets,
      complete: hydrationComplete,
      partial: hydrationPartial,
      detail: `${data.waterIntakeOz}/${data.waterGoalOz} oz`,
      show: true
    }
  ].filter(item => item.show);

  return (
    <Card className="border-[#1B4332]/10 hover:border-[#1B4332]/20 transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-[#1B4332] flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#D4A574]" />
            Today's Progress
          </CardTitle>
          <Badge
            className={cn(
              "text-sm font-bold px-3",
              dailyScore === 100
                ? "bg-green-100 text-green-700 border-green-200"
                : dailyScore >= 50
                  ? "bg-[#D4A574]/20 text-[#D4A574] border-[#D4A574]/30"
                  : "bg-gray-100 text-gray-600 border-gray-200"
            )}
          >
            {dailyScore}%
          </Badge>
        </div>
        <p className="text-xs text-[#52796F]">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.key}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-all",
              item.complete
                ? "bg-green-50 border-green-200"
                : item.partial
                  ? "bg-[#D4A574]/5 border-[#D4A574]/20"
                  : "bg-gray-50 border-gray-200"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                item.complete
                  ? "bg-green-100"
                  : item.partial
                    ? "bg-[#D4A574]/20"
                    : "bg-gray-100"
              )}>
                <item.Icon className={cn(
                  "h-4 w-4",
                  item.complete
                    ? "text-green-600"
                    : item.partial
                      ? "text-[#D4A574]"
                      : "text-gray-400"
                )} />
              </div>
              <div>
                <p className={cn(
                  "font-medium text-sm",
                  item.complete ? "text-green-700" : "text-[#1B4332]"
                )}>
                  {item.label}
                </p>
                <p className="text-xs text-[#52796F]">{item.detail}</p>
              </div>
            </div>
            {item.complete ? (
              <div className="p-1 rounded-full bg-green-100">
                <Check className="h-4 w-4 text-green-600" />
              </div>
            ) : (
              <Circle className="h-5 w-5 text-gray-300" />
            )}
          </div>
        ))}

        {/* Daily summary message */}
        <div className={cn(
          "mt-2 p-3 rounded-lg text-center text-sm font-medium",
          dailyScore === 100
            ? "bg-green-100 text-green-700"
            : dailyScore >= 75
              ? "bg-[#1B4332]/10 text-[#1B4332]"
              : dailyScore >= 50
                ? "bg-[#D4A574]/10 text-[#D4A574]"
                : "bg-gray-100 text-gray-600"
        )}>
          {dailyScore === 100 ? (
            "🎉 Perfect day! All goals complete!"
          ) : dailyScore >= 75 ? (
            "💪 Almost there! Keep going!"
          ) : dailyScore >= 50 ? (
            "🌱 Good progress today!"
          ) : dailyScore > 0 ? (
            "📝 Keep logging to track your day"
          ) : (
            "Start your day by completing some goals"
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Empty state
export function TodaySummaryCardEmpty() {
  return (
    <Card className="border-[#1B4332]/10 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <Calendar className="h-8 w-8 text-gray-300 mb-3" />
        <p className="text-sm text-[#52796F]">
          Set up your plans to track daily progress
        </p>
      </CardContent>
    </Card>
  );
}
