import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';
import {
  BarChart3,
  Search,
  TrendingUp,
  Target,
  FileText,
  ArrowUpDown,
  Pin,
  SkipForward,
  Settings,
  Play,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select';
import { Progress } from '@/shared/components/ui/progress';

// ── Types ─────────────────────────────────────────────────────────────────

interface KeywordRow {
  keyword: string;
  volume: number;
  kd: number;
  cpc: number;
  competition: string | null;
  hasArticle: boolean;
  articleSlug: string | null;
}

interface KeywordStats {
  total: number;
  avgVolume: number;
  avgKd: number;
  avgCpc: number;
  lowComp: number;
  medComp: number;
  highComp: number;
  lastUpdated: string | null;
  withArticles: number;
}

interface PipelineTopic {
  title: string;
  category: string;
  tier: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  volume: number;
  kd: number;
  cpc: number;
  priorityScore: number;
  status: 'written' | 'pending' | 'pinned' | 'skipped';
  articleSlug: string | null;
}

interface PipelineSummary {
  total: number;
  written: number;
  pending: number;
  pinned: number;
  skipped: number;
}

interface QueueItem {
  title: string;
  tier: string;
  primaryKeyword: string;
  volume: number;
  kd: number;
  cpc: number;
  priorityScore: number;
  isPinned: boolean;
}

interface SeoContentStrategy {
  tierWeights: Record<string, number>;
  pinnedKeywords: string[];
  skippedKeywords: string[];
  minVolume: number;
  maxKd: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const ALL_TIERS = ['pillar', 'system', 'ingredient', 'comparison', 'symptom', 'lab', 'lifestyle'];

function kdColor(kd: number): string {
  if (kd < 30) return 'text-green-600';
  if (kd < 60) return 'text-yellow-600';
  return 'text-red-600';
}

function kdBadgeVariant(kd: number): 'default' | 'secondary' | 'destructive' {
  if (kd < 30) return 'default';
  if (kd < 60) return 'secondary';
  return 'destructive';
}

function tierColor(tier: string): string {
  const colors: Record<string, string> = {
    pillar: 'bg-purple-100 text-purple-800',
    system: 'bg-blue-100 text-blue-800',
    ingredient: 'bg-green-100 text-green-800',
    comparison: 'bg-orange-100 text-orange-800',
    symptom: 'bg-red-100 text-red-800',
    lab: 'bg-cyan-100 text-cyan-800',
    lifestyle: 'bg-amber-100 text-amber-800',
  };
  return colors[tier] || 'bg-gray-100 text-gray-800';
}

function statusBadge(status: string) {
  switch (status) {
    case 'written':
      return <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle2 className="w-3 h-3" />Written</Badge>;
    case 'pinned':
      return <Badge className="bg-blue-100 text-blue-800 gap-1"><Pin className="w-3 h-3" />Pinned</Badge>;
    case 'skipped':
      return <Badge variant="outline" className="text-gray-400 gap-1"><SkipForward className="w-3 h-3" />Skipped</Badge>;
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────

function SeoDashboard() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<KeywordStats>({
    queryKey: ['/api/seo/admin/keywords/stats'],
    queryFn: () => apiRequest('GET', '/api/seo/admin/keywords/stats').then(r => r.json()),
  });

  const { data: pipeline } = useQuery<{ topics: PipelineTopic[]; summary: PipelineSummary }>({
    queryKey: ['/api/seo/admin/pipeline'],
    queryFn: () => apiRequest('GET', '/api/seo/admin/pipeline').then(r => r.json()),
  });

  const { data: queueData } = useQuery<{ queue: QueueItem[]; totalCandidates: number }>({
    queryKey: ['/api/seo/admin/pipeline/queue'],
    queryFn: () => apiRequest('GET', '/api/seo/admin/pipeline/queue?limit=10').then(r => r.json()),
  });

  const runMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/blog/admin/auto-gen/run', {}).then(r => r.json()),
    onSuccess: () => toast({ title: 'Generation started', description: 'Check the blog list in a few minutes.' }),
    onError: (e: any) => toast({ title: 'Run failed', description: e.message, variant: 'destructive' }),
  });

  const summary = pipeline?.summary;
  const queue = queueData?.queue ?? [];

  // Data freshness warning
  const lastUpdated = stats?.lastUpdated ? new Date(stats.lastUpdated) : null;
  const daysSinceUpdate = lastUpdated ? Math.floor((Date.now() - lastUpdated.getTime()) / 86400000) : null;

  // Tier coverage
  const tierCoverage = ALL_TIERS.map(tier => {
    const topics = pipeline?.topics ?? [];
    const total = topics.filter(t => t.tier === tier).length;
    // Since pipeline might be filtered, compute from all topics
    const allForTier = (pipeline?.topics ?? []).length > 0 ? topics : [];
    const written = allForTier.filter(t => t.tier === tier && t.status === 'written').length;
    return { tier, total, written, pct: total > 0 ? Math.round((written / total) * 100) : 0 };
  });

  return (
    <div className="space-y-6 mt-6">
      {/* Freshness warning */}
      {daysSinceUpdate !== null && daysSinceUpdate > 30 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Keyword data is {daysSinceUpdate} days old. Run <code className="bg-amber-100 px-1 rounded">scripts/seed-keywords.cjs</code> to refresh volumes.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Total Keywords</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {statsLoading ? '...' : (stats?.total ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">{stats?.withArticles ?? 0} with articles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Pipeline Progress</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {summary ? `${summary.written} / ${summary.total}` : '...'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {summary ? `${Math.round((summary.written / Math.max(summary.total, 1)) * 100)}% complete` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Avg Volume</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {statsLoading ? '...' : (stats?.avgVolume ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">Avg KD: {stats?.avgKd ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Queue Remaining</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {queueData?.totalCandidates?.toLocaleString() ?? '...'}
            </p>
            <p className="text-xs text-gray-400 mt-1">topics ready to generate</p>
          </CardContent>
        </Card>
      </div>

      {/* Coverage by Tier */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coverage by Tier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tierCoverage.map(({ tier, total, written, pct }) => (
              <div key={tier} className="flex items-center gap-3">
                <Badge className={`${tierColor(tier)} text-xs w-24 justify-center`}>{tier}</Badge>
                <div className="flex-1">
                  <Progress value={pct} className="h-2" />
                </div>
                <span className="text-sm text-gray-500 w-24 text-right">
                  {written} / {total} ({pct}%)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generation Queue Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#054700]" />
                Next Up — Generation Queue
              </CardTitle>
              <CardDescription>Top 10 topics by priority score that will be generated next.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={runMutation.isPending}
              onClick={() => runMutation.mutate()}
            >
              {runMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Run Now
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">KD</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">No topics in queue</TableCell></TableRow>
              ) : queue.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="text-gray-400 text-sm">{i + 1}</TableCell>
                  <TableCell>
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.primaryKeyword}</p>
                  </TableCell>
                  <TableCell><Badge className={`${tierColor(item.tier)} text-xs`}>{item.tier}</Badge></TableCell>
                  <TableCell className="text-right text-sm">{item.volume.toLocaleString()}</TableCell>
                  <TableCell className={`text-right text-sm font-medium ${kdColor(item.kd)}`}>{item.kd}</TableCell>
                  <TableCell className="text-right text-sm font-bold">
                    {item.isPinned ? <Pin className="w-3.5 h-3.5 inline text-blue-600" /> : item.priorityScore.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Keywords Tab ──────────────────────────────────────────────────────────

function KeywordExplorer() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [competition, setCompetition] = useState('all');
  const [sort, setSort] = useState('volume');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = new URLSearchParams({
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(competition !== 'all' ? { competition } : {}),
    sort,
    order,
    page: String(page),
    limit: '50',
  }).toString();

  const { data, isLoading } = useQuery<{ keywords: KeywordRow[]; total: number; pages: number }>({
    queryKey: ['/api/seo/admin/keywords', queryParams],
    queryFn: () => apiRequest('GET', `/api/seo/admin/keywords?${queryParams}`).then(r => r.json()),
  });

  const toggleSort = (col: string) => {
    if (sort === col) {
      setOrder(o => o === 'desc' ? 'asc' : 'desc');
    } else {
      setSort(col);
      setOrder('desc');
    }
    setPage(0);
  };

  const SortHeader = ({ col, children }: { col: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-gray-50 select-none"
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sort === col && <ArrowUpDown className="w-3 h-3" />}
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-4 mt-6">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search keywords..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={competition} onValueChange={v => { setCompetition(v); setPage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Competition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Competition</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-400 ml-2">
          {data?.total?.toLocaleString() ?? 0} keywords
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-[#054700]" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader col="keyword">Keyword</SortHeader>
                  <SortHeader col="volume">Volume</SortHeader>
                  <SortHeader col="kd">KD</SortHeader>
                  <SortHeader col="cpc">CPC</SortHeader>
                  <TableHead>Competition</TableHead>
                  <TableHead>Article</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.keywords ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">No keywords found</TableCell></TableRow>
                ) : (data?.keywords ?? []).map(kw => (
                  <TableRow key={kw.keyword}>
                    <TableCell className="font-medium text-gray-900 max-w-xs truncate">{kw.keyword}</TableCell>
                    <TableCell className="text-sm">{kw.volume.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${kdColor(kw.kd)}`}>{kw.kd}</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">${kw.cpc.toFixed(2)}</TableCell>
                    <TableCell>
                      {kw.competition ? (
                        <Badge variant={kw.competition === 'LOW' ? 'default' : kw.competition === 'MEDIUM' ? 'secondary' : 'destructive'} className="text-xs">
                          {kw.competition}
                        </Badge>
                      ) : <span className="text-gray-300">—</span>}
                    </TableCell>
                    <TableCell>
                      {kw.hasArticle ? (
                        <a href={`/blog/${kw.articleSlug}`} target="_blank" rel="noreferrer" className="text-[#054700] hover:underline text-xs flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {(data?.pages ?? 0) > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600">Page {page + 1} of {data?.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= (data?.pages ?? 1) - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Pipeline Tab ──────────────────────────────────────────────────────────

function TopicPipeline() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tier, setTier] = useState('all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = new URLSearchParams({
    ...(tier !== 'all' ? { tier } : {}),
    ...(status !== 'all' ? { status } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  }).toString();

  const { data, isLoading } = useQuery<{ topics: PipelineTopic[]; summary: PipelineSummary }>({
    queryKey: ['/api/seo/admin/pipeline', queryParams],
    queryFn: () => apiRequest('GET', `/api/seo/admin/pipeline?${queryParams}`).then(r => r.json()),
  });

  const pinMutation = useMutation({
    mutationFn: ({ keyword, action }: { keyword: string; action: 'pin' | 'unpin' }) =>
      apiRequest('POST', `/api/seo/admin/keywords/${encodeURIComponent(keyword)}/pin`, { action }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seo/admin/pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seo/admin/pipeline/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seo/admin/strategy'] });
      toast({ title: 'Updated' });
    },
  });

  const skipMutation = useMutation({
    mutationFn: ({ keyword, action }: { keyword: string; action: 'skip' | 'unskip' }) =>
      apiRequest('POST', `/api/seo/admin/keywords/${encodeURIComponent(keyword)}/skip`, { action }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seo/admin/pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seo/admin/pipeline/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seo/admin/strategy'] });
      toast({ title: 'Updated' });
    },
  });

  const summary = data?.summary;
  const topics = data?.topics ?? [];

  return (
    <div className="space-y-4 mt-6">
      {/* Summary bar */}
      {summary && (
        <div className="flex items-center gap-3 text-sm text-gray-600 bg-white border rounded-lg px-4 py-3">
          <span><strong>{summary.written}</strong> of <strong>{summary.total}</strong> topics written ({Math.round((summary.written / Math.max(summary.total, 1)) * 100)}%)</span>
          <span className="text-gray-300">|</span>
          <span>{summary.pending} pending</span>
          <span className="text-gray-300">|</span>
          <span className="text-blue-600">{summary.pinned} pinned</span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-400">{summary.skipped} skipped</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search topics..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="flex gap-1">
          {['all', ...ALL_TIERS].map(t => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                tier === t ? 'bg-[#054700] text-white border-[#054700]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="written">Written</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="pinned">Pinned</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Topics Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-[#054700]" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Topic</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">KD</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">No topics match filters</TableCell></TableRow>
                ) : topics.slice(0, 100).map((topic, i) => (
                  <TableRow key={i} className={topic.status === 'skipped' ? 'opacity-50' : ''}>
                    <TableCell>
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{topic.title}</p>
                      <p className="text-xs text-gray-400">{topic.primaryKeyword}</p>
                    </TableCell>
                    <TableCell><Badge className={`${tierColor(topic.tier)} text-xs`}>{topic.tier}</Badge></TableCell>
                    <TableCell className="text-right text-sm">{topic.volume.toLocaleString()}</TableCell>
                    <TableCell className={`text-right text-sm font-medium ${kdColor(topic.kd)}`}>{topic.kd}</TableCell>
                    <TableCell className="text-right text-sm font-bold">{topic.priorityScore.toLocaleString()}</TableCell>
                    <TableCell>{statusBadge(topic.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {topic.status === 'written' && topic.articleSlug && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(`/blog/${topic.articleSlug}`, '_blank')}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {topic.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-800"
                              title="Pin (generate first)"
                              onClick={() => pinMutation.mutate({ keyword: topic.primaryKeyword, action: 'pin' })}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600"
                              title="Skip (exclude from generation)"
                              onClick={() => skipMutation.mutate({ keyword: topic.primaryKeyword, action: 'skip' })}
                            >
                              <SkipForward className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {topic.status === 'pinned' && (
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs text-blue-600"
                            onClick={() => pinMutation.mutate({ keyword: topic.primaryKeyword, action: 'unpin' })}
                          >
                            Unpin
                          </Button>
                        )}
                        {topic.status === 'skipped' && (
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => skipMutation.mutate({ keyword: topic.primaryKeyword, action: 'unskip' })}
                          >
                            Unskip
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {topics.length > 100 && (
            <p className="text-xs text-gray-400 text-center py-3">Showing first 100 of {topics.length} topics. Use filters to narrow down.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Strategy Tab ──────────────────────────────────────────────────────────

function SeoStrategy() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: strategy, isLoading } = useQuery<SeoContentStrategy>({
    queryKey: ['/api/seo/admin/strategy'],
    queryFn: () => apiRequest('GET', '/api/seo/admin/strategy').then(r => r.json()),
  });

  const [form, setForm] = useState<SeoContentStrategy>({
    tierWeights: { pillar: 1, system: 1, ingredient: 1, comparison: 1, symptom: 1, lab: 1, lifestyle: 1 },
    pinnedKeywords: [],
    skippedKeywords: [],
    minVolume: 0,
    maxKd: 100,
  });

  useEffect(() => {
    if (strategy) setForm(strategy);
  }, [strategy]);

  const saveMutation = useMutation({
    mutationFn: (s: Partial<SeoContentStrategy>) =>
      apiRequest('PATCH', '/api/seo/admin/strategy', s).then(r => r.json()),
    onSuccess: () => {
      toast({ title: 'Strategy saved' });
      queryClient.invalidateQueries({ queryKey: ['/api/seo/admin/strategy'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seo/admin/pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seo/admin/pipeline/queue'] });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const removePinned = (kw: string) => {
    setForm(f => ({ ...f, pinnedKeywords: f.pinnedKeywords.filter(k => k !== kw) }));
  };

  const removeSkipped = (kw: string) => {
    setForm(f => ({ ...f, skippedKeywords: f.skippedKeywords.filter(k => k !== kw) }));
  };

  const setTierWeight = (tier: string, weight: number) => {
    setForm(f => ({ ...f, tierWeights: { ...f.tierWeights, [tier]: weight } }));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-48 mt-6"><Loader2 className="w-6 h-6 animate-spin text-[#054700]" /></div>;
  }

  return (
    <div className="space-y-6 mt-6 max-w-3xl">
      {/* Tier Weights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tier Priority Weights</CardTitle>
          <CardDescription>
            Higher weight = that tier gets prioritized in the generation queue. Default is 1 for all tiers.
            Setting a tier to 5 means its topics score 5x higher.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ALL_TIERS.map(tier => (
              <div key={tier} className="space-y-1">
                <Label className="text-xs">
                  <Badge className={`${tierColor(tier)} text-xs mr-1`}>{tier}</Badge>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.tierWeights[tier] ?? 1}
                  onChange={e => setTierWeight(tier, Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                  className="w-20"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Volume & KD Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volume & Difficulty Filters</CardTitle>
          <CardDescription>
            Topics below min volume or above max KD are excluded from auto-generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Min Volume</Label>
              <Input
                type="number"
                min={0}
                value={form.minVolume}
                onChange={e => setForm(f => ({ ...f, minVolume: Number(e.target.value) || 0 }))}
                className="w-32"
              />
              <p className="text-xs text-gray-400">0 = no minimum</p>
            </div>
            <div className="space-y-1">
              <Label>Max KD</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.maxKd}
                onChange={e => setForm(f => ({ ...f, maxKd: Number(e.target.value) || 100 }))}
                className="w-32"
              />
              <p className="text-xs text-gray-400">100 = no maximum</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pinned Keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Pin className="w-4 h-4 text-blue-600" />
            Pinned Keywords ({form.pinnedKeywords.length})
          </CardTitle>
          <CardDescription>These topics generate first, regardless of priority score. Manage pins from the Pipeline tab.</CardDescription>
        </CardHeader>
        <CardContent>
          {form.pinnedKeywords.length === 0 ? (
            <p className="text-sm text-gray-400">No pinned keywords. Pin topics from the Pipeline tab to prioritize them.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {form.pinnedKeywords.map(kw => (
                <Badge key={kw} variant="secondary" className="gap-1 py-1">
                  {kw}
                  <button onClick={() => removePinned(kw)} className="ml-1 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skipped Keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SkipForward className="w-4 h-4 text-gray-400" />
            Skipped Keywords ({form.skippedKeywords.length})
          </CardTitle>
          <CardDescription>These topics are excluded from auto-generation. Manage from the Pipeline tab.</CardDescription>
        </CardHeader>
        <CardContent>
          {form.skippedKeywords.length === 0 ? (
            <p className="text-sm text-gray-400">No skipped keywords.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {form.skippedKeywords.map(kw => (
                <Badge key={kw} variant="outline" className="gap-1 py-1 text-gray-500">
                  {kw}
                  <button onClick={() => removeSkipped(kw)} className="ml-1 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <Button
        className="bg-[#054700] hover:bg-[#043d00] text-white gap-2"
        onClick={() => saveMutation.mutate(form)}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Strategy
      </Button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function AdminSeoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#054700]" />
          SEO Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Keyword research, content pipeline, and generation strategy
        </p>
      </div>

      <div className="p-6">
        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><SeoDashboard /></TabsContent>
          <TabsContent value="keywords"><KeywordExplorer /></TabsContent>
          <TabsContent value="pipeline"><TopicPipeline /></TabsContent>
          <TabsContent value="strategy"><SeoStrategy /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
