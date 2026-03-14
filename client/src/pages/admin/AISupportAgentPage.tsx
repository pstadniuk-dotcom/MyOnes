import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest } from '@/shared/lib/queryClient';
import {
  Bot,
  CheckCircle2,
  XCircle,
  Edit3,
  Send,
  Play,
  Clock,
  MessageSquare,
  HelpCircle,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  User,
  Calendar,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface AiDraft {
  id: string;
  source: 'ticket' | 'live_chat';
  sourceId: string;
  userId: string | null;
  summary: string;
  draftResponse: string;
  editedResponse: string | null;
  status: 'pending' | 'approved' | 'edited' | 'dismissed';
  model: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  metadata: {
    subject?: string;
    category?: string;
    priority?: string;
    guestEmail?: string;
    guestName?: string;
    messageCount?: number;
    lastCustomerMessage?: string;
  } | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
}

interface Stats {
  pending: number;
  approved: number;
  edited: number;
  dismissed: number;
  total: number;
  openTickets: number;
  waitingChats: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Pending Review', color: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { label: 'Approved & Sent', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  edited: { label: 'Edited & Sent', color: 'bg-blue-100 text-blue-800', icon: Edit3 },
  dismissed: { label: 'Dismissed', color: 'bg-gray-100 text-gray-600', icon: XCircle },
};

const priorityConfig: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

// ─── Stats Overview ───────────────────────────────────────────────────────────

function StatsOverview({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{stats.approved + stats.edited}</p>
              <p className="text-xs text-muted-foreground">Sent (Today)</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{stats.openTickets}</p>
              <p className="text-xs text-muted-foreground">Open Tickets</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{stats.waitingChats}</p>
              <p className="text-xs text-muted-foreground">Waiting Chats</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Draft Card ───────────────────────────────────────────────────────────────

function DraftCard({
  draft,
  onSelect,
}: {
  draft: AiDraft;
  onSelect: (id: string) => void;
}) {
  const statusConf = statusConfig[draft.status];
  const StatusIcon = statusConf.icon;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelect(draft.id)}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {draft.source === 'ticket' ? (
                <HelpCircle className="h-4 w-4 text-blue-600 shrink-0" />
              ) : (
                <MessageSquare className="h-4 w-4 text-purple-600 shrink-0" />
              )}
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {draft.source === 'ticket' ? 'Ticket' : 'Live Chat'}
              </span>
              {draft.metadata?.priority && (
                <Badge variant="outline" className={`text-[10px] ${priorityConfig[draft.metadata.priority] || ''}`}>
                  {draft.metadata.priority}
                </Badge>
              )}
            </div>
            <h4 className="font-semibold text-sm mb-1 truncate">
              {draft.metadata?.subject || 'No subject'}
            </h4>
            <p className="text-sm text-muted-foreground line-clamp-2">{draft.summary}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {draft.userName || draft.metadata?.guestName || draft.userEmail || draft.metadata?.guestEmail || 'Unknown'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(draft.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          <Badge variant="outline" className={`shrink-0 text-[10px] ${statusConf.color}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConf.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Draft Detail View ────────────────────────────────────────────────────────

function DraftDetail({
  draftId,
  onBack,
}: {
  draftId: string;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/ai-support-agent/drafts', draftId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/ai-support-agent/drafts/${draftId}`);
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/admin/ai-support-agent/drafts/${draftId}/approve`);
    },
    onSuccess: () => {
      toast({ title: 'Draft approved and sent!' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-support-agent'] });
      onBack();
    },
    onError: () => toast({ title: 'Failed to approve draft', variant: 'destructive' }),
  });

  const editMutation = useMutation({
    mutationFn: async (editedResponse: string) => {
      await apiRequest('POST', `/api/admin/ai-support-agent/drafts/${draftId}/edit`, { editedResponse });
    },
    onSuccess: () => {
      toast({ title: 'Edited response sent!' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-support-agent'] });
      onBack();
    },
    onError: () => toast({ title: 'Failed to send edited response', variant: 'destructive' }),
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/admin/ai-support-agent/drafts/${draftId}/dismiss`);
    },
    onSuccess: () => {
      toast({ title: 'Draft dismissed' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-support-agent'] });
      onBack();
    },
    onError: () => toast({ title: 'Failed to dismiss draft', variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!data?.draft) {
    return <p className="text-muted-foreground">Draft not found.</p>;
  }

  const { draft, conversation, sourceDetails, user } = data;
  const isPending = draft.status === 'pending';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Badge className={statusConfig[draft.status].color}>
          {statusConfig[draft.status].label}
        </Badge>
        {draft.model && (
          <span className="text-xs text-muted-foreground">Model: {draft.model}</span>
        )}
      </div>

      {/* Source Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {draft.source === 'ticket' ? (
              <><HelpCircle className="h-4 w-4" /> Support Ticket</>
            ) : (
              <><MessageSquare className="h-4 w-4" /> Live Chat (Escalated)</>
            )}
          </CardTitle>
          <CardDescription>
            {draft.metadata?.subject || sourceDetails?.subject || 'No subject'}
            {draft.metadata?.category && ` — ${draft.metadata.category}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Customer:</span>{' '}
              <span className="font-medium">
                {user?.name || draft.metadata?.guestName || 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>{' '}
              <span className="font-medium">
                {user?.email || draft.metadata?.guestEmail || 'N/A'}
              </span>
            </div>
            {draft.metadata?.priority && (
              <div>
                <span className="text-muted-foreground">Priority:</span>{' '}
                <Badge variant="outline" className={priorityConfig[draft.metadata.priority] || ''}>
                  {draft.metadata.priority}
                </Badge>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Created:</span>{' '}
              <span>{format(new Date(draft.createdAt), 'MMM d, yyyy h:mm a')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" /> AI Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{draft.summary}</p>
        </CardContent>
      </Card>

      {/* Conversation History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conversation History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {/* For tickets, show description first */}
            {draft.source === 'ticket' && sourceDetails && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-800 mb-1">Customer (Initial)</p>
                <p className="text-sm">{sourceDetails.description}</p>
              </div>
            )}
            {conversation?.map((msg: any, i: number) => {
              const isCustomer = draft.source === 'ticket' ? !msg.isStaff : msg.sender === 'user';
              const isBot = draft.source === 'live_chat' && msg.sender === 'bot';
              return (
                <div
                  key={i}
                  className={`rounded-lg p-3 ${
                    isCustomer ? 'bg-blue-50' : isBot ? 'bg-gray-50' : 'bg-green-50'
                  }`}
                >
                  <p className={`text-xs font-medium mb-1 ${
                    isCustomer ? 'text-blue-800' : isBot ? 'text-gray-600' : 'text-green-800'
                  }`}>
                    {isCustomer ? 'Customer' : isBot ? 'AI Bot' : 'Staff'}
                    {msg.createdAt && (
                      <span className="ml-2 font-normal text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </span>
                    )}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{msg.message || msg.content}</p>
                </div>
              );
            })}
            {(!conversation || conversation.length === 0) && (
              <p className="text-sm text-muted-foreground">No conversation history available.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Draft Response */}
      <Card className="border-2 border-amber-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-amber-600" /> AI-Drafted Response
          </CardTitle>
          <CardDescription>Review this response before sending. You can edit it or approve as-is.</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={10}
              className="text-sm"
              placeholder="Edit the response..."
            />
          ) : (
            <div className="bg-amber-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
              {draft.editedResponse || draft.draftResponse}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {isPending && (
        <div className="flex items-center gap-3 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => dismissMutation.mutate()}
            disabled={dismissMutation.isPending}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Dismiss
          </Button>
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditedText('');
                }}
              >
                Cancel Edit
              </Button>
              <Button
                size="sm"
                onClick={() => editMutation.mutate(editedText)}
                disabled={editMutation.isPending || !editedText.trim()}
              >
                <Send className="h-4 w-4 mr-1" />
                Send Edited Response
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditedText(draft.draftResponse);
                  setIsEditing(true);
                }}
              >
                <Edit3 className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Approve & Send
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AISupportAgentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['/api/admin/ai-support-agent/stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/ai-support-agent/stats');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: draftsData, isLoading: draftsLoading } = useQuery<{ drafts: AiDraft[] }>({
    queryKey: ['/api/admin/ai-support-agent/drafts', activeTab],
    queryFn: async () => {
      const params = activeTab !== 'all' ? `?status=${activeTab}` : '';
      const res = await apiRequest('GET', `/api/admin/ai-support-agent/drafts${params}`);
      return res.json();
    },
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/ai-support-agent/run');
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'AI Support Agent scan complete',
        description: `${data.ticketDrafts} ticket drafts, ${data.chatDrafts} chat drafts created`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-support-agent'] });
    },
    onError: () => toast({ title: 'Scan failed', variant: 'destructive' }),
  });

  // If a draft is selected, show the detail view
  if (selectedDraftId) {
    return (
      <div className="space-y-6">
        <DraftDetail
          draftId={selectedDraftId}
          onBack={() => setSelectedDraftId(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-amber-600" />
            AI Support Agent
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI drafts responses to support tickets and escalated chats. Review, edit, and send.
          </p>
        </div>
        <Button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          variant="outline"
          size="sm"
        >
          {scanMutation.isPending ? (
            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-1" />
          )}
          Run Scan Now
        </Button>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : stats ? (
        <StatsOverview stats={stats} />
      ) : null}

      {/* Drafts List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Draft Responses</CardTitle>
          <CardDescription>
            The AI scans each morning at 7:00 AM UTC. You can also trigger a scan manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="gap-1">
                <Clock className="h-3 w-3" /> Pending
                {stats?.pending ? (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {stats.pending}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="edited">Edited</TabsTrigger>
              <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {draftsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : draftsData?.drafts && draftsData.drafts.length > 0 ? (
                <div className="space-y-3">
                  {draftsData.drafts.map((draft) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      onSelect={setSelectedDraftId}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No {activeTab === 'all' ? '' : activeTab} drafts</p>
                  <p className="text-sm mt-1">
                    {activeTab === 'pending'
                      ? 'All caught up! No pending drafts to review.'
                      : 'Drafts will appear here after the AI agent runs.'}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
