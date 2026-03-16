import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';
import { VoiceInput } from '@/shared/components/VoiceInput';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
import { Checkbox } from '@/shared/components/ui/checkbox';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  Search,
  Send,
  Edit,
  Check,
  X,
  RefreshCw,
  Radio,
  Newspaper,
  ExternalLink,
  Mail,
  FileText,
  Play,
  Settings,
  User,
  Loader2,
  Eye,
  ChevronDown,
  Sparkles,
  Trash2,
  KeyRound,
  ShieldCheck,
  MessageSquare,
  Clock,
  UserCheck,
  BarChart3,
  Users,
  TrendingUp,
  Zap,
  Globe,
  MessageCircle,
  Linkedin,
  Twitter,
  Star,
  Plus,
  UserPlus,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Prospect {
  id: string;
  name: string;
  category: 'podcast' | 'press';
  subType: string | null;
  url: string;
  contactEmail: string | null;
  contactFormUrl: string | null;
  hostName: string | null;
  publicationName: string | null;
  audienceEstimate: string | null;
  relevanceScore: number | null;
  status: string;
  contactMethod: string;
  topics: string[] | null;
  notes: string | null;
  leadTier: 'strong' | 'medium' | 'weak' | null;
  discoveredAt: string;
}

interface Pitch {
  id: string;
  prospectId: string;
  category: 'podcast' | 'press';
  pitchType: string;
  templateUsed: string | null;
  subject: string;
  body: string;
  formAnswers: Record<string, string> | null;
  status: string;
  sentAt: string | null;
  sentVia: string | null;
  responseReceived: boolean;
  createdAt: string;
}

interface ProspectContact {
  id: string;
  prospectId: string;
  name: string;
  role: string | null;
  email: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  beat: string | null;
  recentArticles: string[] | null;
  confidenceScore: number | null;
  isPrimary: boolean;
  notes: string | null;
  discoveredAt: string;
}

interface AgentRun {
  id: string;
  agentName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  prospectsFound: number;
  pitchesDrafted: number;
  tokensUsed: number;
  errorMessage: string | null;
}

interface DashboardData {
  stats: {
    totalProspects: number;
    podcastProspects: number;
    pressProspects: number;
    pendingPitches: number;
    sentPitches: number;
    responses: number;
    booked: number;
    followUpsDue: number;
  };
  enabled: boolean;
  recentRuns: AgentRun[];
  funnel?: {
    discovered: number;
    pitched: number;
    sent: number;
    responded: number;
    booked: number;
  };
  cost?: {
    totalTokens: number;
    totalCost: number;
    byModel: Record<string, { tokens: number; cost: number }>;
  } | null;
  budgetAlert?: string | null;
}

interface AnalyticsData {
  funnel: {
    discovered: number;
    pitched: number;
    sent: number;
    responded: number;
    booked: number;
    conversionRates: {
      pitchRate: string;
      sendRate: string;
      responseRate: string;
      bookingRate: string;
    };
  };
  cost: {
    totalTokens: number;
    totalCost: number;
    byModel: Record<string, { tokens: number; cost: number }>;
  } | null;
  budgetAlert: string | null;
  platform: {
    userCount: number;
    formulaCount: number;
    ingredientCount: number;
    growthRate: string;
  } | null;
}

