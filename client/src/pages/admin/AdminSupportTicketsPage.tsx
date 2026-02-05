import { useState } from 'react';
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
  Filter,
  User,
  Calendar,
  Tag,
  ChevronRight
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { apiRequest } from '@/shared/lib/queryClient';

interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
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

interface SupportTicketDetails {
  ticket: SupportTicket;
  responses: SupportTicketResponse[];
  user: { id: string; name: string; email: string } | null;
}

const statusConfig = {
  open: {
    icon: AlertCircle,
    color: 'bg-red-100 text-red-700 border-red-200',
    dotColor: 'bg-red-500',
    label: 'Open'
  },
  in_progress: {
    icon: Clock,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    label: 'In Progress'
  },
  resolved: {
    icon: CheckCircle2,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    label: 'Resolved'
  },
  closed: {
    icon: CheckCircle2,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    dotColor: 'bg-slate-400',
    label: 'Closed'
  }
};

const priorityConfig = {
  low: { color: 'bg-slate-100 text-slate-600', label: 'Low' },
  normal: { color: 'bg-blue-100 text-blue-600', label: 'Normal' },
  high: { color: 'bg-orange-100 text-orange-600', label: 'High' },
  urgent: { color: 'bg-red-100 text-red-600 animate-pulse', label: 'Urgent' }
};

