import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Progress } from '@/shared/components/ui/progress';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Separator } from '@/shared/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import {
  Send, Upload, User, AlertTriangle, CheckCircle, Sparkles, FileText,
  History, Download, Search, Plus, RotateCcw, Copy, Share2, Mic,
  Loader2, FlaskConical, Clock, ArrowUp, Settings2, Zap,
  Shield, Trash2, Calendar, Eye, EyeOff, X, ChevronDown, ChevronUp, ArrowRight, Pencil, Check, Watch
} from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getAuthHeaders } from '@/shared/lib/queryClient';
import { buildApiUrl } from '@/shared/lib/api';
import { Link, useSearch } from 'wouter';
import ThinkingSteps, { type ThinkingStep } from '@/features/chat/components/ThinkingSteps';
import { InlineCapsuleSelector } from '@/features/formulas/components/InlineCapsuleSelector';
import { type CapsuleCount } from '@/shared/lib/utils';

// Default step definitions for the AI thinking progress
const INITIAL_THINKING_STEPS: ThinkingStep[] = [
  { id: 'review_data',      label: 'Reviewing your data',        status: 'active' },
  { id: 'understand_query', label: 'Understanding your question', status: 'waiting' },
  { id: 'build_context',    label: 'Referencing materials',      status: 'waiting' },
  { id: 'generate',         label: 'Crafting your response',     status: 'waiting' },
];

function deriveCapsuleRecommendationFromMessage(content: string): CapsuleRecommendation | null {
  const normalized = String(content || '').toLowerCase();
  if (!normalized) return null;

  const persistedDecisionMatch = String(content || '').match(/\[\[CAPSULE_DECISION:([^\]]+)\]\]/i);
  if (persistedDecisionMatch) {
    try {
      const parsed = JSON.parse(decodeURIComponent(persistedDecisionMatch[1]));
      const recommendedCapsules = Number(parsed?.recommendedCapsules);
      if (recommendedCapsules === 6 || recommendedCapsules === 9 || recommendedCapsules === 12) {
        return {
          recommendedCapsules,
          reasoning: typeof parsed?.summary === 'string' && parsed.summary.trim().length > 0
            ? parsed.summary
            : 'Select your preferred DAILY capsule count and I’ll create your formula immediately.',
          priorities: Array.isArray(parsed?.signals)
            ? parsed.signals.filter((signal: unknown) => typeof signal === 'string').slice(0, 6)
            : [],
          estimatedAmazonCost: 0,
        };
      }
    } catch {
      // Fall through to legacy token/fallback parsing
    }
  }

  const persistedTokenMatch = normalized.match(/\[\[capsule_recommendation:(6|9|12)\]\]/i);
  if (persistedTokenMatch) {
    const parsed = Number(persistedTokenMatch[1]) as CapsuleCount;
    return {
      recommendedCapsules: parsed,
      reasoning: 'Select your preferred DAILY capsule count and I’ll create your formula immediately. We recommend higher daily counts only when clinically needed.',
      priorities: [],
      estimatedAmazonCost: 0,
    };
  }

  const asksForCapsuleSelection =
    normalized.includes('select your preferred daily capsule count') ||
    normalized.includes('select your preferred capsule count and i’ll create your formula immediately') ||
    normalized.includes('select your preferred capsule count and i\'ll create your formula immediately') ||
    normalized.includes('select your daily protocol');

  if (!asksForCapsuleSelection) {
    return null;
  }

  const directMatch = normalized.match(/\b(6|9|12)\s*(capsules?|caps)\b/);
  if (!directMatch) {
    return null;
  }

  const parsed = Number(directMatch[1]);
  if (parsed !== 6 && parsed !== 9 && parsed !== 12) {
    return null;
  }

  return {
    recommendedCapsules: parsed,
    reasoning: 'Select your preferred DAILY capsule count and I’ll create your formula immediately. We recommend higher daily counts only when clinically needed.',
    priorities: [],
    estimatedAmazonCost: 0,
  };
}

interface CapsuleRecommendation {
  recommendedCapsules: CapsuleCount;
  reasoning: string;
  priorities: string[];
  estimatedAmazonCost: number;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: Date;
  sessionId?: string;
  capsuleRecommendation?: CapsuleRecommendation;
  selectedCapsules?: CapsuleCount;
  fileAttachment?: {
    name: string;
    url: string;
    type: 'lab_report' | 'medical_document' | 'prescription' | 'other';
    size: number;
  };
  formula?: {
    bases: { name: string; dose: string; purpose: string }[];
    additions: { name: string; dose: string; purpose: string }[];
    totalMg: number;
    warnings: string[];
    rationale: string;
    disclaimers: string[];
    isIncomplete?: boolean;
    buildingProgress?: number;
  };
  isTyping?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
  hasFormula: boolean;
  status: 'active' | 'completed' | 'archived';
}

