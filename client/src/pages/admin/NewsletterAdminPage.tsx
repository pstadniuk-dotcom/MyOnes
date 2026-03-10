import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest } from '@/shared/lib/queryClient';
import { useState, useMemo } from 'react';
import {
  Mail, Users, UserCheck, UserX, Search, ToggleLeft, Download, RefreshCw, Loader2,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';

interface Subscriber {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
}

export default function NewsletterAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: subscribers, isLoading } = useQuery<Subscriber[]>({
    queryKey: ['/api/admin/newsletter'],
    queryFn: async () => { const res = await apiRequest('GET', '/api/admin/newsletter'); return res.json(); },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest('PATCH', `/api/admin/newsletter/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/newsletter'] });
      toast({ title: 'Subscriber Updated' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update subscriber', variant: 'destructive' }),
  });

  const filtered = useMemo(() => {
    if (!subscribers) return [];
    if (!search.trim()) return subscribers;
    const q = search.toLowerCase();
    return subscribers.filter(s => s.email.toLowerCase().includes(q));
  }, [subscribers, search]);

  const stats = useMemo(() => {
    if (!subscribers) return { total: 0, active: 0, inactive: 0 };
    return {
      total: subscribers.length,
      active: subscribers.filter(s => s.isActive).length,
      inactive: subscribers.filter(s => !s.isActive).length,
    };
  }, [subscribers]);

  const exportCsv = () => {
    if (!filtered.length) return;
    const header = 'email,status,subscribed_at\n';
    const rows = filtered.map(s => `${s.email},${s.isActive ? 'active' : 'inactive'},${s.subscribedAt}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'newsletter-subscribers.csv';
    a.click();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6 text-violet-500" />
          Newsletter Subscribers
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your newsletter mailing list
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-slate-500">Total Subscribers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <UserX className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold">{stats.inactive}</p>
              <p className="text-xs text-slate-500">Unsubscribed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            className="pl-8"
            placeholder="Search by email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/newsletter'] })}
        >
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Subscribed</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(sub => (
              <TableRow key={sub.id}>
                <TableCell className="font-medium">{sub.email}</TableCell>
                <TableCell>
                  {sub.isActive ? (
                    <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {new Date(sub.subscribedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant={sub.isActive ? 'destructive' : 'default'}
                    onClick={() => toggleMutation.mutate({ id: sub.id, isActive: !sub.isActive })}
                    disabled={toggleMutation.isPending}
                  >
                    {toggleMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : sub.isActive ? (
                      <><UserX className="h-3 w-3 mr-1" /> Deactivate</>
                    ) : (
                      <><UserCheck className="h-3 w-3 mr-1" /> Reactivate</>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                  {search ? 'No subscribers match your search.' : 'No newsletter subscribers yet.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
