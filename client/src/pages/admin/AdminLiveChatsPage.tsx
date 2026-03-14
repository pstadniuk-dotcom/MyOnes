import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import {
  MessageCircle, Send, X, Clock, User, Mail, ArrowLeft, Circle,
  ArrowRightLeft, Monitor, Smartphone, FileText, Paperclip,
  Image as ImageIcon, Zap, BarChart3, Plus, Trash2, Hash, CheckSquare, Square,
} from 'lucide-react';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────

interface ChatSession {
  id: string;
  userId: string | null;
  guestEmail: string | null;
  guestName: string | null;
  status: 'active' | 'waiting' | 'closed';
  subject: string | null;
  assignedTo: string | null;
  lastMessageAt: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
  unreadCount: number;
  metadata?: Record<string, any>;
}

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'user' | 'admin' | 'bot';
  senderId: string | null;
  content: string;
  createdAt: string;
  attachments?: Attachment[];
}

interface CannedResponse {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category: string | null;
  usageCount: number;
}

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
}

type SidePanel = 'none' | 'visitor' | 'canned' | 'transfer';

// ─── Inline markdown (same as widget) ────────────────────────────

function renderMarkdown(text: string): JSX.Element[] {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (/^[\-\*]\s/.test(line)) {
      return <div key={i} className="flex gap-1.5 ml-1"><span className="text-gray-400 shrink-0">•</span><span>{renderInline(line.replace(/^[\-\*]\s/, ''))}</span></div>;
    }
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      return <div key={i} className="flex gap-1.5 ml-1"><span className="text-gray-400 shrink-0">{num}.</span><span>{renderInline(line.replace(/^\d+\.\s/, ''))}</span></div>;
    }
    return <span key={i}>{renderInline(line)}{i < lines.length - 1 ? '\n' : ''}</span>;
  });
}

