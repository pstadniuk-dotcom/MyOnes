import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { X, Send, Minus, MessageCircle, Star, Mail, Paperclip, History, ArrowLeft, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useLocation } from 'wouter';

// ─── Types ────────────────────────────────────────────────────────

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'admin' | 'bot';
  senderId?: string;
  content: string;
  createdAt: string;
  attachments?: Attachment[];
}

interface ChatSession {
  id: string;
  status: 'active' | 'waiting' | 'closed';
  assignedTo?: string | null;
  lastMessageAt: string;
  guestToken?: string;
}

interface HistorySession {
  id: string;
  status: string;
  createdAt: string;
  lastMessageAt: string;
  metadata: Record<string, any>;
}

interface BusinessHoursInfo {
  isOnline: boolean;
  statusMessage: string;
  nextOpenTime?: string;
}

interface QuickTopic {
  id: string;
  label: string;
  emoji: string;
  message: string;
}

type WidgetState = 'bubble' | 'open' | 'minimized';
type ChatView = 'chat' | 'history' | 'history-detail';

// ─── Constants ────────────────────────────────────────────────────

const QUICK_TOPICS: QuickTopic[] = [
  { id: 'order', label: 'Order Status', emoji: '📦', message: "I'd like to check on my order status." },
  { id: 'formula', label: 'Formula Questions', emoji: '🧬', message: "I have a question about my supplement formula." },
  { id: 'account', label: 'Account Help', emoji: '👤', message: "I need help with my account." },
  { id: 'technical', label: 'Technical Issue', emoji: '🔧', message: "I'm experiencing a technical issue." },
  { id: 'consultation', label: 'AI Consultation', emoji: '🤖', message: "I'd like help with my AI consultation." },
  { id: 'other', label: 'Something Else', emoji: '💬', message: "I need help with something else." },
];

const HIDDEN_ROUTES = ['/admin'];
const SHIFT_UP_ROUTES = ['/dashboard/chat'];

const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJubn5eMeXB3hJWVkYR6dH2IlZKOhHx2eoeUko+DfHd6iJSSjoN8d3qIlJKOg3x3eoiUko6DfHd6iJSSjoN8d3qIk5GOg353eoiTkY6DfXd6iJORjoN9d3qIlJKOg3x3eoeUko+DfHd6h5SSj4N8d3qIlJKOg3x3eoiUko6DfHZ5h5SSj4J7d3mHlJKOg3x3eoiUko6DfHd6h5SSj4N8d3qIlJKOg3x3eoiUko6DfHd6iJSSjoN8d3qIlJKOg3x3eoiUko6DfHd6iJSSjoN8d3p9dXFxdXV1dXV1dXV1dXV1';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];

// ─── Markdown renderer ───────────────────────────────────────────

function renderMarkdown(text: string): JSX.Element[] {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];

  lines.forEach((line, i) => {
    // Bullet list
    if (/^[\-\*]\s/.test(line)) {
      elements.push(
        <div key={i} className="flex gap-1.5 ml-1">
          <span className="text-gray-400 shrink-0">•</span>
          <span>{renderInline(line.replace(/^[\-\*]\s/, ''))}</span>
        </div>
      );
      return;
    }
    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={i} className="flex gap-1.5 ml-1">
          <span className="text-gray-400 shrink-0">{num}.</span>
          <span>{renderInline(line.replace(/^\d+\.\s/, ''))}</span>
        </div>
      );
      return;
    }
    // Regular text
    elements.push(<span key={i}>{renderInline(line)}{i < lines.length - 1 ? '\n' : ''}</span>);
  });

  return elements;
}

