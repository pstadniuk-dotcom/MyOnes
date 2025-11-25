import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, Activity, Zap, Trophy, Calendar, Dumbbell, Clock } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface WorkoutAnalyticsData {
  volumeChartData: { date: string; volume: number }[];
  personalRecords: Record<string, { weight: number; date: string }>;
  consistencyData: { week: string; count: number }[];
  currentStreak: number;
  totalWorkouts: number;
  topExercises: { name: string; count: number }[];
  durationThisWeek?: number;
}

export function WorkoutAnalytics() {
  const { data, isLoading } = useQuery<WorkoutAnalyticsData>({
    queryKey: ['/api/optimize/analytics/workout'],
  });

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (!data || data.totalWorkouts === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/10">
        <div className="bg-primary/10 p-4 rounded-full mb-4">
          <Activity className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">No Analytics Yet</h3>
        <p className="text-muted-foreground max-w-sm mt-2">
          Complete your first workout to unlock detailed insights, volume tracking, and personal records.
        </p>
      </div>
    );
  }

  // Calculate total volume for display
  const totalVolume = data.volumeChartData.reduce((acc: number, curr: any) => acc + curr.volume, 0);
  const lastWeekVolume = data.volumeChartData[data.volumeChartData.length - 1]?.volume || 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Streak</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.currentStreak} Days</div>
            <p className="text-xs text-muted-foreground">
              Keep it up! Consistency is key.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalWorkouts}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime sessions completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration this Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.durationThisWeek || 0} min</div>
            <p className="text-xs text-muted-foreground">
              Time spent training
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Volume Progression</CardTitle>
          <CardDescription>Total weight lifted (lbs) per week</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.volumeChartData}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                stroke="#888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                formatter={(val: number) => [`${val.toLocaleString()} lbs`, 'Volume']}
                labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              />
              <Area 
                type="monotone" 
                dataKey="volume" 
                stroke="#0ea5e9" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorVolume)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Personal Records
            </CardTitle>
            <CardDescription>Your heaviest lifts recorded</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data.personalRecords).length > 0 ? (
                Object.entries(data.personalRecords)
                  .sort(([, a]: any, [, b]: any) => b.weight - a.weight)
                  .slice(0, 5)
                  .map(([exercise, record]: any, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                      <div className="font-medium">{exercise}</div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{record.weight} lbs</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(record.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Log strength workouts to see your PRs here!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Exercises */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Most Frequent Exercises
            </CardTitle>
            <CardDescription>What you train the most</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topExercises.map((ex: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{ex.name}</span>
                    <span className="text-muted-foreground">{ex.count} sessions</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary/80 rounded-full" 
                      style={{ width: `${(ex.count / data.topExercises[0].count) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-16" /></CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="h-[300px]"><Skeleton className="h-full w-full" /></CardContent>
      </Card>
    </div>
  );
}
