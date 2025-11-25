import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dumbbell, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkoutScheduleProps {
  plan: any;
  onWorkoutClick: (workout: any, index: number) => void;
}

export function WorkoutSchedule({ plan, onWorkoutClick }: WorkoutScheduleProps) {
  const weekPlan = plan?.content?.weekPlan || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekPlan.map((day: any, index: number) => (
          <Card 
            key={index} 
            className={cn(
              "cursor-pointer hover:border-primary transition-colors h-full",
              day.isRestDay ? "opacity-70 bg-muted/50" : "border-l-4 border-l-primary"
            )}
            onClick={() => !day.isRestDay && onWorkoutClick(day, index)}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">{day.dayName}</span>
                {day.isRestDay && <Badge variant="outline" className="text-xs">Rest</Badge>}
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
        ))}
      </div>
    </div>
  );
}
