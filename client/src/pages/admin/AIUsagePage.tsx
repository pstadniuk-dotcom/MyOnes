import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/shared/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import {
  DollarSign, Cpu, Zap, TrendingUp, Users, BarChart3, ArrowLeft, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Link } from 'wouter';

interface UsageSummary {
  totalCostCents: number;
  totalTokens: number;
  totalCalls: number;
  byUser: Array<{
    userId: string;
    userName: string | null;
    userEmail: string;
    totalCostCents: number;
    totalTokens: number;
    callCount: number;
  }>;
  byModel: Array<{
    model: string;
    provider: string;
    totalCostCents: number;
    totalTokens: number;
    callCount: number;
  }>;
  byFeature: Array<{
    feature: string;
    totalCostCents: number;
    totalTokens: number;
    callCount: number;
  }>;
  dailyCosts: Array<{
    date: string;
    totalCostCents: number;
    callCount: number;
  }>;
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

function featureLabel(feature: string): string {
  const map: Record<string, string> = {
    chat: 'AI Consultation',
    formula: 'Formula Creation',
    lab_analysis: 'Lab Analysis',
    blog: 'Blog Generation',
    live_chat: 'Live Chat Bot',
    optimize: 'Optimize Plans',
    agent: 'PR Agent',
    file_analysis: 'File Analysis',
  };
  return map[feature] || feature;
}

export default function AIUsagePage() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery<UsageSummary>({
    queryKey: ['/api/admin/ai-usage', days],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/ai-usage?days=${days}`);
      return res.json();
    },
  });

  // Use days elapsed since first usage (not the full window) for accurate projections
  // This prevents diluting a busy day across weeks of no data
  const elapsedDays = (() => {
    if (!data?.dailyCosts?.length) return days;
    const firstDate = new Date(data.dailyCosts[0].date);
    const now = new Date();
    const diff = Math.ceil((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(diff, 1);
  })();

  const dailyAvgCents = data
    ? Math.round(data.totalCostCents / elapsedDays)
    : 0;

  const projectedMonthlyCents = dailyAvgCents * 30;

  // Aggregate daily costs into weekly buckets (always fill all weeks in the window)
  const weeklyCosts = (() => {
    if (!data?.dailyCosts) return [];
    const now = new Date();
    const weeks: Array<{ label: string; totalCostCents: number; callCount: number }> = [];
    const totalWeeks = Math.ceil(days / 7);

    // Build a map of date → cost for quick lookup
    const costMap = new Map<string, { totalCostCents: number; callCount: number }>();
    for (const d of data.dailyCosts) {
      costMap.set(d.date, { totalCostCents: d.totalCostCents, callCount: d.callCount });
    }

    for (let w = totalWeeks - 1; w >= 0; w--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      let totalCostCents = 0;
      let callCount = 0;
      for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        const entry = costMap.get(key);
        if (entry) {
          totalCostCents += entry.totalCostCents;
          callCount += entry.callCount;
        }
      }

      const startLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
      const endLabel = `${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
      weeks.push({ label: `${startLabel}–${endLabel}`, totalCostCents, callCount });
    }
    return weeks;
  })();

  // Max for chart scaling
  const maxWeeklyCost = weeklyCosts.length
    ? Math.max(...weeklyCosts.map(w => w.totalCostCents), 1)
    : 1;

  const weeklyAvgCents = weeklyCosts.length
    ? Math.round(data!.totalCostCents / weeklyCosts.length)
    : 0;