function renderInline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2]) parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={match.index}>{match[3]}</em>);
    else if (match[4]) parts.push(<code key={match.index} className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">{match[4]}</code>);
    else if (match[5] && match[6]) parts.push(<a key={match.index} href={match[6]} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">{match[5]}</a>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

// ─── Notification sound ──────────────────────────────────────────
const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJubn5eMeXB3hJWVkYR6dH2IlZKOhHx2eoeUko+DfHd6iJSSjoN8d3qIlJKOg3x3eoiUko6DfHd6iJSSjoN8d3qIk5GOg353eoiTkY6DfXd6iJORjoN9d3qIlJKOg3x3eoeUko+DfHd6h5SSj4N8d3qIlJKOg3x3eoiUko6DfHZ5h5SSj4J7d3mHlJKOg3x3eoiUko6DfHd6h5SSj4N8d3qIlJKOg3x3eoiUko6DfHd6iJSSjoN8d3qIlJKOg3x3eoiUko6DfHd6iJSSjoN8d3p9dXFxdXV1dXV1dXV1dXV1';

// ─── Component ────────────────────────────────────────────────────

export default function AdminLiveChatsPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');

  // SSE refs
  const adminStreamRef = useRef<EventSource | null>(null);
  const sessionStreamRef = useRef<EventSource | null>(null);

  // Typing
  const [userTyping, setUserTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emitTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // File upload
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Canned responses
  const [cannedFilter, setCannedFilter] = useState('');
  const [showCannedForm, setShowCannedForm] = useState(false);
  const [cannedForm, setCannedForm] = useState({ shortcut: '', title: '', content: '', category: '' });

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    try { audioRef.current = new Audio(NOTIFICATION_SOUND_URL); audioRef.current.volume = 0.3; } catch {}
  }, []);
  const playSound = useCallback(() => { try { audioRef.current?.play().catch(() => {}); } catch {} }, []);

  // ─── Fetch sessions list ───────────────────────────────────────

  const { data: sessionsData, refetch: refetchSessions } = useQuery<{ sessions: ChatSession[] }>({
    queryKey: ['/api/admin/live-chats', statusFilter],
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await apiRequest('GET', `/api/admin/live-chats${params}`);
      return res.json();
    },
    refetchInterval: 10000, // SSE handles real-time; fallback poll every 10s
  });

  const sessions = sessionsData?.sessions || [];

  // ─── Fetch selected session ────────────────────────────────────

  const { data: sessionData } = useQuery<{ session: ChatSession; messages: ChatMessage[] }>({
    queryKey: ['/api/admin/live-chats', selectedSessionId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/live-chats/${selectedSessionId}`);
      return res.json();
    },
    enabled: !!selectedSessionId,
  });

  useEffect(() => {
    if (sessionData?.messages) {
      setLiveMessages(sessionData.messages);
    }
  }, [sessionData]);

  // ─── Fetch canned responses ────────────────────────────────────

  const { data: cannedData, refetch: refetchCanned } = useQuery<{ responses: CannedResponse[] }>({
    queryKey: ['/api/admin/live-chats/canned-responses'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/live-chats/canned-responses');
      return res.json();
    },
  });

  const cannedResponses = cannedData?.responses || [];
  const filteredCanned = cannedFilter
    ? cannedResponses.filter(c =>
        c.shortcut.toLowerCase().includes(cannedFilter.toLowerCase()) ||
        c.title.toLowerCase().includes(cannedFilter.toLowerCase())
      )
    : cannedResponses;

  // ─── Fetch admin list (for transfer) ───────────────────────────

  const { data: adminsData } = useQuery<{ admins: AdminUser[] }>({
    queryKey: ['/api/admin/live-chats/admins'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/live-chats/admins');
      return res.json();
    },
    enabled: sidePanel === 'transfer',
  });

  const adminUsers = adminsData?.admins || [];

  // ─── SSE: Admin global stream ──────────────────────────────────

  useEffect(() => {
    if (!token) return;
    const es = new EventSource(`/api/admin/live-chats/stream?token=${token}`);
    adminStreamRef.current = es;

    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'new_session' || data.type === 'session_update' || data.type === 'session_closed') {
          refetchSessions();
        }
        if (data.type === 'new_message') {
          playSound();
          refetchSessions();
        }
      } catch {}
    });

    es.onerror = () => {
      es.close();
      setTimeout(() => {
        if (adminStreamRef.current === es) {
          // Reconnect by re-triggering effect
        }
      }, 5000);
    };

    return () => { es.close(); adminStreamRef.current = null; };
  }, [token, refetchSessions, playSound]);

  // ─── SSE: Per-session stream ───────────────────────────────────

  useEffect(() => {
    if (sessionStreamRef.current) {
      sessionStreamRef.current.close();
      sessionStreamRef.current = null;
    }
    if (!selectedSessionId || !token) return;

    const es = new EventSource(`/api/admin/live-chats/${selectedSessionId}/stream?token=${token}`);
    sessionStreamRef.current = es;

    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'new_message') {
          const msg = data.data as ChatMessage;
          setLiveMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            if (msg.sender !== 'admin') playSound();
            return [...prev, msg];
          });
        } else if (data.type === 'typing' && data.data?.sender === 'user') {
          setUserTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setUserTyping(false), 4000);
        } else if (data.type === 'stop_typing' && data.data?.sender === 'user') {
          setUserTyping(false);
        } else if (data.type === 'session_closed') {
          refetchSessions();
        }
      } catch {}
    });

    es.onerror = () => {
      es.close();
      setTimeout(() => {
        if (sessionStreamRef.current === es && selectedSessionId) {
          // Will reconnect via effect
        }
      }, 3000);
    };

    return () => { es.close(); sessionStreamRef.current = null; };
  }, [selectedSessionId, token, playSound, refetchSessions]);

  // ─── Scroll ────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveMessages]);

  // ─── Admin typing emit ─────────────────────────────────────────

  const emitAdminTyping = useCallback(() => {
    if (!selectedSessionId) return;
    apiRequest('POST', `/api/admin/live-chats/${selectedSessionId}/typing`).catch(() => {});
  }, [selectedSessionId]);

  const emitAdminStopTyping = useCallback(() => {
    if (!selectedSessionId) return;
    apiRequest('POST', `/api/admin/live-chats/${selectedSessionId}/stop-typing`).catch(() => {});
  }, [selectedSessionId]);

  const handleReplyChange = (val: string) => {
    setReply(val);

    // Canned response shortcut detection: /shortcut
    if (val.startsWith('/') && val.length > 1 && !val.includes(' ')) {
      const shortcut = val.slice(1);
      const match = cannedResponses.find(c => c.shortcut === shortcut);
      if (match) {
        setReply(match.content);
        apiRequest('POST', '/api/admin/live-chats/canned-responses/use', { shortcut }).catch(() => {});
        return;
      }
    }

    if (val.trim()) {
      emitAdminTyping();
      if (emitTypingTimeoutRef.current) clearTimeout(emitTypingTimeoutRef.current);
      emitTypingTimeoutRef.current = setTimeout(emitAdminStopTyping, 2000);
    } else {
      emitAdminStopTyping();
    }
  };

  // ─── File handling ─────────────────────────────────────────────

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => f.size <= 10 * 1024 * 1024);
    setPendingFiles(prev => [...prev, ...valid].slice(0, 5));
  };

  const uploadFiles = async (files: File[]): Promise<Attachment[]> => {
    const attachments: Attachment[] = [];
    for (const file of files) {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      attachments.push({ name: file.name, url, type: file.type, size: file.size });
    }
    return attachments;
  };

  // ─── Send message ──────────────────────────────────────────────

  const handleSend = async () => {
    if ((!reply.trim() && pendingFiles.length === 0) || !selectedSessionId || sending) return;
    const content = reply.trim();
    setReply('');
    setSending(true);
    emitAdminStopTyping();

    const filesToSend = [...pendingFiles];
    setPendingFiles([]);

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: selectedSessionId,
      sender: 'admin',
      senderId: user?.id || null,
      content: content || `Sent ${filesToSend.length} file(s)`,
      createdAt: new Date().toISOString(),
    };
    setLiveMessages(prev => [...prev, optimistic]);

    try {
      let attachments: Attachment[] | undefined;
      if (filesToSend.length > 0) {
        attachments = await uploadFiles(filesToSend);
      }

      const res = await apiRequest('POST', `/api/admin/live-chats/${selectedSessionId}/messages`, {
        content: content || 'Sent files',
        attachments,
      });
      if (res.ok) {
        const data = await res.json();
        setLiveMessages(prev => prev.map(m => m.id === optimistic.id ? data.message : m));
        refetchSessions();
      }
    } catch {
      setLiveMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setReply(content);
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  // ─── Close session ─────────────────────────────────────────────

  const handleClose = async (sessionId: string) => {
    try {
      await apiRequest('POST', `/api/admin/live-chats/${sessionId}/close`);
      toast({ title: 'Chat closed' });
      refetchSessions();
      if (selectedSessionId === sessionId) setSelectedSessionId(null);
    } catch {
      toast({ title: 'Error', description: 'Failed to close chat', variant: 'destructive' });
    }
  };

  // ─── Transfer session ──────────────────────────────────────────

  const handleTransfer = async (adminId: string) => {
    if (!selectedSessionId) return;
    try {
      await apiRequest('POST', `/api/admin/live-chats/${selectedSessionId}/transfer`, { adminId });
      toast({ title: 'Chat transferred' });
      setSidePanel('none');
      refetchSessions();
    } catch {
      toast({ title: 'Error', description: 'Failed to transfer', variant: 'destructive' });
    }
  };

  // ─── Canned response CRUD ─────────────────────────────────────

  const handleCreateCanned = async () => {
    if (!cannedForm.shortcut || !cannedForm.title || !cannedForm.content) return;
    try {
      await apiRequest('POST', '/api/admin/live-chats/canned-responses', cannedForm);
      setCannedForm({ shortcut: '', title: '', content: '', category: '' });
      setShowCannedForm(false);
      refetchCanned();
      toast({ title: 'Canned response created' });
    } catch {
      toast({ title: 'Error', description: 'Failed to create', variant: 'destructive' });
    }
  };

  const handleDeleteCanned = async (id: string) => {
    try {
      await apiRequest('DELETE', `/api/admin/live-chats/canned-responses/${id}`);
      refetchCanned();
    } catch {}
  };

  const handleUseCanned = (canned: CannedResponse) => {
    setReply(canned.content);
    setSidePanel('none');
    apiRequest('POST', '/api/admin/live-chats/canned-responses/use', { shortcut: canned.shortcut }).catch(() => {});
  };

  // ─── Keyboard ──────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectSession = (id: string) => {
    setSelectedSessionId(id);
    setLiveMessages([]);
    setUserTyping(false);
    setSidePanel('none');
  };

  // ─── Formatters ────────────────────────────────────────────────

  const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d: string) => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const formatFileSize = (b: number) => {
    if (b < 1024) return `${b}B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
    return `${(b / (1024 * 1024)).toFixed(1)}MB`;
  };
  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const totalUnread = sessions.reduce((sum, s) => sum + s.unreadCount, 0);
  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  // ─── Multi-select helpers ──────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sessions.map(s => s.id)));
    }
  };

  const handleBulkClose = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`Close ${count} chat session${count > 1 ? 's' : ''}?`)) return;
    try {
      await apiRequest('POST', '/api/admin/live-chats/bulk-close', { ids: Array.from(selectedIds) });
      toast({ title: `${count} chat${count > 1 ? 's' : ''} closed` });
      setSelectedIds(new Set());
      setSelectMode(false);
      refetchSessions();
    } catch {
      toast({ title: 'Error', description: 'Failed to close chats', variant: 'destructive' });
    }
  };

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#054700]">Live Chats</h1>
          <p className="text-sm text-gray-500 mt-1">
            {sessions.length} chat{sessions.length !== 1 ? 's' : ''}
            {totalUnread > 0 && <span className="text-red-500 font-medium"> · {totalUnread} unread</span>}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant={selectMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
            className={selectMode ? 'bg-[#054700] hover:bg-[#054700]/90' : ''}
          >
            <CheckSquare className="h-4 w-4 mr-1" />
            Select
          </Button>
          {['', 'active', 'waiting', 'closed'].map(f => (
            <Button
              key={f}
              variant={statusFilter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(f)}
              className={statusFilter === f ? 'bg-[#054700] hover:bg-[#054700]/90' : ''}
            >
              {f || 'All'}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)]">
        {/* ─── Session List ───────────────────────────── */}
        <Card className="w-[340px] shrink-0 flex flex-col">
          <CardHeader className="py-3 px-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Conversations</CardTitle>
              {selectMode && sessions.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="h-6 px-2 text-xs">
                    {selectedIds.size === sessions.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedIds.size > 0 && (
                    <Button variant="outline" size="sm" onClick={handleBulkClose} className="h-6 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50">
                      <X className="h-3 w-3 mr-1" />
                      Close ({selectedIds.size})
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                <MessageCircle className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => selectMode ? toggleSelect(s.id) : selectSession(s.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                      selectedSessionId === s.id && !selectMode && 'bg-[#054700]/5 border-l-2 border-l-[#054700]',
                      selectMode && selectedIds.has(s.id) && 'bg-red-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {selectMode && (
                        <div className="mt-0.5 shrink-0">
                          <Checkbox
                            checked={selectedIds.has(s.id)}
                            onCheckedChange={() => toggleSelect(s.id)}
                            className="data-[state=checked]:bg-[#054700] data-[state=checked]:border-[#054700]"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {s.userName || s.guestName || 'Unknown'}
                          </span>
                          {s.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5">
                              {s.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {s.userEmail || s.guestEmail}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-gray-400">{timeAgo(s.lastMessageAt)}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            s.status === 'waiting' && 'border-amber-300 text-amber-600 bg-amber-50',
                            s.status === 'active' && 'border-green-300 text-green-600 bg-green-50',
                            s.status === 'closed' && 'border-gray-300 text-gray-500 bg-gray-50',
                          )}
                        >
                          {s.status === 'waiting' && <Circle className="h-1.5 w-1.5 mr-1 fill-current" />}
                          {s.status}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Chat Panel ─────────────────────────────── */}
        <Card className="flex-1 flex flex-col min-w-0">
          {!selectedSessionId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageCircle className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-base font-medium">Select a conversation</p>
              <p className="text-sm mt-1">Choose a chat from the left to start responding</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedSessionId(null)}
                    className="md:hidden p-1 -ml-1 hover:bg-gray-100 rounded"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="h-9 w-9 rounded-full bg-[#054700]/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-[#054700]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {selectedSession?.userName || selectedSession?.guestName || 'User'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">
                        {selectedSession?.userEmail || selectedSession?.guestEmail || ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidePanel(sidePanel === 'visitor' ? 'none' : 'visitor')}
                    className={cn('h-8 w-8 p-0', sidePanel === 'visitor' && 'bg-gray-100')}
                    title="Visitor info"
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidePanel(sidePanel === 'canned' ? 'none' : 'canned')}
                    className={cn('h-8 w-8 p-0', sidePanel === 'canned' && 'bg-gray-100')}
                    title="Canned responses"
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidePanel(sidePanel === 'transfer' ? 'none' : 'transfer')}
                    className={cn('h-8 w-8 p-0', sidePanel === 'transfer' && 'bg-gray-100')}
                    title="Transfer chat"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </Button>
                  {sessionData?.session?.status !== 'closed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClose(selectedSessionId)}
                      className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 ml-1"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Close
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Messages area */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {liveMessages.map(msg => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex flex-col gap-0.5',
                          msg.sender === 'admin' ? 'items-end' : 'items-start'
                        )}
                      >
                        <span className="text-[10px] text-gray-400 px-1">
                          {msg.sender === 'user' ? 'User' : msg.sender === 'bot' ? 'Bot' : 'You'}
                          {' · '}{formatTime(msg.createdAt)}
                        </span>
                        <div
                          className={cn(
                            'max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                            msg.sender === 'admin'
                              ? 'bg-[#054700] text-white rounded-br-md'
                              : msg.sender === 'bot'
                                ? 'bg-blue-50 text-blue-800 rounded-bl-md border border-blue-100'
                                : 'bg-gray-100 text-gray-800 rounded-bl-md'
                          )}
                        >
                          {renderMarkdown(msg.content)}
                        </div>
                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className={cn('flex flex-wrap gap-1.5 mt-1', msg.sender === 'admin' ? 'justify-end' : 'justify-start')}>
                            {msg.attachments.map((att, idx) => (
                              <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300 transition-colors"
                              >
                                {att.type.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                                <span className="truncate max-w-[100px]">{att.name}</span>
                                <span className="text-[10px] opacity-70">{formatFileSize(att.size)}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* User typing indicator */}
                    {userTyping && (
                      <div className="flex flex-col gap-0.5 items-start">
                        <span className="text-[10px] text-gray-400 px-1">User is typing...</span>
                        <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-1.5">
                          <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Pending files */}
                  {pendingFiles.length > 0 && (
                    <div className="border-t border-gray-100 px-3 py-2 flex flex-wrap gap-2">
                      {pendingFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1 text-xs text-gray-600">
                          {file.type.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                          <span className="truncate max-w-[100px]">{file.name}</span>
                          <button onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply input */}
                  {sessionData?.session?.status !== 'closed' ? (
                    <div className="border-t border-gray-200 px-4 py-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={e => handleFileSelect(e.target.files)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-[#054700]"
                          title="Attach file"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Input
                          value={reply}
                          onChange={e => handleReplyChange(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Type your reply... (use /shortcut for canned responses)"
                          className="flex-1"
                          disabled={sending}
                        />
                        <Button
                          onClick={handleSend}
                          disabled={(!reply.trim() && pendingFiles.length === 0) || sending}
                          className="bg-[#054700] hover:bg-[#054700]/90 shrink-0"
                          size="icon"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 ml-10">
                        Type / to use canned responses · Supports **bold**, *italic*, [links](url)
                      </p>
                    </div>
                  ) : (
                    <div className="border-t px-4 py-3 text-center text-sm text-gray-400 bg-gray-50">
                      This conversation has been closed
                    </div>
                  )}
                </div>

                {/* ─── Side panel ──────────────────────────── */}
                {sidePanel !== 'none' && (
                  <div className="w-[280px] border-l border-gray-200 flex flex-col shrink-0 bg-gray-50">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">
                        {sidePanel === 'visitor' ? 'Visitor Info' : sidePanel === 'canned' ? 'Canned Responses' : 'Transfer Chat'}
                      </h4>
                      <button onClick={() => setSidePanel('none')} className="p-1 hover:bg-gray-200 rounded">
                        <X className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {/* Visitor Info */}
                      {sidePanel === 'visitor' && selectedSession && (
                        <div className="space-y-4 text-sm">
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-wide">Name</label>
                            <p className="text-gray-800 font-medium">{selectedSession.userName || selectedSession.guestName || 'Unknown'}</p>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-wide">Email</label>
                            <p className="text-gray-800">{selectedSession.userEmail || selectedSession.guestEmail || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-wide">Device</label>
                            <div className="flex items-center gap-1.5 text-gray-800 mt-0.5">
                              {selectedSession.metadata?.device === 'mobile' ? <Smartphone className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
                              <span className="capitalize">{selectedSession.metadata?.device || 'desktop'}</span>
                            </div>
                          </div>
                          {selectedSession.metadata?.page && (
                            <div>
                              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Current Page</label>
                              <p className="text-gray-800 truncate">{selectedSession.metadata.page}</p>
                            </div>
                          )}
                          {selectedSession.metadata?.referrer && (
                            <div>
                              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Referrer</label>
                              <p className="text-gray-800 truncate text-xs">{selectedSession.metadata.referrer}</p>
                            </div>
                          )}
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-wide">Started</label>
                            <p className="text-gray-800">{formatDate(selectedSession.createdAt)} {formatTime(selectedSession.createdAt)}</p>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-wide">Status</label>
                            <Badge variant="outline" className={cn(
                              'mt-0.5',
                              selectedSession.status === 'active' && 'border-green-300 text-green-600',
                              selectedSession.status === 'waiting' && 'border-amber-300 text-amber-600',
                              selectedSession.status === 'closed' && 'border-gray-300 text-gray-500',
                            )}>
                              {selectedSession.status}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Canned Responses */}
                      {sidePanel === 'canned' && (
                        <div className="space-y-3">
                          <Input
                            value={cannedFilter}
                            onChange={e => setCannedFilter(e.target.value)}
                            placeholder="Search responses..."
                            className="h-8 text-xs"
                          />
                          <div className="space-y-2">
                            {filteredCanned.map(c => (
                              <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-2.5 hover:border-[#054700]/30 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <Hash className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs font-mono text-[#054700]">/{c.shortcut}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleUseCanned(c)}
                                      className="text-[10px] text-[#054700] hover:underline font-medium"
                                    >
                                      Use
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCanned(c.id)}
                                      className="p-0.5 text-gray-400 hover:text-red-500"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs font-medium text-gray-700">{c.title}</p>
                                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{c.content}</p>
                              </div>
                            ))}
                          </div>

                          {/* Add new */}
                          {!showCannedForm ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowCannedForm(true)}
                              className="w-full text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Response
                            </Button>
                          ) : (
                            <div className="bg-white rounded-lg border p-3 space-y-2">
                              <Input
                                value={cannedForm.shortcut}
                                onChange={e => setCannedForm(p => ({ ...p, shortcut: e.target.value.replace(/\s/g, '') }))}
                                placeholder="Shortcut (e.g. greeting)"
                                className="h-7 text-xs"
                              />
                              <Input
                                value={cannedForm.title}
                                onChange={e => setCannedForm(p => ({ ...p, title: e.target.value }))}
                                placeholder="Title"
                                className="h-7 text-xs"
                              />
                              <textarea
                                value={cannedForm.content}
                                onChange={e => setCannedForm(p => ({ ...p, content: e.target.value }))}
                                placeholder="Response content..."
                                className="w-full px-2 py-1.5 border rounded text-xs resize-none"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleCreateCanned} className="flex-1 h-7 text-xs bg-[#054700] hover:bg-[#054700]/90">
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setShowCannedForm(false)} className="h-7 text-xs">
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Transfer */}
                      {sidePanel === 'transfer' && (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-500">Transfer this chat to another admin:</p>
                          {adminUsers.filter(a => a.id !== user?.id).map(admin => (
                            <button
                              key={admin.id}
                              onClick={() => handleTransfer(admin.id)}
                              className="w-full text-left px-3 py-2.5 bg-white rounded-lg border border-gray-200 hover:border-[#054700]/30 transition-colors"
                            >
                              <p className="text-sm font-medium text-gray-800">{admin.fullName}</p>
                              <p className="text-xs text-gray-400">{admin.email}</p>
                            </button>
                          ))}
                          {adminUsers.filter(a => a.id !== user?.id).length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">No other admins available</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
