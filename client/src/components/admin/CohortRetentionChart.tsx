import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CohortData {
  cohort: string;
  month: number;
  totalUsers: number;
  ordered: number;
  reordered: number;
  retention: number;
}

export function CohortRetentionChart() {
  const { data, isLoading, error } = useQuery<CohortData[]>({
    queryKey: ['/api/admin/analytics/cohorts'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cohort Retention (90-Day Cycles)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load cohort data</p>
        </CardContent>
      </Card>
    );
  }

  // Color based on retention percentage
  const getBarColor = (retention: number) => {
    if (retention >= 60) return '#10b981'; // green
    if (retention >= 40) return '#f59e0b'; // amber
    if (retention >= 20) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <Card data-testid="cohort-retention-chart">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Cohort Retention (90-Day Reorder Cycles)
        </CardTitle>
        <CardDescription>
          Users who reorder within their 90-day supply window, grouped by signup month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="cohort" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const [year, month] = value.split('-');
                  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' });
                }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'retention') return [`${value}%`, 'Retention Rate'];
                  return [value, name];
                }}
                labelFormatter={(label) => {
                  const [year, month] = label.split('-');
                  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                }}
              />
              <Bar dataKey="retention" name="retention" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.retention)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cohort Details Table */}
        <div className="mt-4 border-t pt-4">
          <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground mb-2">
            <span>Cohort</span>
            <span className="text-center">Total</span>
            <span className="text-center">Ordered</span>
            <span className="text-center">Reordered</span>
            <span className="text-center">Retention</span>
            <span className="text-center">Status</span>
          </div>
          {data.map((cohort) => (
            <div key={cohort.cohort} className="grid grid-cols-6 gap-2 text-sm py-1 border-b border-muted/20">
              <span className="font-medium">
                {new Date(cohort.cohort + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              </span>
              <span className="text-center">{cohort.totalUsers}</span>
              <span className="text-center">{cohort.ordered}</span>
              <span className="text-center">{cohort.reordered}</span>
              <span className="text-center font-medium">{cohort.retention}%</span>
              <span className="text-center">
                <Badge variant={cohort.retention >= 40 ? 'default' : 'destructive'} className="text-xs">
                  {cohort.retention >= 60 ? 'Great' : cohort.retention >= 40 ? 'Good' : cohort.retention >= 20 ? 'Low' : 'Critical'}
                </Badge>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
