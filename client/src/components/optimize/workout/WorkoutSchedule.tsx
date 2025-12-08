import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dumbbell, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, isToday, isBefore, startOfDay } from 'date-fns';

interface WorkoutScheduleProps {
  plan: any;
  onWorkoutClick: (workout: any, index: number) => void;
  workoutLogs?: any[];
}

// Helper to get the actual date for each day of the current week
function getWeekDates() {
  const today = new Date();
  // Start from Monday (weekStartsOn: 1)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

// Check if a workout was completed on a specific date
function isWorkoutCompleted(date: Date, workoutLogs: any[] = []): boolean {
  const dateStr = format(date, 'yyyy-MM-dd');
  return workoutLogs.some(log => {
    const logDate = format(new Date(log.completedAt), 'yyyy-MM-dd');
    return logDate === dateStr;
  });
}

export function WorkoutSchedule({ plan, onWorkoutClick, workoutLogs = [] }: WorkoutScheduleProps) {
  const weekPlan = plan?.content?.weekPlan || [];
  const weekDates = getWeekDates();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekPlan.map((day: any, index: number) => {
          const dayDate = weekDates[index];
          const isCurrentDay = isToday(dayDate);
          const isPastDay = isBefore(dayDate, startOfDay(new Date()));
          const isCompleted = isWorkoutCompleted(dayDate, workoutLogs);
          
          return (
            <Card 
              key={index} 
              className={cn(
                "cursor-pointer hover:border-primary transition-colors h-full relative",
                day.isRestDay ? "opacity-70 bg-muted/50" : "border-l-4 border-l-primary",
                isCurrentDay && "ring-2 ring-primary ring-offset-2",
                isCompleted && !day.isRestDay && "bg-green-50/50 border-l-green-500"
              )}
              onClick={() => !day.isRestDay && onWorkoutClick(day, index)}
            >
              {isCompleted && !day.isRestDay && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
              )}
              <CardHeader className="p-4 pb-2">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className={cn(
                      "font-semibold text-sm",
                      isCurrentDay && "text-primary"
                    )}>
                      {day.dayName}
                    </span>
                    {day.isRestDay && <Badge variant="outline" className="text-xs">Rest</Badge>}
                  </div>
                  <span className={cn(
                    "text-xs",
                    isCurrentDay ? "text-primary font-medium" : "text-muted-foreground"
                  )}>
                    {format(dayDate, 'MMM d')}
                    {isCurrentDay && " • Today"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {day.isRestDay ? (
                  <div className="text-xs text-muted-foreground">
                    Active recovery or rest
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="font-medium text-sm line-clamp-2">{day.workout?.name || "Workout"}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{day.workout?.durationMinutes || 45}m</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="secondary" className="text-[10px] px-1 h-5">
                        {day.workout?.exercises?.length || 0} Exercises
                      </Badge>
                      {day.workout?.type && (
                        <Badge variant="outline" className="text-[10px] px-1 h-5 capitalize">
                          {day.workout.type.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
