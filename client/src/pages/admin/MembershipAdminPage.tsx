import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest } from '@/shared/lib/queryClient';
import { useState } from 'react';
import {
  Users, Crown, TrendingUp, DollarSign, Shield, Loader2, RefreshCw,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';

interface MembershipTier {
  id: string;
  tierKey: string;
  name: string;
  priceCents: number;
  maxCapacity: number | null;
  currentCount: number;
  isActive: boolean;
  benefits: any;
}

interface MembershipStats {
  tiers: MembershipTier[];
  totalMembers: number;
  revenue: { monthly: number };
}

interface TierUser {
  id: string;
  name: string;
  email: string;
  membershipTier: string;
  membershipLockedAt: string;
  createdAt: string;
}

export default function MembershipAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);
  const [editForm, setEditForm] = useState({ name: '', priceCents: 0, maxCapacity: 0, isActive: true });

  const { data: stats, isLoading } = useQuery<MembershipStats>({
    queryKey: ['/api/membership/admin/stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/membership/admin/stats');
      return res.json();
    },
  });

  const { data: tierUsers, isLoading: usersLoading } = useQuery<TierUser[]>({
    queryKey: ['/api/membership/admin/users', selectedTier],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/membership/admin/users/${selectedTier}`);
      return res.json();
    },
    enabled: !!selectedTier,
  });

  const updateTierMutation = useMutation({
    mutationFn: async (data: { tierKey: string; updates: any }) => {
      const res = await apiRequest('POST', '/api/membership/admin/tiers', {
        tierKey: data.tierKey,
        ...data.updates,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/membership/admin/stats'] });
      setEditingTier(null);
      toast({ title: 'Tier Updated', description: 'Membership tier has been updated.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update tier.', variant: 'destructive' });
    },
  });

  const seedTiersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/membership/admin/seed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/membership/admin/stats'] });
      toast({ title: 'Tiers Seeded', description: 'Default membership tiers have been created.' });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const tiers = stats?.tiers || [];

  const startEdit = (tier: MembershipTier) => {
    setEditingTier(tier);
    setEditForm({
      name: tier.name,
      priceCents: tier.priceCents,
      maxCapacity: tier.maxCapacity || 0,
      isActive: tier.isActive,
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" />
            Membership Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage membership tiers, capacity, and subscriber roster
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/membership/admin/stats'] })}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          {tiers.length === 0 && (
            <Button onClick={() => seedTiersMutation.mutate()} disabled={seedTiersMutation.isPending}>
              {seedTiersMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Seed Default Tiers
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Members</p>
                <p className="text-2xl font-bold">{stats?.totalMembers || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Monthly Revenue</p>
                <p className="text-2xl font-bold">${((stats?.revenue?.monthly || 0) / 100).toFixed(0)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Tiers</p>
                <p className="text-2xl font-bold">{tiers.filter(t => t.isActive).length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-violet-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Near-Capacity Tiers</p>
                <p className="text-2xl font-bold">
                  {tiers.filter(t => t.maxCapacity && t.currentCount / t.maxCapacity > 0.8).length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Table */}
      <Card>
        <CardHeader>
          <CardTitle>Membership Tiers</CardTitle>
          <CardDescription>Click a tier name to view its members</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Fill Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map(tier => {
                const fillRate = tier.maxCapacity ? Math.round((tier.currentCount / tier.maxCapacity) * 100) : null;
                const isEditing = editingTier?.tierKey === tier.tierKey;

                return (
                  <TableRow key={tier.tierKey} className={selectedTier === tier.tierKey ? 'bg-slate-50' : ''}>
                    <TableCell>
                      <button
                        className="font-medium text-blue-600 hover:underline text-left"
                        onClick={() => setSelectedTier(selectedTier === tier.tierKey ? null : tier.tierKey)}
                      >
                        {isEditing ? (
                          <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-40" />
                        ) : tier.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="relative w-28">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input type="number" step={0.01} min={0} value={((editForm.priceCents || 0) / 100).toFixed(2)} onChange={e => setEditForm(f => ({ ...f, priceCents: Math.round(Number(e.target.value) * 100) }))} className="w-28 pl-7" />
                        </div>
                      ) : `$${(tier.priceCents / 100).toFixed(2)}/mo`}
                    </TableCell>
                    <TableCell className="font-semibold">{tier.currentCount}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input type="number" value={editForm.maxCapacity} onChange={e => setEditForm(f => ({ ...f, maxCapacity: Number(e.target.value) }))} className="w-24" />
                      ) : (tier.maxCapacity ? tier.maxCapacity.toLocaleString() : '∞')}
                    </TableCell>
                    <TableCell>
                      {fillRate !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${fillRate >= 90 ? 'bg-red-500' : fillRate >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(fillRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{fillRate}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tier.isActive ? 'default' : 'secondary'}>
                        {tier.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => updateTierMutation.mutate({
                            tierKey: tier.tierKey,
                            updates: editForm,
                          })} disabled={updateTierMutation.isPending}>
                            {updateTierMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingTier(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => startEdit(tier)}>Edit</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {tiers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No membership tiers configured. Click "Seed Default Tiers" to create the initial tiers.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tier Members */}
      {selectedTier && (
        <Card>
          <CardHeader>
            <CardTitle>
              {tiers.find(t => t.tierKey === selectedTier)?.name || selectedTier} Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : tierUsers && tierUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined Tier</TableHead>
                    <TableHead>Signup</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tierUsers.map((user: TierUser) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.membershipLockedAt ? new Date(user.membershipLockedAt).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-4 text-slate-400">No members in this tier yet.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