interface PrAgentConfig {
  enabled: boolean;
  scanCron: string;
  pitchCron: string;
  maxProspectsPerRun: number;
  minRelevanceScore: number;
  maxPitchesPerRun: number;
  followUpDays: number;
  maxFollowUps: number;
  model: string;
  temperature: number;
  gmailEnabled: boolean;
  gmailFrom: string;
  searchQueries: {
    podcast: string[];
    press: string[];
  };
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PRAgentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: dashboard, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ['/api/agent/dashboard'],
    refetchInterval: (query: any) => {
      const d = query.state.data as DashboardData | undefined;
      return d?.recentRuns?.some((r: any) => r.status === 'running') ? 5000 : false;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">PR Agent</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered outreach for podcasts and press
          </p>
        </div>
        {dashboard && (
          <Badge variant={dashboard.enabled ? 'default' : 'secondary'} className="text-sm">
            {dashboard.enabled ? 'Active' : 'Disabled'}
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="podcasts">
            <Radio className="h-3.5 w-3.5 mr-1.5" />
            Podcasts
          </TabsTrigger>
          <TabsTrigger value="press">
            <Newspaper className="h-3.5 w-3.5 mr-1.5" />
            Press
          </TabsTrigger>
          <TabsTrigger value="pitches">Pitches</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab dashboard={dashboard} isLoading={dashLoading} onNavigate={setActiveTab} />
        </TabsContent>
        <TabsContent value="podcasts">
          <ProspectsTab category="podcast" />
        </TabsContent>
        <TabsContent value="press">
          <ProspectsTab category="press" />
        </TabsContent>
        <TabsContent value="pitches">
          <PitchesTab />
        </TabsContent>
        <TabsContent value="runs">
          <RunsTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ dashboard, isLoading, onNavigate }: { dashboard?: DashboardData; isLoading: boolean; onNavigate: (tab: string) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const scanMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/scan', {}),
    onSuccess: () => {
      toast({ title: 'Scan started', description: 'Check the Runs tab for progress.' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const pitchBatchMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/pitch-batch', {}),
    onSuccess: () => {
      toast({ title: 'Pitch batch started', description: 'Drafts will appear in the review queue.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const sendAllMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/send-approved', {}),
    onSuccess: () => {
      toast({ title: 'Sending approved pitches', description: 'Check the Pitches tab for status.' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const competitorMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/competitor-scan', {}),
    onSuccess: () => {
      toast({ title: 'Competitor scan started', description: 'New prospects from competitor coverage will appear soon.' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const responsesMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/check-responses', {}).then(r => r.json()),
    onSuccess: (data: any) => {
      toast({
        title: 'Response check complete',
        description: `Found ${data.responsesFound || 0} new responses.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const followUpMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/process-follow-ups', {}).then(r => r.json()),
    onSuccess: (data: any) => {
      toast({
        title: 'Follow-ups processed',
        description: `${data.draftsCreated || 0} follow-up drafts created.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const stats = dashboard?.stats;

  // Derive running state from dashboard — these scans are async background tasks
  const runningRuns = dashboard?.recentRuns?.filter(r => r.status === 'running') ?? [];
  const isScanRunning = runningRuns.some(r => r.agentName === 'pr_scan') || scanMutation.isPending;
  const isCompetitorRunning = runningRuns.some(r => r.agentName === 'competitor_scan') || competitorMutation.isPending;
  const isPitchRunning = runningRuns.some(r => r.agentName === 'pr_pitch_batch') || pitchBatchMutation.isPending;
  const isAnyRunning = runningRuns.length > 0;

  return (
    <div className="space-y-6">
      {/* Active Scan Banner */}
      {isAnyRunning && (
        <Card className="border-blue-300 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-4 pb-3 flex items-center gap-3 text-sm text-blue-800 dark:text-blue-200">
            <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
            <div>
              <span className="font-medium">
                {runningRuns.map(r => {
                  if (r.agentName === 'pr_scan') return 'PR Scan';
                  if (r.agentName === 'competitor_scan') return 'Competitor Scan';
                  if (r.agentName === 'pr_pitch_batch') return 'Pitch Drafting';
                  return r.agentName;
                }).join(', ')} in progress...
              </span>
              <span className="ml-2 text-blue-600 dark:text-blue-300">
                Results will appear automatically when complete.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Prospects" value={stats?.totalProspects ?? 0} />
        <StatCard label="Podcasts" value={stats?.podcastProspects ?? 0} icon={<Radio className="h-4 w-4 text-muted-foreground" />} onClick={() => onNavigate('podcasts')} />
        <StatCard label="Press" value={stats?.pressProspects ?? 0} icon={<Newspaper className="h-4 w-4 text-muted-foreground" />} onClick={() => onNavigate('press')} />
        <StatCard label="Pending Review" value={stats?.pendingPitches ?? 0} icon={<Edit className="h-4 w-4 text-orange-500" />} onClick={() => onNavigate('pitches')} />
        <StatCard label="Sent" value={stats?.sentPitches ?? 0} icon={<Send className="h-4 w-4 text-blue-500" />} onClick={() => onNavigate('pitches')} />
        <StatCard label="Follow-ups Due" value={stats?.followUpsDue ?? 0} icon={<Clock className="h-4 w-4 text-orange-500" />} onClick={() => onNavigate('pitches')} />
        <StatCard label="Responses" value={stats?.responses ?? 0} icon={<Mail className="h-4 w-4 text-green-500" />} onClick={() => onNavigate('pitches')} />
        <StatCard label="Booked" value={stats?.booked ?? 0} icon={<Check className="h-4 w-4 text-green-600" />} onClick={() => onNavigate('pitches')} />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => scanMutation.mutate()} disabled={isScanRunning}>
            {isScanRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            {isScanRunning ? 'Scanning...' : 'Run Scan'}
          </Button>
          <Button variant="outline" onClick={() => pitchBatchMutation.mutate()} disabled={isPitchRunning}>
            {isPitchRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            {isPitchRunning ? 'Drafting...' : 'Draft Pitches'}
          </Button>
          <Button variant="outline" onClick={() => sendAllMutation.mutate()} disabled={sendAllMutation.isPending}>
            {sendAllMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send All Approved
          </Button>
          <Button variant="outline" onClick={() => competitorMutation.mutate()} disabled={isCompetitorRunning}>
            {isCompetitorRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
            {isCompetitorRunning ? 'Scanning...' : 'Competitor Scan'}
          </Button>
          <Button variant="outline" onClick={() => responsesMutation.mutate()} disabled={responsesMutation.isPending}>
            {responsesMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-2" />}
            Check Responses
          </Button>
          <Button variant="outline" onClick={() => followUpMutation.mutate()} disabled={followUpMutation.isPending}>
            {followUpMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Process Follow-Ups
          </Button>
        </CardContent>
      </Card>

      {/* Budget Alert */}
      {dashboard?.budgetAlert && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-4 pb-3 flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
            <TrendingUp className="h-4 w-4" />
            {dashboard.budgetAlert}
          </CardContent>
        </Card>
      )}

      {/* Funnel Overview */}
      {dashboard?.funnel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outreach Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              {[
                { label: 'Discovered', value: dashboard.funnel.discovered },
                { label: 'Pitched', value: dashboard.funnel.pitched },
                { label: 'Sent', value: dashboard.funnel.sent },
                { label: 'Responded', value: dashboard.funnel.responded },
                { label: 'Booked', value: dashboard.funnel.booked },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-2">
                  {i > 0 && <span className="text-muted-foreground">→</span>}
                  <div className="text-center">
                    <div className="text-lg font-semibold">{step.value}</div>
                    <div className="text-xs text-muted-foreground">{step.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard?.recentRuns && dashboard.recentRuns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prospects</TableHead>
                  <TableHead>Pitches</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.recentRuns.map(run => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono text-xs">{run.agentName}</TableCell>
                    <TableCell><StatusBadge status={run.status} /></TableCell>
                    <TableCell>{run.prospectsFound}</TableCell>
                    <TableCell>{run.pitchesDrafted}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No runs yet. Click "Run Scan" to start.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Prospects Tab ─────────────────────────────────────────────────────────────

function ProspectsTab({ category }: { category: 'podcast' | 'press' }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<{ prospects: Prospect[]; total: number }>({
    queryKey: ['/api/agent/prospects', category],
    queryFn: () => apiRequest('GET', `/api/agent/prospects?category=${category}&limit=100`).then(r => r.json()),
  });

  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contactFilter, setContactFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draftingIds, setDraftingIds] = useState<Set<string>>(new Set());

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/agent/prospects/${id}`),
    onSuccess: () => {
      toast({ title: 'Prospect deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/prospects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const draftPitchMutation = useMutation({
    mutationFn: (prospectId: string) =>
      apiRequest('POST', `/api/agent/prospects/${prospectId}/draft`, {}).then(r => r.json()),
  });

  async function batchDraftPitches() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    let succeeded = 0;
    let failed = 0;
    setDraftingIds(new Set(ids));

    for (const id of ids) {
      try {
        await draftPitchMutation.mutateAsync(id);
        succeeded++;
        setDraftingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      } catch {
        failed++;
        setDraftingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      }
    }

    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
    queryClient.invalidateQueries({ queryKey: ['/api/agent/prospects'] });
    queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
    toast({
      title: `Drafted ${succeeded} pitch${succeeded !== 1 ? 'es' : ''}`,
      description: failed > 0 ? `${failed} failed` : 'Check the Pitches tab to review.',
      variant: failed > 0 ? 'destructive' : 'default',
    });
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const allProspects = data?.prospects || [];
  // Filter by search term, status, and contact method
  const prospects = allProspects.filter(p => {
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.hostName && p.hostName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.contactEmail && p.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.topics && p.topics.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesContact = contactFilter === 'all' || p.contactMethod === contactFilter;
    const matchesTier = tierFilter === 'all' || (tierFilter === 'unrated' ? !p.leadTier : p.leadTier === tierFilter);
    return matchesSearch && matchesStatus && matchesContact && matchesTier;
  });

  const allSelected = prospects.length > 0 && prospects.every(p => selectedIds.has(p.id));
  const someSelected = prospects.some(p => selectedIds.has(p.id));
  const isDrafting = draftingIds.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prospects.map(p => p.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Count by contact method for filter badges
  const emailCount = allProspects.filter(p => p.contactMethod === 'email').length;
  const formCount = allProspects.filter(p => p.contactMethod === 'form').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search prospects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 w-[200px] text-sm"
            />
          </div>
          {/* Status filters */}
          <div className="flex gap-1">
            {['all', 'new', 'pitched', 'responded', 'booked', 'manually_contacted', 'cold'].map(s => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => setStatusFilter(s)}
                className="text-xs h-7"
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
          {/* Contact method filters */}
          <div className="flex gap-1 border-l pl-2">
            {[
              { key: 'all', label: 'All', icon: null, count: allProspects.length },
              { key: 'email', label: 'Email', icon: <Mail className="h-3 w-3" />, count: emailCount },
              { key: 'form', label: 'Form', icon: <FileText className="h-3 w-3" />, count: formCount },
            ].map(f => (
              <Button
                key={f.key}
                size="sm"
                variant={contactFilter === f.key ? 'secondary' : 'ghost'}
                onClick={() => setContactFilter(f.key)}
                className="text-xs h-7 gap-1"
              >
                {f.icon}
                {f.label} ({f.count})
              </Button>
            ))}
          </div>
          {/* Lead tier filters */}
          <div className="flex gap-1 border-l pl-2">
            {[
              { key: 'all', label: 'All Tiers' },
              { key: 'strong', label: '🟢 Strong' },
              { key: 'medium', label: '🟡 Medium' },
              { key: 'weak', label: '🔴 Weak' },
              { key: 'unrated', label: 'Unrated' },
            ].map(f => (
              <Button
                key={f.key}
                size="sm"
                variant={tierFilter === f.key ? 'secondary' : 'ghost'}
                onClick={() => setTierFilter(f.key)}
                className="text-xs h-7"
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              onClick={batchDraftPitches}
              disabled={isDrafting}
              className="h-8 gap-1"
            >
              {isDrafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Edit className="h-3.5 w-3.5" />}
              Draft {selectedIds.size} Pitch{selectedIds.size !== 1 ? 'es' : ''}
            </Button>
          )}
          <p className="text-sm text-muted-foreground">
            {prospects.length} of {allProspects.length} {category === 'podcast' ? 'podcast' : 'press'} prospects
          </p>
        </div>
      </div>

      {prospects.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                  className={someSelected && !allSelected ? 'opacity-60' : ''}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Discovered</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospects.map(p => (
              <TableRow
                key={p.id}
                className={`cursor-pointer ${selectedIds.has(p.id) ? 'bg-muted/50' : ''}`}
                onClick={() => setSelectedProspect(p)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(p.id)}
                    onCheckedChange={() => toggleSelect(p.id)}
                    aria-label={`Select ${p.name}`}
                  />
                  {draftingIds.has(p.id) && <Loader2 className="h-3 w-3 animate-spin inline ml-1" />}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium text-sm">{p.name}</div>
                    {p.hostName && <div className="text-xs text-muted-foreground">Host: {p.hostName}</div>}
                  </div>
                </TableCell>
                <TableCell>
                  <ScoreBadge score={p.relevanceScore} />
                </TableCell>
                <TableCell>
                  <TierBadge tier={p.leadTier} />
                </TableCell>
                <TableCell>
                  <ContactBadge method={p.contactMethod} email={p.contactEmail} />
                </TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(p.discoveredAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </a>
                    {p.status !== 'manually_contacted' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-600 h-7 w-7 p-0"
                        title="Mark as manually reached out"
                        onClick={(e) => {
                          e.stopPropagation();
                          apiRequest('PATCH', `/api/agent/prospects/${p.id}`, { status: 'manually_contacted' })
                            .then(() => {
                              toast({ title: 'Marked as manually contacted' });
                              queryClient.invalidateQueries({ queryKey: ['/api/agent/prospects'] });
                              queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
                            })
                            .catch((err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }));
                        }}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 h-7 w-7 p-0"
                      onClick={(e) => { e.stopPropagation(); if (confirm('Delete this prospect?')) deleteMutation.mutate(p.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No {category} prospects yet. Run a scan to discover opportunities.</p>
          </CardContent>
        </Card>
      )}

      {/* Prospect Detail Dialog */}
      {selectedProspect && (
        <ProspectDetailDialog
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
        />
      )}
    </div>
  );
}

// ── Pitches Tab ───────────────────────────────────────────────────────────────

function PitchesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedPitch, setSelectedPitch] = useState<{ pitch: Pitch; prospect: Prospect } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contactFilter, setContactFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery<{ pitch: Pitch; prospect: Prospect }[]>({
    queryKey: ['/api/agent/pitches'],
    queryFn: () => apiRequest('GET', '/api/agent/pitches?limit=100').then(r => r.json()),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/agent/pitches/${id}/approve`, {}),
    onSuccess: () => {
      toast({ title: 'Pitch approved' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/agent/pitches/${id}/reject`, {}),
    onSuccess: () => {
      toast({ title: 'Pitch rejected' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/agent/pitches/${id}`),
    onSuccess: () => {
      toast({ title: 'Pitch deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const respondedMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/agent/pitches/${id}/responded`, {}),
    onSuccess: () => {
      toast({ title: 'Marked as responded', description: 'Follow-up chain stopped.' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const followUpMutation = useMutation({
    mutationFn: (pitchId: string) => apiRequest('POST', `/api/agent/pitches/${pitchId}/follow-up`, {}).then(r => r.json()),
    onSuccess: () => {
      toast({ title: 'Follow-up drafted', description: 'Check the review queue.' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const resp = await apiRequest('POST', `/api/agent/pitches/${id}/send`, {});
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Send failed');
      return data;
    },
    onSuccess: (data: any) => {
      if (data.method === 'form') {
        const submitted = data.formResult?.submitted;
        toast({
          title: submitted ? 'Form submitted!' : 'Form filled (not submitted)',
          description: data.message,
          ...(submitted ? {} : { variant: 'destructive' as const }),
        });
      } else {
        toast({ title: 'Pitch sent!', description: 'Email delivered successfully.' });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
    },
    onError: (err: any) => toast({ title: 'Send failed', description: err.message, variant: 'destructive' }),
  });

  const sendAllMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/send-approved', {}),
    onSuccess: () => {
      toast({ title: 'Sending approved pitches' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
    },
    onError: (err: any) => toast({ title: 'Send failed', description: err.message, variant: 'destructive' }),
  });

  const pitchBatchMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/pitch-batch', {}),
    onSuccess: () => {
      toast({ title: 'Pitch batch started', description: 'Drafts will appear in the review queue.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const allPitches = Array.isArray(data) ? data : [];
  const pitches = allPitches.filter(({ pitch, prospect }) => {
    const matchesStatus = statusFilter === 'all' || pitch.status === statusFilter;
    const matchesContact = contactFilter === 'all' || prospect.contactMethod === contactFilter;
    const matchesSearch = !searchTerm ||
      prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pitch.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pitch.pitchType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesContact && matchesSearch;
  });

  const approvedCount = allPitches.filter(({ pitch }) => pitch.status === 'approved').length;
  const statusCounts = allPitches.reduce((acc, { pitch }) => {
    acc[pitch.status] = (acc[pitch.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const emailPitchCount = allPitches.filter(({ prospect }) => prospect.contactMethod === 'email').length;
  const formPitchCount = allPitches.filter(({ prospect }) => prospect.contactMethod === 'form').length;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search pitches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 w-[200px] text-sm"
            />
          </div>
          <div className="flex gap-1.5">
          {['all', 'pending_review', 'approved', 'sent', 'rejected'].map(s => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
              className="text-xs h-7"
            >
              {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              {s === 'all' ? ` (${allPitches.length})` : statusCounts[s] ? ` (${statusCounts[s]})` : ''}
            </Button>
          ))}
          </div>
          {/* Contact method filters */}
          <div className="flex gap-1 border-l pl-2">
            {[
              { key: 'all', label: 'All', icon: null, count: allPitches.length },
              { key: 'email', label: 'Email', icon: <Mail className="h-3 w-3" />, count: emailPitchCount },
              { key: 'form', label: 'Form', icon: <FileText className="h-3 w-3" />, count: formPitchCount },
            ].map(f => (
              <Button
                key={f.key}
                size="sm"
                variant={contactFilter === f.key ? 'secondary' : 'ghost'}
                onClick={() => setContactFilter(f.key)}
                className="text-xs h-7 gap-1"
              >
                {f.icon}
                {f.label} ({f.count})
              </Button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {approvedCount > 0 && (
            <Button size="sm" variant="outline" onClick={() => sendAllMutation.mutate()} disabled={sendAllMutation.isPending}>
              {sendAllMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
              Send All Approved ({approvedCount})
            </Button>
          )}
        </div>
      </div>

      {pitches.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prospect</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pitches.map(({ pitch, prospect }) => (
              <TableRow key={pitch.id}>
                <TableCell>
                  <div>
                    <div className="font-medium text-sm">{prospect.name}</div>
                    <Badge variant="outline" className="text-xs mt-0.5">
                      {pitch.category}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <ContactBadge method={prospect.contactMethod} email={prospect.contactEmail} />
                </TableCell>
                <TableCell
                  className="max-w-[250px] truncate cursor-pointer hover:text-primary"
                  onClick={() => setSelectedPitch({ pitch, prospect })}
                >
                  {pitch.subject}
                </TableCell>
                <TableCell className="text-xs">{pitch.pitchType}</TableCell>
                <TableCell><StatusBadge status={pitch.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(pitch.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedPitch({ pitch, prospect })}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {pitch.status === 'pending_review' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600"
                          onClick={() => approveMutation.mutate(pitch.id)}
                          disabled={approveMutation.isPending}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => rejectMutation.mutate(pitch.id)}
                          disabled={rejectMutation.isPending}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {pitch.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className={prospect.contactMethod === 'form' ? 'text-orange-600' : 'text-blue-600'}
                        onClick={() => sendMutation.mutate(pitch.id)}
                        disabled={sendMutation.isPending}
                        title={prospect.contactMethod === 'form' ? 'Fill submission form' : 'Send email'}
                      >
                        {prospect.contactMethod === 'form'
                          ? <FileText className="h-3.5 w-3.5" />
                          : <Send className="h-3.5 w-3.5" />
                        }
                      </Button>
                    )}
                    {pitch.status === 'sent' && !pitch.responseReceived && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600"
                          onClick={() => respondedMutation.mutate(pitch.id)}
                          disabled={respondedMutation.isPending}
                          title="Mark as responded"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                        {/* Only show follow-up for prospects with email — form-only contacts can't receive follow-ups */}
                        {prospect?.contactEmail && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-purple-600"
                            onClick={() => followUpMutation.mutate(pitch.id)}
                            disabled={followUpMutation.isPending}
                            title="Draft follow-up email"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                    {prospect.status !== 'manually_contacted' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-600"
                        onClick={() => {
                          apiRequest('PATCH', `/api/agent/prospects/${prospect.id}`, { status: 'manually_contacted' })
                            .then(() => {
                              toast({ title: 'Marked as manually contacted' });
                              queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
                              queryClient.invalidateQueries({ queryKey: ['/api/agent/prospects'] });
                              queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
                            })
                            .catch((err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }));
                        }}
                        title="Mark prospect as manually reached out"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-600"
                      onClick={() => { if (confirm('Delete this pitch?')) deleteMutation.mutate(pitch.id); }}
                      title="Delete pitch"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-muted-foreground">
              {statusFilter !== 'all'
                ? `No ${statusFilter.replace(/_/g, ' ')} pitches.`
                : 'No pitches yet. Run a pitch batch after discovering prospects.'}
            </p>
            {statusFilter === 'all' && (
              <Button variant="outline" onClick={() => pitchBatchMutation.mutate()} disabled={pitchBatchMutation.isPending}>
                {pitchBatchMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                Draft Pitches
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pitch Detail/Edit Dialog */}
      {selectedPitch && (
        <PitchDetailDialog
          pitch={selectedPitch.pitch}
          prospect={selectedPitch.prospect}
          onClose={() => setSelectedPitch(null)}
        />
      )}
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const { toast } = useToast();

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/agent/analytics'],
    queryFn: () => apiRequest('GET', '/api/agent/analytics').then(r => r.json()),
  });

  const summaryMutation = useMutation({
    mutationFn: () => apiRequest('GET', '/api/agent/weekly-summary').then(r => r.json()),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const funnel = analytics?.funnel;
  const cost = analytics?.cost;

  return (
    <div className="space-y-6">
      {/* Funnel Visualization */}
      {funnel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outreach Funnel</CardTitle>
            <CardDescription>Conversion rates across the pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Discovered', value: funnel.discovered, rate: null, color: 'bg-blue-500' },
                { label: 'Pitched', value: funnel.pitched, rate: funnel.conversionRates.pitchRate, color: 'bg-indigo-500' },
                { label: 'Sent', value: funnel.sent, rate: funnel.conversionRates.sendRate, color: 'bg-purple-500' },
                { label: 'Responded', value: funnel.responded, rate: funnel.conversionRates.responseRate, color: 'bg-green-500' },
                { label: 'Booked', value: funnel.booked, rate: funnel.conversionRates.bookingRate, color: 'bg-emerald-600' },
              ].map((step) => {
                const width = funnel.discovered > 0 ? Math.max(5, (step.value / funnel.discovered) * 100) : 5;
                return (
                  <div key={step.label} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-muted-foreground">{step.label}</div>
                    <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                      <div className={`${step.color} h-full rounded-full flex items-center justify-end pr-2`} style={{ width: `${width}%`, minWidth: '40px' }}>
                        <span className="text-xs text-white font-medium">{step.value}</span>
                      </div>
                    </div>
                    {step.rate && (
                      <div className="w-16 text-sm text-right font-mono">{step.rate}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Tracking */}
      {cost && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Spend (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-semibold">${cost.totalCost?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Tokens</p>
                <p className="text-2xl font-semibold">{(cost.totalTokens || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Budget Alert</p>
                <p className="text-sm">{analytics?.budgetAlert || 'None'}</p>
              </div>
            </div>
            {cost.byModel && Object.keys(cost.byModel).length > 0 && (
              <div className="mt-4 space-y-1">
                <p className="text-xs text-muted-foreground mb-2">By Model</p>
                {Object.entries(cost.byModel).map(([model, data]) => (
                  <div key={model} className="flex justify-between text-sm">
                    <span className="font-mono text-xs">{model}</span>
                    <span>${(data as any).cost?.toFixed(4) || '0'} ({((data as any).tokens || 0).toLocaleString()} tokens)</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Platform Stats */}
      {analytics?.platform && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform Stats (for pitches)</CardTitle>
            <CardDescription>Live data injected into pitch context</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Users</p>
                <p className="text-lg font-semibold">{analytics.platform.userCount?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Formulas</p>
                <p className="text-lg font-semibold">{analytics.platform.formulaCount?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ingredients</p>
                <p className="text-lg font-semibold">{analytics.platform.ingredientCount?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Growth</p>
                <p className="text-lg font-semibold">{analytics.platform.growthRate || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Summary</CardTitle>
          <CardDescription>Generate a PR activity digest</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={() => summaryMutation.mutate()} disabled={summaryMutation.isPending}>
            {summaryMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
            Generate Summary
          </Button>
          {summaryMutation.data && (
            <div className="bg-muted p-4 rounded text-sm whitespace-pre-wrap">
              {typeof summaryMutation.data === 'object' ? JSON.stringify(summaryMutation.data, null, 2) : String(summaryMutation.data)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Runs Tab ──────────────────────────────────────────────────────────────────

function RunsTab() {
  const { data: runs, isLoading } = useQuery<AgentRun[]>({
    queryKey: ['/api/agent/runs'],
    queryFn: () => apiRequest('GET', '/api/agent/runs?limit=50').then(r => r.json()),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {runs && runs.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prospects</TableHead>
              <TableHead>Pitches</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map(run => (
              <TableRow key={run.id}>
                <TableCell className="font-mono text-xs">{run.agentName}</TableCell>
                <TableCell><StatusBadge status={run.status} /></TableCell>
                <TableCell>{run.prospectsFound}</TableCell>
                <TableCell>{run.pitchesDrafted}</TableCell>
                <TableCell className="text-xs">{run.tokensUsed.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(run.startedAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-xs">
                  {run.completedAt
                    ? `${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
                    : '—'
                  }
                </TableCell>
                <TableCell className="text-xs text-red-500 max-w-[200px] truncate">
                  {run.errorMessage || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No runs recorded yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery<PrAgentConfig>({
    queryKey: ['/api/agent/config'],
    queryFn: () => apiRequest('GET', '/api/agent/config').then(r => r.json()),
  });

  const { data: profile } = useQuery<any>({
    queryKey: ['/api/agent/profile'],
    queryFn: () => apiRequest('GET', '/api/agent/profile').then(r => r.json()),
  });

  const updateConfigMutation = useMutation({
    mutationFn: (data: Partial<PrAgentConfig>) => apiRequest('PUT', '/api/agent/config', data),
    onSuccess: () => {
      toast({ title: 'Settings saved' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PUT', '/api/agent/profile', data),
    onSuccess: () => {
      toast({ title: 'Founder profile saved' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/profile'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Agent Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Status</CardTitle>
          <CardDescription>Enable or disable the PR Agent scheduler</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              checked={config?.enabled ?? false}
              onCheckedChange={(checked) => updateConfigMutation.mutate({ enabled: checked })}
            />
            <Label>{config?.enabled ? 'Active — scanning and drafting on schedule' : 'Disabled — manual runs only'}</Label>
          </div>
        </CardContent>
      </Card>

      {/* Scan Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scan Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Max Prospects Per Run</Label>
              <Input
                type="number"
                defaultValue={config?.maxProspectsPerRun ?? 20}
                onBlur={(e) => updateConfigMutation.mutate({ maxProspectsPerRun: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Min Relevance Score (0-100)</Label>
              <Input
                type="number"
                defaultValue={config?.minRelevanceScore ?? 50}
                onBlur={(e) => updateConfigMutation.mutate({ minRelevanceScore: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pitch Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pitch Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Max Pitches Per Batch</Label>
              <Input
                type="number"
                defaultValue={config?.maxPitchesPerRun ?? 10}
                onBlur={(e) => updateConfigMutation.mutate({ maxPitchesPerRun: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Follow-up Days</Label>
              <Input
                type="number"
                defaultValue={config?.followUpDays ?? 7}
                onBlur={(e) => updateConfigMutation.mutate({ followUpDays: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Max Follow-ups</Label>
              <Input
                type="number"
                defaultValue={config?.maxFollowUps ?? 2}
                onBlur={(e) => updateConfigMutation.mutate({ maxFollowUps: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Model */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Model</Label>
              <Input
                defaultValue={config?.model ?? 'gpt-4o'}
                onBlur={(e) => updateConfigMutation.mutate({ model: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Temperature</Label>
              <Input
                type="number"
                step={0.1}
                defaultValue={config?.temperature ?? 0.7}
                onBlur={(e) => updateConfigMutation.mutate({ temperature: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gmail OAuth Credentials */}
      <GmailOAuthCard config={config} updateConfigMutation={updateConfigMutation} />

      {/* Founder Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Founder Profile
          </CardTitle>
          <CardDescription>This context is used to personalize pitches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Name</Label>
              <Input defaultValue={profile?.name ?? ''} onBlur={(e) => updateProfileMutation.mutate({ name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input defaultValue={profile?.title ?? ''} onBlur={(e) => updateProfileMutation.mutate({ title: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Short Bio</Label>
            <Textarea
              defaultValue={profile?.bioShort ?? ''}
              rows={2}
              onBlur={(e) => updateProfileMutation.mutate({ bioShort: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Medium Bio</Label>
            <Textarea
              defaultValue={profile?.bioMedium ?? ''}
              rows={4}
              onBlur={(e) => updateProfileMutation.mutate({ bioMedium: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Gmail OAuth Credentials Card ──────────────────────────────────────────────

interface GmailOAuthConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

function GmailOAuthCard({
  config,
  updateConfigMutation,
}: {
  config: PrAgentConfig | undefined;
  updateConfigMutation: { mutate: (data: Partial<PrAgentConfig>) => void; isPending?: boolean };
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSecrets, setShowSecrets] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [loaded, setLoaded] = useState(false);

  const { data: gmailConfig, isLoading } = useQuery<GmailOAuthConfig & { configured: boolean }>({
    queryKey: ['/api/agent/gmail-config'],
    queryFn: () => apiRequest('GET', '/api/agent/gmail-config').then(r => r.json()),
  });

  // Populate fields once loaded
  if (gmailConfig && !loaded) {
    setClientId(gmailConfig.clientId || '');
    setClientSecret(gmailConfig.clientSecret || '');
    setRefreshToken(gmailConfig.refreshToken || '');
    setLoaded(true);
  }

  const saveMutation = useMutation({
    mutationFn: (data: GmailOAuthConfig) =>
      apiRequest('PUT', '/api/agent/gmail-config', data),
    onSuccess: () => {
      toast({ title: 'Gmail credentials saved' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/gmail-config'] });
    },
    onError: (err: any) =>
      toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', '/api/agent/gmail-config'),
    onSuccess: () => {
      toast({ title: 'Gmail credentials removed' });
      setClientId('');
      setClientSecret('');
      setRefreshToken('');
      setLoaded(false);
      queryClient.invalidateQueries({ queryKey: ['/api/agent/gmail-config'] });
    },
    onError: (err: any) =>
      toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const handleSave = () => {
    if (!clientId.trim() || !clientSecret.trim() || !refreshToken.trim()) {
      toast({ title: 'All three fields are required', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({ clientId: clientId.trim(), clientSecret: clientSecret.trim(), refreshToken: refreshToken.trim() });
  };

  const isConfigured = gmailConfig?.configured ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Gmail OAuth Credentials
        </CardTitle>
        <CardDescription>
          Connect a Gmail account to send pitches automatically.
          {' '}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-primary"
          >
            Google Cloud Console
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicator */}
        <div className="flex items-center gap-2 text-sm">
          {isConfigured ? (
            <>
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span className="text-green-700 font-medium">Connected</span>
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Not configured</span>
            </>
          )}
        </div>

        {/* Gmail Enabled toggle + From address */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={config?.gmailEnabled ?? false}
              onCheckedChange={(checked) => updateConfigMutation.mutate({ gmailEnabled: checked })}
            />
            <Label className="text-xs">Gmail Sending Enabled</Label>
          </div>
          <div>
            <Label className="text-xs">From Address</Label>
            <Input
              defaultValue={config?.gmailFrom ?? 'pete@ones.health'}
              onBlur={(e) => updateConfigMutation.mutate({ gmailFrom: e.target.value })}
              placeholder="pete@ones.health"
            />
          </div>
        </div>

        {/* Credential fields */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Client ID</Label>
            <Input
              type={showSecrets ? 'text' : 'password'}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="xxxx.apps.googleusercontent.com"
            />
          </div>
          <div>
            <Label className="text-xs">Client Secret</Label>
            <Input
              type={showSecrets ? 'text' : 'password'}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="GOCSPX-..."
            />
          </div>
          <div>
            <Label className="text-xs">Refresh Token</Label>
            <Input
              type={showSecrets ? 'text' : 'password'}
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              placeholder="1//..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSecrets(!showSecrets)}>
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            {showSecrets ? 'Hide' : 'Show'} secrets
          </Button>
          <div className="flex gap-2">
            {isConfigured && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Remove
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1.5" />
              )}
              Save Credentials
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Dialogs ───────────────────────────────────────────────────────────────────

function ProspectDetailDialog({ prospect, onClose }: { prospect: Prospect; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactRole, setNewContactRole] = useState('');

  // Fetch pitches for this prospect
  const { data: prospectPitches } = useQuery<{ pitch: Pitch; prospect: Prospect }[]>({
    queryKey: ['/api/agent/pitches', 'prospect', prospect.id],
    queryFn: () => apiRequest('GET', `/api/agent/pitches?prospectId=${prospect.id}`).then(r => r.json()),
  });

  // Fetch journalist contacts for this prospect
  const { data: contacts, isLoading: contactsLoading } = useQuery<ProspectContact[]>({
    queryKey: ['/api/agent/prospects', prospect.id, 'contacts'],
    queryFn: () => apiRequest('GET', `/api/agent/prospects/${prospect.id}/contacts`).then(r => r.json()),
  });

  const addContactMutation = useMutation({
    mutationFn: (data: { name: string; email?: string; role?: string }) =>
      apiRequest('POST', `/api/agent/prospects/${prospect.id}/contacts`, data).then(r => r.json()),
    onSuccess: () => {
      toast({ title: 'Contact added' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/prospects', prospect.id, 'contacts'] });
      setShowAddContact(false);
      setNewContactName('');
      setNewContactEmail('');
      setNewContactRole('');
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: string) =>
      apiRequest('DELETE', `/api/agent/prospects/${prospect.id}/contacts/${contactId}`),
    onSuccess: () => {
      toast({ title: 'Contact removed' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/prospects', prospect.id, 'contacts'] });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (contactId: string) =>
      apiRequest('PATCH', `/api/agent/prospects/${prospect.id}/contacts/${contactId}`, { isPrimary: true }),
    onSuccess: () => {
      toast({ title: 'Primary contact updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/prospects', prospect.id, 'contacts'] });
    },
  });

  const draftMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/agent/prospects/${prospect.id}/draft`, {}),
    onSuccess: () => {
      toast({ title: 'Pitch drafted!' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches', 'prospect', prospect.id] });
      onClose();
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const enrichMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/agent/prospects/${prospect.id}/enrich`, {}).then(r => r.json()),
    onSuccess: (data: any) => {
      const journalistsMsg = data.journalistsFound ? ` · ${data.journalistsFound} writer(s) found` : '';
      toast({ title: 'Prospect enriched', description: `Quality score: ${data.enrichmentScore || 'N/A'}${journalistsMsg}` });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/prospects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/prospects', prospect.id, 'contacts'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', `/api/agent/prospects/${prospect.id}`, { status: 'cold' }),
    onSuccess: () => {
      toast({ title: 'Prospect archived' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/prospects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
      onClose();
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{prospect.name}</DialogTitle>
          <DialogDescription>
            {prospect.category} · {prospect.subType || 'General'} · Score: {prospect.relevanceScore ?? 'N/A'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">URL</span>
            <a href={prospect.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
              Visit <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {prospect.hostName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Host</span>
              <span>{prospect.hostName}</span>
            </div>
          )}
          {prospect.contactEmail && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{prospect.contactEmail}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contact Method</span>
            <ContactBadge method={prospect.contactMethod} email={prospect.contactEmail} />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={prospect.status} />
          </div>
          {prospect.topics && prospect.topics.length > 0 && (
            <div>
              <span className="text-muted-foreground">Topics</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {prospect.topics.map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
          )}
          {prospect.notes && (
            <div>
              <span className="text-muted-foreground">Notes</span>
              <p className="mt-1 text-xs bg-muted p-2 rounded">{prospect.notes}</p>
            </div>
          )}

          {/* Journalist/Writer Contacts */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm font-medium flex items-center gap-1">
                <Users className="h-4 w-4" /> Writers / Contacts
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowAddContact(!showAddContact)}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>

            {showAddContact && (
              <div className="bg-muted/50 p-3 rounded-lg mb-2 space-y-2">
                <Input
                  placeholder="Name"
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                  className="h-8 text-xs"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Email (optional)"
                    value={newContactEmail}
                    onChange={e => setNewContactEmail(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Role (optional)"
                    value={newContactRole}
                    onChange={e => setNewContactRole(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddContact(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={!newContactName.trim() || addContactMutation.isPending}
                    onClick={() => addContactMutation.mutate({
                      name: newContactName.trim(),
                      email: newContactEmail.trim() || undefined,
                      role: newContactRole.trim() || undefined,
                    })}
                  >
                    {addContactMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </div>
            )}

            {contactsLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading contacts...
              </div>
            ) : contacts && contacts.length > 0 ? (
              <div className="space-y-2">
                {contacts.map(contact => (
                  <div key={contact.id} className={`bg-muted/50 p-2.5 rounded-lg text-xs ${contact.isPrimary ? 'ring-1 ring-blue-300 bg-blue-50/50' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm">{contact.name}</span>
                          {contact.isPrimary && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-blue-100">
                              <Star className="h-2.5 w-2.5 mr-0.5" /> Primary
                            </Badge>
                          )}
                        </div>
                        {contact.role && (
                          <span className="text-muted-foreground">{contact.role}</span>
                        )}
                        {contact.beat && (
                          <span className="text-muted-foreground ml-1">· Covers: {contact.beat}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        {!contact.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            title="Set as primary contact"
                            onClick={() => setPrimaryMutation.mutate(contact.id)}
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                          onClick={() => deleteContactMutation.mutate(contact.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline flex items-center gap-0.5">
                          <Mail className="h-3 w-3" /> {contact.email}
                        </a>
                      )}
                      {contact.linkedinUrl && (
                        <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
                          <Linkedin className="h-3 w-3" /> LinkedIn
                        </a>
                      )}
                      {contact.twitterHandle && (
                        <a href={`https://x.com/${contact.twitterHandle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
                          <Twitter className="h-3 w-3" /> {contact.twitterHandle}
                        </a>
                      )}
                    </div>

                    {contact.recentArticles && contact.recentArticles.length > 0 && (
                      <div className="mt-1.5 text-[11px] text-muted-foreground">
                        <span className="font-medium">Recent articles:</span>{' '}
                        {contact.recentArticles.join(' · ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-1">
                No contacts yet. Click <strong>Enrich</strong> to discover writers, or add manually.
              </p>
            )}
          </div>

          {/* Lead Tier Selector */}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Lead Tier</span>
            <div className="flex gap-1">
              {(['strong', 'medium', 'weak'] as const).map(tier => (
                <Button
                  key={tier}
                  size="sm"
                  variant={prospect.leadTier === tier ? 'default' : 'outline'}
                  className={`text-xs h-7 ${
                    prospect.leadTier === tier
                      ? tier === 'strong' ? 'bg-green-600 hover:bg-green-700'
                        : tier === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600'
                        : 'bg-red-500 hover:bg-red-600'
                      : ''
                  }`}
                  onClick={() => {
                    const newTier = prospect.leadTier === tier ? null : tier;
                    apiRequest('PATCH', `/api/agent/prospects/${prospect.id}`, { leadTier: newTier })
                      .then(() => {
                        prospect.leadTier = newTier;
                        toast({ title: newTier ? `Marked as ${newTier} lead` : 'Tier removed' });
                        queryClient.invalidateQueries({ queryKey: ['/api/agent/prospects'] });
                      })
                      .catch((err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }));
                  }}
                >
                  {tier === 'strong' ? '🟢' : tier === 'medium' ? '🟡' : '🔴'} {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Pitch History */}
          {prospectPitches && prospectPitches.length > 0 && (
            <div className="border-t pt-3">
              <span className="text-muted-foreground text-sm font-medium">Pitch History</span>
              <div className="mt-2 space-y-2">
                {prospectPitches.map(({ pitch }) => (
                  <div key={pitch.id} className="flex items-center justify-between bg-muted/50 p-2 rounded text-xs">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={pitch.status} />
                      <span className="font-medium truncate max-w-[200px]">{pitch.subject}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{pitch.pitchType}</span>
                      <span>{new Date(pitch.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex gap-2">
            {prospect.status !== 'cold' && (
              <Button variant="ghost" className="text-muted-foreground" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending}>
                <Trash2 className="h-4 w-4 mr-1" /> Archive
              </Button>
            )}
            {prospect.status !== 'manually_contacted' && (
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={() => {
                  apiRequest('PATCH', `/api/agent/prospects/${prospect.id}`, { status: 'manually_contacted' })
                    .then(() => {
                      toast({ title: 'Marked as manually contacted' });
                      queryClient.invalidateQueries({ queryKey: ['/api/agent/prospects'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
                      onClose();
                    })
                    .catch((err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }));
                }}
              >
                <UserCheck className="h-4 w-4 mr-1" /> Contacted
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            <Button variant="outline" size="sm" onClick={() => enrichMutation.mutate()} disabled={enrichMutation.isPending}>
              {enrichMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
              Enrich
            </Button>
            {prospect.status === 'new' && (
              <Button size="sm" onClick={() => draftMutation.mutate()} disabled={draftMutation.isPending}>
                {draftMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                Draft Pitch
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PitchDetailDialog({ pitch, prospect, onClose }: { pitch: Pitch; prospect: Prospect; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Local overrides: after a rewrite the backend already saved, so we just
  // override what the dialog displays without requiring "Save Changes".
  const [localPitch, setLocalPitch] = useState<{ subject: string; body: string }>({
    subject: pitch.subject,
    body: pitch.body,
  });
  const [editedSubject, setEditedSubject] = useState(pitch.subject);
  const [editedBody, setEditedBody] = useState(pitch.body);
  const [isEditing, setIsEditing] = useState(false);
  const [isAiRewrite, setIsAiRewrite] = useState(false);
  const [rewriteInstructions, setRewriteInstructions] = useState('');

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Pitch>) => apiRequest('PATCH', `/api/agent/pitches/${pitch.id}`, data),
    onSuccess: () => {
      // Sync local display so non-edit view reflects the save
      setLocalPitch({ subject: editedSubject, body: editedBody });
      toast({ title: 'Pitch updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      setIsEditing(false);
    },
  });

  const rewriteMutation = useMutation({
    mutationFn: (instructions: string) =>
      apiRequest('POST', `/api/agent/pitches/${pitch.id}/rewrite`, { instructions }).then(r => r.json()),
    onSuccess: (data: { subject: string; body: string }) => {
      // Backend already saved the rewrite — update local display immediately
      setLocalPitch({ subject: data.subject, body: data.body });
      setEditedSubject(data.subject);
      setEditedBody(data.body);
      toast({ title: 'AI rewrite applied', description: 'The updated pitch is saved.' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      setIsAiRewrite(false);
      setIsEditing(false);
      setRewriteInstructions('');
    },
    onError: (err: any) => toast({ title: 'Rewrite failed', description: err.message, variant: 'destructive' }),
  });

  const approveMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/agent/pitches/${pitch.id}/approve`, {}),
    onSuccess: () => {
      toast({ title: 'Pitch approved' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
      onClose();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/agent/pitches/${pitch.id}/reject`, {}),
    onSuccess: () => {
      toast({ title: 'Pitch rejected' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusBadge status={pitch.status} />
            Pitch to {prospect.name}
          </DialogTitle>
          <DialogDescription>
            {pitch.pitchType} · Template: {pitch.templateUsed || 'custom'} · {pitch.category}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prospect Info */}
          <div className="bg-muted/50 border rounded-lg p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{prospect.name}</span>
              <ContactBadge method={prospect.contactMethod} email={prospect.contactEmail} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Website</span>
              <a href={prospect.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 max-w-[300px] truncate">
                {prospect.url.replace(/^https?:\/\//, '').replace(/\/$/, '')} <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </div>
            {prospect.hostName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Host</span>
                <span>{prospect.hostName}</span>
              </div>
            )}
            {prospect.contactEmail && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{prospect.contactEmail}</span>
              </div>
            )}
            {prospect.contactFormUrl && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Form URL</span>
                <a href={prospect.contactFormUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 max-w-[300px] truncate">
                  {prospect.contactFormUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
            )}
            {prospect.audienceEstimate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audience</span>
                <span>{prospect.audienceEstimate}</span>
              </div>
            )}
            {prospect.relevanceScore !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Score</span>
                <ScoreBadge score={prospect.relevanceScore} />
              </div>
            )}
            {prospect.topics && prospect.topics.length > 0 && (
              <div>
                <span className="text-muted-foreground">Topics</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {prospect.topics.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
            {prospect.notes && (
              <div>
                <span className="text-muted-foreground">Notes</span>
                <p className="mt-1 text-xs bg-muted p-2 rounded">{prospect.notes}</p>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Subject</Label>
            {isEditing ? (
              <Input value={editedSubject} onChange={(e) => setEditedSubject(e.target.value)} />
            ) : (
              <p className="font-medium">{localPitch.subject}</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Body</Label>
              {isEditing && (
                <VoiceInput
                  onTranscript={(text) => setEditedBody(prev => prev ? prev + ' ' + text : text)}
                  size="sm"
                />
              )}
            </div>
            {isEditing ? (
              <Textarea value={editedBody} onChange={(e) => setEditedBody(e.target.value)} rows={12} />
            ) : (
              <div className="bg-muted p-4 rounded text-sm whitespace-pre-wrap">{localPitch.body}</div>
            )}
          </div>

          {/* Form Answers (for form-based prospects) */}
          {pitch.formAnswers && Object.keys(pitch.formAnswers).length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Form Answers (filled by AI)</Label>
              <div className="bg-orange-50 border border-orange-200 rounded p-3 space-y-1.5">
                {Object.entries(pitch.formAnswers).map(([label, value]) => (
                  <div key={label} className="text-sm">
                    <span className="font-medium text-orange-800">{label}:</span>{' '}
                    <span className="text-orange-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sent Via indicator */}
          {pitch.sentVia && (
            <div className="text-xs text-muted-foreground">
              Sent via: <span className="font-medium">{pitch.sentVia === 'form_auto' ? 'Form (auto-submitted)' : pitch.sentVia === 'form_manual' ? 'Form (manual)' : pitch.sentVia}</span>
              {pitch.sentAt && <> at {new Date(pitch.sentAt).toLocaleString()}</>}
            </div>
          )}

          {/* AI Rewrite Section */}
          {isAiRewrite && (
            <div className="border border-dashed border-purple-300 bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
                <Sparkles className="h-4 w-4" />
                AI Rewrite
              </div>
              <div className="relative">
                <Textarea
                  value={rewriteInstructions}
                  onChange={(e) => setRewriteInstructions(e.target.value)}
                  placeholder="Describe what you want changed, e.g. 'make it shorter and more casual' or 'emphasize our AI personalization technology' — or use the mic button to speak"
                  rows={3}
                  className="text-sm pr-10"
                />
                <div className="absolute top-2 right-2">
                  <VoiceInput
                    onTranscript={(text) => setRewriteInstructions(prev => prev ? prev + ' ' + text : text)}
                    size="sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => rewriteMutation.mutate(rewriteInstructions)}
                  disabled={!rewriteInstructions.trim() || rewriteMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {rewriteMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {rewriteMutation.isPending ? 'Rewriting...' : 'Rewrite'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsAiRewrite(false); setRewriteInstructions(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={() => updateMutation.mutate({ subject: editedSubject, body: editedBody })}>
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Close</Button>
              {pitch.status === 'pending_review' && (
                <>
                  <Button variant="outline" onClick={() => { setEditedSubject(localPitch.subject); setEditedBody(localPitch.body); setIsEditing(true); }}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                  {!isAiRewrite && (
                    <Button variant="outline" className="text-purple-600 border-purple-300 hover:bg-purple-50" onClick={() => setIsAiRewrite(true)}>
                      <Sparkles className="h-4 w-4 mr-2" /> AI Rewrite
                    </Button>
                  )}
                  <Button onClick={() => approveMutation.mutate()}>
                    <Check className="h-4 w-4 mr-2" /> Approve
                  </Button>
                  <Button variant="destructive" onClick={() => rejectMutation.mutate()}>
                    <X className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Shared Components ─────────────────────────────────────────────────────────

function StatCard({ label, value, icon, onClick }: { label: string; value: number; icon?: React.ReactNode; onClick?: () => void }) {
  return (
    <Card className={onClick ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''} onClick={onClick}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          {icon}
        </div>
        <p className="text-2xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    new: 'secondary',
    running: 'default',
    completed: 'default',
    failed: 'destructive',
    draft: 'secondary',
    pending_review: 'outline',
    approved: 'default',
    sent: 'default',
    rejected: 'destructive',
    skipped: 'secondary',
    pitched: 'outline',
    responded: 'default',
    booked: 'default',
    published: 'default',
    manually_contacted: 'default',
    cold: 'secondary',
    paused: 'outline',
  };

  return (
    <Badge variant={variants[status] || 'secondary'} className="text-xs capitalize">
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-xs text-muted-foreground">—</span>;
  const color = score >= 75 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-500';
  return <span className={`font-mono text-sm font-medium ${color}`}>{score}</span>;
}

function TierBadge({ tier }: { tier: 'strong' | 'medium' | 'weak' | null }) {
  if (!tier) return <span className="text-xs text-muted-foreground">—</span>;
  const config = {
    strong: { emoji: '🟢', label: 'Strong', className: 'bg-green-100 text-green-800 border-green-200' },
    medium: { emoji: '🟡', label: 'Medium', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    weak:   { emoji: '🔴', label: 'Weak',   className: 'bg-red-100 text-red-800 border-red-200' },
  }[tier];
  return (
    <Badge variant="outline" className={`text-xs ${config.className}`}>
      {config.emoji} {config.label}
    </Badge>
  );
}

function ContactBadge({ method, email }: { method: string; email: string | null }) {
  if (method === 'email' && email) {
    return (
      <Badge variant="outline" className="text-xs">
        <Mail className="h-3 w-3 mr-1" />
        Email
      </Badge>
    );
  }
  if (method === 'form') {
    return (
      <Badge variant="outline" className="text-xs">
        <FileText className="h-3 w-3 mr-1" />
        Form
      </Badge>
    );
  }
  return <Badge variant="secondary" className="text-xs">Unknown</Badge>;
}
