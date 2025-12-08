import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp, Calendar } from 'lucide-react';
import type { StreakData } from '@/types/wellness';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';

interface StreakHeatmapProps {
  data: StreakData;
}

// Get color based on activity level
function getActivityColor(level: 0 | 1 | 2 | 3 | 4): string {
  switch (level) {
    case 0: return 'bg-gray-100';
    case 1: return 'bg-[#52796F]/30';
    case 2: return 'bg-[#52796F]/50';
    case 3: return 'bg-[#52796F]/70';
    case 4: return 'bg-[#1B4332]';
    default: return 'bg-gray-100';
  }
}

// Tooltip text for activity level
function getActivityTooltip(activities: string[], level: number): string {
  if (level === 0) return 'No activity';
  const activityNames = activities.map(a => {
    switch (a) {
      case 'workout': return '🏋️ Workout';
      case 'nutrition': return '🍽️ Nutrition';
      case 'supplements': return '💊 Supplements';
      default: return a;
    }
  });
  return activityNames.join(', ');
}

export function StreakHeatmap({ data }: StreakHeatmapProps) {
  // Group activity map into weeks for grid display
  // Start from the first Sunday in the 30-day range
  const firstDate = data.activityMap[0]?.date;
  const firstDateObj = firstDate ? parseISO(firstDate) : new Date();
  const weekStart = startOfWeek(firstDateObj);
  
  // Build grid: 5 rows (weeks) x 7 columns (days)
  const weeks: (typeof data.activityMap[0] | null)[][] = [];
  let currentWeek: (typeof data.activityMap[0] | null)[] = [];
  
  // Fill in days from week start to first data point
  const daysUntilFirstData = Math.floor((firstDateObj.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
  for (let i = 0; i < daysUntilFirstData; i++) {
    currentWeek.push(null);
  }
  
  // Add actual data
  data.activityMap.forEach((day, i) => {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  });
  
  // Fill remaining days in last week
  while (currentWeek.length < 7) {
    currentWeek.push(null);
  }
  weeks.push(currentWeek);

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <Card className="border-[#1B4332]/10 hover:border-[#1B4332]/20 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-[#1B4332] flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Streaks & Consistency
          </CardTitle>
          {data.overall.current > 0 && (
            <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
              🔥 {data.overall.current} day{data.overall.current !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Streak Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-[#1B4332]/5">
            <p className="text-2xl font-bold text-[#1B4332]">{data.overall.current}</p>
            <p className="text-xs text-[#52796F]">Current</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[#D4A574]/10">
            <p className="text-2xl font-bold text-[#D4A574]">{data.overall.longest}</p>
            <p className="text-xs text-[#52796F]">Best</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[#52796F]/10">
            <p className="text-2xl font-bold text-[#52796F]">
              {data.activityMap.filter(d => d.level > 0).length}
            </p>
            <p className="text-xs text-[#52796F]">Active Days</p>
          </div>
        </div>

        {/* Heatmap */}
        <div className="space-y-2">
          <p className="text-xs text-[#52796F] flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Last 30 days
          </p>
          
          {/* Day labels */}
          <div className="flex gap-1 mb-1">
            <div className="w-4" /> {/* Spacer for alignment */}
            {dayLabels.map((day, i) => (
              <div key={i} className="w-5 text-center text-[10px] text-[#52796F]">
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex flex-col gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-1 items-center">
                <div className="w-4 text-[10px] text-[#52796F] text-right">
                  {weekIndex === 0 ? 'W1' : weekIndex === weeks.length - 1 ? 'Now' : ''}
                </div>
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`w-5 h-5 rounded-sm ${
                      day ? getActivityColor(day.level) : 'bg-transparent'
                    } transition-colors hover:ring-2 hover:ring-[#1B4332]/30 cursor-default`}
                    title={day ? `${format(parseISO(day.date), 'MMM d')}: ${getActivityTooltip(day.activities, day.level)}` : ''}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1 mt-2">
            <span className="text-[10px] text-[#52796F] mr-1">Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm ${getActivityColor(level as 0 | 1 | 2 | 3 | 4)}`}
              />
            ))}
            <span className="text-[10px] text-[#52796F] ml-1">More</span>
          </div>
        </div>

        {/* Mini streak badges for categories */}
        <div className="flex gap-2 flex-wrap pt-2 border-t border-[#1B4332]/10">
          {data.workout.current > 0 && (
            <Badge variant="outline" className="text-xs border-[#D4A574]/30 text-[#D4A574]">
              🏋️ {data.workout.current} workout streak
            </Badge>
          )}
          {data.nutrition.current > 0 && (
            <Badge variant="outline" className="text-xs border-[#52796F]/30 text-[#52796F]">
              🍽️ {data.nutrition.current} nutrition streak
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Empty state
export function StreakHeatmapEmpty() {
  return (
    <Card className="border-[#1B4332]/10 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <Flame className="h-8 w-8 text-gray-300 mb-3" />
        <h3 className="font-semibold text-[#1B4332] mb-1">Start Your Streak</h3>
        <p className="text-sm text-[#52796F] max-w-xs">
          Log your first workout, meal, or supplements to begin building your streak.
        </p>
      </CardContent>
    </Card>
  );
}