// Utility function to remove JSON code blocks and markdown formatting from AI messages for clean display
const removeJsonBlocks = (content: string): string => {
  if (!content) return '';

  // Remove complete ```json blocks (formula data)
  let cleaned = content.replace(/```json\s*[\s\S]*?```/g, '');
  // Also remove incomplete/streaming ```json blocks (no closing backticks yet)
  cleaned = cleaned.replace(/```json\s*[\s\S]*$/g, '');

  // Remove complete ```health-data blocks (health profile updates)
  cleaned = cleaned.replace(/```health-data\s*[\s\S]*?```/g, '');
  // Also remove incomplete/streaming ```health-data blocks
  cleaned = cleaned.replace(/```health-data\s*[\s\S]*$/g, '');

  // Remove ```capsule-recommendation blocks (capsule selector data)
  // Complete blocks with closing backticks
  cleaned = cleaned.replace(/```capsule-recommendation\s*[\s\S]*?```/g, '');
  // Incomplete blocks (no closing backticks) - match JSON object
  cleaned = cleaned.replace(/```capsule-recommendation\s*\{[\s\S]*?\}\s*(?=\n|$)/g, '');
  // Streaming incomplete blocks
  cleaned = cleaned.replace(/```capsule-recommendation\s*[\s\S]*$/g, '');

  // Remove any other code blocks that might be streaming (generic catch-all)
  // This catches any ``` block that started but hasn't closed
  cleaned = cleaned.replace(/```[a-z-]*\s*[\s\S]*$/gi, '');

  // Remove markdown headers (### Header)
  cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, '$1');

  // Remove persisted capsule recommendation token used for restore logic
  cleaned = cleaned.replace(/\s*\[\[CAPSULE_RECOMMENDATION:(6|9|12)\]\]\s*/gi, '\n');
  cleaned = cleaned.replace(/\s*\[\[CAPSULE_DECISION:[^\]]+\]\]\s*/gi, '\n');

  // Remove bold markdown (**text** or __text__)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');

  // Clean up any resulting multiple blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim extra whitespace that might result from removal
  return cleaned.trim();
};

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

interface SuggestedPrompt {
  id: string;
  text: string;
  category: 'health' | 'formula' | 'lifestyle' | 'symptoms';
  icon: any;
}

export default function ConsultationPage() {
  // Core state management
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionHistory, setSessionHistory] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isNewSession, setIsNewSession] = useState(true);

  // Input and interaction state
  const [inputValue, setInputValue] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [activeStreamingMessageId, setActiveStreamingMessageId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Pending lab marker discussion (set from Labs page, consumed after handleSendMessage is ready)
  const [pendingLabMessage, setPendingLabMessage] = useState<string | null>(null);

  // UI state
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Inline capsule selection state (tracks which message has active selection)
  const [selectingCapsuleMessageId, setSelectingCapsuleMessageId] = useState<string | null>(null);

  // Draft autosave key
  const DRAFT_KEY = 'consultation_draft';
  // Key for persisting current session across tab navigation
  const SESSION_KEY = 'consultation_current_session';

  // Refs and hooks
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userHasScrolledUp = useRef(false);
  const lastScrollTop = useRef(0);
  const isUserScrolling = useRef(false);
  const scrollLockTimeout = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Start new consultation session - defined early for use in effects
  const handleNewSession = useCallback(() => {
    const welcomeMessage: Message = {
      id: 'welcome-' + Date.now(),
      content: `Hello ${user?.name?.split(' ')[0] || 'there'}! I'm here to help you optimize your health. Let's get started with creating the perfect supplement formula for you.\n\nTo give you the best recommendations, I need to understand your complete health picture. Please share as much information as you can about yourself:\n\n• Your age, gender, height, and weight\n• Any medications you're currently taking\n• Health goals or concerns you have\n• Any specific symptoms or issues you're experiencing\n• Lifestyle factors (exercise, diet, sleep patterns)\n\nFeel free to click the microphone icon to speak with me, or simply type in the chat. This is just like a doctor's visit - the more you share, the better I can help you.`,
      sender: 'ai',
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);
    setCurrentSessionId(null);
    setIsNewSession(true);
    setUploadedFiles([]);
    setInputValue('');
    setShowSuggestions(false);
    // Clear saved session when starting a new one
    localStorage.removeItem(SESSION_KEY);

    toast({
      title: "New Consultation Started",
      description: "Ready to discuss your health goals with Ones AI.",
      variant: "default"
    });
  }, [toast, user?.name]);

  // Restore draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      setInputValue(savedDraft);
      setDraftSaved(true);
    }
  }, []);

  // Autosave draft with debounce
  useEffect(() => {
    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }

    if (inputValue.trim().length > 10) {
      draftTimeoutRef.current = setTimeout(() => {
        localStorage.setItem(DRAFT_KEY, inputValue);
        setDraftSaved(true);
      }, 1000);
    } else if (inputValue.trim().length === 0) {
      localStorage.removeItem(DRAFT_KEY);
      setDraftSaved(false);
    }

    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
    };
  }, [inputValue]);

  // Clear draft when message is sent
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftSaved(false);
  }, []);

  // Suggested prompts data
  const suggestedPrompts: SuggestedPrompt[] = useMemo(() => [
    {
      id: '1',
      text: 'I want to optimize my energy levels and focus',
      category: 'health',
      icon: Zap
    },
    {
      id: '2',
      text: 'Please review my current supplement formula',
      category: 'formula',
      icon: FlaskConical
    },
    {
      id: '3',
      text: 'I have new blood test results to analyze',
      category: 'health',
      icon: Upload
    },
    {
      id: '4',
      text: 'Help me with sleep and recovery issues',
      category: 'symptoms',
      icon: Shield
    },
    {
      id: '5',
      text: 'I want to discuss my fitness and nutrition goals',
      category: 'lifestyle',
      icon: Plus
    }
  ], []);

  // Query to fetch consultation history
  const { data: historyData, isLoading: isLoadingHistory, error: historyError } = useQuery({
    queryKey: ['/api/chat/consultations/history', user?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/chat/consultations/history');
      const data = await response.json();
      return data as { sessions: ChatSession[], messages: Record<string, Message[]> };
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: (query) => {
      const data = query.state.data as { sessions?: ChatSession[]; messages?: Record<string, any[]> } | undefined;
      if (!data?.messages) return false;

      const savedSessionId = localStorage.getItem(SESSION_KEY);
      const activeSessionId = currentSessionId || savedSessionId || data.sessions?.[0]?.id;
      if (!activeSessionId) return false;

      const sessionMessages = data.messages[activeSessionId] || [];
      if (sessionMessages.length === 0) {
        // Session exists but has no messages loaded yet; keep polling briefly.
        return 2000;
      }

      const lastMessage = sessionMessages[sessionMessages.length - 1] as any;
      const lastSender = lastMessage?.sender || (lastMessage?.role === 'assistant' ? 'ai' : lastMessage?.role === 'user' ? 'user' : undefined);

      // If user message is last, assistant reply is still pending.
      return lastSender === 'user' ? 2000 : false;
    }
  });

  // Query wearable connections to show status indicator in chat header
  const { data: wearableConnections = [] } = useQuery<Array<{ id: string; provider: string; status: string }>>({
    queryKey: ['/api/wearables/connections'],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const hasConnectedWearable = wearableConnections.some(c => c.status === 'connected');

  // Persist current session ID to localStorage whenever it changes
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem(SESSION_KEY, currentSessionId);
    }
  }, [currentSessionId]);

  const search = useSearch();

  // Load history data and restore session (prioritize saved session, fallback to most recent)
  useEffect(() => {
    if (historyData?.sessions) {
      setSessionHistory(historyData.sessions);

      const params = new URLSearchParams(search);
      const startNew = params.get('new') === 'true';
      const formulaReviewContext = params.get('context') === 'formula-review';

      if ((startNew || formulaReviewContext) && messages.length === 0) {
        // If query param requests new session or formula review, force new session
        handleNewSession();
        // Clear the query param to avoid sticking
        window.history.replaceState({}, '', window.location.pathname);

        // Formula review context: auto-inject a review prompt
        if (formulaReviewContext) {
          setPendingLabMessage(
            'I\'d like to review my current formula. My dashboard is showing that my formula may need an update based on recent health data changes. Can you look at what\'s changed and recommend any adjustments?'
          );
          return;
        }

        // Check for lab marker discussion message (from Labs page "Discuss" link)
        const labMarkerMessage = localStorage.getItem('labMarkerDiscuss');
        if (labMarkerMessage) {
          localStorage.removeItem('labMarkerDiscuss');
          setPendingLabMessage(labMarkerMessage);
        }
        return;
      }

      // Only restore session on initial load (no messages yet, isNewSession true)
      if (historyData.sessions.length > 0 && messages.length === 0 && isNewSession) {
        const params = new URLSearchParams(search);
        const urlSessionId = params.get('session_id');
        const savedSessionId = localStorage.getItem(SESSION_KEY);

        // Priority 1: session_id from URL (e.g., from Dashboard 'Refine' button)
        // Priority 2: saved session from localStorage (previous navigation)
        // Priority 3: most recent session from history
        let sessionToRestore: ChatSession | undefined;

        if (urlSessionId) {
          sessionToRestore = historyData.sessions.find(s => s.id === urlSessionId);
          if (sessionToRestore) {
            console.log('Restoring session from URL parameter:', urlSessionId);
          }
        }

        if (!sessionToRestore && savedSessionId) {
          sessionToRestore = historyData.sessions.find(s => s.id === savedSessionId);
          if (sessionToRestore) {
            console.log('Restoring saved session from navigation:', savedSessionId);
          }
        }

        // Fallback to most recent session if no specific session requested or found
        if (!sessionToRestore) {
          sessionToRestore = historyData.sessions[0]; // Sessions are sorted by timestamp descending
          console.log('Restoring most recent session:', sessionToRestore?.id);
        }

        if (sessionToRestore) {
          const rawSessionMessages = historyData.messages[sessionToRestore.id] || [];
          const sessionMessages = rawSessionMessages.map((msg: any) => {
            // CRITICAL: Backend sends 'role' but frontend needs 'sender'
            // Backend values: 'user' | 'assistant' | 'system'  
            // Frontend values: 'user' | 'ai' | 'system'
            let sender = msg.sender; // Use existing sender if present
            if (!sender || sender === 'assistant') {
              // Transform 'assistant' -> 'ai' OR use role field as fallback
              sender = msg.role === 'assistant' ? 'ai' : msg.role === 'user' ? 'user' : msg.role === 'system' ? 'system' : 'ai';
            }

            return {
              ...msg,
              sender,
              timestamp: new Date(msg.timestamp)
            };
          });

          // Always restore the session ID so new messages continue in the right session
          setCurrentSessionId(sessionToRestore.id);

          if (sessionMessages.length > 0) {
            // Session has messages — restore them fully
            setMessages(sessionMessages);
            setIsNewSession(false);
            setShowSuggestions(false);
            console.log('Auto-restored session with', sessionMessages.length, 'messages:', sessionToRestore.id);
          } else {
            // Session exists but no messages yet (e.g. race: saved before DB write)
            // Keep isNewSession true so welcome message / suggestions still show
            console.log('Session found but 0 messages, keeping fresh state for session:', sessionToRestore.id);
          }

          // Clear query parameters to avoid re-triggering restoration on refresh
          if (urlSessionId) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      }
    }
  }, [historyData, messages.length, isNewSession, search, handleNewSession]);

  // Keep current session in sync with server history updates.
  // This is critical when a user navigates away mid-response: the assistant reply
  // may finish in the background and should appear automatically on return.
  useEffect(() => {
    if (!historyData?.messages) return;
    if (activeStreamingMessageId) return; // Don't clobber active local stream UI

    const targetSessionId = currentSessionId || localStorage.getItem(SESSION_KEY);
    if (!targetSessionId) return;

    const serverMessages = historyData.messages[targetSessionId];
    if (!Array.isArray(serverMessages) || serverMessages.length === 0) return;

    const normalizedServerMessages: Message[] = serverMessages.map((msg: any) => {
      let sender = msg.sender;
      if (!sender || sender === 'assistant') {
        sender = msg.role === 'assistant' ? 'ai' : msg.role === 'user' ? 'user' : msg.role === 'system' ? 'system' : 'ai';
      }

      return {
        ...msg,
        sender,
        timestamp: new Date(msg.timestamp)
      };
    });

    // Keep "analyzing" indicator behavior consistent even after user navigates away.
    const serverLastMessage = normalizedServerMessages[normalizedServerMessages.length - 1];
    const isAssistantPending = serverLastMessage?.sender === 'user';
    if (isAssistantPending) {
      setIsTyping(true);
      if (!thinkingMessage) {
        setThinkingMessage('Analyzing your health data...');
      }
    } else {
      setIsTyping(false);
      if (thinkingMessage) {
        setThinkingMessage(null);
        setThinkingSteps([]);
      }
    }

    const currentLastId = messages[messages.length - 1]?.id;
    const serverLastId = normalizedServerMessages[normalizedServerMessages.length - 1]?.id;

    // Never overwrite optimistic local messages with an older/shorter server snapshot.
    // This preserves the basic chat UX where the user's message appears immediately.
    if (messages.length > 0 && normalizedServerMessages.length < messages.length) {
      return;
    }

    const needsUpdate =
      messages.length === 0 ||
      normalizedServerMessages.length > messages.length ||
      serverLastId !== currentLastId;

    if (!needsUpdate) return;

    setMessages(normalizedServerMessages);
    setIsNewSession(false);
    setShowSuggestions(false);
  }, [historyData, currentSessionId, activeStreamingMessageId, messages, thinkingMessage]);

  // Initialize welcome message ONLY if no sessions exist
  useEffect(() => {
    // Don't show welcome if we already have messages or if we're loading history
    if (messages.length > 0 || isLoadingHistory) return;

    // Don't show welcome if we have sessions (they'll be auto-loaded)
    if (historyData?.sessions && historyData.sessions.length > 0) return;

    // Only show welcome for truly new users with no history
    if (!isNewSession) return;

    const welcomeMessage: Message = {
      id: 'welcome-' + Date.now(),
      content: `Hello ${user?.name?.split(' ')[0] || 'there'}! I'm here to help you optimize your health. Let's get started with creating the perfect supplement formula for you.\n\nTo give you the best recommendations, I need to understand your complete health picture. Please share as much information as you can about yourself:\n\n• Your age, gender, height, and weight\n• Any medications you're currently taking\n• Health goals or concerns you have\n• Any specific symptoms or issues you're experiencing\n• Lifestyle factors (exercise, diet, sleep patterns)\n\nFeel free to click the microphone icon to speak with me, or simply type in the chat. This is just like a doctor's visit - the more you share, the better I can help you.`,
      sender: 'ai',
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);
    setShowSuggestions(false);

    // Check for preserved message
    const preservedMessage = localStorage.getItem('preAuthMessage');
    if (preservedMessage) {
      localStorage.removeItem('preAuthMessage');
      setInputValue(preservedMessage);
      setShowSuggestions(false);

      setTimeout(() => {
        handleSendMessage(preservedMessage);
      }, 1000);
    }
  }, [user?.name, isNewSession, messages.length, isLoadingHistory, historyData?.sessions]);

  // Check if user is near the bottom of the scroll container using scroll position math
  const isNearBottom = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return true;

    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    // Consider "near bottom" if within 150px of the bottom
    return distanceFromBottom < 150;
  }, []);

  // Handle scroll events to track if user scrolled up
  const handleScroll = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const currentScrollTop = viewport.scrollTop;

    // If user is actively scrolling (touch/wheel) and scrolled up, mark as scrolled up
    if (isUserScrolling.current && currentScrollTop < lastScrollTop.current - 10) {
      userHasScrolledUp.current = true;
    }

    // If user scrolls back to near bottom, re-enable auto-scroll
    if (isNearBottom()) {
      userHasScrolledUp.current = false;
    }

    lastScrollTop.current = currentScrollTop;
  }, [isNearBottom]);

  // Handle user-initiated scroll (touch or wheel) to differentiate from programmatic scrolls
  const handleUserScrollStart = useCallback(() => {
    isUserScrolling.current = true;

    // Clear any existing timeout
    if (scrollLockTimeout.current) {
      clearTimeout(scrollLockTimeout.current);
    }

    // Reset after 150ms of no scroll activity
    scrollLockTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 150);
  }, []);

  // Set up scroll listener on the ScrollArea viewport
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // Find the actual scrollable viewport (Radix ScrollArea creates a nested structure)
    const viewport = scrollContainer.closest('[data-radix-scroll-area-viewport]') ||
      scrollContainer.parentElement?.querySelector('[data-radix-scroll-area-viewport]');

    if (viewport) {
      // Store ref to viewport for position calculations
      scrollViewportRef.current = viewport as HTMLDivElement;

      viewport.addEventListener('scroll', handleScroll, { passive: true });
      // Track user-initiated scrolling via touch and wheel events
      viewport.addEventListener('touchstart', handleUserScrollStart, { passive: true });
      viewport.addEventListener('touchmove', handleUserScrollStart, { passive: true });
      viewport.addEventListener('wheel', handleUserScrollStart, { passive: true });

      return () => {
        viewport.removeEventListener('scroll', handleScroll);
        viewport.removeEventListener('touchstart', handleUserScrollStart);
        viewport.removeEventListener('touchmove', handleUserScrollStart);
        viewport.removeEventListener('wheel', handleUserScrollStart);
        if (scrollLockTimeout.current) {
          clearTimeout(scrollLockTimeout.current);
        }
      };
    }
  }, [handleScroll, handleUserScrollStart]);

  // Auto-scroll to bottom when new messages arrive (only if user hasn't scrolled up)
  const scrollToBottom = useCallback((force = false) => {
    if (force || !userHasScrolledUp.current) {
      // Use requestAnimationFrame for smoother scrolling on mobile
      requestAnimationFrame(() => {
        const viewport = scrollViewportRef.current;
        if (viewport) {
          // For programmatic scroll, use scrollTop directly for more control
          // This is smoother than scrollIntoView on mobile during streaming
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: force ? 'instant' : 'smooth'
          });
        } else {
          // Fallback to scrollIntoView if viewport ref not available
          messagesEndRef.current?.scrollIntoView({ behavior: force ? 'instant' : 'smooth' });
        }
      });
    }
  }, []);

  // Reset scroll tracking when user sends a new message
  const resetScrollTracking = useCallback(() => {
    userHasScrolledUp.current = false;
    isUserScrolling.current = false;
    scrollToBottom(true);
  }, [scrollToBottom]);

  useEffect(() => {
    // Only auto-scroll if user hasn't scrolled up to read
    // Add a small delay to let the DOM update first
    if (!userHasScrolledUp.current) {
      // Use instant scroll during streaming to prevent janky animations
      const isStreamingMessage = messages.length > 0 &&
        messages[messages.length - 1]?.sender === 'ai' &&
        isTyping;

      if (isStreamingMessage) {
        // During streaming, scroll immediately without animation
        requestAnimationFrame(() => {
          const viewport = scrollViewportRef.current;
          if (viewport && !userHasScrolledUp.current) {
            viewport.scrollTop = viewport.scrollHeight;
          }
        });
      } else {
        scrollToBottom();
      }
    }
  }, [messages, scrollToBottom, isTyping]);

  // Scroll to bottom whenever thinking steps are added/updated so the growing card stays fully visible
  useEffect(() => {
    if (thinkingSteps.length > 0 && !userHasScrolledUp.current) {
      requestAnimationFrame(() => {
        const viewport = scrollViewportRef.current;
        if (viewport && !userHasScrolledUp.current) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      });
    }
  }, [thinkingSteps]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  // Enhanced message sending with file support
  const handleSendMessage = useCallback(async (messageText?: string, attachedFiles?: UploadedFile[]) => {
    const currentMessage = messageText || inputValue;
    if (!currentMessage.trim() && !attachedFiles?.length) return;

    // Stop voice recording if active
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    // Hide suggestions after first message
    setShowSuggestions(false);
    setIsNewSession(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: currentMessage,
      sender: 'user',
      timestamp: new Date(),
      sessionId: currentSessionId || undefined,
      fileAttachment: attachedFiles?.[0] ? {
        name: attachedFiles[0].name,
        url: attachedFiles[0].url,
        type: attachedFiles[0].type as any,
        size: attachedFiles[0].size
      } : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    void queryClient.invalidateQueries({ queryKey: ['/api/chat/consultations/history', user?.id] });
    setInputValue('');
    clearDraft(); // Clear autosaved draft when message is sent
    initialInputRef.current = ''; // Clear voice input reference
    setIsTyping(true);
    setUploadedFiles([]);
    resetScrollTracking(); // Force scroll to bottom when user sends a message

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 120000);

    try {
      const requestBody = {
        message: currentMessage,
        sessionId: currentSessionId,
        files: attachedFiles?.map(file => ({
          name: file.name,
          url: file.url,
          type: file.type,
          size: file.size
        })) || []
      };

      const response = await fetch(buildApiUrl('/api/chat/stream'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(requestBody),
        credentials: 'include',
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let aiMessageId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let currentAiMessage: Message = {
        id: aiMessageId,
        content: '',
        sender: 'ai',
        timestamp: new Date()
      };

      setActiveStreamingMessageId(aiMessageId);
      setMessages(prev => [...prev, currentAiMessage]);

      let buffer = '';
      let connected = false;
      let completed = false;

      // Accumulate content in hidden buffer - only show final result
      let accumulatedContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (!completed) {
              console.warn('Stream ended without completion signal');
              // Show accumulated content if stream ended early
              if (accumulatedContent) {
                setMessages(prev => prev.map(msg =>
                  msg.id === aiMessageId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                ));
              }
              setIsTyping(false);
              setThinkingMessage(null);
              setThinkingSteps([]);
              setActiveStreamingMessageId(null);
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === '') continue;

                const data = JSON.parse(jsonStr);

                if (data.type === 'connected') {
                  connected = true;
                  setIsConnected(true);
                  // Initialize thinking steps when connection starts
                  setThinkingSteps([...INITIAL_THINKING_STEPS]);
                  setThinkingMessage('thinking');
                  console.log('✅ SSE: Connected');
                } else if (data.type === 'thinking_step') {
                  // Progressive step updates from server
                  setThinkingSteps(prev => prev.map(s => {
                    if (s.id === data.step) {
                      return { ...s, status: data.status, detail: data.detail || s.detail };
                    }
                    // If the current step is done, advance the NEXT waiting step to active
                    if (data.status === 'done') {
                      const doneIdx = prev.findIndex(p => p.id === data.step);
                      const thisIdx = prev.findIndex(p => p.id === s.id);
                      if (thisIdx === doneIdx + 1 && s.status === 'waiting') {
                        return { ...s, status: 'active' };
                      }
                    }
                    return s;
                  }));
                  setIsTyping(false);
                } else if (data.type === 'thinking') {
                  // Legacy fallback — still handle old-style thinking events
                  setIsTyping(false);
                  setThinkingMessage(data.message);
                } else if (data.type === 'processing') {
                  // Formula is being processed - show status to prevent "timeout" appearance
                  console.log('⚙️ SSE: Processing status received:', data.message);
                  setThinkingMessage(data.message || 'Creating your formula...');
                  // Update the last step label to reflect formula processing
                  setThinkingSteps(prev => prev.map(s =>
                    s.id === 'generate' ? { ...s, label: 'Creating your formula', detail: data.message, status: 'active' } : s
                  ));
                } else if (data.type === 'chunk') {
                  // Accumulate content and show cleaned version in real-time
                  // This lets user see the "thinking" process without JSON code
                  accumulatedContent += data.content;

                  // Display cleaned content (removes JSON blocks) in real-time
                  const cleanedContent = removeJsonBlocks(accumulatedContent);
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, content: cleanedContent }
                      : msg
                  ));

                  // Clear thinking steps once we have visible content
                  // But allow processing messages to override this during formula creation
                  if (cleanedContent.trim().length > 0 && (thinkingMessage === 'thinking' || thinkingMessage === 'Analyzing your health data...')) {
                    setThinkingMessage(null);
                    setThinkingSteps([]);
                  }

                  if (data.sessionId && !currentSessionId) {
                    setCurrentSessionId(data.sessionId);
                  }
                } else if (data.type === 'health_data_updated') {
                  // Add a system message indicating profile was updated
                  const systemMessageId = (Date.now() + Math.random()).toString();
                  setMessages(prev => [...prev, {
                    id: systemMessageId,
                    content: data.message || "✓ We've updated your health profile based on the information you provided.",
                    sender: 'system',
                    timestamp: new Date()
                  }]);
                } else if (data.type === 'capsule_recommendation') {
                  // AI is recommending a capsule count - add inline selector to the current AI message
                  console.log('💊 Capsule recommendation received:', data.data);
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, capsuleRecommendation: data.data }
                      : msg
                  ));
                } else if (data.type === 'complete') {
                  completed = true;
                  setThinkingMessage(null); // Clear thinking status
                  setThinkingSteps([]);     // Clear thinking steps
                  setActiveStreamingMessageId(null); // Now clear the streaming indicator

                  // Now show the final accumulated content (cleaned by removeJsonBlocks during render)
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, content: accumulatedContent, formula: data.formula || msg.formula }
                      : msg
                  ));

                  if (data.formula) {
                    // Invalidate formula queries so the new formula appears in My Formula tab
                    queryClient.invalidateQueries({ queryKey: ['/api/users/me/formula/current'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/users/me/formula/history'] });
                  }
                  setIsTyping(false);
                } else if (data.type === 'formula_error') {
                  console.error('Formula validation error:', data.error);
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, content: removeJsonBlocks(accumulatedContent) + '\n\n⚠️ **Formula Error**: ' + (data.error || 'Validation failed.'), isError: true }
                      : msg
                  ));
                  toast({
                    title: "Formula Error",
                    description: data.error,
                    variant: "destructive"
                  });
                  setIsTyping(false);
                  setActiveStreamingMessageId(null);
                  completed = true;
                } else if (data.type === 'info') {
                  toast({
                    description: data.message,
                    variant: "default"
                  });
                } else if (data.type === 'error') {
                  console.error('AI Stream error:', data.error);
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, content: removeJsonBlocks(accumulatedContent) + '\n\n⚠️ **Error**: ' + (data.error || 'An error occurred.'), isError: true }
                      : msg
                  ));
                  toast({
                    title: "AI Response Error",
                    description: data.error,
                    variant: "destructive"
                  });
                  setIsTyping(false);
                  setActiveStreamingMessageId(null);
                  completed = true;
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError, 'Line:', line);
              }
            }
          }
        }
      } catch (streamError) {
        console.error('Streaming error:', streamError);
        setIsTyping(false);
        setActiveStreamingMessageId(null);
      } finally {
        try {
          reader.releaseLock();
        } catch (e) {
          console.warn('Could not release reader lock:', e);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast({
            title: "Request Timeout",
            description: "The request took too long. Please try again.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Connection Error",
            description: error.message || "Failed to send message. Please try again.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Unknown Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      }

      setIsTyping(false);
      setActiveStreamingMessageId(null);
    } finally {
      clearTimeout(timeoutId);
    }
  }, [inputValue, currentSessionId, toast, user?.id, isRecording]);

  // Auto-send pending lab marker discussion message (from Labs page "Discuss with practitioner" link)
  useEffect(() => {
    if (!pendingLabMessage) return;
    const timer = setTimeout(() => {
      handleSendMessage(pendingLabMessage);
      setPendingLabMessage(null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [pendingLabMessage, handleSendMessage]);

  // Enhanced file upload with object storage
  const handleFileUpload = useCallback(async () => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const newUploadedFiles: UploadedFile[] = [];

    try {
      for (const file of files) {
        // Validate file
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

        if (file.size > maxSize) {
          toast({
            title: "File Too Large",
            description: `${file.name} exceeds the 10MB limit.`,
            variant: "destructive"
          });
          continue;
        }

        if (!allowedTypes.includes(file.type)) {
          toast({
            title: "File Type Not Supported",
            description: `${file.name} format not supported. Please use PDF, JPG, or PNG.`,
            variant: "destructive"
          });
          continue;
        }

        // Upload to object storage
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'lab_report');
        formData.append('userId', user?.id || '');

        const uploadResponse = await fetch(buildApiUrl('/api/files/upload'), {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData,
          credentials: 'include'
        });

        if (!uploadResponse.ok) {
          let errorMessage = `Upload failed for ${file.name}`;
          try {
            const errorData = await uploadResponse.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // Response might not be JSON
            console.error('Failed to parse error response:', e);
          }
          throw new Error(errorMessage);
        }

        let uploadResult;
        try {
          uploadResult = await uploadResponse.json();
        } catch (e) {
          console.error('Failed to parse upload response as JSON:', e);
          throw new Error(`Invalid response format for ${file.name}`);
        }

        const uploadedFile: UploadedFile = {
          id: uploadResult.id || Date.now().toString(),
          name: file.name,
          url: uploadResult.url,
          type: file.type,
          size: file.size,
          uploadedAt: new Date()
        };

        newUploadedFiles.push(uploadedFile);
      }

      if (newUploadedFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
        setInputValue(`I've uploaded my lab results (${newUploadedFiles.map(f => f.name).join(', ')}). Please analyze them and provide insights for optimizing my supplement formula.`);

        toast({
          title: "Files Uploaded Successfully",
          description: `${newUploadedFiles.length} file(s) ready for analysis. Click send to have Ones AI analyze your results.`,
          variant: "success"
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  }, [user?.id, toast]);

  // Handle suggested prompt selection
  const handlePromptSelect = useCallback((prompt: SuggestedPrompt) => {
    setInputValue(prompt.text);
    setShowSuggestions(false);

    setTimeout(() => {
      handleSendMessage(prompt.text);
    }, 100);
  }, [handleSendMessage]);



  // Load previous session
  const handleLoadSession = useCallback((session: ChatSession) => {
    if (historyData && historyData.messages[session.id]) {
      // Convert timestamp strings to Date objects and transform role to sender
      const messagesWithDates = historyData.messages[session.id].map((msg: any) => {
        // CRITICAL: Backend sends 'role' but frontend needs 'sender'
        // Backend values: 'user' | 'assistant' | 'system'  
        // Frontend values: 'user' | 'ai' | 'system'
        let sender = msg.sender; // Use existing sender if present
        if (!sender || sender === 'assistant') {
          // Transform 'assistant' -> 'ai' OR use role field as fallback
          sender = msg.role === 'assistant' ? 'ai' : msg.role === 'user' ? 'user' : msg.role === 'system' ? 'system' : 'ai';
        }

        return {
          ...msg,
          sender,
          timestamp: new Date(msg.timestamp)
        };
      });

      setMessages(messagesWithDates);
      setCurrentSessionId(session.id);
      setIsNewSession(false);
      setShowHistory(false);
      setShowSuggestions(false);
    }
  }, [historyData]);

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('DELETE', `/api/chat/consultations/${sessionId}`);
      if (!response.ok) throw new Error('Failed to delete session');
      return sessionId;
    },
    onSuccess: (deletedSessionId) => {
      // Invalidate history query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/chat/consultations/history', user?.id] });

      // If we deleted the current session, start a new one
      if (deletedSessionId === currentSessionId) {
        handleNewSession();
      }

      toast({
        title: "Conversation Deleted",
        description: "The consultation has been removed from your history.",
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Unable to delete the conversation. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle delete session with confirmation
  const handleDeleteSession = useCallback((sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the load session
    setSessionToDelete(sessionId);
  }, []);

  // Handle rename session
  const handleStartRename = useCallback((sessionId: string, currentTitle: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setRenamingSessionId(sessionId);
    setRenameValue(currentTitle);
  }, []);

  const handleConfirmRename = useCallback(async (sessionId: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed.length === 0) {
      setRenamingSessionId(null);
      return;
    }
    try {
      await apiRequest('PATCH', `/api/chat/consultations/${sessionId}/rename`, { title: trimmed });
      // Update local state
      setSessionHistory(prev => prev.map(s => s.id === sessionId ? { ...s, title: trimmed } : s));
      queryClient.invalidateQueries({ queryKey: ['/api/chat/consultations/history', user?.id] });
      toast({ title: 'Renamed', description: 'Consultation renamed successfully.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to rename consultation.', variant: 'destructive' });
    }
    setRenamingSessionId(null);
  }, [renameValue, queryClient, user?.id, toast]);

  // Confirm delete session
  const confirmDeleteSession = useCallback(() => {
    if (sessionToDelete) {
      deleteSessionMutation.mutate(sessionToDelete);
      setSessionToDelete(null);
    }
  }, [sessionToDelete, deleteSessionMutation]);

  // Copy message content
  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast({
        title: "Copied to Clipboard",
        description: "Message content copied successfully.",
        variant: "default"
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Failed to copy message content.",
        variant: "destructive"
      });
    });
  }, [toast]);

  // Share message content
  const handleShareMessage = useCallback(async (content: string, formula?: any) => {
    const shareData = {
      title: 'Ones AI Consultation',
      text: formula
        ? `Check out my personalized supplement formula from Ones AI:\n\n${content}\n\nTotal: ${formula.totalMg}mg formula with ${formula.bases.length} system supports and ${formula.additions?.length || 0} additions.`
        : `Ones AI Health Consultation:\n\n${content}`,
      url: window.location.origin
    };

    try {
      if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        await navigator.share(shareData);
        toast({
          title: "Shared Successfully",
          description: "Content shared via native sharing.",
          variant: "default"
        });
      } else {
        // Fallback: copy to clipboard with formatted text
        await navigator.clipboard.writeText(`${shareData.text}\n\nLearn more at: ${shareData.url}`);
        toast({
          title: "Ready to Share",
          description: "Formatted content copied to clipboard for sharing.",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Unable to share content. Content copied to clipboard instead.",
        variant: "destructive"
      });
      // Fallback to copy
      try {
        await navigator.clipboard.writeText(content);
      } catch {
        // Silent fail for copy fallback
      }
    }
  }, [toast]);

  // Export consultation
  const handleExportConsultation = useCallback(() => {
    const exportData = {
      session: currentSessionId,
      timestamp: new Date().toISOString(),
      messages: messages.map(msg => ({
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        formula: msg.formula
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consultation-${currentSessionId || 'current'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Consultation Exported",
      description: "Your consultation has been downloaded as JSON.",
      variant: "default"
    });
  }, [messages, currentSessionId, toast]);

  // Enhanced keyboard handling
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!inputValue.trim() && uploadedFiles.length === 0) return;
      handleSendMessage(inputValue, uploadedFiles);
    }
    // Add keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'n':
          e.preventDefault();
          handleNewSession();
          break;
        case 'e':
          e.preventDefault();
          handleExportConsultation();
          break;
        case 'h':
          e.preventDefault();
          setShowHistory(!showHistory);
          break;
      }
    }
  }, [inputValue, uploadedFiles, handleSendMessage, handleNewSession, handleExportConsultation, showHistory]);

  // Remove uploaded file
  const handleRemoveFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    setInputValue('');
  }, []);

  // Voice input handling with continuous recording
  const recognitionRef = useRef<any>(null);
  const initialInputRef = useRef<string>('');

  const handleVoiceInput = useCallback(async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast({
        title: "Voice Input Not Supported",
        description: "Your browser doesn't support voice recognition.",
        variant: "destructive"
      });
      return;
    }

    // If already recording, stop
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;  // Enable continuous recording
      recognition.interimResults = true;  // Show interim results as user speaks
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let finalTranscript = '';

      recognition.onstart = () => {
        setIsRecording(true);
        // Store the initial input value when recording starts
        initialInputRef.current = inputValue;
        toast({
          title: "Listening...",
          description: "Speak freely. Click the microphone again when done.",
          variant: "success"
        });
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Update input with both final and interim results
        // Use the initial input value stored when recording started
        const baseText = initialInputRef.current.trim();
        const combinedTranscript = (finalTranscript + interimTranscript).trim();
        const newValue = baseText + (baseText && combinedTranscript ? ' ' : '') + combinedTranscript + (interimTranscript ? ' [Speaking...]' : '');
        setInputValue(newValue);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        recognitionRef.current = null;

        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          toast({
            title: "Voice Recognition Error",
            description: "Failed to capture voice input. Please try again.",
            variant: "destructive"
          });
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        recognitionRef.current = null;

        // Clean up the [Speaking...] indicator
        setInputValue(prev => prev.replace(' [Speaking...]', '').trim());
      };

      recognition.start();
    } catch (error) {
      setIsRecording(false);
      recognitionRef.current = null;
      toast({
        title: "Voice Input Error",
        description: "Unable to start voice recognition.",
        variant: "destructive"
      });
    }
  }, [toast, isRecording, inputValue]);

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Filter messages for search
  // Filter messages for search
  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim()) return messages;
    return messages.filter(msg =>
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [messages, searchTerm]);

  // Handle inline capsule selection
  const handleCapsuleSelection = useCallback(async (messageId: string, capsuleCount: CapsuleCount) => {
    console.log('💊 User selected', capsuleCount, 'capsules for message', messageId);
    console.log('💊 Current session ID:', currentSessionId);

    // Mark this message as "selecting" and update selected capsules
    setSelectingCapsuleMessageId(messageId);
    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, selectedCapsules: capsuleCount }
        : msg
    ));

    // Auto-send message to create formula
    const selectionMessage = `I'll take ${capsuleCount} capsules per day. Please create my formula now.`;

    // Use the existing send logic
    setTimeout(async () => {
      // Directly call the send message API
      try {
        const requestBody = {
          message: selectionMessage,
          sessionId: currentSessionId || undefined, // Don't send null
          files: []
        };

        console.log('💊 Sending capsule selection request:', requestBody);

        // Add user message to UI
        const userMessage: Message = {
          id: Date.now().toString(),
          content: selectionMessage,
          sender: 'user',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        setIsTyping(true);

        const response = await fetch(buildApiUrl('/api/chat/stream'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(requestBody),
          credentials: 'include'
        });

        console.log('💊 Response status:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('💊 Error response:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let aiMessageId = (Date.now() + 1).toString();
        let currentAiMessage: Message = {
          id: aiMessageId,
          content: '',
          sender: 'ai',
          timestamp: new Date()
        };

        // Set streaming indicator BEFORE adding message
        setActiveStreamingMessageId(aiMessageId);
        setMessages(prev => [...prev, currentAiMessage]);

        let buffer = '';
        let completed = false;

        // Accumulate content - don't show raw JSON during generation
        let accumulatedContent = '';
        setThinkingMessage('Creating your personalized formula...');

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('💊 Stream ended, completed:', completed);
            // Show accumulated content if stream ended early
            if (!completed && accumulatedContent) {
              setMessages(prev => prev.map(msg =>
                msg.id === aiMessageId
                  ? { ...msg, content: accumulatedContent }
                  : msg
              ));
            }
            setThinkingMessage(null);
            setThinkingSteps([]);
            setActiveStreamingMessageId(null);
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === '') continue;

                const data = JSON.parse(jsonStr);
                console.log('💊 SSE event:', data.type);

                if (data.type === 'connected') {
                  console.log('💊 Connected to SSE');
                  // Initialize thinking steps for formula creation
                  setThinkingSteps([
                    { id: 'review_data', label: 'Reviewing your health profile', status: 'done', detail: '' },
                    { id: 'understand_query', label: 'Selecting optimal ingredients', status: 'active', detail: '' },
                    { id: 'build_context', label: 'Calculating dosages', status: 'waiting', detail: '' },
                    { id: 'generate', label: 'Creating your formula', status: 'waiting', detail: '' },
                  ]);
                  setThinkingMessage('thinking');
                } else if (data.type === 'thinking_step') {
                  // Progressive step updates from server
                  setThinkingSteps(prev => prev.map(s => {
                    if (s.id === data.step) {
                      return { ...s, status: data.status, detail: data.detail || s.detail };
                    }
                    if (data.status === 'done') {
                      const doneIdx = prev.findIndex(p => p.id === data.step);
                      const thisIdx = prev.findIndex(p => p.id === s.id);
                      if (thisIdx === doneIdx + 1 && s.status === 'waiting') {
                        return { ...s, status: 'active' };
                      }
                    }
                    return s;
                  }));
                } else if (data.type === 'thinking') {
                  console.log('💊 AI thinking:', data.message);
                  setThinkingMessage(data.message);
                } else if (data.type === 'processing') {
                  console.log('⚙️ Formula processing:', data.message);
                  setThinkingMessage(data.message || 'Creating your formula...');
                  setThinkingSteps(prev => prev.map(s =>
                    s.id === 'generate' ? { ...s, label: 'Creating your formula', detail: data.message, status: 'active' } : s
                  ));
                } else if (data.type === 'chunk') {
                  // Accumulate and show cleaned content in real-time
                  accumulatedContent += data.content;

                  // Display cleaned content (removes JSON blocks) in real-time
                  const cleanedContent = removeJsonBlocks(accumulatedContent);
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, content: cleanedContent }
                      : msg
                  ));

                  // Clear thinking message once we have visible content
                  if (cleanedContent.trim().length > 0) {
                    setThinkingMessage(null);
                    setThinkingSteps([]);
                  }
                } else if (data.type === 'complete') {
                  completed = true;
                  setThinkingMessage(null);
                  setThinkingSteps([]);
                  console.log('💊 Stream complete, formula:', !!data.formula);

                  // Now show the final accumulated content
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, content: accumulatedContent, formula: data.formula || msg.formula }
                      : msg
                  ));

                  if (data.formula) {
                    queryClient.invalidateQueries({ queryKey: ['/api/users/me/formula/current'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/users/me/formula/history'] });
                    toast({
                      title: "Formula Created!",
                      description: "Your personalized supplement formula has been created.",
                    });
                  }
                  setIsTyping(false);
                  setActiveStreamingMessageId(null);
                  setSelectingCapsuleMessageId(null);
                } else if (data.type === 'formula_error') {
                  console.error('💊 Formula error:', data.error);
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, content: removeJsonBlocks(accumulatedContent) + '\n\n⚠️ **Formula Error**: ' + (data.error || 'Validation failed.'), isError: true }
                      : msg
                  ));
                  toast({
                    title: "Formula Validation Error",
                    description: data.error,
                    variant: "destructive"
                  });
                  setIsTyping(false);
                  setActiveStreamingMessageId(null);
                  setSelectingCapsuleMessageId(null);
                  completed = true;
                } else if (data.type === 'error') {
                  console.error('💊 SSE error:', data.error);
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, content: removeJsonBlocks(accumulatedContent) + '\n\n⚠️ **Error**: ' + (data.error || 'An error occurred.'), isError: true }
                      : msg
                  ));
                  setIsTyping(false);
                  setActiveStreamingMessageId(null);
                  setSelectingCapsuleMessageId(null);
                  completed = true;
                }
              } catch (parseError) {
                console.error('💊 Parse error:', parseError, 'Line:', line);
              }
            }
          }
        }

        // Stream ended - ensure typing state is cleared
        setIsTyping(false);
        setActiveStreamingMessageId(null);
        setSelectingCapsuleMessageId(null);
        reader.releaseLock();
      } catch (error) {
        console.error('Error sending capsule selection:', error);
        setIsTyping(false);
        setActiveStreamingMessageId(null);
        setSelectingCapsuleMessageId(null);
        toast({
          title: "Error",
          description: "Failed to create formula. Please try again.",
          variant: "destructive"
        });
      }
    }, 100);
  }, [currentSessionId, queryClient, toast]);

  // Debug: Log render state
  console.log('🔍 RENDER STATE - isTyping:', isTyping, 'thinkingMessage:', thinkingMessage);

  return (
    // <div className="flex h-full min-h-[calc(100dvh-8rem)] md:min-h-dvh md:max-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/5 via-background to-secondary/5" data-testid="page-consultation">
    <div className="rounded-lg overflow-hidden flex flex-row h-[calc(100vh-7.5rem)]" data-testid="page-consultation">
      {/* History Sidebar - Hidden on mobile, shown on desktop */}
      {showHistory && (
        <div className="hidden md:flex w-80 border-r bg-background/80 backdrop-blur-sm flex-col">
          <div className="p-4 border-b bg-gradient-to-br from-primary/10 to-secondary/10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Consultation History</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-2 pb-4">
              {isLoadingHistory ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : sessionHistory.length > 0 ? (
                sessionHistory.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 border rounded-lg hover-elevate cursor-pointer group relative"
                    onClick={() => handleLoadSession(session)}
                    data-testid={`session-${session.id}`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {renamingSessionId === session.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleConfirmRename(session.id);
                                  if (e.key === 'Escape') setRenamingSessionId(null);
                                }}
                                className="text-sm font-medium w-full bg-white/60 border border-[#054700]/20 rounded px-1.5 py-0.5 outline-none focus:border-[#054700]/40"
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleConfirmRename(session.id); }}
                                className="h-6 w-6 p-0 text-[#054700] hover:bg-[#054700]/10 flex-shrink-0"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-sm font-medium truncate pr-2">{session.title}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleStartRename(session.id, session.title, e)}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#054700]/10 text-[#5a6623]"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                            data-testid={`button-delete-session-${session.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {session.lastMessage}
                      </p>

                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {session.messageCount} msgs
                          </Badge>
                          {session.hasFormula && (
                            <Badge variant="secondary" className="text-xs">
                              <FlaskConical className="w-3 h-3 mr-1" />
                              Formula
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(session.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No previous consultations
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Clean Branded Header */}
        <div className="glass-card border-b border-[#054700]/10 flex-shrink-0">
          <div className="p-4 md:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/ones-logo-icon.svg" alt="Ones" className="h-8 w-8" />
                <div>
                  <h1 className="text-lg md:text-xl font-semibold text-[#054700] flex items-center gap-2" data-testid="text-consultation-title">
                    <span className="hidden sm:inline">Ones AI Consultation</span>
                    <span className="sm:hidden">AI Consultation</span>
                  </h1>
                  <div className="flex items-center gap-2">
                    <p className="text-xs md:text-sm text-[#5a6623] hidden sm:block">Your personalized supplement consultant</p>
                    {isConnected && (
                      <div className="flex items-center gap-1 text-xs text-[#054700]">
                        <div className="w-1.5 h-1.5 bg-[#054700] rounded-full animate-pulse" />
                        <span className="hidden sm:inline">Live</span>
                      </div>
                    )}
                    {hasConnectedWearable && (
                      <Link href="/wearables">
                        <div className="flex items-center gap-1 text-xs text-[#054700]/70 hover:text-[#054700] transition-colors cursor-pointer" title="Wearable data active — click to manage">
                          <Watch className="w-3 h-3" />
                          <span className="hidden sm:inline">Wearable</span>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHistory(!showHistory)}
                  className="hover-elevate"
                  data-testid="button-toggle-history"
                >
                  <History className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNewSession}
                  className="hover-elevate"
                  data-testid="button-new-session"
                >
                  <Plus className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExportConsultation}
                  disabled={messages.length === 0}
                  className="hover-elevate"
                  data-testid="button-export"
                >
                  <Download className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Search Bar (when enabled) */}
            {searchTerm && (
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-background/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="input-search-messages"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea
          className="flex-1 relative"
          data-testid="container-chat-messages"
        >
          {/* Gradient blobs so frosted bubbles have content to blur */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute top-10 -left-10 w-[400px] h-[400px] rounded-full bg-[#c5d4b5]/20 blur-3xl" />
            <div className="absolute top-1/3 right-[-50px] w-[350px] h-[350px] rounded-full bg-[#054700]/8 blur-3xl" />
            <div className="absolute bottom-10 left-1/4 w-[450px] h-[450px] rounded-full bg-[#d5e3cc]/25 blur-3xl" />
            <div className="absolute top-2/3 left-[-30px] w-[300px] h-[300px] rounded-full bg-[#e0ead8]/30 blur-3xl" />
          </div>
          <div
            className="p-3 sm:p-6 pb-8 sm:pb-12 space-y-4 sm:space-y-6 relative"
            ref={scrollContainerRef}
          >
            {filteredMessages.map((message, index) => {
              // System messages render differently
              if (message.sender === 'system') {
                return (
                  <div
                    key={message.id}
                    className="flex justify-center"
                    data-testid={`message-system-${message.id}`}
                  >
                    <div className="max-w-md px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20">
                      {message.content}
                    </div>
                  </div>
                );
              }

              // Regular user/AI messages
              return (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${message.sender}-${message.id}`}
                >
                  <div
                    className={`group max-w-[95%] sm:max-w-[85%] rounded-2xl p-3 sm:p-5 space-y-3 overflow-hidden ${message.sender === 'user'
                      ? 'glass-dark text-[#054700] shadow-md'
                      : 'glass-card text-foreground shadow-md'
                      } ${message.sender === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                  >
                    <div>
                      {/* Header with avatar, name, timestamp */}
                      <div className={`flex items-center gap-2 mb-2 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                        {message.sender === 'ai' && (
                          <img
                            src="/ones-logo-icon.svg"
                            alt="Ones"
                            className={`h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0 ${message.id === activeStreamingMessageId ? 'animate-spin' : ''}`}
                          />
                        )}
                        {message.sender === 'user' && (
                          <Avatar className="h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0 ring-2 ring-[#054700]/20">
                            <AvatarFallback className="bg-[#054700]/15 text-[#054700]">
                              <User className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${message.sender === 'user' ? 'text-[#054700]' : 'text-muted-foreground'}`}>
                            {message.sender === 'user' ? 'You' : 'Ones AI'}
                          </span>
                          <span className={`text-xs ${message.sender === 'user' ? 'text-[#5a6623]' : 'text-muted-foreground/70'}`}>
                            {message.timestamp && !isNaN(new Date(message.timestamp).getTime())
                              ? new Date(message.timestamp).toLocaleTimeString()
                              : 'Just now'}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyMessage(message.content)}
                            className="!size-4 p-0 min-w-0 opacity-0 group-hover:opacity-100 transition-all"
                            data-testid={`button-copy-message-${message.id}`}
                          >
                            <Copy className="!size-3" />
                          </Button>
                          {/* <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShareMessage(message.content, message.formula)}
                            className="h-6 w-0 p-0 group-hover:w-6 opacity-0 group-hover:opacity-100 transition-all"
                            data-testid={`button-share-message-${message.id}`}
                          >
                            <Share2 className="w-3 h-3" />
                          </Button> */}
                        </div>
                      </div>

                      {/* Message content - left aligned */}
                      <div className="w-full">
                        {/* Show thinking steps ONLY when this specific message is streaming and has no content yet */}
                        {message.sender === 'ai' && message.id === activeStreamingMessageId && !message.content ? (
                          thinkingSteps.length > 0 ? (
                            <ThinkingSteps steps={thinkingSteps} />
                          ) : (
                            <div className="text-sm text-muted-foreground italic flex items-center gap-1.5">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#5a6623] animate-pulse" />
                              {thinkingMessage || 'Thinking...'}
                            </div>
                          )
                        ) : (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{removeJsonBlocks(message.content)}</p>
                        )}

                        {/* Inline Capsule Selector */}
                        {(() => {
                          if (message.sender !== 'ai') return null;
                          const isLatestMessage = index === filteredMessages.length - 1;
                          if (!isLatestMessage) return null;
                          const capsuleRecommendation = message.capsuleRecommendation || deriveCapsuleRecommendationFromMessage(message.content);
                          if (!capsuleRecommendation || message.formula) return null;

                          return (
                          <InlineCapsuleSelector
                            recommendedCapsules={capsuleRecommendation.recommendedCapsules}
                            reasoning={capsuleRecommendation.reasoning}
                            priorities={capsuleRecommendation.priorities}
                            onSelect={(count) => handleCapsuleSelection(message.id, count)}
                            isSelecting={selectingCapsuleMessageId === message.id}
                            selectedCapsules={message.selectedCapsules}
                          />
                          );
                        })()}

                        {/* File Attachment Display */}
                        {message.fileAttachment && (
                          <div className="mt-3 p-3 bg-muted/30 rounded border-dashed border">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              <div>
                                <p className="text-sm font-medium">{message.fileAttachment.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(message.fileAttachment.size)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Enhanced formula visualization with animations */}
                        {message.formula && (
                          <div className="mt-4 p-3 sm:p-4 bg-card rounded-lg border animate-in fade-in-50 duration-500 overflow-hidden">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                              <h4 className="font-semibold text-base flex items-center gap-2 text-primary">
                                <CheckCircle className="w-5 h-5 text-green-500 animate-in zoom-in-50 duration-700" />
                                Your Personalized Formula
                              </h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {message.formula.totalMg}mg total
                                </Badge>
                                <Progress
                                  value={Math.min((message.formula.totalMg / (9 * 550)) * 100, 100)}
                                  className="w-20 h-2"
                                />
                              </div>
                            </div>

                            {/* All Ingredients in Formula */}
                            {(message.formula.bases.length > 0 || message.formula.additions.length > 0) && (
                              <div className="mb-4 space-y-2">
                                <div className="grid gap-2">
                                  {message.formula.bases.map((base, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-start sm:items-center justify-between gap-2 p-2 sm:p-3 bg-muted/50 rounded border hover-elevate cursor-pointer group"
                                      style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <span className="font-medium text-sm">{base.name}</span>
                                        {base.purpose && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{base.purpose}</p>}
                                      </div>
                                      <Badge variant="secondary" className="text-xs font-semibold flex-shrink-0">{base.dose}</Badge>
                                    </div>
                                  ))}
                                  {message.formula.additions.map((addition, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-start sm:items-center justify-between gap-2 p-2 sm:p-3 bg-muted/30 rounded border-dashed border hover-elevate cursor-pointer"
                                      style={{ animationDelay: `${((message.formula?.bases?.length || 0) + idx) * 100}ms` }}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <span className="font-medium text-sm">{addition.name}</span>
                                        {addition.purpose && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{addition.purpose}</p>}
                                      </div>
                                      <Badge variant="outline" className="text-xs font-semibold flex-shrink-0">{addition.dose}</Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {message.formula.rationale && (
                              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded border-l-4 border-blue-400">
                                <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Why This Formula:</p>
                                <p className="text-sm text-blue-700 dark:text-blue-400">{message.formula.rationale}</p>
                              </div>
                            )}

                            {message.formula.warnings && message.formula.warnings.length > 0 && (
                              <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded border-l-4 border-amber-400">
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1">
                                  <AlertTriangle className="w-4 h-4" />
                                  Important Warnings:
                                </p>
                                <ul className="space-y-1">
                                  {message.formula.warnings.map((warning, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                                      <span className="text-amber-600 mt-0.5 font-bold">•</span>
                                      <span className="text-sm">{warning}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {message.formula.disclaimers && message.formula.disclaimers.length > 0 && (
                              <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
                                {message.formula.disclaimers.map((disclaimer, idx) => (
                                  <p key={idx}>• {disclaimer}</p>
                                ))}
                              </div>
                            )}

                            {/* Call to Action - View Full Formulation */}
                            <div className="mt-4 pt-4 border-t">
                              <Button asChild className="w-full" data-testid="button-view-formulation">
                                <Link href="/dashboard/formula">
                                  <FlaskConical className="w-4 h-4 mr-2" />
                                  See Your Formulation
                                  <ArrowRight className="w-4 h-4 ml-2" />
                                </Link>
                              </Button>
                              <p className="text-xs text-muted-foreground text-center mt-2">
                                View complete details and place your order
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>



        {/* Modern Input Area */}
        <div className="border-t glass-card safe-bottom flex-shrink-0">
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Uploaded Files:</p>
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border"
                      data-testid={`uploaded-file-${file.id}`}
                    >
                      <FileText className="w-4 h-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(file.id)}
                        className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area - Full width textarea with buttons below */}
            <div className="space-y-3">
              <Textarea
                ref={textareaRef}
                id="consultation-message"
                name="consultation-message"
                autoComplete="off"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about supplements, health goals..."
                className="w-full min-h-[48px] max-h-[120px] resize-none text-base"
                rows={1}
                disabled={isTyping || isUploading}
                data-testid="input-consultation-message"
              />

              {/* Buttons Row */}
              <div className="flex items-center justify-between">
                {/* Left side - hints (desktop only) */}
                <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="w-3 h-3" />
                  <span>Upload files or type your question</span>
                  {draftSaved && inputValue.trim().length > 0 && (
                    <span className="flex items-center gap-1 ml-3 text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      Draft saved
                    </span>
                  )}
                </div>

                {/* Spacer for mobile to push buttons right */}
                <div className="md:hidden flex-1" />

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleFileUpload}
                    disabled={isUploading}
                    className="flex-shrink-0 hover-elevate touch-feedback"
                    data-testid="button-upload-file"
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 md:w-4 md:h-4 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 md:w-4 md:h-4" />
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleVoiceInput}
                    disabled={isRecording || isTyping}
                    className={`flex-shrink-0 hover-elevate touch-feedback ${isRecording ? 'bg-red-50 border-red-200' : ''}`}
                    data-testid="button-voice-input"
                  >
                    {isRecording ? (
                      <div className="flex items-center">
                        <Mic className="w-5 h-5 md:w-4 md:h-4 text-red-500 animate-pulse" />
                      </div>
                    ) : (
                      <Mic className="w-5 h-5 md:w-4 md:h-4" />
                    )}
                  </Button>

                  <Button
                    onClick={() => handleSendMessage(inputValue, uploadedFiles)}
                    size="icon"
                    disabled={(!inputValue.trim() && uploadedFiles.length === 0) || isTyping}
                    className="flex-shrink-0 hover-elevate touch-feedback"
                    data-testid="button-send-message"
                  >
                    {isTyping ? (
                      <Loader2 className="w-5 h-5 md:w-4 md:h-4 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 md:w-4 md:h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              multiple
              className="hidden"
              data-testid="input-file-upload"
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Conversation
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setSessionToDelete(null)}
              data-testid="button-cancel-delete"
            >
              No, Keep It
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteSession}
              data-testid="button-confirm-delete"
            >
              Yes, Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}