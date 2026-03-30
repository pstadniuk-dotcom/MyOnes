import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import {
  Globe,
  Users,
  DollarSign,
  TrendingUp,
  Share2,
  Megaphone,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DateRangePicker } from '@/shared/components/ui/date-range-picker';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest } from '@/shared/lib/queryClient';

interface TrafficSource {
  channel: string;
  count: number;
  paidCount: number;
  revenue: number;
}

interface UtmCampaign {
  campaign: string;
  source: string;
  medium: string;
  signups: number;
  orders: number;
  revenue: number;
}

interface ReferralStats {
  totalReferrers: number;
  totalReferred: number;
  topReferrers: Array<{
    userId: string;
    name: string;
    email: string;
    referralCode: string;
    referralCount: number;
    revenueGenerated: number;
  }>;
}

interface Campaign {
  id: string;
  name: string;
  channel: string;
  utmCampaign: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  budgetCents: number | null;
  notes: string | null;
  createdAt: string;
}

const CHANNEL_COLORS: Record<string, string> = {
  direct: '#6b7280',
  organic: '#059669',
  social: '#8b5cf6',
  paid: '#ef4444',
  referral: '#f59e0b',
  email: '#3b82f6',
  podcast: '#ec4899',
};

const CHANNEL_LABELS: Record<string, string> = {
  direct: 'Direct',
  organic: 'Organic',
  social: 'Social',
  paid: 'Paid Ads',
  referral: 'Referral',
  email: 'Email',
  podcast: 'Podcast',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

export default function TrafficSourcesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [createDialog, setCreateDialog] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', channel: 'email', utmCampaign: '', status: 'draft', notes: '' });

  const days = Math.max(1, Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)));

  const { data: sources, isLoading: sourcesLoading } = useQuery<TrafficSource[]>({
    queryKey: [`/api/admin/analytics/traffic-sources?days=${days}`],
  });

  const { data: utmCampaigns } = useQuery<UtmCampaign[]>({
    queryKey: [`/api/admin/analytics/utm-campaigns?days=${days}`],
  });

  const { data: referralStats } = useQuery<ReferralStats>({
    queryKey: ['/api/admin/analytics/referrals'],
  });

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ['/api/admin/campaigns'],
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: typeof newCampaign) => {
      const res = await apiRequest('POST', '/api/admin/campaigns', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/campaigns'] });
      setCreateDialog(false);
      setNewCampaign({ name: '', channel: 'email', utmCampaign: '', status: 'draft', notes: '' });
      toast({ title: 'Campaign created' });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/campaigns'] });
      toast({ title: 'Campaign deleted' });
    },
  });

  const totalSignups = sources?.reduce((sum, s) => sum + s.count, 0) || 0;
  const totalRevenue = sources?.reduce((sum, s) => sum + s.revenue, 0) || 0;
  const totalPaid = sources?.reduce((sum, s) => sum + s.paidCount, 0) || 0;

  const pieData = sources?.map(s => ({
    name: CHANNEL_LABELS[s.channel] || s.channel,
    value: s.count,
    fill: CHANNEL_COLORS[s.channel] || '#9ca3af',
  })) || [];

  if (sourcesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="h-5 w-5" /> Traffic & Attribution
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Understand where your users come from and which channels drive revenue.
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Total Signups</p>
            <p className="text-2xl font-semibold mt-1">{totalSignups}</p>
            <p className="text-xs text-gray-400">Last {days} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500 flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Attributed Revenue</p>
            <p className="text-2xl font-semibold mt-1">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-gray-400">From {days}d signups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Conversion Rate</p>
            <p className="text-2xl font-semibold mt-1">{totalSignups > 0 ? Math.round((totalPaid / totalSignups) * 100) : 0}%</p>
            <p className="text-xs text-gray-400">Signup to purchase</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-gray-500 flex items-center gap-1.5"><Share2 className="h-3.5 w-3.5" /> Referrals</p>
            <p className="text-2xl font-semibold mt-1">{referralStats?.totalReferred || 0}</p>
            <p className="text-xs text-gray-400">From {referralStats?.totalReferrers || 0} referrers</p>
          </CardContent>
        </Card>
      </div>

      {/* Channel Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signups by Channel</CardTitle>
            <CardDescription>Last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sources || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis type="category" dataKey="channel" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => CHANNEL_LABELS[v] || v} width={80} />
                  <Tooltip formatter={(value: number) => [value, 'Signups']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(sources || []).map((entry) => (
                      <Cell key={entry.channel} fill={CHANNEL_COLORS[entry.channel] || '#9ca3af'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channel Distribution</CardTitle>
            <CardDescription>Proportion of signups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Channel Performance</CardTitle>
          <CardDescription>Signups, conversions, and revenue per channel</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Signups</TableHead>
                <TableHead className="text-right">Customers</TableHead>
                <TableHead className="text-right">Conv. Rate</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Revenue/User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sources || []).map((s) => (
                <TableRow key={s.channel}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[s.channel] || '#9ca3af' }} />
                      {CHANNEL_LABELS[s.channel] || s.channel}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{s.count}</TableCell>
                  <TableCell className="text-right">{s.paidCount}</TableCell>
                  <TableCell className="text-right">{s.count > 0 ? Math.round((s.paidCount / s.count) * 100) : 0}%</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.revenue)}</TableCell>
                  <TableCell className="text-right">{s.count > 0 ? formatCurrency(s.revenue / s.count) : '$0'}</TableCell>
                </TableRow>
              ))}
              {(!sources || sources.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No traffic data yet. Users who sign up with UTM parameters will appear here.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* UTM Campaigns */}
      {utmCampaigns && utmCampaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">UTM Campaign Performance</CardTitle>
            <CardDescription>Individual campaign tracking via utm_campaign parameter</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Medium</TableHead>
                  <TableHead className="text-right">Signups</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {utmCampaigns.map((c) => (
                  <TableRow key={c.campaign}>
                    <TableCell className="font-medium">{c.campaign}</TableCell>
                    <TableCell><Badge variant="outline">{c.source}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{c.medium}</Badge></TableCell>
                    <TableCell className="text-right">{c.signups}</TableCell>
                    <TableCell className="text-right">{c.orders}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Referral Leaderboard */}
      {referralStats && referralStats.topReferrers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Referrers</CardTitle>
            <CardDescription>{referralStats.totalReferred} total referrals from {referralStats.totalReferrers} users</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Referral Code</TableHead>
                  <TableHead className="text-right">Referrals</TableHead>
                  <TableHead className="text-right">Revenue Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralStats.topReferrers.map((r) => (
                  <TableRow key={r.userId}>
                    <TableCell>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-gray-500">{r.email}</p>
                    </TableCell>
                    <TableCell><code className="text-xs bg-gray-100 px-2 py-1 rounded">{r.referralCode}</code></TableCell>
                    <TableCell className="text-right">{r.referralCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.revenueGenerated)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Marketing Campaigns */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4" /> Marketing Campaigns</CardTitle>
              <CardDescription>Track and manage marketing campaigns</CardDescription>
            </div>
            <Button size="sm" onClick={() => setCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>UTM Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!campaigns || campaigns.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No campaigns yet. Create one to start tracking.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><Badge variant="outline">{c.channel}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{c.utmCampaign || '-'}</TableCell>
                    <TableCell>
                      <Badge className={
                        c.status === 'active' ? 'bg-green-100 text-green-700' :
                        c.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                        c.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                        'bg-blue-100 text-blue-700'
                      }>{c.status}</Badge>
                    </TableCell>
                    <TableCell>{c.budgetCents ? formatCurrency(c.budgetCents / 100) : '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteCampaignMutation.mutate(c.id)}>
                        <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Campaign Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Marketing Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Campaign Name</label>
              <Input
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                placeholder="e.g. Spring Launch 2026"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Channel</label>
              <Select value={newCampaign.channel} onValueChange={(v) => setNewCampaign({ ...newCampaign, channel: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="paid">Paid Ads</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="podcast">Podcast</SelectItem>
                  <SelectItem value="influencer">Influencer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">UTM Campaign Tag</label>
              <Input
                value={newCampaign.utmCampaign}
                onChange={(e) => setNewCampaign({ ...newCampaign, utmCampaign: e.target.value })}
                placeholder="e.g. spring-launch-2026"
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">This maps to ?utm_campaign= in your links</p>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={newCampaign.notes}
                onChange={(e) => setNewCampaign({ ...newCampaign, notes: e.target.value })}
                placeholder="Internal notes..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createCampaignMutation.mutate(newCampaign)}
              disabled={!newCampaign.name || createCampaignMutation.isPending}
            >
              {createCampaignMutation.isPending ? 'Creating...' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
