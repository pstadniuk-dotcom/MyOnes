import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dumbbell, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, isToday, isBefore, startOfDay } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRef, useEffect, useState } from 'react';

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
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Find today's index for initial scroll position
  const todayIndex = weekDates.findIndex(date => isToday(date));

  // Card width calculation: min(88vw, 320px) + gap for snap math (keeps full card visible and centered)
  const getCardWidth = () => Math.min(window.innerWidth * 0.88, 320) + 12;

  // Auto-scroll to today on mobile
  useEffect(() => {
    if (isMobile && scrollRef.current && todayIndex >= 0) {
      const cardWidth = getCardWidth();
      scrollRef.current.scrollTo({
        left: todayIndex * cardWidth,
        behavior: 'smooth'
      });
      setActiveIndex(todayIndex);
    }
  }, [isMobile, todayIndex]);

  // Track scroll position for indicator dots
  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const cardWidth = getCardWidth();
      const newIndex = Math.round(scrollLeft / cardWidth);
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < weekPlan.length) {
        setActiveIndex(newIndex);
      }
    }
  };

  // Mobile: Horizontal scrollable cards
  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Horizontal scroll container */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 scrollbar-hide px-4 justify-center"
          style={{ scrollPaddingLeft: '16px', scrollPaddingRight: '16px' }}
        >
          {weekPlan.map((day: any, index: number) => {
            const dayDate = weekDates[index];
            const isCurrentDay = isToday(dayDate);
            const isCompleted = isWorkoutCompleted(dayDate, workoutLogs);
            
            return (
              <div
                key={index}
                className="snap-center flex-shrink-0"
                style={{ width: 'min(88vw, 320px)' }}
              >
                <Card 
                  className={cn(
                    "transition-all h-full relative overflow-hidden bg-white",
                    "mx-auto",
                    day.isRestDay ? "opacity-75 bg-muted/40" : "border border-slate-200 shadow-sm",
                    isCurrentDay && !isCompleted && "border-2 border-[#1B4332]/60",
                    isCompleted && !day.isRestDay && "border-2 border-green-500/70 bg-green-50/60"
                  )}
                >
                  {isCompleted && !day.isRestDay && (
                    <div className="absolute top-2 right-2 bg-white/85 rounded-full p-1 shadow-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                  )}
                  <CardContent className="p-4 pb-5">
                    <div className="flex flex-col gap-2">
                      {/* Day header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-bold text-base",
                            isCurrentDay && "text-primary"
                          )}>
                            {day.dayName}
                          </span>
                          {day.isRestDay && (
                            <Badge variant="outline" className="text-xs">Rest</Badge>
                          )}
                        </div>
                        <span className={cn(
                          "text-xs font-medium",
                          isCurrentDay ? "text-primary" : "text-muted-foreground"
                        )}>
                          {format(dayDate, 'MMM d')}
                          {isCurrentDay && " • Today"}
                        </span>
                      </div>
                      
                      {day.isRestDay ? (
                        <p className="text-sm text-muted-foreground">
                          Active recovery or complete rest
                        </p>
                      ) : (
                        <>
                          {/* Workout name */}
                          <h4 className="font-semibold text-lg leading-tight pr-2">
                            {day.workout?.name || "Workout"}
                          </h4>
                          
                          {/* Workout details */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{day.workout?.durationMinutes || 45} min</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {day.workout?.exercises?.length || 0} exercises
                            </Badge>
                            {day.workout?.type && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {day.workout.type.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Action button */}
                          <Button 
                            className="w-full mt-3" 
                            size="sm"
                            variant={isCompleted ? "outline" : "default"}
                            onClick={() => onWorkoutClick(day, index)}
                            data-testid="workout-log-button"
                          >
                            {isCompleted ? 'View Details' : 'Start & Log'}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
          
        </div>
        
        {/* Scroll indicator dots */}
        <div className="flex justify-center gap-1.5">
          {weekPlan.map((_: any, i: number) => (
            <button
              key={i}
              onClick={() => {
                if (scrollRef.current) {
                  const cardWidth = getCardWidth();
                  scrollRef.current.scrollTo({
                    left: i * cardWidth,
                    behavior: 'smooth'
                  });
                }
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === activeIndex 
                  ? "bg-[#1B4332] w-4" 
                  : "bg-[#1B4332]/20 hover:bg-[#1B4332]/40"
              )}
              aria-label={`Go to day ${i + 1}`}
            />
          ))}
        </div>
      </div>
    );
  }

  // Desktop: Grid layout
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
                    <Button 
                      className="w-full mt-2" 
                      size="sm"
                      variant={isCompleted ? "outline" : "default"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onWorkoutClick(day, index);
                      }}
                    >
                      {isCompleted ? 'View Details' : 'Start & Log'}
                    </Button>
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
