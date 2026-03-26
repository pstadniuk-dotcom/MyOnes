import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { useLocation } from 'wouter';
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Send,
  Search,
  User,
  Calendar,
  Tag,
  ChevronRight,
  CheckSquare,
  BarChart3,
  AlertTriangle,
  Timer,
  UserCheck,
  X,
  Plus,
  ArrowUpDown,
  Inbox,
  History,
  Trash2,
  RefreshCw,
  Bot,
  Sparkles,
  Edit3,
  XCircle,
  Play,
  HelpCircle,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { apiRequest } from '@/shared/lib/queryClient';
import { cn } from '@/shared/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────

interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string | null;
  adminNotes: string | null;
  tags: string[];
  source: string;
  firstResponseAt: string | null;
  slaDeadline: string | null;
  slaBreached: boolean;
  mergedIntoId: string | null;
  responseCount: number;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  userName: string;
  userEmail: string;
}

interface SupportTicketResponse {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
}

interface ActivityLogEntry {
  action: string;
  oldValue: string | null;
  newValue: string | null;
  metadata: string | null;
  createdAt: string;
  userName: string | null;
}

interface SupportTicketDetails {
  ticket: SupportTicket;
  responses: SupportTicketResponse[];
  user: { id: string; name: string; email: string } | null;
  activityLog: ActivityLogEntry[];
}

interface TicketMetrics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  slaBreachedCount: number;
  ticketsByCategory: Array<{ category: string; count: number }>;
  ticketsByPriority: Array<{ priority: string; count: number }>;
  ticketsPerDay: Array<{ date: string; count: number }>;
  topAssignees: Array<{ assignedTo: string; count: number; resolved: number }>;
}

interface FilterOptions {
  categories: string[];
  tags: string[];
  admins: Array<{ id: string; name: string; email: string }>;
}

// ── Config ─────────────────────────────────────────────────────────────

const statusConfig = {
  open: { icon: AlertCircle, color: 'bg-red-100 text-red-700 border-red-200', dotColor: 'bg-red-500', label: 'Open' },
  in_progress: { icon: Clock, color: 'bg-amber-100 text-amber-700 border-amber-200', dotColor: 'bg-amber-500', label: 'In Progress' },
  resolved: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500', label: 'Resolved' },
  closed: { icon: CheckCircle2, color: 'bg-slate-100 text-slate-700 border-slate-200', dotColor: 'bg-slate-400', label: 'Closed' },
};

const priorityConfig = {
  low: { color: 'bg-slate-100 text-slate-600', label: 'Low', weight: 0 },
  medium: { color: 'bg-blue-100 text-blue-600', label: 'Normal', weight: 1 },
  high: { color: 'bg-orange-100 text-orange-600', label: 'High', weight: 2 },
  urgent: { color: 'bg-red-100 text-red-600', label: 'Urgent', weight: 3 },
};

const invalidateTickets = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({
    predicate: (query) =>
      typeof query.queryKey[0] === 'string' &&
      (query.queryKey[0] as string).startsWith('/api/admin/support-tickets'),
  });
};

// ── SLA helpers ────────────────────────────────────────────────────────

function SlaIndicator({ deadline, breached }: { deadline: string | null; breached: boolean }) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const overdue = isPast(d);
  if (breached || overdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
        <AlertTriangle className="h-3 w-3" />
        SLA breached
      </span>
    );
  }
  const remaining = formatDistanceToNow(d);
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
      <Timer className="h-3 w-3" />
      {remaining} left
    </span>
  );
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

// ── Metrics Dashboard ──────────────────────────────────────────────────

