import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
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
  status: string;
  sentAt: string | null;
  sentVia: string | null;
  responseReceived: boolean;
  createdAt: string;
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
  };
  enabled: boolean;
  recentRuns: AgentRun[];
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

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const stats = dashboard?.stats;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Prospects" value={stats?.totalProspects ?? 0} />
        <StatCard label="Podcasts" value={stats?.podcastProspects ?? 0} icon={<Radio className="h-4 w-4 text-muted-foreground" />} onClick={() => onNavigate('podcasts')} />
        <StatCard label="Press" value={stats?.pressProspects ?? 0} icon={<Newspaper className="h-4 w-4 text-muted-foreground" />} onClick={() => onNavigate('press')} />
        <StatCard label="Pending Review" value={stats?.pendingPitches ?? 0} icon={<Edit className="h-4 w-4 text-orange-500" />} onClick={() => onNavigate('pitches')} />
        <StatCard label="Sent" value={stats?.sentPitches ?? 0} icon={<Send className="h-4 w-4 text-blue-500" />} onClick={() => onNavigate('pitches')} />
        <StatCard label="Responses" value={stats?.responses ?? 0} icon={<Mail className="h-4 w-4 text-green-500" />} onClick={() => onNavigate('pitches')} />
        <StatCard label="Booked" value={stats?.booked ?? 0} icon={<Check className="h-4 w-4 text-green-600" />} onClick={() => onNavigate('pitches')} />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending}>
            {scanMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Run Scan
          </Button>
          <Button variant="outline" onClick={() => pitchBatchMutation.mutate()} disabled={pitchBatchMutation.isPending}>
            {pitchBatchMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Draft Pitches
          </Button>
          <Button variant="outline" onClick={() => sendAllMutation.mutate()} disabled={sendAllMutation.isPending}>
            {sendAllMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send All Approved
          </Button>
        </CardContent>
      </Card>

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
  const { data, isLoading } = useQuery<{ prospects: Prospect[]; total: number }>({
    queryKey: ['/api/agent/prospects', category],
    queryFn: () => apiRequest('GET', `/api/agent/prospects?category=${category}&limit=100`).then(r => r.json()),
  });

  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const prospects = data?.prospects || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data?.total ?? 0} {category === 'podcast' ? 'podcast' : 'press'} prospects
        </p>
      </div>

      {prospects.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Discovered</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospects.map(p => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelectedProspect(p)}>
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
                  <ContactBadge method={p.contactMethod} email={p.contactEmail} />
                </TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(p.discoveredAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </a>
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

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/agent/pitches/${id}/send`, {}),
    onSuccess: () => {
      toast({ title: 'Pitch sent!' });
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
  const pitches = statusFilter === 'all'
    ? allPitches
    : allPitches.filter(({ pitch }) => pitch.status === statusFilter);

  const approvedCount = allPitches.filter(({ pitch }) => pitch.status === 'approved').length;
  const statusCounts = allPitches.reduce((acc, { pitch }) => {
    acc[pitch.status] = (acc[pitch.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
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
                        className="text-blue-600"
                        onClick={() => sendMutation.mutate(pitch.id)}
                        disabled={sendMutation.isPending}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    )}
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

  const draftMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/agent/prospects/${prospect.id}/draft`, {}),
    onSuccess: () => {
      toast({ title: 'Pitch drafted!' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      onClose();
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
      <DialogContent className="max-w-lg">
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
        </div>
        <DialogFooter>
          {prospect.status !== 'cold' && (
            <Button variant="ghost" className="text-muted-foreground mr-auto" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending}>
              <Trash2 className="h-4 w-4 mr-2" /> Archive
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Close</Button>
          {prospect.status === 'new' && (
            <Button onClick={() => draftMutation.mutate()} disabled={draftMutation.isPending}>
              {draftMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Draft Pitch
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PitchDetailDialog({ pitch, prospect, onClose }: { pitch: Pitch; prospect: Prospect; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editedSubject, setEditedSubject] = useState(pitch.subject);
  const [editedBody, setEditedBody] = useState(pitch.body);
  const [isEditing, setIsEditing] = useState(false);
  const [isAiRewrite, setIsAiRewrite] = useState(false);
  const [rewriteInstructions, setRewriteInstructions] = useState('');

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Pitch>) => apiRequest('PATCH', `/api/agent/pitches/${pitch.id}`, data),
    onSuccess: () => {
      toast({ title: 'Pitch updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      setIsEditing(false);
    },
  });

  const rewriteMutation = useMutation({
    mutationFn: (instructions: string) =>
      apiRequest('POST', `/api/agent/pitches/${pitch.id}/rewrite`, { instructions }).then(r => r.json()),
    onSuccess: (data: { subject: string; body: string }) => {
      setEditedSubject(data.subject);
      setEditedBody(data.body);
      toast({ title: 'AI rewrite complete', description: 'Review the changes below.' });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/pitches'] });
      setIsAiRewrite(false);
      setIsEditing(true);
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
          <div>
            <Label className="text-xs text-muted-foreground">Subject</Label>
            {isEditing ? (
              <Input value={editedSubject} onChange={(e) => setEditedSubject(e.target.value)} />
            ) : (
              <p className="font-medium">{pitch.subject}</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Body</Label>
            {isEditing ? (
              <Textarea value={editedBody} onChange={(e) => setEditedBody(e.target.value)} rows={12} />
            ) : (
              <div className="bg-muted p-4 rounded text-sm whitespace-pre-wrap">{pitch.body}</div>
            )}
          </div>

          {/* AI Rewrite Section */}
          {isAiRewrite && (
            <div className="border border-dashed border-purple-300 bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
                <Sparkles className="h-4 w-4" />
                AI Rewrite
              </div>
              <Textarea
                value={rewriteInstructions}
                onChange={(e) => setRewriteInstructions(e.target.value)}
                placeholder="Describe what you want changed, e.g. 'make it shorter and more casual' or 'emphasize our AI personalization technology' or 'add a mention of our recent clinical study'"
                rows={3}
                className="text-sm"
              />
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
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
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
