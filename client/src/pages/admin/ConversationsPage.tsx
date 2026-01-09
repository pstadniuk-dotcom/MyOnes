import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { 
  MessageSquare, 
  Search, 
  RefreshCw, 
  ChevronRight, 
  User, 
  Bot,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Calendar,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

// Types
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

export default function ConversationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [insightDays, setInsightDays] = useState('30');
  const [activeTab, setActiveTab] = useState('insights');

  // Fetch conversation list
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/admin/conversations'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/conversations?limit=100');
      return res.json() as Promise<{ conversations: ConversationPreview[]; total: number }>;
    }
  });

  // Fetch selected conversation details
  const { data: conversationDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['/api/admin/conversations', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return null;
      const res = await apiRequest('GET', `/api/admin/conversations/${selectedConversation}`);
      return res.json() as Promise<ConversationDetails>;
    },
    enabled: !!selectedConversation
  });

  // Fetch latest insights
  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['/api/admin/conversations/insights/latest'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/conversations/insights/latest');
      return res.json() as Promise<{ hasInsights: boolean; insights?: InsightData; message?: string }>;
    }
  });

  // Fetch conversation stats
  const { data: statsData } = useQuery({
    queryKey: ['/api/admin/conversations/stats', insightDays],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/conversations/stats?days=${insightDays}`);
      return res.json() as Promise<ConversationStats>;
    }
  });

  // Generate insights mutation
  const generateInsights = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/conversations/insights/generate', {
        days: parseInt(insightDays)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/conversations/insights/latest'] });
      toast({
        title: 'Insights Generated',
        description: 'AI has analyzed your conversations and generated new insights.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to generate insights. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Filter conversations by search
  const filteredConversations = conversationsData?.conversations.filter(conv => 
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.preview.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageSquare className="h-6 w-6" />
                Conversation Intelligence
              </h1>
              <p className="text-muted-foreground mt-1">
                Analyze user conversations to discover product insights
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={insightDays} onValueChange={setInsightDays}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={() => generateInsights.mutate()}
                disabled={generateInsights.isPending}
              >
                {generateInsights.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate Insights
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        {statsData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsData.totalConversations}</div>
                <p className="text-xs text-muted-foreground">in the last {insightDays} days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">User Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsData.totalUserMessages}</div>
                <p className="text-xs text-muted-foreground">questions and requests</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg. Messages/Conversation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsData.averageMessagesPerConversation}</div>
                <p className="text-xs text-muted-foreground">engagement depth</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Browse Conversations
            </TabsTrigger>
          </TabsList>

          {/* Insights Tab */}
          <TabsContent value="insights">
            {insightsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : !insightsData?.hasInsights ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Insights Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Click "Generate Insights" to have AI analyze your user conversations
                    and discover product insights.
                  </p>
                  <Button onClick={() => generateInsights.mutate()} disabled={generateInsights.isPending}>
                    {generateInsights.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Generate Insights
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Summary Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Executive Summary
                    </CardTitle>
                    <CardDescription>
                      Based on {insightsData.insights!.messageCount} messages from{' '}
                      {format(new Date(insightsData.insights!.dateRange.start), 'MMM d')} -{' '}
                      {format(new Date(insightsData.insights!.dateRange.end), 'MMM d, yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg">{insightsData.insights!.summary}</p>
                    
                    {/* Sentiment Overview */}
                    <div className="mt-4 flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{insightsData.insights!.sentimentOverview.positive}% Positive</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">{insightsData.insights!.sentimentOverview.neutral}% Neutral</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">{insightsData.insights!.sentimentOverview.negative}% Negative</span>
                      </div>
                    </div>

                    {/* Top Themes */}
                    {insightsData.insights!.topThemes && insightsData.insights!.topThemes.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Top Themes:</p>
                        <div className="flex flex-wrap gap-2">
                          {insightsData.insights!.topThemes.map((theme, i) => (
                            <Badge key={i} variant="secondary">{theme}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Ingredient Requests */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Ingredient Requests</CardTitle>
                      <CardDescription>What users are asking for</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {insightsData.insights!.ingredientRequests.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No specific ingredient requests detected.</p>
                      ) : (
                        <div className="space-y-3">
                          {insightsData.insights!.ingredientRequests.slice(0, 10).map((req, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={req.available ? 'default' : 'destructive'} className="text-xs">
                                  {req.available ? 'Available' : 'Missing'}
                                </Badge>
                                <span className="font-medium">{req.name}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">{req.count} requests</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Feature Requests */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Feature Requests</CardTitle>
                      <CardDescription>Product improvements users want</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {insightsData.insights!.featureRequests.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No feature requests detected.</p>
                      ) : (
                        <div className="space-y-3">
                          {insightsData.insights!.featureRequests.slice(0, 10).map((req, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{req.feature}</p>
                                <Badge variant="outline" className="text-xs mt-1">{req.category}</Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">{req.count}x</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Common Questions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Common Questions</CardTitle>
                      <CardDescription>Frequently asked questions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {insightsData.insights!.commonQuestions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No common questions detected.</p>
                      ) : (
                        <div className="space-y-3">
                          {insightsData.insights!.commonQuestions.slice(0, 8).map((q, i) => (
                            <div key={i} className="flex items-start justify-between gap-4">
                              <p className="text-sm">{q.question}</p>
                              <Badge variant="secondary" className="shrink-0">{q.count}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Actionable Insights */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Actionable Insights</CardTitle>
                      <CardDescription>Recommendations for product improvement</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!insightsData.insights!.actionableInsights || insightsData.insights!.actionableInsights.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No specific recommendations at this time.</p>
                      ) : (
                        <ul className="space-y-2">
                          {insightsData.insights!.actionableInsights.map((insight, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Generated timestamp */}
                <p className="text-xs text-muted-foreground text-center">
                  Insights generated {format(new Date(insightsData.insights!.generatedAt), 'MMM d, yyyy \'at\' h:mm a')}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Browse Conversations Tab */}
          <TabsContent value="browse">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Conversation List */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Conversations</CardTitle>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by user or content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                      {conversationsLoading ? (
                        <div className="p-4 space-y-3">
                          {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full" />
                          ))}
                        </div>
                      ) : filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No conversations found</p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredConversations.map((conv) => (
                            <button
                              key={conv.sessionId}
                              onClick={() => setSelectedConversation(conv.sessionId)}
                              className={cn(
                                'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                                selectedConversation === conv.sessionId && 'bg-muted'
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{conv.user.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{conv.user.email}</p>
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {conv.preview}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <Badge variant={conv.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                    {conv.messageCount} msgs
                                  </Badge>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {format(new Date(conv.createdAt), 'MMM d')}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Conversation Detail */}
              <div className="lg:col-span-2">
                <Card className="h-full">
                  {!selectedConversation ? (
                    <CardContent className="h-[650px] flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Select a conversation to view details</p>
                      </div>
                    </CardContent>
                  ) : detailsLoading ? (
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    </CardContent>
                  ) : conversationDetails ? (
                    <>
                      <CardHeader className="border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{conversationDetails.user.name}</CardTitle>
                            <CardDescription>{conversationDetails.user.email}</CardDescription>
                          </div>
                          <div className="text-right">
                            <Badge variant={conversationDetails.session.status === 'active' ? 'default' : 'secondary'}>
                              {conversationDetails.session.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(conversationDetails.session.createdAt), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[550px]">
                          <div className="p-4 space-y-4">
                            {conversationDetails.messages.map((message) => (
                              <div
                                key={message.id}
                                className={cn(
                                  'flex gap-3',
                                  message.role === 'user' ? 'flex-row' : 'flex-row-reverse'
                                )}
                              >
                                <div className={cn(
                                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                                  message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                )}>
                                  {message.role === 'user' ? (
                                    <User className="h-4 w-4" />
                                  ) : (
                                    <Bot className="h-4 w-4" />
                                  )}
                                </div>
                                <div className={cn(
                                  'flex-1 rounded-lg p-3',
                                  message.role === 'user' ? 'bg-primary/10' : 'bg-muted'
                                )}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium">
                                      {message.role === 'user' ? 'User' : 'AI Assistant'}
                                    </span>
                                    {message.model && (
                                      <Badge variant="outline" className="text-xs">
                                        {message.model}
                                      </Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(message.createdAt), 'h:mm a')}
                                    </span>
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                  {message.formula && (
                                    <Badge variant="secondary" className="mt-2">
                                      Formula Generated
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </>
                  ) : null}
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