  const topUser = data?.byUser?.[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">AI Usage & Costs</h1>
            <p className="text-sm text-muted-foreground">Monitor API spending per user, model, and feature</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading usage data...</div>
      ) : !data ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">No data available yet. Usage tracking starts with new AI calls.</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend ({days}d)</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatCost(data.totalCostCents)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ~{formatCost(dailyAvgCents)}/day avg
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Projected Monthly</CardTitle>
                <TrendingUp className={cn("h-4 w-4", projectedMonthlyCents > 5000 ? "text-red-500" : "text-blue-500")} />
              </CardHeader>
              <CardContent>
                <div className={cn("text-3xl font-bold", projectedMonthlyCents > 5000 && "text-red-600")}>
                  {formatCost(projectedMonthlyCents)}
                </div>
                {projectedMonthlyCents > 5000 && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> High spend alert
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total API Calls</CardTitle>
                <Zap className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.totalCalls.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ~{Math.round(data.totalCalls / (days || 1))}/day
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tokens Used</CardTitle>
                <Cpu className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatTokens(data.totalTokens)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ~{formatCost(data.totalCalls > 0 ? Math.round(data.totalCostCents / data.totalCalls) : 0)}/call avg
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Cost Chart */}
          {weeklyCosts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Weekly AI Spend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 h-40">
                  {weeklyCosts.map((week) => (
                    <div
                      key={week.label}
                      className="flex-1 group relative flex flex-col justify-end"
                    >
                      <div
                        className={cn(
                          "w-full rounded-t transition-colors",
                          week.totalCostCents > weeklyAvgCents * 2 ? "bg-red-400" : "bg-blue-400 group-hover:bg-blue-500"
                        )}
                        style={{
                          height: week.totalCostCents > 0
                            ? `${Math.max((week.totalCostCents / maxWeeklyCost) * 100, 4)}%`
                            : '2px',
                        }}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                        {week.label}: {formatCost(week.totalCostCents)} ({week.callCount} calls)
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  {weeklyCosts.map((week) => (
                    <span key={week.label} className="flex-1 text-center truncate text-[10px]">
                      {week.label}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost by User */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> Cost by User (Top 20)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.byUser.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No user data yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.byUser.slice(0, 20).map((user, i) => {
                      const pct = data.totalCostCents > 0
                        ? Math.round((user.totalCostCents / data.totalCostCents) * 100)
                        : 0;
                      return (
                        <div key={user.userId || i}>
                          <div className="flex justify-between items-center text-sm mb-1">
                            <div className="flex items-center gap-2 truncate flex-1">
                              <span className="font-medium truncate">
                                {user.userName || user.userEmail || 'Unknown'}
                              </span>
                              {user.userName && (
                                <span className="text-xs text-muted-foreground truncate">{user.userEmail}</span>
                              )}
                            </div>
                            <div className="text-right flex items-center gap-3 flex-shrink-0">
                              <span className="text-xs text-muted-foreground">{user.callCount} calls</span>
                              <span className="font-semibold">{formatCost(user.totalCostCents)}</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-all",
                                pct > 40 ? "bg-red-400" : pct > 20 ? "bg-amber-400" : "bg-blue-400"
                              )}
                              style={{ width: `${Math.max(pct, 1)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cost by Feature */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Cost by Feature
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.byFeature.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No feature data yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.byFeature.map((f) => {
                      const pct = data.totalCostCents > 0
                        ? Math.round((f.totalCostCents / data.totalCostCents) * 100)
                        : 0;
                      return (
                        <div key={f.feature}>
                          <div className="flex justify-between items-center text-sm mb-1">
                            <span className="font-medium">{featureLabel(f.feature)}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">
                                {f.callCount} calls · {formatTokens(f.totalTokens)} tokens
                              </span>
                              <span className="font-semibold">{formatCost(f.totalCostCents)}</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-purple-400 transition-all"
                              style={{ width: `${Math.max(pct, 1)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cost by Model */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="h-4 w-4" /> Cost by Model
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.byModel.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No model data yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.byModel.map((m) => {
                      const pct = data.totalCostCents > 0
                        ? Math.round((m.totalCostCents / data.totalCostCents) * 100)
                        : 0;
                      return (
                        <div key={m.model}>
                          <div className="flex justify-between items-center text-sm mb-1">
                            <div>
                              <span className="font-medium">{m.model}</span>
                              <span className="text-xs text-muted-foreground ml-2">({m.provider})</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{m.callCount} calls</span>
                              <span className="font-semibold">{formatCost(m.totalCostCents)}</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-green-400 transition-all"
                              style={{ width: `${Math.max(pct, 1)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top User Alert */}
            {topUser && topUser.totalCostCents > 500 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-4 w-4" /> Highest-Cost User
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-semibold">{topUser.userName || topUser.userEmail}</span> has consumed {formatCost(topUser.totalCostCents)} in the last {days} days across {topUser.callCount} API calls.
                    </p>
                    <p className="text-xs text-amber-700">
                      This is {data.totalCostCents > 0 ? Math.round((topUser.totalCostCents / data.totalCostCents) * 100) : 0}% of your total AI spend.
                      Consider implementing per-user rate limits if this becomes unsustainable.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