function renderInline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  // Match: **bold**, *italic*, `code`, [text](url)
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2]) parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={match.index}>{match[3]}</em>);
    else if (match[4]) parts.push(<code key={match.index} className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">{match[4]}</code>);
    else if (match[5] && match[6]) parts.push(<a key={match.index} href={match[6]} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">{match[5]}</a>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

// ─── Component ────────────────────────────────────────────────────

export function LiveChatWidget() {
  const { user, token } = useAuth();
  const [location] = useLocation();

  const [state, setState] = useState<WidgetState>('bubble');
  const [view, setView] = useState<ChatView>('chat');
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showTopics, setShowTopics] = useState(true);
  const [businessHours, setBusinessHours] = useState<BusinessHoursInfo | null>(null);
  const [adminTyping, setAdminTyping] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  // Controls whether the typing dots are rendered; lags behind botTyping for fade-out
  const [showTypingDots, setShowTypingDots] = useState(false);
  // True when dots are fading out (botTyping=false but still visible)
  const [typingFadingOut, setTypingFadingOut] = useState(false);
  const typingFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Orchestrate smooth typing indicator lifecycle
  useEffect(() => {
    if (botTyping) {
      // Immediately show dots
      if (typingFadeTimerRef.current) { clearTimeout(typingFadeTimerRef.current); typingFadeTimerRef.current = null; }
      setTypingFadingOut(false);
      setShowTypingDots(true);
    } else if (showTypingDots) {
      // Start fading out — keep DOM mounted for CSS transition
      setTypingFadingOut(true);
      typingFadeTimerRef.current = setTimeout(() => {
        setShowTypingDots(false);
        setTypingFadingOut(false);
        typingFadeTimerRef.current = null;
      }, 500);
    }
    return () => { if (typingFadeTimerRef.current) clearTimeout(typingFadeTimerRef.current); };
  }, [botTyping]);

  // Rating state
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Guest mode state
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestToken, setGuestToken] = useState<string | null>(() =>
    localStorage.getItem('ones_live_chat_guest_token')
  );
  const [guestSessionId, setGuestSessionId] = useState<string | null>(() =>
    localStorage.getItem('ones_live_chat_guest_session')
  );

  // File upload state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History state
  const [chatHistory, setChatHistory] = useState<HistorySession[]>([]);
  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>([]);
  const [selectedHistorySession, setSelectedHistorySession] = useState<HistorySession | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageTimeRef = useRef<string | null>(null);
  const prevMessageCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasShownTooltipRef = useRef(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const isAuthenticated = !!user && !!token;

  // ─── Helpers ──────────────────────────────────────────────────

  const apiHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (isAuthenticated && token) h.Authorization = `Bearer ${token}`;
    if (!isAuthenticated && guestToken) h['x-guest-token'] = guestToken;
    return h;
  }, [isAuthenticated, token, guestToken]);

  const apiBase = useCallback((sessionId: string) => {
    return isAuthenticated
      ? `/api/live-chat/sessions/${sessionId}`
      : `/api/live-chat/guest/sessions/${sessionId}`;
  }, [isAuthenticated]);

  // ─── Route-based visibility ──────────────────────────────────

  const isHiddenRoute = HIDDEN_ROUTES.some(r => location.startsWith(r));
  const isShiftedRoute = SHIFT_UP_ROUTES.some(r => location.startsWith(r));

  // ─── Audio setup ──────────────────────────────────────────────

  useEffect(() => {
    try {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
      audioRef.current.volume = 0.3;
    } catch { /* audio not supported */ }
  }, []);

  const playNotificationSound = useCallback(() => {
    try { audioRef.current?.play().catch(() => {}); } catch { /* silent fail */ }
  }, []);

  // ─── Fetch business hours ─────────────────────────────────────

  useEffect(() => {
    fetch('/api/live-chat/business-hours')
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setBusinessHours(data))
      .catch(() => {});
  }, []);

  // ─── Auto-show tooltip once ────────────────────────────────────

  useEffect(() => {
    if (state === 'bubble' && !hasShownTooltipRef.current && !isHiddenRoute) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
        hasShownTooltipRef.current = true;
        setTimeout(() => setShowTooltip(false), 5000);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, isHiddenRoute]);

  // ─── Scroll helpers ────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // ─── SSE Connection ───────────────────────────────────────────

  const connectSSE = useCallback((sessionId: string) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const base = isAuthenticated
      ? `/api/live-chat/sessions/${sessionId}/stream`
      : `/api/live-chat/guest/sessions/${sessionId}/stream`;

    // SSE doesn't support custom headers, so for auth we append as query params
    const params = new URLSearchParams();
    if (isAuthenticated && token) params.set('token', token);
    if (!isAuthenticated && guestToken) params.set('guestToken', guestToken);
    const url = `${base}?${params}`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'new_message') {
          const msg = data.data as ChatMessage;
          // Skip user's own messages — they're already shown via optimistic add + API response
          if (msg.sender === 'user') return;
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            playNotificationSound();
            return [...prev, msg];
          });
          // Turn off typing indicators AFTER the message is in the list
          // The useEffect will handle the fade-out transition
          setBotTyping(false);
          setAdminTyping(false);
          if (state !== 'open') setUnreadCount(c => c + 1);
        } else if (data.type === 'typing') {
          if (data.data?.sender !== 'user') {
            const isBot = data.data?.sender === 'bot';
            if (isBot) setBotTyping(true);
            else setAdminTyping(true);
            // Auto-clear after 5s
            if (adminTypingTimeoutRef.current) clearTimeout(adminTypingTimeoutRef.current);
            adminTypingTimeoutRef.current = setTimeout(() => {
              setAdminTyping(false);
              setBotTyping(false);
            }, 5000);
          }
        } else if (data.type === 'stop_typing') {
          if (data.data?.sender !== 'user') {
            // Only stop admin typing here; bot typing is handled by new_message
            // to keep dots visible until the actual response arrives
            if (data.data?.sender !== 'bot') {
              setAdminTyping(false);
            }
          }
        } else if (data.type === 'session_closed') {
          setSession(prev => prev ? { ...prev, status: 'closed' as const } : prev);
        } else if (data.type === 'session_update') {
          setSession(prev => prev ? { ...prev, ...data.data } : prev);
        }
      } catch { /* ignore parse errors */ }
    });

    es.onerror = () => {
      // Reconnect after 3s
      es.close();
      setTimeout(() => {
        if (eventSourceRef.current === es) connectSSE(sessionId);
      }, 3000);
    };
  }, [isAuthenticated, token, guestToken, state, playNotificationSound]);

  // Connect SSE when session is available
  useEffect(() => {
    if (session && session.status !== 'closed' && state === 'open') {
      connectSSE(session.id);
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [session?.id, session?.status, state, connectSSE]);

  // ─── Typing indicator (user → server) ─────────────────────────

  const emitTyping = useCallback(() => {
    if (!session) return;
    fetch(`${apiBase(session.id)}/typing`, {
      method: 'POST',
      headers: apiHeaders(),
    }).catch(() => {});
  }, [session, apiBase, apiHeaders]);

  const emitStopTyping = useCallback(() => {
    if (!session) return;
    fetch(`${apiBase(session.id)}/stop-typing`, {
      method: 'POST',
      headers: apiHeaders(),
    }).catch(() => {});
  }, [session, apiBase, apiHeaders]);

  const handleInputChange = useCallback((val: string) => {
    setInput(val);
    if (val.trim()) {
      emitTyping();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(emitStopTyping, 2000);
    } else {
      emitStopTyping();
    }
  }, [emitTyping, emitStopTyping]);

  // ─── Session lifecycle ─────────────────────────────────────────

  const initSession = useCallback(async () => {
    if (loading || session) return;
    setLoading(true);
    try {
      if (isAuthenticated) {
        const res = await fetch('/api/live-chat/session', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
          setMessages(data.messages || []);
          if (data.messages?.length) {
            lastMessageTimeRef.current = data.messages[data.messages.length - 1].createdAt;
            prevMessageCountRef.current = data.messages.length;
            if (data.messages.some((m: ChatMessage) => m.sender === 'user')) {
              setShowTopics(false);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to init live chat session:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, loading, session]);

  const startGuestSession = async () => {
    if (!guestName.trim() || !guestEmail.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/live-chat/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: guestName.trim(), email: guestEmail.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setMessages(data.messages || []);
        setGuestSessionId(data.session.id);
        localStorage.setItem('ones_live_chat_guest_session', data.session.id);
        // Store guest token for secure subsequent requests
        if (data.guestToken) {
          setGuestToken(data.guestToken);
          localStorage.setItem('ones_live_chat_guest_token', data.guestToken);
        }
        if (data.messages?.length) {
          lastMessageTimeRef.current = data.messages[data.messages.length - 1].createdAt;
          prevMessageCountRef.current = data.messages.length;
        }
      }
    } catch (err) {
      console.error('Failed to start guest chat:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── File upload ───────────────────────────────────────────────

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => {
      if (f.size > MAX_FILE_SIZE) return false;
      if (!ALLOWED_FILE_TYPES.includes(f.type)) return false;
      return true;
    });
    setPendingFiles(prev => [...prev, ...valid].slice(0, 5)); // Max 5 files
  };

  const removePendingFile = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadFiles = async (files: File[]): Promise<Attachment[]> => {
    // For now, convert files to base64 data URLs as attachments
    // In production, this would upload to GCS via a file upload endpoint
    const attachments: Attachment[] = [];
    for (const file of files) {
      const url = await fileToDataUrl(file);
      attachments.push({
        name: file.name,
        url,
        type: file.type,
        size: file.size,
      });
    }
    return attachments;
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ─── Chat history ─────────────────────────────────────────────

  const loadHistory = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/live-chat/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data.sessions || []);
        setView('history');
      }
    } catch { /* silent */ }
  };

  const loadHistoryMessages = async (histSession: HistorySession) => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(`/api/live-chat/history/${histSession.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryMessages(data.messages || []);
        setSelectedHistorySession(histSession);
        setView('history-detail');
      }
    } catch { /* silent */ }
  };

  // ─── Event handlers ────────────────────────────────────────────

  const handleOpen = () => {
    setState('open');
    setUnreadCount(0);
    setShowTooltip(false);
    setView('chat');
    if (isAuthenticated && !session) {
      initSession();
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleMinimize = () => setState('minimized');
  const handleClose = () => { setState('bubble'); };

  const handleSend = async (overrideContent?: string) => {
    const content = (overrideContent || input).trim();
    if ((!content && pendingFiles.length === 0) || !session || sending) return;
    setInput('');
    setSending(true);
    setShowTopics(false);
    emitStopTyping();

    const filesToSend = [...pendingFiles];
    setPendingFiles([]);

    // Optimistic add
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      content: content || (filesToSend.length > 0 ? `📎 ${filesToSend.map(f => f.name).join(', ')}` : ''),
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setBotTyping(true);

    try {
      let attachments: Attachment[] | undefined;
      if (filesToSend.length > 0) {
        setUploading(true);
        attachments = await uploadFiles(filesToSend);
        setUploading(false);
      }

      const res = await fetch(`${apiBase(session.id)}/messages`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ content: content || '📎 Sent files', attachments }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data.message : m));
        lastMessageTimeRef.current = data.message.createdAt;
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setInput(content);
      setBotTyping(false);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleTopicClick = (topic: QuickTopic) => {
    handleSend(topic.message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0 || !session) return;
    try {
      const endpoint = isAuthenticated
        ? `/api/live-chat/sessions/${session.id}/rating`
        : `/api/live-chat/guest/sessions/${session.id}/rating`;
      await fetch(endpoint, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ rating, comment: ratingComment || undefined }),
      });
      setRatingSubmitted(true);
    } catch { /* silent fail */ }
  };

  const handleEmailTranscript = async () => {
    if (!session) return;
    const email = isAuthenticated ? user?.email : guestEmail;
    if (!email) return;
    try {
      await fetch(`/api/live-chat/sessions/${session.id}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch { /* silent fail */ }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  // ─── Formatters ────────────────────────────────────────────────

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  // ─── Render: Hidden on admin/disallowed routes ─────────────────

  if (isHiddenRoute) return null;

  // ─── Render: Bubble / Minimized ────────────────────────────────

  if (state === 'bubble' || state === 'minimized') {
    return (
      <div className={cn(
        'fixed right-6 z-50 transition-all duration-300',
        isShiftedRoute ? 'bottom-24' : 'bottom-6'
      )}>
        <button
          onClick={handleOpen}
          className="group relative h-14 w-14 rounded-full bg-[#054700] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
          aria-label="Open live chat"
        >
          <img
            src="/ones-logo-icon.svg"
            alt="Ones"
            className="h-7 w-7 brightness-0 invert group-hover:scale-110 transition-transform"
          />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 leading-none animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {(state === 'bubble' && showTooltip) && (
          <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-lg px-4 py-2.5 whitespace-nowrap animate-in slide-in-from-bottom-2 fade-in duration-500 border border-gray-100">
            <p className="text-sm text-[#054700] font-medium">Need help? Chat with us!</p>
            <div className="absolute bottom-[-6px] right-5 w-3 h-3 bg-white rotate-45 border-r border-b border-gray-100" />
          </div>
        )}
      </div>
    );
  }

  // ─── Render: Chat panel ────────────────────────────────────────

  return (
    <div
      className={cn(
        'fixed right-6 z-50 w-[380px] h-[540px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300',
        isShiftedRoute ? 'bottom-24' : 'bottom-6'
      )}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="bg-[#054700] text-white px-4 py-3 flex items-center gap-3 shrink-0">
        {view !== 'chat' && (
          <button
            onClick={() => setView(view === 'history-detail' ? 'history' : 'chat')}
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="relative">
          <img src="/ones-logo-icon.svg" alt="Ones" className="h-7 w-7 brightness-0 invert" />
          {businessHours && view === 'chat' && (
            <span className={cn(
              'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#054700]',
              businessHours.isOnline ? 'bg-green-400' : 'bg-gray-400'
            )} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm leading-tight">
            {view === 'chat' ? 'Ones Support' : view === 'history' ? 'Chat History' : 'Past Conversation'}
          </h3>
          <p className="text-[11px] text-white/70 leading-tight truncate">
            {view === 'chat' ? (
              session?.status === 'waiting'
                ? 'Connecting you with a team member...'
                : session?.assignedTo
                  ? 'You\'re chatting with our team'
                  : 'Ask us anything'
            ) : view === 'history' ? (
              `${chatHistory.length} past conversation${chatHistory.length !== 1 ? 's' : ''}`
            ) : (
              selectedHistorySession ? formatDate(selectedHistorySession.createdAt) : ''
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {isAuthenticated && view === 'chat' && (
            <button
              onClick={loadHistory}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
              aria-label="Chat history"
              title="Chat history"
            >
              <History className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={handleMinimize}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            aria-label="Minimize"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── History list view ────────────────────────────────── */}
      {view === 'history' && (
        <div className="flex-1 overflow-y-auto">
          {chatHistory.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <p className="text-sm text-gray-400">No past conversations</p>
            </div>
          ) : (
            chatHistory.map(hs => (
              <button
                key={hs.id}
                onClick={() => loadHistoryMessages(hs)}
                className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">{formatDate(hs.createdAt)}</span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    hs.status === 'closed' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'
                  )}>
                    {hs.status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 truncate">
                  {hs.metadata?.guestName ? `Guest: ${hs.metadata.guestName}` : 'Support conversation'}
                </p>
              </button>
            ))
          )}
        </div>
      )}

      {/* ── History detail view ─────────────────────────────── */}
      {view === 'history-detail' && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {historyMessages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} formatTime={formatTime} formatFileSize={formatFileSize} />
          ))}
        </div>
      )}

      {/* ── Guest form ─────────────────────────────────────── */}
      {view === 'chat' && !isAuthenticated && !session && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <div className="h-12 w-12 bg-[#054700]/10 rounded-full flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-[#054700]" />
          </div>
          <div className="text-center">
            <h4 className="font-semibold text-[#054700] text-base">Start a conversation</h4>
            <p className="text-sm text-gray-500 mt-1">Enter your details to chat with us</p>
          </div>
          <div className="w-full space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#054700]/30 focus:border-[#054700]"
            />
            <input
              type="email"
              placeholder="Your email"
              value={guestEmail}
              onChange={e => setGuestEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#054700]/30 focus:border-[#054700]"
            />
            <button
              onClick={startGuestSession}
              disabled={!guestName.trim() || !guestEmail.trim() || loading}
              className="w-full py-2.5 bg-[#054700] text-white rounded-lg text-sm font-medium hover:bg-[#054700]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Starting...' : 'Start Chat'}
            </button>
          </div>
        </div>
      )}

      {/* ── Loading state ──────────────────────────────────── */}
      {view === 'chat' && loading && session === null && isAuthenticated && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="h-2 w-2 bg-[#054700] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 bg-[#054700] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 bg-[#054700] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {/* ── Messages + Quick Topics ────────────────────────── */}
      {view === 'chat' && session && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} formatTime={formatTime} formatFileSize={formatFileSize} />
            ))}

            {/* Admin typing indicator */}
            {adminTyping && (
              <div className="flex flex-col gap-0.5 items-start">
                <span className="text-[10px] text-gray-400 px-1">Support</span>
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-1.5">
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Bot typing indicator — fades out smoothly when message arrives */}
            {showTypingDots && !adminTyping && (
              <div
                className="flex flex-col gap-0.5 items-start"
                style={{
                  transition: 'opacity 400ms ease-out, transform 400ms ease-out, max-height 400ms ease-out',
                  opacity: typingFadingOut ? 0 : 1,
                  transform: typingFadingOut ? 'translateY(-6px) scale(0.9)' : 'translateY(0) scale(1)',
                  maxHeight: typingFadingOut ? '0px' : '60px',
                  overflow: 'hidden',
                }}
              >
                <span className="text-[10px] text-gray-400 px-1">Ones</span>
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-1.5">
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick topic buttons */}
          {showTopics && !messages.some(m => m.sender === 'user') && session.status !== 'closed' && (
            <div className="px-4 pb-2 shrink-0">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2 font-medium">Quick topics</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TOPICS.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicClick(topic)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#054700]/5 hover:bg-[#054700]/10 text-[#054700] rounded-full text-xs font-medium transition-colors border border-[#054700]/10 hover:border-[#054700]/20"
                  >
                    <span>{topic.emoji}</span>
                    <span>{topic.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Rating prompt (after session closed) ─────────── */}
          {session.status === 'closed' && !showRating && !ratingSubmitted && (
            <div className="border-t border-gray-100 px-4 py-3 text-center space-y-2 shrink-0">
              <p className="text-sm text-gray-500">This conversation has been closed.</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setShowRating(true)}
                  className="text-xs text-[#054700] hover:underline font-medium"
                >
                  Rate this conversation
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleEmailTranscript}
                  className="text-xs text-[#054700] hover:underline font-medium flex items-center gap-1"
                >
                  <Mail className="h-3 w-3" /> Email transcript
                </button>
              </div>
            </div>
          )}

          {/* Rating form */}
          {session.status === 'closed' && showRating && !ratingSubmitted && (
            <div className="border-t border-gray-100 px-4 py-3 space-y-3 shrink-0">
              <p className="text-sm text-gray-600 font-medium text-center">How was your experience?</p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setRatingHover(star)}
                    onMouseLeave={() => setRatingHover(0)}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        'h-6 w-6 transition-colors',
                        (ratingHover || rating) >= star
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      )}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <>
                  <textarea
                    value={ratingComment}
                    onChange={e => setRatingComment(e.target.value)}
                    placeholder="Any additional feedback? (optional)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#054700]/20 resize-none"
                    rows={2}
                  />
                  <button
                    onClick={handleSubmitRating}
                    className="w-full py-2 bg-[#054700] text-white rounded-lg text-xs font-medium hover:bg-[#054700]/90 transition-colors"
                  >
                    Submit Rating
                  </button>
                </>
              )}
            </div>
          )}

          {/* Rating submitted */}
          {ratingSubmitted && (
            <div className="border-t border-gray-100 px-4 py-3 text-center shrink-0">
              <p className="text-sm text-gray-500">Thank you for your feedback!</p>
              <button
                onClick={handleEmailTranscript}
                className="text-xs text-[#054700] hover:underline font-medium flex items-center gap-1 mx-auto mt-1"
              >
                <Mail className="h-3 w-3" /> Email transcript
              </button>
            </div>
          )}

          {/* ── Pending files preview ──────────────────────── */}
          {pendingFiles.length > 0 && session.status !== 'closed' && (
            <div className="border-t border-gray-100 px-3 py-2 flex flex-wrap gap-2 shrink-0">
              {pendingFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1 text-xs text-gray-600">
                  {file.type.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  <span className="truncate max-w-[100px]">{file.name}</span>
                  <button onClick={() => removePendingFile(idx)} className="text-gray-400 hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Input area ─────────────────────────────────── */}
          {session.status !== 'closed' && (
            <div className="border-t border-gray-100 px-3 py-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_FILE_TYPES.join(',')}
                  className="hidden"
                  onChange={e => handleFileSelect(e.target.files)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-gray-400 hover:text-[#054700] transition-colors rounded-md hover:bg-gray-50"
                  aria-label="Attach file"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#054700]/20 focus:border-[#054700]/40"
                  disabled={sending || uploading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && pendingFiles.length === 0) || sending || uploading}
                  className="h-9 w-9 rounded-full bg-[#054700] text-white flex items-center justify-center hover:bg-[#054700]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── MessageBubble sub-component ──────────────────────────────────

function MessageBubble({
  msg,
  formatTime,
  formatFileSize,
}: {
  msg: ChatMessage;
  formatTime: (d: string) => string;
  formatFileSize: (b: number) => string;
}) {
  const isUser = msg.sender === 'user';

  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'items-end' : 'items-start'
      )}
    >
      {!isUser && (
        <span className="text-[10px] text-gray-400 px-1">
          {msg.sender === 'bot' ? 'Ones' : 'Support'}
        </span>
      )}
      <div
        className={cn(
          'max-w-[85%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-[#054700] text-white rounded-br-md'
            : 'bg-gray-100 text-gray-800 rounded-bl-md'
        )}
      >
        {renderMarkdown(msg.content)}
      </div>

      {/* Attachments */}
      {msg.attachments && msg.attachments.length > 0 && (
        <div className={cn('flex flex-wrap gap-1.5 mt-1 max-w-[85%]', isUser ? 'justify-end' : 'justify-start')}>
          {msg.attachments.map((att, idx) => (
            <a
              key={idx}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors',
                isUser
                  ? 'bg-white/20 text-white/90 hover:bg-white/30'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              )}
            >
              {att.type.startsWith('image/') ? (
                <ImageIcon className="h-3 w-3 shrink-0" />
              ) : (
                <FileText className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate max-w-[120px]">{att.name}</span>
              <span className="text-[10px] opacity-70 shrink-0">{formatFileSize(att.size)}</span>
            </a>
          ))}
        </div>
      )}

      <span className="text-[10px] text-gray-300 px-1">{formatTime(msg.createdAt)}</span>
    </div>
  );
}
