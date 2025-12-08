import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, Activity, Zap, Trophy, Calendar, Dumbbell, Clock, Flame, Target, BarChart3 } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface WorkoutAnalyticsData {
  volumeChartData: { date: string; volume: number }[];
  personalRecords: Record<string, { weight: number; date: string }>;
  consistencyData: { week: string; count: number }[];
  currentStreak: number;
  totalWorkouts: number;
  topExercises: { name: string; count: number }[];
  durationThisWeek?: number;
  // New fields for enhanced analytics
  avgWorkoutDuration?: number;
  avgIntensity?: number;
  weeklyGoal?: number;
  muscleGroupBreakdown?: { name: string; count: number }[];
  estimatedMaxes?: Record<string, number>;
  weeklyConsistency?: { day: string; completed: boolean }[];
  // Completion tracking
  completionRate?: number;
  totalExercisesLogged?: number;
  totalExercisesSkipped?: number;
  mostSkippedExercises?: { name: string; count: number }[];
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
  const previousWeekVolume = data.volumeChartData[data.volumeChartData.length - 2]?.volume || 0;
  const volumeChange = previousWeekVolume > 0 
    ? Math.round(((lastWeekVolume - previousWeekVolume) / previousWeekVolume) * 100) 
    : 0;

  // Weekly consistency - default to 3 days goal
  const weeklyGoal = data.weeklyGoal || 3;
  const workoutsThisWeek = data.consistencyData[data.consistencyData.length - 1]?.count || 0;
  const weeklyProgress = Math.min((workoutsThisWeek / weeklyGoal) * 100, 100);

  // Calculate estimated 1RMs (Epley formula: 1RM = weight × (1 + reps/30))
  const estimatedMaxes = data.estimatedMaxes || {};

  return (
    <div className="space-y-6">
      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-200/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Streak</CardTitle>
            <Flame className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{data.currentStreak}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.currentStreak > 7 ? '🔥 On fire!' : 'Days in a row'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Target className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-blue-600">{workoutsThisWeek}</span>
              <span className="text-sm text-muted-foreground">/ {weeklyGoal}</span>
            </div>
            <Progress value={weeklyProgress} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{data.totalWorkouts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime sessions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time This Week</CardTitle>
            <Clock className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{data.durationThisWeek || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Minutes trained
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate Card */}
      {(data.totalExercisesLogged || data.totalExercisesSkipped) ? (
        <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5 text-teal-600" />
              Exercise Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-teal-600">{data.completionRate || 100}%</span>
                  <span className="text-sm text-muted-foreground">of exercises completed</span>
                </div>
                <Progress value={data.completionRate || 100} className="h-2 mt-3" />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>✅ {data.totalExercisesLogged || 0} logged</span>
                  <span>⏭️ {data.totalExercisesSkipped || 0} skipped</span>
                </div>
              </div>
              {data.mostSkippedExercises && data.mostSkippedExercises.length > 0 && (
                <div className="border-l pl-6 hidden md:block">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Most Skipped</div>
                  <div className="space-y-1">
                    {data.mostSkippedExercises.slice(0, 3).map((ex, i) => (
                      <div key={i} className="text-sm flex items-center gap-2">
                        <span className="text-orange-500">⚠️</span>
                        <span className="truncate max-w-32">{ex.name}</span>
                        <span className="text-xs text-muted-foreground">({ex.count}×)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Volume Progression Chart - Enhanced */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Volume Progression
              </CardTitle>
              <CardDescription>Total weight lifted (lbs) per week</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{lastWeekVolume.toLocaleString()} lbs</div>
              <div className={`text-sm flex items-center gap-1 justify-end ${volumeChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {volumeChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                {volumeChange >= 0 ? '+' : ''}{volumeChange}% vs last week
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.volumeChartData}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
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

      {/* Weekly Consistency Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Weekly Consistency
          </CardTitle>
          <CardDescription>Workouts completed per week (last 8 weeks)</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.consistencyData.slice(-8)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
              <XAxis 
                dataKey="week" 
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 7]}
                ticks={[0, 2, 4, 6]}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                formatter={(val: number) => [`${val} workouts`, 'Completed']}
                labelFormatter={(label) => `Week of ${new Date(label).toLocaleDateString()}`}
              />
              <Bar 
                dataKey="count" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Records - Enhanced */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Personal Records
            </CardTitle>
            <CardDescription>Your heaviest lifts recorded</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.personalRecords).length > 0 ? (
                Object.entries(data.personalRecords)
                  .sort(([, a]: any, [, b]: any) => b.weight - a.weight)
                  .slice(0, 6)
                  .map(([exercise, record]: any, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200/50">
                      <div>
                        <div className="font-medium text-sm">{exercise}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-yellow-700">{record.weight} lbs</div>
                        <Badge variant="outline" className="text-[10px] bg-yellow-100 border-yellow-300">
                          🏆 PR
                        </Badge>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p>Log strength workouts to track PRs!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Muscle Group Balance - Compact version */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Muscle Group Balance
            </CardTitle>
            <CardDescription>Training distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.muscleGroupBreakdown && data.muscleGroupBreakdown.length > 0 ? (
                data.muscleGroupBreakdown.slice(0, 6).map((group: { name: string; count: number }, i: number) => {
                  const colors = ['bg-sky-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'];
                  const maxCount = data.muscleGroupBreakdown![0].count;
                  return (
                    <div key={group.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium truncate flex-1">{group.name}</span>
                        <span className="text-muted-foreground ml-2">{group.count}×</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-500`}
                          style={{ width: `${(group.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p>Log workouts to see muscle balance!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lifetime Stats Summary */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            Lifetime Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold text-yellow-400">{totalVolume.toLocaleString()}</div>
              <div className="text-sm text-slate-400">Total lbs lifted</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400">{data.totalWorkouts}</div>
              <div className="text-sm text-slate-400">Workouts completed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400">
                {Math.round((data.durationThisWeek || 0) * (data.consistencyData.length || 1) / 60)}
              </div>
              <div className="text-sm text-slate-400">Hours trained (est.)</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">
                {Object.keys(data.personalRecords).length}
              </div>
              <div className="text-sm text-slate-400">Personal records</div>
            </div>
          </div>
        </CardContent>
      </Card>
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
