import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  Search,
  RefreshCw,
  User,
  Bot,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Calendar,
  Filter,
  ArrowUpDown,
  ExternalLink,
  FlaskConical,
  Clock,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Target,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Paperclip,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest } from '@/shared/lib/queryClient';
import { cn } from '@/shared/lib/utils';
import { useLocation } from 'wouter';

interface ConversationPreview {
  sessionId: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  messageCount: number;
  preview: string;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  formula?: object;
  attachments?: Array<{
    id: string;
    name: string;
    url?: string;
    type: string;
    size: number;
  }>;
  createdAt: string;
}

interface ConversationDetails {
  session: { id: string; status: string; createdAt: string };
  user: { id: string; name: string; email: string };
  messages: ConversationMessage[];
}

interface InsightData {
  generatedAt: string;
  dateRange: { start: string; end: string };
  messageCount: number;
  summary: string;
  ingredientRequests: Array<{ name: string; count: number; available: boolean; context?: string }>;
  featureRequests: Array<{ feature: string; count: number; category: string }>;
  commonQuestions: Array<{ question: string; count: number }>;
  sentimentOverview: { positive: number; neutral: number; negative: number };
  topThemes?: string[];
  actionableInsights?: string[];
  rawAnalysis: string;
}

interface ConversationStats {
  dateRange: { start: string; end: string };
  totalConversations: number;
  totalUserMessages: number;
  averageMessagesPerConversation: number;
}

