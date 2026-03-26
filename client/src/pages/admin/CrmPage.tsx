import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  Users,
  Target,
  Activity,
  TrendingUp,
  Search,
  Plus,
  ExternalLink,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  Building2,
  User,
  Phone,
  Globe,
  Calendar,
  MessageSquare,
  Send,
  FileText,
  Loader2,
  X,
  Filter,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────

interface CrmContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  type: 'person' | 'company';
  title: string | null;
  website: string | null;
  source: string | null;
  leadScore: number;
  tags: string[];
  notes: string | null;
  lastActivityAt: string | null;
  outreachProspectId: string | null;
  b2bProspectId: string | null;
  createdAt: string;
}

interface CrmDeal {
  id: string;
  contactId: string;
  title: string;
  stage: DealStage;
  category: string;
  value: number | null;
  currency: string;
  probability: number | null;
  expectedCloseAt: string | null;
  closedAt: string | null;
  lostReason: string | null;
  tags: string[];
  notes: string | null;
  outreachProspectId: string | null;
  createdAt: string;
  updatedAt: string;
}

type DealStage = 'lead' | 'contacted' | 'responded' | 'meeting' | 'negotiation' | 'closed_won' | 'closed_lost';

interface PipelineDeal extends CrmDeal {
  contact?: CrmContact;
}

interface CrmActivity {
  id: string;
  contactId: string;
  dealId: string | null;
  type: string;
  subject: string | null;
  body: string | null;
  contactName?: string;
  dueAt: string | null;
  completedAt: string | null;
  isPinned: boolean;
  createdBy: string | null;
  createdAt: string;
}

interface CrmStats {
  totalContacts: number;
  totalDeals: number;
  dealsByStage: Record<string, number>;
  pipelineValue: number;
  overdueTasks: number;
  activitiesThisWeek: number;
}

interface PipelineData {
  [stage: string]: PipelineDeal[];
}

// ── Constants ──────────────────────────────────────────────────────

const STAGE_ORDER: DealStage[] = ['lead', 'contacted', 'responded', 'meeting', 'negotiation', 'closed_won', 'closed_lost'];

const STAGE_CONFIG: Record<DealStage, { label: string; color: string; bgColor: string; dotColor: string }> = {
  lead: { label: 'Lead', color: 'text-slate-700', bgColor: 'bg-slate-50 border-slate-200', dotColor: 'bg-slate-400' },
  contacted: { label: 'Contacted', color: 'text-blue-700', bgColor: 'bg-blue-50/80 border-blue-200', dotColor: 'bg-blue-500' },
  responded: { label: 'Responded', color: 'text-amber-700', bgColor: 'bg-amber-50/80 border-amber-200', dotColor: 'bg-amber-500' },
  meeting: { label: 'Meeting', color: 'text-purple-700', bgColor: 'bg-purple-50/80 border-purple-200', dotColor: 'bg-purple-500' },
  negotiation: { label: 'Negotiation', color: 'text-orange-700', bgColor: 'bg-orange-50/80 border-orange-200', dotColor: 'bg-orange-500' },
  closed_won: { label: 'Won', color: 'text-emerald-700', bgColor: 'bg-emerald-50/80 border-emerald-200', dotColor: 'bg-emerald-500' },
  closed_lost: { label: 'Lost', color: 'text-red-700', bgColor: 'bg-red-50/80 border-red-200', dotColor: 'bg-red-400' },
};

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  note: FileText,
  email_sent: Send,
  email_received: Mail,
  call: Phone,
  meeting: Calendar,
  pitch_drafted: FileText,
  pitch_approved: CheckCircle2,
  pitch_sent: Send,
  follow_up_sent: ArrowRight,
  response_detected: MessageSquare,
  deal_stage_changed: Target,
  task_created: Clock,
  custom: Activity,
};

// ── Main CRM Page ──────────────────────────────────────────────────