function MetricsDashboard() {
  const { data: metrics, isLoading } = useQuery<TicketMetrics>({
    queryKey: ['/api/admin/support-tickets/metrics'],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (!metrics) return null;

  const kpis = [
    { label: 'Open', value: metrics.openTickets, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'In Progress', value: metrics.inProgressTickets, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Resolved', value: metrics.resolvedTickets, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total (30d)', value: metrics.totalTickets, color: 'text-slate-700', bg: 'bg-slate-50' },
    { label: 'Avg First Response', value: formatMinutes(metrics.avgFirstResponseMinutes), color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Avg Resolution', value: formatMinutes(metrics.avgResolutionMinutes), color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'SLA Breached', value: metrics.slaBreachedCount, color: metrics.slaBreachedCount > 0 ? 'text-red-600' : 'text-emerald-600', bg: metrics.slaBreachedCount > 0 ? 'bg-red-50' : 'bg-emerald-50' },
    { label: 'Resolution Rate', value: metrics.totalTickets > 0 ? `${Math.round(((metrics.resolvedTickets + metrics.closedTickets) / metrics.totalTickets) * 100)}%` : '—', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`${kpi.bg} rounded-lg p-3 border`}>
            <div className="text-xs font-medium text-slate-500 mb-1">{kpi.label}</div>
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Category & Assignee breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.ticketsByCategory.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-medium">By Category</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-1.5">
                {metrics.ticketsByCategory.slice(0, 8).map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-slate-600 truncate">{c.category}</span>
                    <Badge variant="secondary" className="text-xs ml-2">{c.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {metrics.topAssignees.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-medium">Top Assignees</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-1.5">
                {metrics.topAssignees.map((a) => (
                  <div key={a.assignedTo} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 truncate">{a.assignedTo}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400">{a.resolved}/{a.count} resolved</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Ticket Queue (List View) ───────────────────────────────────────────

function SupportTicketList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedToFilter, setAssignedToFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showMetrics, setShowMetrics] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // Build query string
  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (statusFilter !== 'all') p.set('status', statusFilter);
    if (priorityFilter !== 'all') p.set('priority', priorityFilter);
    if (assignedToFilter !== 'all') p.set('assignedTo', assignedToFilter);
    if (categoryFilter !== 'all') p.set('category', categoryFilter);
    if (searchQuery) p.set('search', searchQuery);
    p.set('sortBy', sortBy);
    p.set('sortOrder', sortOrder);
    p.set('limit', '100');
    return p.toString();
  }, [statusFilter, priorityFilter, assignedToFilter, categoryFilter, searchQuery, sortBy, sortOrder]);

  const queryKey = `/api/admin/support-tickets?${queryParams}`;

  const { data, isLoading, refetch } = useQuery<{ tickets: SupportTicket[]; total: number }>({
    queryKey: [queryKey],
    refetchInterval: 30000, // Auto-refresh every 30s for real-time feel
  });

  const { data: filterOptions } = useQuery<FilterOptions>({
    queryKey: ['/api/admin/support-tickets/filter-options'],
    staleTime: 5 * 60 * 1000,
  });

  const tickets = data?.tickets || [];
  const total = data?.total || 0;

  // Quick status counts from current result
  const statusCounts = useMemo(() => ({
    all: total,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    sla_breached: tickets.filter(t => t.slaBreached || (t.slaDeadline && isPast(new Date(t.slaDeadline)))).length,
  }), [tickets, total]);

  // Multi-select
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === tickets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tickets.map(t => t.id)));
    }
  }, [selectedIds, tickets]);

  // Bulk mutations
  const bulkClose = useMutation({
    mutationFn: (ids: string[]) => apiRequest('POST', '/api/admin/support-tickets/bulk-close', { ids }),
    onSuccess: (_, ids) => {
      toast({ title: `${ids.length} ticket${ids.length > 1 ? 's' : ''} closed` });
      setSelectedIds(new Set());
      invalidateTickets(queryClient);
    },
  });

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => apiRequest('POST', '/api/admin/support-tickets/bulk-delete', { ids }),
    onSuccess: (_, ids) => {
      toast({ title: `${ids.length} ticket${ids.length > 1 ? 's' : ''} deleted` });
      setSelectedIds(new Set());
      invalidateTickets(queryClient);
    },
  });

  const bulkUpdate = useMutation({
    mutationFn: (payload: { ids: string[]; updates: Record<string, any> }) =>
      apiRequest('POST', '/api/admin/support-tickets/bulk-update', payload),
    onSuccess: () => {
      toast({ title: 'Tickets updated' });
      setSelectedIds(new Set());
      invalidateTickets(queryClient);
    },
  });

  const handleBulkClose = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Close ${selectedIds.size} ticket${selectedIds.size > 1 ? 's' : ''}?`)) return;
    bulkClose.mutate(Array.from(selectedIds));
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Permanently delete ${selectedIds.size} ticket${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    bulkDelete.mutate(Array.from(selectedIds));
  };

  const handleBulkAssign = (assignedTo: string) => {
    bulkUpdate.mutate({ ids: Array.from(selectedIds), updates: { assignedTo: assignedTo === 'unassign' ? null : assignedTo } });
  };

  const handleBulkPriority = (priority: string) => {
    bulkUpdate.mutate({ ids: Array.from(selectedIds), updates: { priority } });
  };

  const handleBulkStatus = (status: string) => {
    bulkUpdate.mutate({ ids: Array.from(selectedIds), updates: { status } });
  };

  // Keyboard shortcut: Escape to exit select mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectMode) {
        setSelectMode(false);
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectMode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Support Queue</h1>
              <p className="text-sm text-slate-500">{total} total tickets</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setShowMetrics(!showMetrics)}>
                <BarChart3 className="h-4 w-4 mr-1" />
                {showMetrics ? 'Hide Metrics' : 'Metrics'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button
                variant={selectMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                {selectMode ? 'Exit Select' : 'Select'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
        {/* Metrics Dashboard (collapsible) */}
        {showMetrics && <MetricsDashboard />}

        {/* Status Tab Bar */}
        <div className="flex items-center gap-1 mb-4 bg-white rounded-lg border p-1 overflow-x-auto">
          {[
            { key: 'all', label: 'All', count: statusCounts.all },
            { key: 'open', label: 'Open', count: statusCounts.open, dot: 'bg-red-500' },
            { key: 'in_progress', label: 'In Progress', count: statusCounts.in_progress, dot: 'bg-amber-500' },
            { key: 'resolved', label: 'Resolved', count: statusCounts.resolved, dot: 'bg-emerald-500' },
            { key: 'closed', label: 'Closed', count: statusCounts.closed, dot: 'bg-slate-400' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                statusFilter === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot}`} />}
              {tab.label}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                statusFilter === tab.key ? 'bg-white/20' : 'bg-slate-100'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search tickets, users, emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>

              {/* Priority */}
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Category */}
              {filterOptions?.categories && filterOptions.categories.length > 0 && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {filterOptions.categories.map(c => (
                      <SelectItem key={c} value={c}><span className="capitalize">{c}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Assigned To */}
              {filterOptions?.admins && filterOptions.admins.length > 0 && (
                <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {filterOptions.admins.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Sort */}
              <Select value={`${sortBy}:${sortOrder}`} onValueChange={(v) => {
                const [field, order] = v.split(':');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}>
                <SelectTrigger className="w-[160px] h-9">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt:desc">Newest first</SelectItem>
                  <SelectItem value="createdAt:asc">Oldest first</SelectItem>
                  <SelectItem value="lastActivityAt:desc">Recent activity</SelectItem>
                  <SelectItem value="priority:desc">Priority (high → low)</SelectItem>
                  <SelectItem value="priority:asc">Priority (low → high)</SelectItem>
                  <SelectItem value="slaDeadline:asc">SLA deadline</SelectItem>
                  <SelectItem value="updatedAt:desc">Recently updated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Action Bar */}
        {selectMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-slate-800 rounded-lg text-white shadow-lg flex-wrap">
            <Checkbox
              checked={selectedIds.size === tickets.length && tickets.length > 0}
              onCheckedChange={toggleSelectAll}
              className="border-white data-[state=checked]:bg-white data-[state=checked]:text-slate-900"
            />
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <span className="text-slate-400">|</span>

            {/* Bulk Status */}
            <Select onValueChange={handleBulkStatus}>
              <SelectTrigger className="w-[120px] h-8 bg-slate-700 border-slate-600 text-white text-xs">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            {/* Bulk Priority */}
            <Select onValueChange={handleBulkPriority}>
              <SelectTrigger className="w-[120px] h-8 bg-slate-700 border-slate-600 text-white text-xs">
                <SelectValue placeholder="Set priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            {/* Bulk Assign */}
            {filterOptions?.admins && filterOptions.admins.length > 0 && (
              <Select onValueChange={handleBulkAssign}>
                <SelectTrigger className="w-[130px] h-8 bg-slate-700 border-slate-600 text-white text-xs">
                  <SelectValue placeholder="Assign to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassign">Unassign</SelectItem>
                  {filterOptions.admins.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button variant="secondary" size="sm" onClick={handleBulkClose} className="h-8 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Close
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-8 text-xs">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          </div>
        )}

        {/* Select-all row when in select mode */}
        {selectMode && tickets.length > 0 && selectedIds.size === 0 && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-slate-100 rounded-lg border text-sm">
            <Checkbox onCheckedChange={toggleSelectAll} />
            <span className="text-slate-500">Select all {tickets.length} tickets</span>
          </div>
        )}

        {/* Ticket List */}
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Inbox className="h-16 w-16 mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">No tickets found</h3>
              <p className="text-slate-400 text-sm">
                {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'No support tickets yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => {
              const status = statusConfig[ticket.status] ?? statusConfig.open;
              const priority = priorityConfig[ticket.priority] ?? priorityConfig.medium;
              const StatusIcon = status.icon;
              const isSelected = selectedIds.has(ticket.id);
              const hasUnreadActivity = !ticket.firstResponseAt && ticket.status === 'open';

              return (
                <div
                  key={ticket.id}
                  className={cn(
                    'group bg-white rounded-lg border p-3 md:p-4 cursor-pointer hover:shadow-sm hover:border-slate-300 transition-all',
                    isSelected && 'border-blue-300 bg-blue-50/50 shadow-sm',
                    hasUnreadActivity && 'border-l-4 border-l-red-400',
                  )}
                  onClick={() => selectMode ? toggleSelect(ticket.id) : setLocation(`/admin/support-tickets/${ticket.id}`)}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    {selectMode && (
                      <div className="mt-0.5 shrink-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(ticket.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}

                    {/* Priority dot */}
                    <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5 shrink-0', status.dotColor)} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: title + meta */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className={cn(
                              'font-semibold text-slate-900 truncate',
                              hasUnreadActivity && 'font-bold'
                            )}>
                              {ticket.subject}
                            </h3>
                            <Badge className={`${priority.color} text-xs shrink-0`}>{priority.label}</Badge>
                            {ticket.tags?.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs shrink-0">
                                <Tag className="h-2.5 w-2.5 mr-0.5" />{tag}
                              </Badge>
                            ))}
                          </div>

                          <p className="text-sm text-slate-500 line-clamp-1 mb-2">{ticket.description}</p>

                          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {ticket.userName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                            </span>
                            <span className="capitalize">{ticket.category}</span>
                            {ticket.responseCount > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {ticket.responseCount}
                              </span>
                            )}
                            {ticket.assignedTo && (
                              <span className="flex items-center gap-1">
                                <UserCheck className="h-3 w-3" />
                                <span className="truncate max-w-[80px]">
                                  {filterOptions?.admins?.find(a => a.id === ticket.assignedTo)?.name || 'Assigned'}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: status + SLA */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <Badge className={`${status.color} border text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                          <SlaIndicator deadline={ticket.slaDeadline} breached={ticket.slaBreached} />
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 mt-1 hidden md:block" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Ticket Detail View ─────────────────────────────────────────────────

function SupportTicketDetailView({ ticketId }: { ticketId: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyMessage, setReplyMessage] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState('conversation');

  const { data, isLoading } = useQuery<SupportTicketDetails>({
    queryKey: [`/api/admin/support-tickets/${ticketId}`],
  });

  const { data: filterOptions } = useQuery<FilterOptions>({
    queryKey: ['/api/admin/support-tickets/filter-options'],
    staleTime: 5 * 60 * 1000,
  });

  const updateTicket = useMutation({
    mutationFn: (updates: Record<string, any>) =>
      apiRequest('PATCH', `/api/admin/support-tickets/${ticketId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/support-tickets/${ticketId}`] });
      invalidateTickets(queryClient);
      toast({ title: 'Ticket updated' });
    },
    onError: () => {
      toast({ title: 'Failed to update ticket', variant: 'destructive' });
    }
  });

  const sendReply = useMutation({
    mutationFn: (message: string) =>
      apiRequest('POST', `/api/admin/support-tickets/${ticketId}/reply`, { message }),
    onSuccess: () => {
      setReplyMessage('');
      queryClient.invalidateQueries({ queryKey: [`/api/admin/support-tickets/${ticketId}`] });
      invalidateTickets(queryClient);
      toast({ title: 'Reply sent' });
    },
    onError: () => {
      toast({ title: 'Failed to send reply', variant: 'destructive' });
    }
  });

  const addTag = useMutation({
    mutationFn: (tag: string) =>
      apiRequest('POST', `/api/admin/support-tickets/${ticketId}/tags`, { tag }),
    onSuccess: () => {
      setNewTag('');
      queryClient.invalidateQueries({ queryKey: [`/api/admin/support-tickets/${ticketId}`] });
    },
  });

  const removeTag = useMutation({
    mutationFn: (tag: string) =>
      apiRequest('DELETE', `/api/admin/support-tickets/${ticketId}/tags`, { tag }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/support-tickets/${ticketId}`] });
    },
  });

  // Keyboard shortcut: Ctrl+Enter to send reply
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && replyMessage.trim()) {
        sendReply.mutate(replyMessage);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [replyMessage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-64" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700">Ticket not found</h3>
              <Button variant="outline" className="mt-4" onClick={() => setLocation('/admin/support-tickets')}>
                Back to Queue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { ticket, responses, user, activityLog } = data;
  const status = statusConfig[ticket.status] ?? statusConfig.open;
  const priority = priorityConfig[ticket.priority] ?? priorityConfig.medium;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/admin/support-tickets')}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Queue
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 mb-1">{ticket.subject}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {user?.name || 'Unknown'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-400">{user?.email}</span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}
                </span>
                <SlaIndicator deadline={ticket.slaDeadline} breached={ticket.slaBreached} />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge className={`${status.color} border`}>{status.label}</Badge>
              <Badge className={priority.color}>{priority.label}</Badge>
              {ticket.source !== 'web' && (
                <Badge variant="outline" className="text-xs capitalize">{ticket.source}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Original Message */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Original Message</CardTitle>
                  <span className="text-xs text-slate-400">
                    {format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
              </CardContent>
            </Card>

            {/* Tabs: Conversation / Activity */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="conversation" className="text-sm">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Conversation ({responses.length})
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-sm">
                  <History className="h-4 w-4 mr-1" />
                  Activity ({activityLog?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="conversation" className="mt-3">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    {responses.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No responses yet — be the first to reply</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {responses.map((response) => (
                          <div
                            key={response.id}
                            className={cn(
                              'p-3 rounded-lg',
                              response.isStaff
                                ? 'bg-blue-50 border-l-4 border-blue-400'
                                : 'bg-slate-50 border-l-4 border-slate-300'
                            )}
                          >
                            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                              <Badge variant={response.isStaff ? 'default' : 'secondary'} className="text-xs">
                                {response.isStaff ? 'Support Team' : 'User'}
                              </Badge>
                              <span className="text-xs text-slate-400">
                                {format(new Date(response.createdAt), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{response.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Form */}
                    <div className="pt-3 border-t space-y-2">
                      <Textarea
                        placeholder="Type your response... (Ctrl+Enter to send)"
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        rows={3}
                        className="resize-none text-sm"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Visible to user • Email notification will be sent</span>
                        <Button
                          onClick={() => sendReply.mutate(replyMessage)}
                          disabled={!replyMessage.trim() || sendReply.isPending}
                          size="sm"
                        >
                          <Send className="h-3.5 w-3.5 mr-1" />
                          {sendReply.isPending ? 'Sending...' : 'Send Reply'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="mt-3">
                <Card>
                  <CardContent className="p-4">
                    {(!activityLog || activityLog.length === 0) ? (
                      <div className="text-center py-8 text-slate-400">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No activity recorded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activityLog.map((entry, i) => (
                          <div key={i} className="flex items-start gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-700">{entry.userName || 'System'}</span>
                                <span className="text-slate-500">
                                  {entry.action === 'status_change' && `changed status from "${entry.oldValue}" to "${entry.newValue}"`}
                                  {entry.action === 'priority_change' && `changed priority from "${entry.oldValue}" to "${entry.newValue}"`}
                                  {entry.action === 'assignment' && `assigned to ${entry.newValue === 'unassigned' ? 'nobody' : entry.newValue}`}
                                  {entry.action === 'reply' && 'sent a reply'}
                                  {entry.action === 'tag_add' && `added tag "${entry.newValue}"`}
                                  {entry.action === 'tag_remove' && `removed tag "${entry.oldValue}"`}
                                  {entry.action === 'note' && 'updated internal notes'}
                                  {!['status_change', 'priority_change', 'assignment', 'reply', 'tag_add', 'tag_remove', 'note'].includes(entry.action) && entry.action}
                                </span>
                              </div>
                              <span className="text-xs text-slate-400">
                                {format(new Date(entry.createdAt), 'MMM d, h:mm a')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Ticket Controls */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-medium">Ticket Details</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-3">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Status</Label>
                  <Select value={ticket.status} onValueChange={(v) => updateTicket.mutate({ status: v })}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" />Open</span>
                      </SelectItem>
                      <SelectItem value="in_progress">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" />In Progress</span>
                      </SelectItem>
                      <SelectItem value="resolved">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" />Resolved</span>
                      </SelectItem>
                      <SelectItem value="closed">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-400" />Closed</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Priority</Label>
                  <Select value={ticket.priority} onValueChange={(v) => updateTicket.mutate({ priority: v })}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Assigned To</Label>
                  <Select
                    value={ticket.assignedTo || 'unassigned'}
                    onValueChange={(v) => updateTicket.mutate({ assignedTo: v === 'unassigned' ? null : v })}
                  >
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        <span className="text-slate-400">Unassigned</span>
                      </SelectItem>
                      {filterOptions?.admins?.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          <span className="flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />{a.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Category</Label>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md border text-sm capitalize">
                    <Tag className="h-3.5 w-3.5 text-slate-400" />
                    {ticket.category}
                  </div>
                </div>

                {/* SLA Info */}
                {ticket.slaDeadline && (
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">SLA Deadline</Label>
                    <div className="text-sm text-slate-600">
                      {format(new Date(ticket.slaDeadline), 'MMM d, h:mm a')}
                      <div className="mt-0.5">
                        <SlaIndicator deadline={ticket.slaDeadline} breached={ticket.slaBreached} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Response times */}
                <div className="pt-2 border-t space-y-1.5 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>First response</span>
                    <span className="font-medium text-slate-700">
                      {ticket.firstResponseAt
                        ? formatDistanceToNow(new Date(ticket.firstResponseAt), { addSuffix: true })
                        : 'Awaiting'}
                    </span>
                  </div>
                  {ticket.resolvedAt && (
                    <div className="flex justify-between">
                      <span>Resolved</span>
                      <span className="font-medium text-slate-700">
                        {formatDistanceToNow(new Date(ticket.resolvedAt), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Replies</span>
                    <span className="font-medium text-slate-700">{ticket.responseCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-medium">Tags</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ticket.tags?.length > 0 ? ticket.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                      <button
                        onClick={() => removeTag.mutate(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )) : (
                    <span className="text-xs text-slate-400">No tags</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Input
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTag.trim()) {
                        addTag.mutate(newTag.trim());
                      }
                    }}
                  />
                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => newTag.trim() && addTag.mutate(newTag.trim())}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Internal Notes */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-medium">Internal Notes</CardTitle>
                <CardDescription className="text-xs">Only visible to admin team</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                <Textarea
                  placeholder="Add internal notes..."
                  value={adminNotes || ticket.adminNotes || ''}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => updateTicket.mutate({ adminNotes })}
                  disabled={updateTicket.isPending}
                >
                  {updateTicket.isPending ? 'Saving...' : 'Save Notes'}
                </Button>
              </CardContent>
            </Card>

            {/* User Info */}
            {user && (
              <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-medium">User Info</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-700">{user.name}</span>
                  </div>
                  <div className="text-slate-500 pl-6">{user.email}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setLocation(`/admin/users/${user.id}`)}
                  >
                    View User Profile
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Entry Point ────────────────────────────────────────────────────────

export default function AdminSupportTicketsPage({ ticketId }: { ticketId?: string }) {
  if (ticketId) {
    return <SupportTicketDetailView ticketId={ticketId} />;
  }

  return <SupportTicketList />;
}