// ---- Browse Tab (much stronger) ----
function BrowseTab() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'messages' | 'oldest'>('recent');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  const { data: conversationsData, isLoading } = useQuery({
    queryKey: ['/api/admin/conversations'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/conversations?limit=200');
      return res.json() as Promise<{ conversations: ConversationPreview[]; total: number }>;
    }
  });

  const { data: conversationDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['/api/admin/conversations', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return null;
      const res = await apiRequest('GET', `/api/admin/conversations/${selectedConversation}`);
      return res.json() as Promise<ConversationDetails>;
    },
    enabled: !!selectedConversation
  });

  console.log('conversationDetails', conversationDetails);

  const filtered = useMemo(() => {
    let list = conversationsData?.conversations || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.user.name.toLowerCase().includes(q) ||
        c.user.email.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q) ||
        c.sessionId.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter(c => c.status === statusFilter);
    }
    if (sortBy === 'recent') list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sortBy === 'oldest') list = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (sortBy === 'messages') list = [...list].sort((a, b) => b.messageCount - a.messageCount);
    return list;
  }, [conversationsData, searchQuery, sortBy, statusFilter]);

  const toggleMessage = (id: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
      {/* Left: Conversation List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search name, email, content..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="messages">Most Messages</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} results</span>
        </div>

        <Card className="overflow-hidden">
          <ScrollArea className="h-[620px]">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400"><MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm">No conversations match</p></div>
            ) : (
              <div className="divide-y">
                {filtered.map(conv => (
                  <button key={conv.sessionId} onClick={() => setSelectedConversation(conv.sessionId)} className={cn('w-full p-3 text-left hover:bg-gray-50 transition-colors', selectedConversation === conv.sessionId && 'bg-[#054700]/5 border-l-2 border-l-[#054700]')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate text-gray-900">{conv.user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{conv.user.email}</p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{conv.preview}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <Badge variant={conv.status === 'active' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">{conv.messageCount} msgs</Badge>
                        <p className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true })}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* Right: Conversation Detail */}
      <Card className="overflow-hidden">
        {!selectedConversation ? (
          <div className="h-[700px] flex items-center justify-center text-gray-400">
            <div className="text-center"><MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Select a conversation to view</p></div>
          </div>
        ) : detailsLoading ? (
          <div className="p-6 space-y-4">{Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : conversationDetails ? (
          <>
            <div className="border-b px-5 py-3 bg-gray-50/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{conversationDetails.user.name}</p>
                  <Badge variant={conversationDetails.session.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{conversationDetails.session.status}</Badge>
                </div>
                <p className="text-xs text-gray-500">{conversationDetails.user.email}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{format(new Date(conversationDetails.session.createdAt), 'MMM d, yyyy h:mm a')} · {conversationDetails.messages.length} messages</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setLocation('/admin/users/' + conversationDetails.user.id)}>
                <ExternalLink className="h-3 w-3 mr-1" /> View User
              </Button>
            </div>
            <ScrollArea className="h-[640px]">
              <div className="p-4 space-y-3">
                {conversationDetails.messages.map(message => {
                  const isUser = message.role === 'user';
                  const isExpanded = expandedMessages.has(message.id);
                  const isLong = message.content.length > 400;
                  return (
                    <div key={message.id} className={cn('flex gap-3', isUser ? 'flex-row' : 'flex-row')}>
                      <div className={cn('shrink-0 h-7 w-7 rounded-full flex items-center justify-center mt-0.5', isUser ? 'bg-[#054700] text-white' : 'bg-gray-200 text-gray-600')}>
                        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-700">{isUser ? 'User' : 'AI'}</span>
                          {message.model && <Badge variant="outline" className="text-[10px] px-1 py-0">{message.model}</Badge>}
                          <span className="text-[10px] text-gray-400">{format(new Date(message.createdAt), 'h:mm a')}</span>
                        </div>
                        <div className={cn('text-sm text-gray-700 whitespace-pre-wrap rounded-lg p-3', isUser ? 'bg-[#054700]/5' : 'bg-gray-50')}>
                          {isLong && !isExpanded ? message.content.slice(0, 400) + '...' : message.content}
                        </div>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600"
                              >
                                <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                                <span className="truncate font-medium text-gray-700">{attachment.name}</span>
                                <span className="text-gray-400">
                                  {attachment.size ? `(${Math.round(attachment.size / 1024)} KB)` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {isLong && (
                          <button onClick={() => toggleMessage(message.id)} className="text-xs text-[#054700] hover:underline mt-1 flex items-center gap-1">
                            {isExpanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show more</>}
                          </button>
                        )}
                        {message.formula && (
                          <Badge className="mt-2 bg-green-100 text-green-800 border-green-200"><FlaskConical className="h-3 w-3 mr-1" /> Formula Generated</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        ) : null}
      </Card>
    </div>
  );
}

// ---- Insights Tab (much more detailed) ----
function InsightsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [insightDays, setInsightDays] = useState('30');

  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['/api/admin/conversations/insights/latest'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/conversations/insights/latest');
      return res.json() as Promise<{ hasInsights: boolean; insights?: InsightData; message?: string }>;
    }
  });

  const { data: statsData } = useQuery({
    queryKey: ['/api/admin/conversations/stats', insightDays],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/conversations/stats?days=' + insightDays);
      return res.json() as Promise<ConversationStats>;
    }
  });

  const generateInsights = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/conversations/insights/generate', { days: parseInt(insightDays) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/conversations/insights/latest'] });
      toast({ title: 'Insights Generated', description: 'AI analyzed your conversations.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to generate insights.', variant: 'destructive' });
    }
  });

  const insights = insightsData?.insights;
  const sentiment = insights?.sentimentOverview;
  const totalSentiment = sentiment ? sentiment.positive + sentiment.neutral + sentiment.negative : 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={insightDays} onValueChange={setInsightDays}>
            <SelectTrigger className="w-[140px] h-9"><Calendar className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          {insights && (
            <p className="text-xs text-gray-400">Last generated {formatDistanceToNow(new Date(insights.generatedAt), { addSuffix: true })}</p>
          )}
        </div>
        <Button onClick={() => generateInsights.mutate()} disabled={generateInsights.isPending} size="sm">
          {generateInsights.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generate Insights
        </Button>
      </div>

      {/* Stats cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-gray-500 mb-1">Conversations</p><p className="text-2xl font-semibold">{statsData.totalConversations}</p><p className="text-[11px] text-gray-400">in last {insightDays}d</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-gray-500 mb-1">User Messages</p><p className="text-2xl font-semibold">{statsData.totalUserMessages}</p><p className="text-[11px] text-gray-400">questions & requests</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-gray-500 mb-1">Avg Depth</p><p className="text-2xl font-semibold">{statsData.averageMessagesPerConversation}</p><p className="text-[11px] text-gray-400">msgs / conversation</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-gray-500 mb-1">Sentiment</p>{sentiment ? (
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5 text-green-500" /><span className="text-sm font-medium">{sentiment.positive}%</span></div>
              <div className="flex items-center gap-1"><Minus className="h-3.5 w-3.5 text-gray-400" /><span className="text-sm font-medium">{sentiment.neutral}%</span></div>
              <div className="flex items-center gap-1"><ThumbsDown className="h-3.5 w-3.5 text-red-500" /><span className="text-sm font-medium">{sentiment.negative}%</span></div>
            </div>
          ) : <p className="text-sm text-gray-400">No data</p>}</CardContent></Card>
        </div>
      )}

      {insightsLoading ? (
        <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : !insightsData?.hasInsights ? (
        <Card><CardContent className="py-12 text-center"><Lightbulb className="h-12 w-12 mx-auto text-gray-300 mb-4" /><h3 className="text-lg font-medium mb-2">No Insights Yet</h3><p className="text-gray-500 mb-4 text-sm">Click Generate Insights to have AI analyze conversations and surface business-driving intelligence.</p></CardContent></Card>
      ) : (
        <>
          {/* Executive Summary */}
          <Card className="border-[#054700]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#054700]" /> Executive Summary</CardTitle>
              <CardDescription className="text-xs">Based on {insights!.messageCount} messages ({format(new Date(insights!.dateRange.start), 'MMM d')} - {format(new Date(insights!.dateRange.end), 'MMM d, yyyy')})</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 leading-relaxed">{insights!.summary}</p>
              {insights!.topThemes && insights!.topThemes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">{insights!.topThemes.map((t, i) => <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>)}</div>
              )}
              {/* Sentiment bar */}
              {sentiment && totalSentiment > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">Sentiment Distribution</p>
                  <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                    <div className="bg-green-500 transition-all" style={{ width: sentiment.positive + '%' }} />
                    <div className="bg-yellow-400 transition-all" style={{ width: sentiment.neutral + '%' }} />
                    <div className="bg-red-500 transition-all" style={{ width: sentiment.negative + '%' }} />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                    <span>Positive {sentiment.positive}%</span><span>Neutral {sentiment.neutral}%</span><span>Negative {sentiment.negative}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actionable Insights - most important for driving decisions */}
          {insights!.actionableInsights && insights!.actionableInsights.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-600" /> Actionable Recommendations</CardTitle>
                <CardDescription className="text-xs">AI-generated recommendations to drive business decisions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights!.actionableInsights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-yellow-100">
                      <div className="shrink-0 h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center mt-0.5"><span className="text-xs font-bold text-yellow-700">{i + 1}</span></div>
                      <p className="text-sm text-gray-700">{insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ingredient Requests */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Ingredient Demand</CardTitle>
                <CardDescription className="text-xs">What users are asking for — signals product gaps</CardDescription>
              </CardHeader>
              <CardContent>
                {insights!.ingredientRequests.length === 0 ? (
                  <p className="text-sm text-gray-400">No ingredient requests detected.</p>
                ) : (
                  <div className="space-y-2">
                    {insights!.ingredientRequests.slice(0, 12).map((req, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant={req.available ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0 shrink-0">{req.available ? 'In catalog' : 'Missing'}</Badge>
                          <span className="text-sm font-medium truncate">{req.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#054700] rounded-full" style={{ width: Math.min(100, (req.count / Math.max(1, insights!.ingredientRequests[0]?.count || 1)) * 100) + '%' }} /></div>
                          <span className="text-xs text-gray-500 w-8 text-right">{req.count}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feature Requests */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Feature Requests</CardTitle>
                <CardDescription className="text-xs">Product improvements users want — prioritize roadmap</CardDescription>
              </CardHeader>
              <CardContent>
                {insights!.featureRequests.length === 0 ? (
                  <p className="text-sm text-gray-400">No feature requests detected.</p>
                ) : (
                  <div className="space-y-2">
                    {insights!.featureRequests.slice(0, 10).map((req, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{req.feature}</p>
                          <Badge variant="outline" className="text-[10px] mt-0.5">{req.category}</Badge>
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">{req.count}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Common Questions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Common Questions</CardTitle>
                <CardDescription className="text-xs">FAQ opportunities — automate or create content for these</CardDescription>
              </CardHeader>
              <CardContent>
                {insights!.commonQuestions.length === 0 ? (
                  <p className="text-sm text-gray-400">No patterns detected.</p>
                ) : (
                  <div className="space-y-2">
                    {insights!.commonQuestions.slice(0, 8).map((q, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0">
                        <p className="text-sm text-gray-700">{q.question}</p>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">{q.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Raw AI Analysis */}
            {insights!.rawAnalysis && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Full AI Analysis</CardTitle>
                  <CardDescription className="text-xs">Complete raw analysis from AI — scroll for details</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{insights!.rawAnalysis}</div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---- Main Page ----
export default function ConversationsPage() {
  const [activeTab, setActiveTab] = useState('insights');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Conversation Intelligence</h1>
        <p className="text-sm text-gray-500 mt-1">Analyze conversations to surface product insights and business intelligence</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="insights" className="flex items-center gap-2"><Lightbulb className="h-4 w-4" /> AI Insights</TabsTrigger>
          <TabsTrigger value="browse" className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Browse Conversations</TabsTrigger>
        </TabsList>
        <TabsContent value="insights" className="mt-4"><InsightsTab /></TabsContent>
        <TabsContent value="browse" className="mt-4"><BrowseTab /></TabsContent>
      </Tabs>
    </div>
  );
}