export default function CrmPage() {
  const [tab, setTab] = useState('pipeline');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">Pipeline, contacts, and activity tracking</p>
        </div>
        <SyncButton />
      </div>

      <StatsBar />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="pipeline" className="gap-1.5"><Target className="w-3.5 h-3.5" /> Pipeline</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Contacts</TabsTrigger>
          <TabsTrigger value="deals" className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Deals</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><Activity className="w-3.5 h-3.5" /> Activity</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5"><Clock className="w-3.5 h-3.5" /> Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <PipelineBoard />
        </TabsContent>
        <TabsContent value="contacts" className="mt-4">
          <ContactsList />
        </TabsContent>
        <TabsContent value="deals" className="mt-4">
          <DealsList />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityFeed />
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <TasksView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────────

function StatsBar() {
  const { data: stats, isLoading } = useQuery<CrmStats>({
    queryKey: ['/api/admin/crm/stats'],
    queryFn: () => apiRequest('GET', '/api/admin/crm/stats').then(r => r.json()),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const items = [
    { label: 'Contacts', value: stats.totalContacts, icon: Users, color: 'text-foreground' },
    { label: 'Active Deals', value: stats.totalDeals, icon: Target, color: 'text-blue-600' },
    { label: 'Pipeline Value', value: stats.pipelineValue ? `$${(stats.pipelineValue / 1000).toFixed(0)}k` : '$0', icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Responded', value: stats.dealsByStage?.responded || 0, icon: MessageSquare, color: 'text-amber-600' },
    { label: 'Overdue Tasks', value: stats.overdueTasks, icon: AlertCircle, color: stats.overdueTasks > 0 ? 'text-red-600' : 'text-muted-foreground' },
    { label: 'Activity (7d)', value: stats.activitiesThisWeek, icon: Activity, color: 'text-purple-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="border shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{item.label}</span>
            </div>
            <span className={`text-xl font-semibold ${item.color}`}>{item.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Sync Button ────────────────────────────────────────────────────

function SyncButton() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sync = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/crm/sync-prospects').then(r => r.json()),
    onSuccess: (data: any) => {
      toast({ title: 'Sync complete', description: `${data.synced} prospects synced to CRM` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/crm'] });
    },
    onError: () => {
      toast({ title: 'Sync failed', variant: 'destructive' });
    },
  });

  return (
    <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
      <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${sync.isPending ? 'animate-spin' : ''}`} />
      {sync.isPending ? 'Syncing...' : 'Sync Prospects'}
    </Button>
  );
}

// ── Pipeline Board (Kanban) ────────────────────────────────────────

function PipelineBoard() {
  const { data: pipeline, isLoading } = useQuery<PipelineData>({
    queryKey: ['/api/admin/crm/deals/pipeline'],
    queryFn: () => apiRequest('GET', '/api/admin/crm/deals/pipeline').then(r => r.json()),
  });

  const [selectedDeal, setSelectedDeal] = useState<PipelineDeal | null>(null);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGE_ORDER.slice(0, 5).map((s) => (
          <div key={s} className="min-w-[260px] flex-1">
            <Skeleton className="h-8 mb-3 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max">
          {STAGE_ORDER.map((stage) => {
            const config = STAGE_CONFIG[stage];
            const deals = pipeline?.[stage] || [];

            return (
              <div key={stage} className="w-[260px] flex-shrink-0">
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-md border mb-2 ${config.bgColor}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                    <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {deals.length}
                  </Badge>
                </div>

                {/* Deal cards */}
                <div className="space-y-2 min-h-[200px]">
                  {deals.map((deal) => (
                    <button
                      key={deal.id}
                      onClick={() => setSelectedDeal(deal)}
                      className="w-full text-left p-3 rounded-lg border bg-card hover:shadow-md transition-all duration-200 group cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{deal.title}</p>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                      </div>
                      {deal.contact && (
                        <p className="text-xs text-muted-foreground mt-1.5 truncate">
                          {deal.contact.name}
                          {deal.contact.company && ` · ${deal.contact.company}`}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 capitalize">
                          {deal.category}
                        </Badge>
                        {deal.value && (
                          <span className="text-[10px] font-medium text-emerald-600">
                            ${deal.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}

                  {deals.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 px-3 text-center">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mb-2">
                        <Target className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">No deals</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {selectedDeal && (
        <DealDetailDialog deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      )}
    </>
  );
}

// ── Deal Detail Dialog ─────────────────────────────────────────────

function DealDetailDialog({ deal, onClose }: { deal: PipelineDeal; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newStage, setNewStage] = useState(deal.stage);

  const { data: activities } = useQuery<CrmActivity[]>({
    queryKey: ['/api/admin/crm/deals', deal.id, 'activities'],
    queryFn: () => apiRequest('GET', `/api/admin/crm/deals/${deal.id}/activities`).then(r => r.json()),
  });

  const updateStage = useMutation({
    mutationFn: (stage: DealStage) =>
      apiRequest('PATCH', `/api/admin/crm/deals/${deal.id}`, { stage }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: 'Deal updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/crm'] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{deal.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact info */}
          {deal.contact && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{deal.contact.name}</p>
                {deal.contact.email && (
                  <p className="text-xs text-muted-foreground truncate">{deal.contact.email}</p>
                )}
              </div>
              {deal.contact.website && (
                <a href={deal.contact.website} target="_blank" rel="noopener noreferrer" className="ml-auto">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                </a>
              )}
            </div>
          )}

          {/* Stage selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground w-16">Stage</span>
            <Select
              value={newStage}
              onValueChange={(v) => {
                setNewStage(v as DealStage);
                updateStage.mutate(v as DealStage);
              }}
            >
              <SelectTrigger className="flex-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${STAGE_CONFIG[s].dotColor}`} />
                      {STAGE_CONFIG[s].label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category & value */}
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="outline" className="capitalize">{deal.category}</Badge>
            {deal.value && <span className="font-medium text-emerald-600">${deal.value.toLocaleString()}</span>}
            {deal.probability != null && <span className="text-muted-foreground">{deal.probability}% prob.</span>}
          </div>

          {/* Timeline */}
          {activities && activities.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Timeline</p>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {activities.map((a) => {
                  const Icon = ACTIVITY_ICONS[a.type] || Activity;
                  return (
                    <div key={a.id} className="flex items-start gap-2.5 text-xs">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{a.subject || a.type.replace(/_/g, ' ')}</p>
                        {a.body && <p className="text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>}
                        <p className="text-muted-foreground/60 mt-0.5">
                          {new Date(a.createdAt).toLocaleDateString()} · {a.createdBy || 'system'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {deal.notes && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-muted-foreground">{deal.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Contacts List ──────────────────────────────────────────────────

function ContactsList() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);

  const { data, isLoading } = useQuery<{ contacts: CrmContact[]; total: number }>({
    queryKey: ['/api/admin/crm/contacts', search, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.set('search', search);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      return apiRequest('GET', `/api/admin/crm/contacts?${params}`).then(r => r.json());
    },
  });

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="person">People</SelectItem>
              <SelectItem value="company">Companies</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}
          </div>
        ) : (
          <Card className="border shadow-none">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.contacts?.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setSelectedContact(c)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {c.type === 'company' ? (
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          {c.title && <p className="text-[11px] text-muted-foreground truncate">{c.title}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">
                      {c.email || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[140px]">
                      {c.company || '—'}
                    </TableCell>
                    <TableCell>
                      {c.source && (
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {c.source.replace('agent_', '')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-xs font-medium ${c.leadScore >= 70 ? 'text-emerald-600' : c.leadScore >= 40 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {c.leadScore}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.lastActivityAt ? new Date(c.lastActivityAt).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.contacts || data.contacts.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                      {search ? 'No contacts match your search' : 'No contacts yet. Sync prospects to populate your CRM.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {selectedContact && (
        <ContactDetailDialog contact={selectedContact} onClose={() => setSelectedContact(null)} />
      )}
    </>
  );
}

// ── Contact Detail Dialog ──────────────────────────────────────────

function ContactDetailDialog({ contact, onClose }: { contact: CrmContact; onClose: () => void }) {
  const { data: activities } = useQuery<CrmActivity[]>({
    queryKey: ['/api/admin/crm/contacts', contact.id, 'activities'],
    queryFn: () => apiRequest('GET', `/api/admin/crm/contacts/${contact.id}/activities`).then(r => r.json()),
  });

  const { data: deals } = useQuery<CrmDeal[]>({
    queryKey: ['/api/admin/crm/contacts', contact.id, 'deals'],
    queryFn: () => apiRequest('GET', `/api/admin/crm/deals?contactId=${contact.id}`).then(r => r.json()).then(d => d.deals || []),
  });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {contact.type === 'company' ? (
                <Building2 className="w-5 h-5 text-primary" />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <span className="text-lg">{contact.name}</span>
              {contact.title && <p className="text-sm font-normal text-muted-foreground">{contact.title}</p>}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <a href={`mailto:${contact.email}`} className="text-primary hover:underline truncate">{contact.email}</a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.company && (
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{contact.company}</span>
              </div>
            )}
            {contact.website && (
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                  {new URL(contact.website).hostname}
                </a>
              </div>
            )}
          </div>

          {/* Tags */}
          {contact.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>
          )}

          {/* Associated deals */}
          {deals && deals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Deals</p>
              <div className="space-y-1.5">
                {deals.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 text-sm">
                    <span className="font-medium truncate">{d.title}</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${STAGE_CONFIG[d.stage]?.dotColor || 'bg-gray-400'}`} />
                      <span className="text-xs text-muted-foreground">{STAGE_CONFIG[d.stage]?.label || d.stage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity timeline */}
          {activities && activities.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Activity</p>
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {activities.map((a) => {
                  const Icon = ACTIVITY_ICONS[a.type] || Activity;
                  return (
                    <div key={a.id} className="flex items-start gap-2.5 text-xs">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{a.subject || a.type.replace(/_/g, ' ')}</p>
                        {a.body && <p className="text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>}
                        <p className="text-muted-foreground/60 mt-0.5">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {contact.notes && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-muted-foreground">{contact.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Deals List (Table View) ────────────────────────────────────────

function DealsList() {
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data, isLoading } = useQuery<{ deals: CrmDeal[]; total: number }>({
    queryKey: ['/api/admin/crm/deals', stageFilter, categoryFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' });
      if (stageFilter !== 'all') params.set('stage', stageFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      return apiRequest('GET', `/api/admin/crm/deals?${params}`).then(r => r.json());
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGE_ORDER.map((s) => (
              <SelectItem key={s} value={s}>{STAGE_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="podcast">Podcast</SelectItem>
            <SelectItem value="press">Press</SelectItem>
            <SelectItem value="investor">Investor</SelectItem>
            <SelectItem value="b2b">B2B</SelectItem>
            <SelectItem value="partnership">Partnership</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}
        </div>
      ) : (
        <Card className="border shadow-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Deal</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.deals?.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <p className="text-sm font-medium truncate max-w-[280px]">{d.title}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${STAGE_CONFIG[d.stage]?.dotColor || 'bg-gray-400'}`} />
                      <span className="text-xs">{STAGE_CONFIG[d.stage]?.label || d.stage}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] capitalize">{d.category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {d.value ? `$${d.value.toLocaleString()}` : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {(!data?.deals || data.deals.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                    No deals found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ── Activity Feed ──────────────────────────────────────────────────

function ActivityFeed() {
  const { data: activities, isLoading } = useQuery<CrmActivity[]>({
    queryKey: ['/api/admin/crm/activities/recent'],
    queryFn: () => apiRequest('GET', '/api/admin/crm/activities/recent?limit=50').then(r => r.json()),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-md" />)}
      </div>
    );
  }

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities && activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((a) => {
              const Icon = ACTIVITY_ICONS[a.type] || Activity;
              return (
                <div key={a.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{a.subject || a.type.replace(/_/g, ' ')}</p>
                      <Badge variant="outline" className="text-[10px] h-4 capitalize">
                        {a.type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    {a.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>}
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/70">
                      {a.contactName && <span>{a.contactName}</span>}
                      {a.contactName && <span>·</span>}
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
                      {a.createdBy && <span>· {a.createdBy}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No activity yet. Send pitches or sync prospects to start building your timeline.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Tasks View ─────────────────────────────────────────────────────

function TasksView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: overdue, isLoading: loadingOverdue } = useQuery<CrmActivity[]>({
    queryKey: ['/api/admin/crm/activities/tasks', 'overdue'],
    queryFn: () => apiRequest('GET', '/api/admin/crm/activities/tasks?filter=overdue').then(r => r.json()),
  });

  const { data: upcoming, isLoading: loadingUpcoming } = useQuery<CrmActivity[]>({
    queryKey: ['/api/admin/crm/activities/tasks', 'upcoming'],
    queryFn: () => apiRequest('GET', '/api/admin/crm/activities/tasks?filter=upcoming').then(r => r.json()),
  });

  const completeTask = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/admin/crm/activities/${id}/complete`).then(r => r.json()),
    onSuccess: () => {
      toast({ title: 'Task completed' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/crm'] });
    },
  });

  const renderTaskList = (tasks: CrmActivity[] | undefined, loading: boolean, emptyText: string) => {
    if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}</div>;
    if (!tasks || tasks.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">{emptyText}</p>;

    return (
      <div className="space-y-1.5">
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/20 transition-colors">
            <button
              onClick={() => completeTask.mutate(t.id)}
              disabled={completeTask.isPending}
              className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 hover:border-primary hover:bg-primary/10 transition-colors flex-shrink-0 flex items-center justify-center"
            >
              {completeTask.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.subject || t.type.replace(/_/g, ' ')}</p>
              {t.dueAt && (
                <p className={`text-[11px] ${new Date(t.dueAt) < new Date() ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                  Due {new Date(t.dueAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            Overdue
            {overdue && overdue.length > 0 && (
              <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{overdue.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderTaskList(overdue, loadingOverdue, 'No overdue tasks')}
        </CardContent>
      </Card>

      <Card className="border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderTaskList(upcoming, loadingUpcoming, 'No upcoming tasks')}
        </CardContent>
      </Card>
    </div>
  );
}
