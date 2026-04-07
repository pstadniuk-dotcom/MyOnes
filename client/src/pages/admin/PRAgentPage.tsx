import { useState, useEffect, useRef } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Skeleton } from '@/shared/components/ui/skeleton';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
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
  DollarSign,
  Briefcase,
  Target,
  Activity,
  Phone,
  Building2,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Calendar,
  Filter,
  CheckCircle2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Prospect {
  id: string;
  name: string;
  category: 'podcast' | 'press' | 'investor';
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
  category: 'podcast' | 'press' | 'investor';
  pitchType: string;
  templateUsed: string | null;
  subject: string;
  body: string;
  formAnswers: Record<string, string> | null;
  status: string;
  sentAt: string | null;
  sentVia: string | null;
  responseReceived: boolean;
  responseAt: string | null;
  responseSummary: string | null;
  responseClassification: string | null;
  followUpDueAt: string | null;
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
  runLog?: Array<{
    timestamp: string;
    action: string;
    result: string;
    details?: any;
  }>;
}

interface DashboardData {
  stats: {
    totalProspects: number;
    podcastProspects: number;
    pressProspects: number;
    investorProspects: number;
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
    podcast?: string[];
    press?: string[];
    investor?: string[];
  };
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PRAgentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pipeline');

  const { data: dashboard, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ['/api/agent/dashboard'],
    refetchInterval: (query: any) => {
      const d = query.state.data as DashboardData | undefined;
      return d?.recentRuns?.some((r: any) => r.status === 'running') ? 5000 : false;
    },
  });

  // ── Lifted active-scan state (persists across tab switches) ──
  const [activeScans, setActiveScans] = useState<Array<{ runId: string; label: string }>>([]);

  // Clean up completed scans from local state when dashboard updates
  useEffect(() => {
    if (!dashboard?.recentRuns) return;
    setActiveScans(prev =>
      prev.filter(s => {
        const run = dashboard.recentRuns.find(r => r.id === s.runId);
        return !run || run.status === 'running';
      })
    );
  }, [dashboard?.recentRuns]);

  function addActiveScan(runId: string, label: string) {
    setActiveScans(prev => [...prev.filter(s => s.runId !== runId), { runId, label }]);
  }

  // Merge dashboard running run IDs with locally tracked scan IDs
  const runningRuns = dashboard?.recentRuns?.filter(r => r.status === 'running') ?? [];
  const allActiveRunIds = Array.from(new Set([
    ...runningRuns.map(r => r.id),
    ...activeScans.map(s => s.runId),
  ]));
  const allActiveLabels = Array.from(new Set([
    ...runningRuns.map(r => {
      if (r.agentName === 'pr_scan') return 'PR Scan';
      if (r.agentName === 'investor_scan') return 'Investor Scan';
      if (r.agentName === 'competitor_scan') return 'Competitor Scan';
      if (r.agentName === 'pr_pitch_batch') return 'Pitch Drafting';
      return r.agentName;
    }),
    ...activeScans.map(s => s.label),
  ]));
  const isAnyActive = allActiveRunIds.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Outreach Agent</h1>
          <p className="text-sm text-muted-foreground">
            Prospect, pitch, and track your outreach pipeline
          </p>
        </div>
        {dashboard && (
          <Badge variant={dashboard.enabled ? 'default' : 'secondary'} className="text-sm">
            {dashboard.enabled ? 'Active' : 'Disabled'}
          </Badge>
        )}
      </div>

      {/* Persistent Activity Feed — stays visible across all tabs */}
      {isAnyActive && (
        <>
          <Card className="border-blue-300 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="pt-4 pb-3 flex items-center gap-3 text-sm text-blue-800 dark:text-blue-200">
              <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
              <div>
                <span className="font-medium">
                  {allActiveLabels.join(', ')} in progress...
                </span>
                <span className="ml-2 text-blue-600 dark:text-blue-300">
                  Results will appear automatically when complete.
                </span>
              </div>
            </CardContent>
          </Card>
          <ActivityFeed runIds={allActiveRunIds} scanLabels={allActiveLabels} />
        </>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="pipeline" className="gap-1.5"><Target className="w-3.5 h-3.5" /> Pipeline</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Contacts</TabsTrigger>
          <TabsTrigger value="pitches" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Pitches</TabsTrigger>
          <TabsTrigger value="agent" className="gap-1.5"><Zap className="w-3.5 h-3.5" /> Agent</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Settings className="w-3.5 h-3.5" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <PipelineTab onNavigate={setActiveTab} />
        </TabsContent>
        <TabsContent value="contacts">
          <ContactsTab />
        </TabsContent>
        <TabsContent value="pitches">
          <PitchesTab />
        </TabsContent>
        <TabsContent value="agent">
          <OverviewTab dashboard={dashboard} isLoading={dashLoading} onNavigate={setActiveTab} addActiveScan={addActiveScan} />
          <div className="mt-6 space-y-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Run History</h3>
            <RunsTab />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Analytics</h3>
            <AnalyticsTab />
          </div>
        </TabsContent>
        <TabsContent value="settings">
          <TemplatesTab />
          <div className="mt-8">
            <SettingsTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, string> = {
  scan_started: '🚀',
  web_search: '🔍',
  search_results: '📋',
  search_complete: '✅',
  search_error: '⚠️',
  dedup_complete: '🔄',
  dedup_start: '🔄',
  processing_start: '⚙️',
  processing_prospect: '👤',
  prospect_skipped: '⏭️',
  prospect_ready: '✓',
  email_search: '📧',
  scanning_competitor: '🏢',
  competitor_error: '⚠️',
  saving: '💾',
  scan_complete: '🎉',
};

function ActivityFeed({ runIds, scanLabels }: { runIds: string[]; scanLabels?: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<Array<{ timestamp: string; action: string; result: string; runId: string }>>([]);

  useEffect(() => {
    if (runIds.length === 0) { setLogs([]); return; }

    let active = true;

    async function poll() {
      const allLogs: typeof logs = [];
      for (const id of runIds) {
        try {
          const res = await apiRequest('GET', `/api/agent/runs/${id}`);
          const run = await res.json();
          if (run.runLog && Array.isArray(run.runLog)) {
            for (const entry of run.runLog) {
              allLogs.push({ ...entry, runId: id });
            }
          }
        } catch { /* ignore */ }
      }
      if (active) {
        allLogs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        setLogs(allLogs);
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [runIds.join(',')]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  if (runIds.length === 0) return null;

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-500" />
          Live Activity
          {scanLabels && scanLabels.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">— {scanLabels.join(', ')}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div ref={scrollRef} className="max-h-56 overflow-y-auto space-y-1 text-xs font-mono">
          {logs.length === 0 ? (
            <div className="flex items-center gap-2 py-2 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Initializing scan...</span>
            </div>
          ) : (
            logs.map((entry, i) => {
              const time = new Date(entry.timestamp).toLocaleTimeString();
              const icon = ACTION_ICONS[entry.action] || '•';
              const isComplete = entry.action === 'scan_complete';
              return (
                <div key={i} className={`flex gap-2 py-0.5 ${isComplete ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-muted-foreground'}`}>
                  <span className="flex-shrink-0 w-16 text-[10px] opacity-60">{time}</span>
                  <span className="flex-shrink-0">{icon}</span>
                  <span className="break-words">{entry.result}</span>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ dashboard, isLoading, onNavigate, addActiveScan }: { dashboard?: DashboardData; isLoading: boolean; onNavigate: (tab: string) => void; addActiveScan: (runId: string, label: string) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const scanMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/scan', {}).then(r => r.json()),
    onSuccess: (data: any) => {
      if (data.runId) addActiveScan(data.runId, 'PR Scan');
      toast({ title: 'Scan started', description: 'Watch the activity feed below.' });
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
    mutationFn: () => apiRequest('POST', '/api/agent/competitor-scan', {}).then(r => r.json()),
    onSuccess: (data: any) => {
      if (data.runId) addActiveScan(data.runId, 'Competitor Scan');
      toast({ title: 'Competitor scan started', description: 'Watch the activity feed below.' });
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

  const investorScanMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/investor-scan', {}).then(r => r.json()),
    onSuccess: (data: any) => {
      if (data.runId) addActiveScan(data.runId, 'Investor Scan');
      toast({ title: 'Investor scan started', description: 'Watch the activity feed below.' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const stats = dashboard?.stats;

  // Derive running state from dashboard
  const runningRuns = dashboard?.recentRuns?.filter(r => r.status === 'running') ?? [];
  const isScanRunning = runningRuns.some(r => r.agentName === 'pr_scan') || scanMutation.isPending;
  const isInvestorScanRunning = runningRuns.some(r => r.agentName === 'investor_scan') || investorScanMutation.isPending;
  const isCompetitorRunning = runningRuns.some(r => r.agentName === 'competitor_scan') || competitorMutation.isPending;
  const isPitchRunning = runningRuns.some(r => r.agentName === 'pr_pitch_batch') || pitchBatchMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Prospects" value={stats?.totalProspects ?? 0} />
        <StatCard label="Podcasts" value={stats?.podcastProspects ?? 0} icon={<Radio className="h-4 w-4 text-muted-foreground" />} onClick={() => onNavigate('contacts')} />
        <StatCard label="Press" value={stats?.pressProspects ?? 0} icon={<Newspaper className="h-4 w-4 text-muted-foreground" />} onClick={() => onNavigate('contacts')} />
        <StatCard label="Investors" value={stats?.investorProspects ?? 0} icon={<Briefcase className="h-4 w-4 text-muted-foreground" />} onClick={() => onNavigate('contacts')} />
        <StatCard label="Pending Review" value={stats?.pendingPitches ?? 0} icon={<Edit className="h-4 w-4 text-orange-500" />} onClick={() => onNavigate('pitches')} />
        <StatCard label="Sent" value={stats?.sentPitches ?? 0} icon={<Send className="h-4 w-4 text-blue-500" />} onClick={() => onNavigate('pitches')} />
        <StatCard label="Follow-ups Due" value={stats?.followUpsDue ?? 0} icon={<Clock className="h-4 w-4 text-orange-500" />} onClick={() => onNavigate('pitches')} />
        <StatCard label="Responses" value={stats?.responses ?? 0} icon={<Mail className="h-4 w-4 text-green-500" />} onClick={() => onNavigate('pitches')} />
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
          <Button variant="outline" onClick={() => investorScanMutation.mutate()} disabled={isInvestorScanRunning}>
            {isInvestorScanRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Briefcase className="h-4 w-4 mr-2" />}
            {isInvestorScanRunning ? 'Scanning...' : 'Find Investors'}
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

function ProspectsTab({ category }: { category: 'podcast' | 'press' | 'investor' }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  type ProspectPitchRow = { pitch: { prospectId: string; status: string } };

  const { data, isLoading } = useQuery<{ prospects: Prospect[]; total: number }>({
    queryKey: ['/api/agent/prospects', category],
    queryFn: () => apiRequest('GET', `/api/agent/prospects?category=${category}&limit=100`).then(r => r.json()),
  });

  const { data: draftPitches = [] } = useQuery<ProspectPitchRow[]>({
    queryKey: ['/api/agent/pitches', category, 'pending_review'],
    queryFn: () =>
      apiRequest('GET', `/api/agent/pitches?category=${category}&status=pending_review&limit=100`).then(r => r.json()),
  });

  const { data: rawDraftPitches = [] } = useQuery<ProspectPitchRow[]>({
    queryKey: ['/api/agent/pitches', category, 'draft'],
    queryFn: () =>
      apiRequest('GET', `/api/agent/pitches?category=${category}&status=draft&limit=100`).then(r => r.json()),
  });
console.log(draftPitches, rawDraftPitches);
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
  const draftProspectIds = new Set([
    ...draftPitches.map(row => row.pitch.prospectId),
    ...rawDraftPitches.map(row => row.pitch.prospectId),
  ]);
  const draftsCount = allProspects.filter(p => draftProspectIds.has(p.id)).length;

  // Filter by search term, status, and contact method
  const prospects = allProspects.filter(p => {
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.hostName && p.hostName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.contactEmail && p.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.topics && p.topics.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesContact = contactFilter === 'all'
      ? true
      : contactFilter === 'drafts'
        ? draftProspectIds.has(p.id)
        : p.contactMethod === contactFilter;
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
              { key: 'drafts', label: 'Drafts', icon: <Edit className="h-3 w-3" />, count: draftsCount },
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

  const redraftMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/agent/redraft-all', {}).then(r => r.json()),
    onSuccess: (data: any) => {
      toast({ title: 'Redraft complete', description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/prospects'] });
    },
    onError: (err: any) => toast({ title: 'Redraft failed', description: err.message, variant: 'destructive' }),
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
          <Button size="sm" variant="outline" onClick={() => redraftMutation.mutate()} disabled={redraftMutation.isPending}>
            {redraftMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Redraft All Pending
          </Button>
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

// ── Templates Tab ─────────────────────────────────────────────────────────────

interface CustomTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

function TemplatesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewAiTemplates, setViewAiTemplates] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('investor');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formFavorite, setFormFavorite] = useState(false);

  const { data: customTemplates = [], isLoading } = useQuery<CustomTemplate[]>({
    queryKey: ['/api/agent/custom-templates'],
    queryFn: () => apiRequest('GET', '/api/agent/custom-templates').then(r => r.json()),
  });

  const { data: aiTemplates = [] } = useQuery<any[]>({
    queryKey: ['/api/agent/templates'],
    queryFn: () => apiRequest('GET', '/api/agent/templates').then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; category: string; subject: string; body: string; isFavorite: boolean }) =>
      apiRequest('POST', '/api/agent/custom-templates', data).then(r => r.json()),
    onSuccess: () => {
      toast({ title: 'Template created' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/custom-templates'] });
      resetForm();
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; category?: string; subject?: string; body?: string; isFavorite?: boolean }) =>
      apiRequest('PUT', `/api/agent/custom-templates/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      toast({ title: 'Template updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/custom-templates'] });
      resetForm();
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/agent/custom-templates/${id}`),
    onSuccess: () => {
      toast({ title: 'Template deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/custom-templates'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  function resetForm() {
    setShowCreate(false);
    setEditingId(null);
    setFormName('');
    setFormCategory('investor');
    setFormSubject('');
    setFormBody('');
    setFormFavorite(false);
  }

  function startEdit(t: CustomTemplate) {
    setEditingId(t.id);
    setFormName(t.name);
    setFormCategory(t.category);
    setFormSubject(t.subject);
    setFormBody(t.body);
    setFormFavorite(t.isFavorite);
    setShowCreate(true);
  }

  function handleSave() {
    if (!formName.trim() || !formSubject.trim() || !formBody.trim()) {
      toast({ title: 'Name, subject, and body are required', variant: 'destructive' });
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, name: formName, category: formCategory, subject: formSubject, body: formBody, isFavorite: formFavorite });
    } else {
      createMutation.mutate({ name: formName, category: formCategory, subject: formSubject, body: formBody, isFavorite: formFavorite });
    }
  }

  const categoryColors: Record<string, string> = {
    investor: 'bg-emerald-100 text-emerald-800',
    podcast: 'bg-blue-100 text-blue-800',
    press: 'bg-purple-100 text-purple-800',
    other: 'bg-gray-100 text-gray-800',
  };

  const favorites = customTemplates.filter(t => t.isFavorite);
  const rest = customTemplates.filter(t => !t.isFavorite);
  const sortedTemplates = [...favorites, ...rest];

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Email Templates</h3>
          <p className="text-sm text-muted-foreground">
            Canned emails you can reuse for outreach. {customTemplates.length} template{customTemplates.length !== 1 ? 's' : ''} saved.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewAiTemplates(!viewAiTemplates)}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {viewAiTemplates ? 'Hide' : 'View'} AI Templates
          </Button>
          <Button
            size="sm"
            onClick={() => { resetForm(); setShowCreate(true); }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Template
          </Button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {showCreate && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editingId ? 'Edit Template' : 'New Template'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Template Name</Label>
                <Input
                  placeholder="e.g., Investor Intro"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="investor">Investor</option>
                  <option value="podcast">Podcast</option>
                  <option value="press">Press</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="template-fav"
                    checked={formFavorite}
                    onCheckedChange={(checked) => setFormFavorite(checked === true)}
                  />
                  <Label htmlFor="template-fav" className="text-xs">Favorite</Label>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Subject Line</Label>
              <Input
                placeholder="e.g., Ones: One supplement built with AI"
                value={formSubject}
                onChange={e => setFormSubject(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Email Body</Label>
              <Textarea
                placeholder="Hi [Name],&#10;&#10;Write your template here. Use [Name] as a placeholder for the recipient..."
                rows={8}
                value={formBody}
                onChange={e => setFormBody(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                )}
                {editingId ? 'Update' : 'Save'} Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Templates List */}
      {sortedTemplates.length === 0 && !showCreate ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-2">No templates yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create canned emails for investor outreach, podcast pitches, press, or anything else.
            </p>
            <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedTemplates.map(t => (
            <Card key={t.id} className={t.isFavorite ? 'border-amber-300 bg-amber-50/30' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {t.isFavorite && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                    <span className="font-medium">{t.name}</span>
                    <Badge className={`text-xs ${categoryColors[t.category] || categoryColors.other}`}>
                      {t.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title={t.isFavorite ? 'Remove favorite' : 'Mark as favorite'}
                      onClick={() => updateMutation.mutate({ id: t.id, isFavorite: !t.isFavorite })}
                    >
                      <Star className={`h-3.5 w-3.5 ${t.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => startEdit(t)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                      onClick={() => {
                        if (confirm('Delete this template?')) deleteMutation.mutate(t.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm mb-2">
                  <span className="text-muted-foreground">Subject:</span>{' '}
                  <span className="font-medium">{t.subject}</span>
                </div>
                <div className="bg-muted/50 rounded p-3 text-sm whitespace-pre-wrap text-foreground/80">
                  {t.body}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Updated {new Date(t.updatedAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* AI Templates Reference (collapsible) */}
      {viewAiTemplates && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Pitch Templates ({aiTemplates.length})
            <span className="font-normal">— Used by the AI when auto-drafting pitches</span>
          </h4>
          {aiTemplates.map((t: any) => (
            <Card key={t.id} className="bg-muted/20 border-dashed">
              <CardContent className="py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t.name}</span>
                    <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                    <Badge variant="outline" className="text-xs">{t.subType}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Max {t.maxLength} words</span>
                </div>
                <p className="text-xs text-muted-foreground italic">{t.toneGuidance}</p>
                {t.exampleSubjectLines && (
                  <div className="mt-2 text-xs">
                    <span className="text-muted-foreground">Example subjects: </span>
                    {t.exampleSubjectLines.slice(0, 2).join(' · ')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
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

      {/* Search Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Queries
          </CardTitle>
          <CardDescription>Customize the search queries used when scanning for prospects. One query per line.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(['podcast', 'press', 'investor'] as const).map(category => (
            <div key={category}>
              <Label className="text-xs capitalize mb-1 block">{category} Queries</Label>
              <Textarea
                rows={5}
                className="font-mono text-xs"
                defaultValue={(config?.searchQueries?.[category] ?? []).join('\n')}
                placeholder={`Enter ${category} search queries, one per line...`}
                onBlur={(e) => {
                  const queries = e.target.value
                    .split('\n')
                    .map(q => q.trim())
                    .filter(Boolean);
                  updateConfigMutation.mutate({
                    searchQueries: {
                      ...config?.searchQueries,
                      [category]: queries,
                    },
                  });
                }}
              />
            </div>
          ))}
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
  const [expandedPitchId, setExpandedPitchId] = useState<string | null>(null);
  const [editingPitchId, setEditingPitchId] = useState<string | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [isAiRewrite, setIsAiRewrite] = useState(false);
  const [rewriteInstructions, setRewriteInstructions] = useState('');
  const [activeSection, setActiveSection] = useState<'info' | 'emails' | 'contacts'>('info');

  // Fetch pitches for this prospect
  const { data: prospectPitches, isLoading: pitchesLoading } = useQuery<{ pitch: Pitch; prospect: Prospect }[]>({
    queryKey: ['/api/agent/pitches', 'prospect', prospect.id],
    queryFn: () => apiRequest('GET', `/api/agent/pitches?prospectId=${prospect.id}`).then(r => r.json()),
  });

  // Fetch custom email templates
  const { data: customTemplates = [] } = useQuery<CustomTemplate[]>({
    queryKey: ['/api/agent/custom-templates'],
    queryFn: () => apiRequest('GET', '/api/agent/custom-templates').then(r => r.json()),
  });

  // Fetch journalist contacts for this prospect
  const { data: contacts, isLoading: contactsLoading } = useQuery<ProspectContact[]>({
    queryKey: ['/api/agent/prospects', prospect.id, 'contacts'],
    queryFn: () => apiRequest('GET', `/api/agent/prospects/${prospect.id}/contacts`).then(r => r.json()),
  });

  // Derive follow-up alerts from pitches
  const sentPitches = prospectPitches?.filter(p => p.pitch.status === 'sent' && !p.pitch.responseReceived) || [];
  const needsFollowUp = sentPitches.some(p => {
    if (!p.pitch.followUpDueAt) return false;
    return new Date(p.pitch.followUpDueAt) <= new Date();
  });
  const nextFollowUpDue = sentPitches
    .filter(p => p.pitch.followUpDueAt && new Date(p.pitch.followUpDueAt) <= new Date())
    .sort((a, b) => new Date(a.pitch.followUpDueAt!).getTime() - new Date(b.pitch.followUpDueAt!).getTime())[0];

  // Derive the best contact info: prefer primary enriched contact, fallback to prospect fields
  const primaryContact = contacts?.find(c => c.isPrimary) || contacts?.[0];
  const bestContactName = primaryContact?.name || prospect.hostName || prospect.name || '';
  const bestContactEmail = primaryContact?.email || prospect.contactEmail || '';
  const bestCompanyName = prospect.publicationName || prospect.name || '';

  /** Replace {placeholders} in template text with actual prospect + enriched contact data */
  function applyPlaceholders(text: string): string {
    const firstName = bestContactName.split(/\s+/)[0] || '';
    const replacements: Record<string, string> = {
      '{name}': bestContactName,
      '{first_name}': firstName,
      '{host_name}': bestContactName,
      '{host_first_name}': firstName,
      '{company}': bestCompanyName,
      '{publication}': bestCompanyName,
      '{show_name}': prospect.name || '',
      '{email}': bestContactEmail,
      '{url}': prospect.url || '',
      '{category}': prospect.category || '',
    };
    let result = text;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replaceAll(placeholder, value);
    }
    return result;
  }

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
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pipeline'] });
      setActiveSection('emails');
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
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pipeline'] });
      onClose();
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updatePitchMutation = useMutation({
    mutationFn: ({ pitchId, data }: { pitchId: string; data: Partial<Pitch> }) =>
      apiRequest('PATCH', `/api/agent/pitches/${pitchId}`, data),
    onSuccess: () => {
      toast({ title: 'Pitch updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches', 'prospect', prospect.id] });
      setEditingPitchId(null);
    },
  });

  const approvePitchMutation = useMutation({
    mutationFn: (pitchId: string) => apiRequest('POST', `/api/agent/pitches/${pitchId}/approve`, {}),
    onSuccess: () => {
      toast({ title: 'Pitch approved' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches', 'prospect', prospect.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pipeline'] });
    },
  });

  const rejectPitchMutation = useMutation({
    mutationFn: (pitchId: string) => apiRequest('POST', `/api/agent/pitches/${pitchId}/reject`, {}),
    onSuccess: () => {
      toast({ title: 'Pitch rejected' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches', 'prospect', prospect.id] });
    },
  });

  const sendPitchMutation = useMutation({
    mutationFn: (pitchId: string) => apiRequest('POST', `/api/agent/pitches/${pitchId}/send`, {}),
    onSuccess: () => {
      toast({ title: 'Pitch sent!' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches', 'prospect', prospect.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
    },
    onError: (err: any) => toast({ title: 'Send failed', description: err.message, variant: 'destructive' }),
  });

  const followUpMutation = useMutation({
    mutationFn: (pitchId: string) => apiRequest('POST', `/api/agent/pitches/${pitchId}/follow-up`, {}),
    onSuccess: () => {
      toast({ title: 'Follow-up drafted' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches', 'prospect', prospect.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pipeline'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const markRespondedMutation = useMutation({
    mutationFn: (pitchId: string) => apiRequest('POST', `/api/agent/pitches/${pitchId}/responded`, {}),
    onSuccess: () => {
      toast({ title: 'Marked as responded' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches', 'prospect', prospect.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard'] });
    },
  });

  const rewritePitchMutation = useMutation({
    mutationFn: ({ pitchId, instructions }: { pitchId: string; instructions: string }) =>
      apiRequest('POST', `/api/agent/pitches/${pitchId}/rewrite`, { instructions }).then(r => r.json()),
    onSuccess: (data: { subject: string; body: string }) => {
      setEditedSubject(data.subject);
      setEditedBody(data.body);
      toast({ title: 'AI rewrite applied' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches', 'prospect', prospect.id] });
      setIsAiRewrite(false);
      setRewriteInstructions('');
    },
    onError: (err: any) => toast({ title: 'Rewrite failed', description: err.message, variant: 'destructive' }),
  });

  // Sort pitches: most recent first, group by sent status
  const sortedPitches = [...(prospectPitches || [])].sort((a, b) =>
    new Date(b.pitch.createdAt).getTime() - new Date(a.pitch.createdAt).getTime()
  );

  function daysAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'today';
    if (diff === 1) return '1 day ago';
    return `${diff} days ago`;
  }

  function daysOverdue(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return null;
    if (diff === 1) return '1 day overdue';
    return `${diff} days overdue`;
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="flex-1">{prospect.name}</DialogTitle>
            <StatusBadge status={prospect.status} />
          </div>
          <DialogDescription>
            {prospect.category} · {prospect.subType || 'General'} · Score: {prospect.relevanceScore ?? 'N/A'}
          </DialogDescription>
        </DialogHeader>

        {/* Follow-up Alert Banner */}
        {needsFollowUp && nextFollowUpDue && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-amber-800">Follow-up needed</p>
              <p className="text-xs text-amber-600">
                No response received · {daysOverdue(nextFollowUpDue.pitch.followUpDueAt!) || 'Due today'}
              </p>
            </div>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0"
              onClick={() => {
                followUpMutation.mutate(nextFollowUpDue.pitch.id);
              }}
              disabled={followUpMutation.isPending}
            >
              {followUpMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              Draft Follow-up
            </Button>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex gap-1 border-b">
          {([
            { key: 'info' as const, label: 'Details', icon: User },
            { key: 'emails' as const, label: `Emails${sortedPitches.length ? ` (${sortedPitches.length})` : ''}`, icon: Mail },
            { key: 'contacts' as const, label: `Contacts${contacts?.length ? ` (${contacts.length})` : ''}`, icon: Users },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeSection === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.key === 'emails' && needsFollowUp && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* ── Details Section ── */}
        {activeSection === 'info' && (
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
          </div>
        )}

        {/* ── Emails / Pitch History Section ── */}
        {activeSection === 'emails' && (
          <div className="space-y-3">
            {/* Contact & Company Quick Info */}
            <div className="bg-muted/40 border rounded-lg px-3 py-2 flex items-center gap-3 text-xs flex-wrap">
              {bestContactName && bestContactName !== prospect.name && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{bestContactName}</span>
                  {primaryContact?.role && <span className="text-muted-foreground">· {primaryContact.role}</span>}
                </div>
              )}
              {bestContactEmail && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span>{bestContactEmail}</span>
                </div>
              )}
              {bestCompanyName && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span>{bestCompanyName}</span>
                </div>
              )}
              {!bestContactEmail && !bestContactName && (
                <span className="text-muted-foreground italic">No contact info yet — try Enrich</span>
              )}
            </div>

            {/* Draft Pitch Button */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Email Activity</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => draftMutation.mutate()}
                disabled={draftMutation.isPending}
              >
                {draftMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                {sortedPitches.length > 0 ? 'New Follow-up' : 'Draft Pitch'}
              </Button>
            </div>

            {pitchesLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading emails...
              </div>
            ) : sortedPitches.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">No pitches yet</p>
                <Button
                  size="sm"
                  onClick={() => draftMutation.mutate()}
                  disabled={draftMutation.isPending}
                >
                  {draftMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                  Draft Pitch
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Email Timeline */}
                {sortedPitches.map(({ pitch }) => {
                  const isExpanded = expandedPitchId === pitch.id;
                  const isEditingThis = editingPitchId === pitch.id;
                  const isPending = pitch.status === 'pending_review';
                  const isApproved = pitch.status === 'approved';
                  const isSent = pitch.status === 'sent';
                  const isOverdue = isSent && !pitch.responseReceived && pitch.followUpDueAt && new Date(pitch.followUpDueAt) <= new Date();

                  return (
                    <div key={pitch.id} className={`border rounded-lg overflow-hidden transition-all ${
                      isOverdue ? 'border-amber-300 bg-amber-50/30' :
                      isSent && pitch.responseReceived ? 'border-green-200 bg-green-50/30' :
                      isSent ? 'border-blue-200' :
                      isPending ? 'border-orange-200' :
                      isApproved ? 'border-emerald-200' :
                      'border-border'
                    }`}>
                      {/* Email Header Row - always visible */}
                      <button
                        onClick={() => {
                          setExpandedPitchId(isExpanded ? null : pitch.id);
                          if (!isExpanded) {
                            setEditedSubject(pitch.subject);
                            setEditedBody(pitch.body);
                            setEditingPitchId(null);
                            setIsAiRewrite(false);
                          }
                        }}
                        className="w-full text-left p-3 flex items-center gap-2 hover:bg-muted/30 transition-colors"
                      >
                        {/* Status Timeline Dot */}
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          isOverdue ? 'bg-amber-500 animate-pulse' :
                          isSent && pitch.responseReceived ? 'bg-green-500' :
                          isSent ? 'bg-blue-500' :
                          isApproved ? 'bg-emerald-500' :
                          isPending ? 'bg-orange-400' :
                          pitch.status === 'rejected' ? 'bg-red-400' :
                          'bg-gray-300'
                        }`} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium truncate">{pitch.subject}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            <StatusBadge status={pitch.status} />
                            <span>{pitch.pitchType === 'initial' ? 'Initial' : pitch.pitchType.replace(/_/g, ' ')}</span>
                            <span>·</span>
                            <span>{daysAgo(pitch.createdAt)}</span>
                            {isSent && pitch.sentAt && (
                              <>
                                <span>·</span>
                                <span>Sent {new Date(pitch.sentAt).toLocaleDateString()}{pitch.sentVia ? ` via ${pitch.sentVia}` : ''}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Alert Indicators */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isOverdue && (
                            <Badge variant="outline" className="text-[10px] h-5 border-amber-300 text-amber-700 bg-amber-50">
                              <Clock className="h-2.5 w-2.5 mr-0.5" /> Follow up
                            </Badge>
                          )}
                          {isSent && pitch.responseReceived && (
                            <Badge variant="outline" className="text-[10px] h-5 border-green-300 text-green-700 bg-green-50">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Replied
                            </Badge>
                          )}
                          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="border-t px-3 pb-3 pt-2 space-y-3">
                          {/* Subject */}
                          <div>
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Subject</Label>
                            {isEditingThis ? (
                              <Input
                                value={editedSubject}
                                onChange={(e) => setEditedSubject(e.target.value)}
                                className="mt-1 h-8 text-sm"
                              />
                            ) : (
                              <p className="text-sm font-medium mt-0.5">{pitch.subject}</p>
                            )}
                          </div>

                          {/* Body */}
                          <div>
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Body</Label>
                              {isEditingThis && (
                                <VoiceInput
                                  onTranscript={(text) => setEditedBody(prev => prev ? prev + ' ' + text : text)}
                                  size="sm"
                                />
                              )}
                            </div>
                            {isEditingThis ? (
                              <Textarea
                                value={editedBody}
                                onChange={(e) => setEditedBody(e.target.value)}
                                rows={8}
                                className="mt-1 text-sm"
                              />
                            ) : (
                              <div className="bg-muted/50 p-3 rounded text-sm whitespace-pre-wrap mt-1 max-h-[200px] overflow-y-auto">
                                {pitch.body}
                              </div>
                            )}
                          </div>

                          {/* Form Answers */}
                          {pitch.formAnswers && Object.keys(pitch.formAnswers).length > 0 && (
                            <div>
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Form Answers</Label>
                              <div className="bg-orange-50 border border-orange-200 rounded p-2.5 space-y-1 mt-1">
                                {Object.entries(pitch.formAnswers).map(([label, value]) => (
                                  <div key={label} className="text-xs">
                                    <span className="font-medium text-orange-800">{label}:</span>{' '}
                                    <span className="text-orange-700">{value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Response Info */}
                          {pitch.responseReceived && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-xs">
                              <div className="flex items-center gap-1.5 font-medium text-green-800 mb-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Response Received
                              </div>
                              {pitch.responseAt && (
                                <p className="text-green-700">Responded on {new Date(pitch.responseAt).toLocaleDateString()}</p>
                              )}
                              {pitch.responseClassification && (
                                <Badge variant="outline" className="text-[10px] mt-1 border-green-300 text-green-700">
                                  {pitch.responseClassification}
                                </Badge>
                              )}
                              {pitch.responseSummary && (
                                <p className="text-green-700 mt-1">{pitch.responseSummary}</p>
                              )}
                            </div>
                          )}

                          {/* Follow-up Due Alert */}
                          {isSent && !pitch.responseReceived && pitch.followUpDueAt && (
                            <div className={`rounded-lg p-2.5 text-xs ${
                              new Date(pitch.followUpDueAt) <= new Date()
                                ? 'bg-amber-50 border border-amber-200'
                                : 'bg-muted/50 border'
                            }`}>
                              <div className="flex items-center gap-1.5">
                                <Clock className={`h-3.5 w-3.5 ${
                                  new Date(pitch.followUpDueAt) <= new Date() ? 'text-amber-600' : 'text-muted-foreground'
                                }`} />
                                <span className={
                                  new Date(pitch.followUpDueAt) <= new Date() ? 'font-medium text-amber-800' : 'text-muted-foreground'
                                }>
                                  Follow-up {new Date(pitch.followUpDueAt) <= new Date() ? 'overdue' : 'scheduled'}: {new Date(pitch.followUpDueAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* AI Rewrite Section */}
                          {isAiRewrite && expandedPitchId === pitch.id && (
                            <div className="border border-dashed border-purple-300 bg-purple-50 rounded-lg p-3 space-y-2">
                              <div className="flex items-center gap-2 text-xs font-medium text-purple-700">
                                <Sparkles className="h-3.5 w-3.5" /> AI Rewrite
                              </div>
                              <div className="relative">
                                <Textarea
                                  value={rewriteInstructions}
                                  onChange={(e) => setRewriteInstructions(e.target.value)}
                                  placeholder="e.g. 'make it shorter' or 'emphasize AI tech'"
                                  rows={2}
                                  className="text-xs pr-10"
                                />
                                <div className="absolute top-1.5 right-1.5">
                                  <VoiceInput
                                    onTranscript={(text) => setRewriteInstructions(prev => prev ? prev + ' ' + text : text)}
                                    size="sm"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                                  onClick={() => rewritePitchMutation.mutate({ pitchId: pitch.id, instructions: rewriteInstructions })}
                                  disabled={!rewriteInstructions.trim() || rewritePitchMutation.isPending}
                                >
                                  {rewritePitchMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                                  Rewrite
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setIsAiRewrite(false); setRewriteInstructions(''); }}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {isEditingThis ? (
                              <>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingPitchId(null)}>
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => updatePitchMutation.mutate({ pitchId: pitch.id, data: { subject: editedSubject, body: editedBody } })}
                                  disabled={updatePitchMutation.isPending}
                                >
                                  {updatePitchMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                                  Save
                                </Button>
                              </>
                            ) : (
                              <>
                                {/* Template picker */}
                                {(isPending || isApproved) && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-7 text-xs text-amber-600 border-amber-200">
                                        <FileText className="h-3 w-3 mr-1" /> Template <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-56 max-h-[250px] overflow-y-auto">
                                      {customTemplates.length === 0 ? (
                                        <div className="px-2 py-3 text-center text-xs text-muted-foreground">No templates yet</div>
                                      ) : customTemplates.map(t => (
                                        <DropdownMenuItem
                                          key={t.id}
                                          onClick={() => {
                                            const subj = applyPlaceholders(t.subject);
                                            const bod = applyPlaceholders(t.body);
                                            updatePitchMutation.mutate({ pitchId: pitch.id, data: { subject: subj, body: bod } as Partial<Pitch> });
                                            toast({ title: 'Template applied', description: `"${t.name}" loaded` });
                                          }}
                                          className="cursor-pointer"
                                        >
                                          {t.isFavorite && <Star className="h-3 w-3 mr-1.5 text-amber-500 fill-amber-500" />}
                                          <span className="text-xs">{t.name}</span>
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}

                                {/* Edit */}
                                {(isPending || isApproved) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                      setEditedSubject(pitch.subject);
                                      setEditedBody(pitch.body);
                                      setEditingPitchId(pitch.id);
                                    }}
                                  >
                                    <Edit className="h-3 w-3 mr-1" /> Edit
                                  </Button>
                                )}

                                {/* AI Rewrite */}
                                {(isPending || isApproved) && !isAiRewrite && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-purple-600 border-purple-200"
                                    onClick={() => setIsAiRewrite(true)}
                                  >
                                    <Sparkles className="h-3 w-3 mr-1" /> AI Rewrite
                                  </Button>
                                )}

                                {/* Approve */}
                                {isPending && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => approvePitchMutation.mutate(pitch.id)}
                                    disabled={approvePitchMutation.isPending}
                                  >
                                    <Check className="h-3 w-3 mr-1" /> Approve
                                  </Button>
                                )}

                                {/* Reject */}
                                {isPending && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-red-600 border-red-200"
                                    onClick={() => rejectPitchMutation.mutate(pitch.id)}
                                  >
                                    <X className="h-3 w-3 mr-1" /> Reject
                                  </Button>
                                )}

                                {/* Send */}
                                {isApproved && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                                    onClick={() => sendPitchMutation.mutate(pitch.id)}
                                    disabled={sendPitchMutation.isPending}
                                  >
                                    {sendPitchMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                                    Send
                                  </Button>
                                )}

                                {/* Sent actions: Mark Responded / Draft Follow-up */}
                                {isSent && !pitch.responseReceived && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs text-green-600 border-green-200"
                                      onClick={() => markRespondedMutation.mutate(pitch.id)}
                                      disabled={markRespondedMutation.isPending}
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Responded
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs text-amber-600 border-amber-200"
                                      onClick={() => followUpMutation.mutate(pitch.id)}
                                      disabled={followUpMutation.isPending}
                                    >
                                      {followUpMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                                      Draft Follow-up
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Contacts Section ── */}
        {activeSection === 'contacts' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Writers / Contacts</span>
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
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
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
        )}

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex gap-2">
            {prospect.status !== 'cold' && (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Archive
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
                      queryClient.invalidateQueries({ queryKey: ['/api/agent/pipeline'] });
                      onClose();
                    })
                    .catch((err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }));
                }}
              >
                <UserCheck className="h-3.5 w-3.5 mr-1" /> Contacted
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            <Button variant="outline" size="sm" onClick={() => enrichMutation.mutate()} disabled={enrichMutation.isPending}>
              {enrichMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
              Enrich
            </Button>
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

  // Fetch custom email templates for the template picker
  const { data: customTemplates = [] } = useQuery<CustomTemplate[]>({
    queryKey: ['/api/agent/custom-templates'],
    queryFn: () => apiRequest('GET', '/api/agent/custom-templates').then(r => r.json()),
  });

  /** Replace {placeholders} in template text with actual prospect data */
  function applyPlaceholders(text: string): string {
    const firstName = prospect.hostName?.split(/\s+/)[0] || prospect.name?.split(/\s+/)[0] || '';
    const replacements: Record<string, string> = {
      '{name}': prospect.name || '',
      '{first_name}': firstName,
      '{host_name}': prospect.hostName || prospect.name || '',
      '{host_first_name}': prospect.hostName?.split(/\s+/)[0] || firstName,
      '{company}': prospect.publicationName || prospect.name || '',
      '{publication}': prospect.publicationName || prospect.name || '',
      '{show_name}': prospect.name || '',
      '{email}': prospect.contactEmail || '',
      '{url}': prospect.url || '',
      '{category}': prospect.category || '',
    };
    let result = text;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replaceAll(placeholder, value);
    }
    return result;
  }

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="text-amber-600 border-amber-300 hover:bg-amber-50">
                    <FileText className="h-4 w-4 mr-2" /> Use Template <ChevronDown className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 max-h-[300px] overflow-y-auto">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Apply a template to this pitch</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {customTemplates.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                      No templates yet. Create them in Settings → Templates.
                    </div>
                  ) : (() => {
                    const favorites = customTemplates.filter(t => t.isFavorite);
                    const others = customTemplates.filter(t => !t.isFavorite);
                    return (
                      <>
                        {favorites.length > 0 && (
                          <>
                            <DropdownMenuLabel className="text-xs">Favorites</DropdownMenuLabel>
                            {favorites.map(t => (
                              <DropdownMenuItem
                                key={t.id}
                                onClick={() => {
                                  const subj = applyPlaceholders(t.subject);
                                  const bod = applyPlaceholders(t.body);
                                  setEditedSubject(subj);
                                  setEditedBody(bod);
                                  setLocalPitch({ subject: subj, body: bod });
                                  updateMutation.mutate({ subject: subj, body: bod } as Partial<Pitch>);
                                  toast({ title: 'Template applied', description: `"${t.name}" loaded` });
                                }}
                                className="cursor-pointer"
                              >
                                <Star className="h-3.5 w-3.5 mr-2 text-amber-500 fill-amber-500" />
                                <div className="flex flex-col">
                                  <span className="text-sm">{t.name}</span>
                                  <span className="text-xs text-muted-foreground">{t.category}</span>
                                </div>
                              </DropdownMenuItem>
                            ))}
                            {others.length > 0 && <DropdownMenuSeparator />}
                          </>
                        )}
                        {others.map(t => (
                          <DropdownMenuItem
                            key={t.id}
                            onClick={() => {
                              const subj = applyPlaceholders(t.subject);
                              const bod = applyPlaceholders(t.body);
                              setEditedSubject(subj);
                              setEditedBody(bod);
                              setLocalPitch({ subject: subj, body: bod });
                              updateMutation.mutate({ subject: subj, body: bod } as Partial<Pitch>);
                              toast({ title: 'Template applied', description: `"${t.name}" loaded` });
                            }}
                            className="cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="text-sm">{t.name}</span>
                              <span className="text-xs text-muted-foreground">{t.category}</span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </>
                    );
                  })()}
                </DropdownMenuContent>
              </DropdownMenu>
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

// ── Pipeline Tab (Kanban from actual prospect statuses + pitches) ─────────────

const PIPELINE_STAGES = ['new', 'pitched', 'sent', 'responded', 'booked', 'manually_contacted', 'cold'] as const;
type PipelineStage = typeof PIPELINE_STAGES[number];

const STAGE_META: Record<PipelineStage, {
  label: string; color: string; bgColor: string; dotColor: string; description: string;
}> = {
  new:                  { label: 'Discovered',    color: 'text-slate-700',   bgColor: 'bg-slate-50 border-slate-200',    dotColor: 'bg-slate-400',   description: 'New prospects found by the agent' },
  pitched:              { label: 'Pitch Drafted',  color: 'text-violet-700',  bgColor: 'bg-violet-50/80 border-violet-200', dotColor: 'bg-violet-500', description: 'Pitch drafted, awaiting review' },
  sent:                 { label: 'Sent',           color: 'text-blue-700',    bgColor: 'bg-blue-50/80 border-blue-200',   dotColor: 'bg-blue-500',    description: 'Pitch sent, awaiting response' },
  responded:            { label: 'Responded',      color: 'text-amber-700',   bgColor: 'bg-amber-50/80 border-amber-200', dotColor: 'bg-amber-500',   description: 'They responded to our outreach' },
  booked:               { label: 'Booked',         color: 'text-emerald-700', bgColor: 'bg-emerald-50/80 border-emerald-200', dotColor: 'bg-emerald-500', description: 'Interview/meeting confirmed' },
  manually_contacted:   { label: 'Manual Outreach', color: 'text-cyan-700',    bgColor: 'bg-cyan-50/80 border-cyan-200',   dotColor: 'bg-cyan-500',    description: 'Contacted outside the system' },
  cold:                 { label: 'Archived',       color: 'text-gray-500',    bgColor: 'bg-gray-50/80 border-gray-200',   dotColor: 'bg-gray-400',    description: 'No longer pursuing' },
};

/**
 * Derives the "effective" pipeline stage from prospect status + latest pitch status.
 * This bridges the gap: a prospect with status "new" but a sent pitch is really in "sent" stage.
 */
function derivePipelineStage(prospect: Prospect, latestPitch: Pitch | null): PipelineStage {
  // Terminal prospect statuses always win
  if (prospect.status === 'booked') return 'booked';
  if (prospect.status === 'responded') return 'responded';
  if (prospect.status === 'cold' || prospect.status === 'rejected') return 'cold';
  if (prospect.status === 'manually_contacted') return 'manually_contacted';

  // If there's a pitch, derive from pitch status
  if (latestPitch) {
    if (latestPitch.status === 'sent') return 'sent';
    if (latestPitch.status === 'approved') return 'sent'; // approved but not yet sent → treat as sent pipeline
    if (latestPitch.status === 'draft' || latestPitch.status === 'pending_review') return 'pitched';
  }

  // Prospect was pitched but pitch might have been deleted
  if (prospect.status === 'pitched') return 'pitched';

  return 'new';
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  podcast: Radio,
  press: Newspaper,
  investor: Briefcase,
};

const CATEGORY_COLOR: Record<string, string> = {
  podcast: 'bg-purple-100 text-purple-700 border-purple-200',
  press: 'bg-blue-100 text-blue-700 border-blue-200',
  investor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

interface PipelineItem {
  prospect: Prospect;
  latestPitch: Pitch | null;
  pitchCount: number;
}

function PipelineTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pipelineData, isLoading } = useQuery<PipelineItem[]>({
    queryKey: ['/api/agent/pipeline'],
    queryFn: () => apiRequest('GET', '/api/agent/pipeline').then(r => r.json()),
  });

  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  // Group items by derived stage
  const grouped = {} as Record<PipelineStage, PipelineItem[]>;
  for (const s of PIPELINE_STAGES) grouped[s] = [];

  const items = pipelineData || [];
  const filtered = items.filter(item => {
    if (categoryFilter !== 'all' && item.prospect.category !== categoryFilter) return false;
    return true;
  });

  for (const item of filtered) {
    const stage = derivePipelineStage(item.prospect, item.latestPitch);
    grouped[stage]?.push(item);
  }

  // Sort each column: higher relevance score first
  for (const stage of PIPELINE_STAGES) {
    grouped[stage].sort((a, b) => (b.prospect.relevanceScore ?? 0) - (a.prospect.relevanceScore ?? 0));
  }

  // Stats from actual data
  const totalProspects = filtered.length;
  const pitchedCount = grouped.pitched.length + grouped.sent.length;
  const sentCount = grouped.sent.length;
  const respondedCount = grouped.responded.length;
  const bookedCount = grouped.booked.length;

  // Which stages to display (hide archived by default)
  const visibleStages = showArchived
    ? PIPELINE_STAGES
    : PIPELINE_STAGES.filter(s => s !== 'cold');

  return (
    <div className="space-y-4">
      {/* Stats ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Discovered', value: totalProspects, color: 'text-foreground' },
          { label: 'Pitched', value: pitchedCount, color: 'text-violet-600' },
          { label: 'Sent', value: sentCount, color: 'text-blue-600' },
          { label: 'Responded', value: respondedCount, color: 'text-amber-600' },
          { label: 'Booked', value: bookedCount, color: 'text-emerald-600' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-semibold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Category filters */}
          {(['all', 'podcast', 'press', 'investor'] as const).map((cat) => {
            const Icon = cat === 'all' ? Users : CATEGORY_ICON[cat];
            const count = cat === 'all' ? filtered.length : items.filter(i => i.prospect.category === cat).length;
            return (
              <Button
                key={cat}
                variant={categoryFilter === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
                className="gap-1.5 h-8 text-xs"
              >
                <Icon className="w-3.5 h-3.5" />
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                <span className="text-[10px] opacity-70">({count})</span>
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? <Eye className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 opacity-40" />}
            {showArchived ? 'Hide' : 'Show'} Archived
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => onNavigate('pitches')}
          >
            <Edit className="w-3.5 h-3.5" /> Review Pitches
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {visibleStages.slice(0, 5).map((s) => (
            <div key={s} className="min-w-[260px] flex-1">
              <Skeleton className="h-8 mb-3 rounded-md" />
              <div className="space-y-2"><Skeleton className="h-28 rounded-lg" /><Skeleton className="h-28 rounded-lg" /></div>
            </div>
          ))}
        </div>
      ) : (
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-4 min-w-max">
            {visibleStages.map((stage) => {
              const meta = STAGE_META[stage];
              const stageItems = grouped[stage];
              return (
                <div key={stage} className="w-[280px] flex-shrink-0">
                  {/* Column header */}
                  <div className={`flex items-center justify-between px-3 py-2 rounded-lg border mb-2 ${meta.bgColor}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${meta.dotColor}`} />
                      <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">{stageItems.length}</Badge>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2 min-h-[200px]">
                    {stageItems.map(({ prospect, latestPitch, pitchCount }) => {
                      const CatIcon = CATEGORY_ICON[prospect.category] || Globe;
                      const catColor = CATEGORY_COLOR[prospect.category] || '';
                      const isFollowUpOverdue = latestPitch?.status === 'sent' && !latestPitch.responseReceived && latestPitch.followUpDueAt && new Date(latestPitch.followUpDueAt) <= new Date();
                      return (
                        <button
                          key={prospect.id}
                          onClick={() => setSelectedProspect(prospect)}
                          className={`w-full text-left p-3 rounded-lg border bg-card hover:shadow-md transition-all duration-200 group cursor-pointer ${
                            isFollowUpOverdue ? 'ring-1 ring-amber-300 border-amber-200' : ''
                          }`}
                        >
                          {/* Top row: name + category */}
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{prospect.name}</p>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                          </div>

                          {/* Host / publication */}
                          {(prospect.hostName || prospect.publicationName) && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {prospect.hostName || prospect.publicationName}
                            </p>
                          )}

                          {/* Category + pitch info row */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] h-5 px-1.5 gap-1 border ${catColor}`}>
                              <CatIcon className="w-2.5 h-2.5" />
                              {prospect.category}
                            </Badge>
                            {prospect.relevanceScore != null && (
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                                {prospect.relevanceScore}
                              </Badge>
                            )}
                            {prospect.leadTier && (
                              <span className={`text-[10px] font-medium ${
                                prospect.leadTier === 'strong' ? 'text-emerald-600' :
                                prospect.leadTier === 'medium' ? 'text-amber-600' : 'text-red-500'
                              }`}>
                                {prospect.leadTier === 'strong' ? '●' : prospect.leadTier === 'medium' ? '●' : '●'} {prospect.leadTier}
                              </span>
                            )}
                          </div>

                          {/* Follow-up alert banner */}
                          {latestPitch && latestPitch.status === 'sent' && !latestPitch.responseReceived && latestPitch.followUpDueAt && new Date(latestPitch.followUpDueAt) <= new Date() && (
                            <div className="mt-2 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                              <AlertCircle className="w-3 h-3 text-amber-600 flex-shrink-0 animate-pulse" />
                              <span className="text-[10px] font-medium text-amber-700">
                                Follow-up needed · No response
                              </span>
                            </div>
                          )}

                          {/* Response received badge */}
                          {latestPitch && latestPitch.status === 'sent' && latestPitch.responseReceived && (
                            <div className="mt-2 flex items-center gap-1.5 bg-green-50 border border-green-200 rounded px-2 py-1.5">
                              <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                              <span className="text-[10px] font-medium text-green-700">
                                Replied{latestPitch.responseAt ? ` · ${new Date(latestPitch.responseAt).toLocaleDateString()}` : ''}
                              </span>
                            </div>
                          )}

                          {/* Pitch summary line */}
                          {latestPitch && (
                            <div className="mt-2 pt-2 border-t border-dashed">
                              <div className="flex items-center gap-1.5 text-[11px]">
                                {latestPitch.status === 'sent' ? (
                                  <Send className="w-3 h-3 text-blue-500" />
                                ) : latestPitch.status === 'pending_review' ? (
                                  <Clock className="w-3 h-3 text-orange-500" />
                                ) : latestPitch.status === 'approved' ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : latestPitch.status === 'draft' ? (
                                  <Edit className="w-3 h-3 text-muted-foreground" />
                                ) : (
                                  <FileText className="w-3 h-3 text-muted-foreground" />
                                )}
                                <span className="text-muted-foreground truncate flex-1">{latestPitch.subject}</span>
                              </div>
                              {latestPitch.sentAt && (
                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                  Sent {new Date(latestPitch.sentAt).toLocaleDateString()}
                                  {latestPitch.sentVia && ` via ${latestPitch.sentVia}`}
                                </p>
                              )}
                              {pitchCount > 1 && (
                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                  {pitchCount} total pitches
                                </p>
                              )}
                            </div>
                          )}

                          {/* Contact info at bottom */}
                          {prospect.contactEmail && (
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/70">
                              <Mail className="w-2.5 h-2.5" />
                              <span className="truncate">{prospect.contactEmail}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {stageItems.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mb-2">
                          <Target className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Reuse existing ProspectDetailDialog */}
      {selectedProspect && (
        <ProspectDetailDialog prospect={selectedProspect} onClose={() => setSelectedProspect(null)} />
      )}
    </div>
  );
}

// ── Contacts Tab (all categories, table view) ─────────────────────────────────

function ContactsTab() {
  const [category, setCategory] = useState<'podcast' | 'press' | 'investor'>('podcast');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([
          { key: 'podcast', label: 'Podcasts', icon: Radio },
          { key: 'press', label: 'Press', icon: Newspaper },
          { key: 'investor', label: 'Investors', icon: Briefcase },
        ] as const).map((c) => (
          <Button
            key={c.key}
            variant={category === c.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory(c.key)}
            className="gap-1.5"
          >
            <c.icon className="w-3.5 h-3.5" />
            {c.label}
          </Button>
        ))}
      </div>
      <ProspectsTab category={category} key={category} />
    </div>
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
