import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

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

function SupportTicketList() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState('all');

  const queryKey = statusFilter === 'all' 
    ? '/api/admin/support-tickets'
    : `/api/admin/support-tickets?status=${statusFilter}`;

  const { data, isLoading } = useQuery<{ tickets: SupportTicket[], total: number }>({
    queryKey: [queryKey],
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string, icon: typeof Clock }> = {
      open: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      in_progress: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      closed: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle2 }
    };
    
    const { color, icon: Icon } = variants[status] || variants.open;
    
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={colors[priority] || colors.normal}>
        {priority}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const tickets = data?.tickets || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Support Tickets</h2>
          <p className="text-muted-foreground">
            Manage and respond to user support requests
          </p>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No support tickets found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card 
              key={ticket.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation(`/admin/support-tickets/${ticket.id}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">{ticket.subject}</h3>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ticket.message}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{ticket.userName} ({ticket.userEmail})</span>
                      <span>•</span>
                      <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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
    return <Skeleton className="h-[600px] w-full" />;
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          Ticket not found
        </CardContent>
      </Card>
    );
  }

  const { ticket, responses, user } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/admin/support-tickets')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main ticket content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle>{ticket.subject}</CardTitle>
                  <CardDescription>
                    Submitted by {user?.name} ({user?.email}) on {format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{ticket.message}</p>
              </div>
            </CardContent>
          </Card>

          {/* Responses */}
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {responses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No responses yet
                </p>
              ) : (
                responses.map((response) => (
                  <div 
                    key={response.id}
                    className={`p-4 rounded-lg ${
                      response.isStaff 
                        ? 'bg-blue-50 border-l-4 border-blue-500' 
                        : 'bg-gray-50 border-l-4 border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={response.isStaff ? 'default' : 'secondary'}>
                        {response.isStaff ? 'Support Team' : 'User'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(response.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{response.message}</p>
                  </div>
                ))
              )}

              {/* Reply form */}
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="reply">Send Reply</Label>
                <Textarea
                  id="reply"
                  placeholder="Type your response..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={4}
                />
                <Button 
                  onClick={() => sendReply.mutate(replyMessage)}
                  disabled={!replyMessage.trim() || sendReply.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Reply
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select 
                  value={ticket.status} 
                  onValueChange={(value) => updateTicket.mutate({ status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority</Label>
                <Select 
                  value={ticket.priority} 
                  onValueChange={(value) => updateTicket.mutate({ priority: value })}
                >
                  <SelectTrigger>
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
                <Label>Category</Label>
                <p className="text-sm mt-1 capitalize">{ticket.category}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                placeholder="Internal notes (not visible to user)..."
                value={adminNotes || ticket.adminNotes || ''}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={6}
              />
              <Button 
                variant="secondary" 
                onClick={() => updateTicket.mutate({ adminNotes })}
                disabled={updateTicket.isPending}
              >
                Save Notes
              </Button>
            </CardContent>
          </Card>
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
