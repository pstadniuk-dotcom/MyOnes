import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  Dumbbell, 
  Pill, 
  Droplets, 
  Zap, 
  Smile, 
  Moon,
  CheckCircle2,
  XCircle,
  StickyNote
} from 'lucide-react';
import type { OptimizeDailyLog } from '@/types/optimize';

interface DailyLogsHistoryProps {
  logs: OptimizeDailyLog[];
}

export function DailyLogsHistory({ logs }: DailyLogsHistoryProps) {
  // Sort logs by date descending
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.logDate).getTime() - new Date(a.logDate).getTime()
  );

  if (logs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Logs Yet</h3>
          <p className="text-muted-foreground max-w-sm">
            Start tracking your daily progress using the "Quick Log" button above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedLogs.map((log) => (
        <Card key={log.id} className="overflow-hidden">
          <CardHeader className="bg-muted/30 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">
                  {new Date(log.logDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              <Badge variant="outline" className="bg-background">
                {new Date(log.logDate).toLocaleDateString()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Habits */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Habits</p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {log.workoutCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground/30" />
                    )}
                    <span className="text-sm">Workout</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.supplementsTaken ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground/30" />
                    )}
                    <span className="text-sm">Supplements</span>
                  </div>
                </div>
              </div>

              {/* Wellness Stats */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Wellness</p>
                <div className="space-y-1">
                  {log.energyLevel && (
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-3 w-3 text-yellow-500" />
                      <span>Energy: {log.energyLevel}/5</span>
                    </div>
                  )}
                  {log.moodLevel && (
                    <div className="flex items-center gap-2 text-sm">
                      <Smile className="h-3 w-3 text-blue-500" />
                      <span>Mood: {log.moodLevel}/5</span>
                    </div>
                  )}
                  {log.sleepQuality && (
                    <div className="flex items-center gap-2 text-sm">
                      <Moon className="h-3 w-3 text-indigo-500" />
                      <span>Sleep: {log.sleepQuality}/5</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hydration */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hydration</p>
                <div className="flex items-center gap-2">
                  <Droplets className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="text-xl font-bold">{log.waterIntakeOz || 0}</p>
                    <p className="text-xs text-muted-foreground">oz water</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {log.notes && (
                <div className="space-y-2 col-span-2 md:col-span-4 border-t pt-3 mt-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</p>
                  <div className="flex items-start gap-2">
                    <StickyNote className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{log.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