function SupportTicketList() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const queryKey = statusFilter === 'all'
    ? '/api/admin/support-tickets'
    : `/api/admin/support-tickets?status=${statusFilter}`;

  const { data, isLoading } = useQuery<{ tickets: SupportTicket[], total: number }>({
    queryKey: [queryKey],
  });

  const tickets = data?.tickets || [];

  // Filter by search
  const filteredTickets = tickets.filter(ticket =>
    searchQuery === '' ||
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count by status
  const statusCounts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Support Tickets</h1>
              <p className="text-slate-500 mt-1">Manage and respond to user requests</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-slate-600">
                {statusCounts.open} open
              </Badge>
              <Badge variant="outline" className="text-amber-600 border-amber-200">
                {statusCounts.in_progress} in progress
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by subject, name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({statusCounts.all})</SelectItem>
                  <SelectItem value="open">Open ({statusCounts.open})</SelectItem>
                  <SelectItem value="in_progress">In Progress ({statusCounts.in_progress})</SelectItem>
                  <SelectItem value="resolved">Resolved ({statusCounts.resolved})</SelectItem>
                  <SelectItem value="closed">Closed ({statusCounts.closed})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Ticket List */}
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">No tickets found</h3>
              <p className="text-slate-500">
                {searchQuery ? 'Try adjusting your search or filter' : 'No support tickets yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => {
              const status = statusConfig[ticket.status];
              const priority = priorityConfig[ticket.priority];
              const StatusIcon = status.icon;

              return (
                <Card
                  key={ticket.id}
                  className="group cursor-pointer hover:shadow-md hover:border-slate-300 transition-all duration-200"
                  onClick={() => setLocation(`/admin/support-tickets/${ticket.id}`)}
                >
                  <CardContent className="p-4 md:p-5">
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-3">
                      {/* Status & Priority Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${status.color} border text-xs`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        <Badge className={`${priority.color} text-xs`}>
                          {priority.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {ticket.category}
                        </Badge>
                      </div>

                      {/* Subject */}
                      <h3 className="font-semibold text-slate-900 line-clamp-2">
                        {ticket.subject}
                      </h3>

                      {/* Message Preview */}
                      <p className="text-sm text-slate-500 line-clamp-2">
                        {ticket.message}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">{ticket.userName}</span>
                        </div>
                        <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-start gap-4">
                      {/* Status Indicator */}
                      <div className={`w-3 h-3 rounded-full mt-1.5 ${status.dotColor}`} />

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Subject & Badges */}
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h3 className="font-semibold text-slate-900 truncate">
                                {ticket.subject}
                              </h3>
                              <Badge className={`${priority.color} text-xs shrink-0`}>
                                {priority.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {ticket.category}
                              </Badge>
                            </div>

                            {/* Message Preview */}
                            <p className="text-sm text-slate-500 line-clamp-1 mb-3">
                              {ticket.message}
                            </p>

                            {/* Meta Info */}
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {ticket.userName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                              </span>
                              <span>{ticket.userEmail}</span>
                            </div>
                          </div>

                          {/* Right side */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <Badge className={`${status.color} border`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SupportTicketDetailView({ ticketId }: { ticketId: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyMessage, setReplyMessage] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const { data, isLoading } = useQuery<SupportTicketDetails>({
    queryKey: [`/api/admin/support-tickets/${ticketId}`],
  });

  const updateTicket = useMutation({
    mutationFn: (updates: { status?: string; priority?: string; adminNotes?: string }) =>
      apiRequest('PATCH', `/api/admin/support-tickets/${ticketId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/support-tickets/${ticketId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support-tickets'] });
      toast({ title: 'Ticket updated successfully' });
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
      toast({ title: 'Reply sent successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to send reply', variant: 'destructive' });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700">Ticket not found</h3>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { ticket, responses, user } = data;
  const status = statusConfig[ticket.status];
  const priority = priorityConfig[ticket.priority];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/admin/support-tickets')}
            className="mb-3 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                {ticket.subject}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {user?.name || 'Unknown'}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="text-slate-400">{user?.email}</span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge className={`${status.color} border`}>
                {status.label}
              </Badge>
              <Badge className={priority.color}>
                {priority.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Original Message */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Original Message</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-slate-700">
                  <p className="whitespace-pre-wrap">{ticket.message}</p>
                </div>
              </CardContent>
            </Card>

            {/* Conversation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Conversation
                  {responses.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {responses.length} {responses.length === 1 ? 'reply' : 'replies'}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {responses.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No responses yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {responses.map((response) => (
                      <div
                        key={response.id}
                        className={`p-4 rounded-lg ${response.isStaff
                          ? 'bg-blue-50 border-l-4 border-blue-400'
                          : 'bg-slate-50 border-l-4 border-slate-300'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <Badge variant={response.isStaff ? 'default' : 'secondary'}>
                            {response.isStaff ? 'Support Team' : 'User'}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {format(new Date(response.createdAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {response.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                <div className="pt-4 border-t space-y-3">
                  <Label htmlFor="reply" className="text-sm font-medium">
                    Send Reply
                  </Label>
                  <Textarea
                    id="reply"
                    placeholder="Type your response to the user..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <Button
                    onClick={() => sendReply.mutate(replyMessage)}
                    disabled={!replyMessage.trim() || sendReply.isPending}
                    className="w-full sm:w-auto"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendReply.isPending ? 'Sending...' : 'Send Reply'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ticket Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-slate-500 mb-1.5 block">Status</Label>
                  <Select
                    value={ticket.status}
                    onValueChange={(value) => updateTicket.mutate({ status: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Open
                        </span>
                      </SelectItem>
                      <SelectItem value="in_progress">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          In Progress
                        </span>
                      </SelectItem>
                      <SelectItem value="resolved">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Resolved
                        </span>
                      </SelectItem>
                      <SelectItem value="closed">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          Closed
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-500 mb-1.5 block">Priority</Label>
                  <Select
                    value={ticket.priority}
                    onValueChange={(value) => updateTicket.mutate({ priority: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-500 mb-1.5 block">Category</Label>
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-md border">
                    <Tag className="h-4 w-4 text-slate-400" />
                    <span className="text-sm capitalize">{ticket.category}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Internal Notes</CardTitle>
                <CardDescription className="text-xs">
                  Only visible to admin team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Add internal notes about this ticket..."
                  value={adminNotes || ticket.adminNotes || ''}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  className="resize-none text-sm"
                />
                <Button
                  variant="secondary"
                  onClick={() => updateTicket.mutate({ adminNotes })}
                  disabled={updateTicket.isPending}
                  size="sm"
                  className="w-full"
                >
                  {updateTicket.isPending ? 'Saving...' : 'Save Notes'}
                </Button>
              </CardContent>
            </Card>

            {/* User Info */}
            {user && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">User Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-700">{user.name}</span>
                  </div>
                  <div className="text-slate-500 pl-6">
                    {user.email}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
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

export default function AdminSupportTicketsPage({ ticketId }: { ticketId?: string }) {
  if (ticketId) {
    return <SupportTicketDetailView ticketId={ticketId} />;
  }

  return <SupportTicketList />;
}
