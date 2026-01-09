import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { 
  Users, 
  DollarSign, 
  Activity, 
  Package,
  TrendingUp,
  UserCheck,
  Clock,
  MessageSquare
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '@/components/ui/select';
import { Settings2, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Types for API responses
interface DashboardStats {
  totalUsers: number;
  totalPaidUsers: number;
  activeUsers: number;
  totalOrders: number;
  totalFormulas: number;
  totalRevenue: number;
}

interface GrowthDataPoint {
  date: string;
  users: number;
  paidUsers: number;
}

interface RevenueDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

interface TodaysOrder {
  id: string;
  status: string;
  placedAt: string;
  amountCents: number | null;
  supplyMonths: number | null;
  user: { id: string; name: string; email: string };
  formula?: { totalMg: number; bases: Array<{ ingredient: string; amount: number }> };
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend
}: { 
  title: string; 
  value: string | number; 
  description: string; 
  icon: typeof Users;
  trend?: string;
}) {
  return (
    <Card 
      data-testid={`stat-card-${title.toLowerCase().replace(/\s/g, '-')}`}
      className="hover-elevate"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-value-${title.toLowerCase().replace(/\s/g, '-')}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
        {trend && (
          <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
            <TrendingUp className="h-3 w-3" />
            <span>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/stats'],
  });

  // Fetch user growth data
  const { data: growthData, isLoading: growthLoading, error: growthError } = useQuery<GrowthDataPoint[]>({
    queryKey: ['/api/admin/analytics/growth?days=30'],
  });

  // Fetch revenue data
  const { data: revenueData, isLoading: revenueLoading, error: revenueError } = useQuery<RevenueDataPoint[]>({
    queryKey: ['/api/admin/analytics/revenue?days=30'],
  });

  // Fetch today's orders
  const { data: todaysOrders } = useQuery<TodaysOrder[]>({
    queryKey: ['/api/admin/orders/today'],
  });

  // Show error toast if any query fails
  useEffect(() => {
    if (statsError || growthError || revenueError) {
      toast({
        title: "Error loading dashboard data",
        description: (statsError || growthError || revenueError)?.message || "Please try again later.",
        variant: "destructive"
      });
    }
  }, [statsError, growthError, revenueError, toast]);

  const isLoading = statsLoading || growthLoading || revenueLoading;

  if (isLoading) {
    return (
      <div className="p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-8" data-testid="page-admin-dashboard">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-admin-dashboard">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Overview of platform metrics and user activity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setLocation('/dashboard')} data-testid="button-go-to-dashboard">
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* AI Settings */}
        <AISettingsCard onChanged={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-settings'] });
        }} />

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation('/admin/users')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                View and manage all users
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation('/admin/conversations')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversations
              </CardTitle>
              <CardDescription>
                Browse chats &amp; generate insights
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation('/admin/support-tickets')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Support Tickets
              </CardTitle>
              <CardDescription>
                Manage user support requests
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation('/admin')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Analytics
              </CardTitle>
              <CardDescription>
                View detailed platform analytics
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="section-stats-cards">
          <div 
            className="cursor-pointer transition-all"
            onClick={() => setLocation('/admin/users?filter=all')}
          >
            <StatCard
              title="Total Users"
              value={stats?.totalUsers || 0}
              description="Click to view all users"
              icon={Users}
            />
          </div>
          <div 
            className="cursor-pointer transition-all"
            onClick={() => setLocation('/admin/users?filter=paid')}
          >
            <StatCard
              title="Paid Users"
              value={stats?.totalPaidUsers || 0}
              description="Click to view paid users"
              icon={UserCheck}
            />
          </div>
          <div 
            className="cursor-pointer transition-all"
            onClick={() => setLocation('/admin/users?filter=active')}
          >
            <StatCard
              title="Active Users"
              value={stats?.activeUsers || 0}
              description="Click to view active users"
              icon={Activity}
            />
          </div>
          <StatCard
            title="Total Orders"
            value={stats?.totalOrders || 0}
            description="All time orders"
            icon={Package}
          />
          <StatCard
            title="Total Formulas"
            value={stats?.totalFormulas || 0}
            description="Custom formulas created"
            icon={Activity}
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats?.totalRevenue || 0)}
            description="All time revenue"
            icon={DollarSign}
          />
        </div>

        {/* Today's Orders */}
        {todaysOrders && todaysOrders.length > 0 && (
          <Card data-testid="card-todays-orders">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Orders
              </CardTitle>
              <CardDescription>
                Orders placed today ({format(new Date(), 'MMMM dd, yyyy')})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todaysOrders.map((order) => (
                  <Card key={order.id} className="hover-elevate cursor-pointer" onClick={() => setLocation(`/admin/users/${order.user.id}`)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium" data-testid={`text-order-user-${order.id}`}>{order.user.name}</p>
                          <p className="text-sm text-muted-foreground">{order.user.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(order.placedAt), 'h:mm a')}
                          </p>
                        </div>
                        <div className="text-right">
                          {order.amountCents && (
                            <p className="font-bold font-mono">${(order.amountCents / 100).toFixed(2)}</p>
                          )}
                          {order.supplyMonths && (
                            <p className="text-sm text-muted-foreground">{order.supplyMonths} month{order.supplyMonths !== 1 ? 's' : ''}</p>
                          )}
                          <Badge variant={order.status === 'pending' ? 'secondary' : 'default'} className="mt-1">
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* User Growth Chart */}
          <Card data-testid="chart-user-growth">
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>
                New users over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Total Users"
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="paidUsers" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      name="Paid Users"
                      dot={{ fill: 'hsl(var(--chart-2))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Daily Orders Chart */}
          <Card data-testid="chart-daily-orders">
            <CardHeader>
              <CardTitle>Daily Orders</CardTitle>
              <CardDescription>
                Orders placed over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Legend />
                    <Bar 
                      dataKey="orders" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Orders"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---- AI Settings Card ----
function AISettingsCard({ onChanged }: { onChanged?: () => void }) {
  const { toast } = useToast();
  const { data: aiSettings, isLoading } = useQuery<{
    provider: 'openai' | 'anthropic';
    model: string;
    source: 'override' | 'env';
    updatedAt: string | null;
  }>({
    queryKey: ['/api/admin/ai-settings'],
  });

  const [provider, setProvider] = useState<'openai' | 'anthropic'>(aiSettings?.provider || 'openai');
  const [model, setModel] = useState<string>(aiSettings?.model || '');

  const MODEL_OPTIONS: Record<'openai' | 'anthropic', { value: string; label: string }[]> = {
    openai: [
      { value: 'gpt-5.2', label: 'GPT-5.2 (latest) 🔥' },
      { value: 'gpt-5.2-pro', label: 'GPT-5.2 Pro' },
      { value: 'gpt-5', label: 'GPT-5' },
      { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
      { value: 'gpt-5-nano', label: 'GPT-5 Nano (fastest)' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'o3', label: 'o3 (reasoning)' },
      { value: 'o3-mini', label: 'o3 Mini' },
      { value: 'o4-mini', label: 'o4 Mini' },
    ],
    anthropic: [
      { value: 'claude-opus-4-5', label: 'Claude Opus 4.5 (most intelligent) 🔥' },
      { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (best for coding)' },
      { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fastest)' },
      { value: 'claude-opus-4-1', label: 'Claude Opus 4.1 (legacy)' },
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (legacy)' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (legacy)' },
    ],
  };

  useEffect(() => {
    if (aiSettings) {
      setProvider(aiSettings.provider);
      setModel(aiSettings.model || '');
    }
  }, [aiSettings]);

  // When provider changes, set a sensible default model for that provider
  useEffect(() => {
    const options = MODEL_OPTIONS[provider];
    if (!options.find(o => o.value === model)) {
      setModel(options[0]?.value || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const mutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await apiRequest('POST', '/api/admin/ai-settings', body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'AI settings updated' });
      onChanged?.();
    },
    onError: (e: any) => {
      toast({ title: 'Failed to update AI settings', description: e?.message || 'Please try again', variant: 'destructive' });
    }
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ai-settings/test');
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        // Return structured info so UI can show better diagnostics
        return { _raw: text, _status: res.status, ok: false } as any;
      }
      return data as { ok: boolean; provider: string; model: string; sample?: string; error?: string };
    },
    onSuccess: (data: any) => {
      if (data && typeof data.ok === 'boolean') {
        if (data.ok) {
          toast({ title: 'AI test succeeded', description: `Using ${data.provider} / ${data.model}` });
        } else {
          toast({ title: 'AI test failed', description: data.error || 'Unknown error', variant: 'destructive' });
        }
      } else {
        const snippet = (data?._raw || '').slice(0, 160) || '(empty body)';
        const status = data?._status ? `HTTP ${data._status}` : 'Unknown status';
        toast({ title: 'AI test response was not JSON', description: `${status}: ${snippet}`, variant: 'destructive' });
      }
    },
    onError: (e: any) => {
      toast({ title: 'AI test failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    }
  });

  const handleSave = () => {
    mutation.mutate({ provider, model });
  };

  const handleReset = () => {
    mutation.mutate({ reset: true });
  };

  return (
    <Card data-testid="card-ai-settings">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            AI Settings
          </CardTitle>
          <CardDescription>
            Control which AI provider and model power consultations (override environment defaults).
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            <span>
              Active: {aiSettings?.provider || 'openai'} / {aiSettings?.model || 'gpt-4o'}
            </span>
          </div>
          <Badge variant={aiSettings?.source === 'override' ? 'default' : 'secondary'}>
            Source: {aiSettings?.source || 'env'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <div className="flex items-center gap-2 justify-end">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 items-end">
            <div className="space-y-1">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(v: 'openai' | 'anthropic') => setProvider(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Model</Label>
              <Select value={model} onValueChange={(v) => setModel(v)}>
                <SelectTrigger>
                  <SelectValue placeholder={provider === 'anthropic' ? 'Select Claude model' : 'Select GPT model'} />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS[provider].map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" onClick={handleReset} disabled={mutation.isPending} data-testid="button-reset-ai-settings">Reset to Defaults</Button>
              <Button variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending} data-testid="button-test-ai-settings">Test Provider</Button>
              <Button onClick={handleSave} disabled={mutation.isPending} data-testid="button-save-ai-settings">Save Changes</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
