import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Send, Upload, Brain, User, AlertTriangle, CheckCircle, Sparkles, FileText,
  History, Download, Search, Plus, RotateCcw, Copy, Share2, Mic, 
  Loader2, FlaskConical, Clock, ArrowUp, Settings2, Zap,
  Shield, Trash2, Calendar, Eye, EyeOff, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: Date;
  sessionId?: string;
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
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // UI state
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // Refs and hooks
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    queryKey: ['/api/consultations/history', user?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/consultations/history');
      const data = await response.json();
      return data as { sessions: ChatSession[], messages: Record<string, Message[]> };
    },
    enabled: !!user?.id
  });
  
  // Load history data whenever it changes
  useEffect(() => {
    if (historyData?.sessions) {
      setSessionHistory(historyData.sessions);
    }
  }, [historyData]);
  
  // Initialize welcome message on component mount
  useEffect(() => {
    if (!isNewSession || messages.length > 0) return;
    
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
  }, [user?.name, isNewSession, messages.length]);
  
  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
    setInputValue('');
    setIsTyping(true);
    setUploadedFiles([]);
    
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
      
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(requestBody),
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
      
      let aiMessageId = (Date.now() + 1).toString();
      let currentAiMessage: Message = {
        id: aiMessageId,
        content: '',
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, currentAiMessage]);
      
      let buffer = '';
      let connected = false;
      let completed = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (!completed) {
              console.warn('Stream ended without completion signal');
              setIsTyping(false);
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
                } else if (data.type === 'chunk') {
                  setMessages(prev => prev.map(msg => 
                    msg.id === aiMessageId 
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  ));
                  
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
                } else if (data.type === 'complete') {
                  completed = true;
                  if (data.formula) {
                    setMessages(prev => prev.map(msg => 
                      msg.id === aiMessageId 
                        ? { ...msg, formula: data.formula }
                        : msg
                    ));
                  }
                  setIsTyping(false);
                } else if (data.type === 'formula_error') {
                  toast({
                    title: "Formula Validation Error",
                    description: data.error,
                    variant: "destructive"
                  });
                  setIsTyping(false);
                  completed = true;
                } else if (data.type === 'error') {
                  toast({
                    title: "AI Response Error",
                    description: data.error,
                    variant: "destructive"
                  });
                  setIsTyping(false);
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
    } finally {
      clearTimeout(timeoutId);
    }
  }, [inputValue, currentSessionId, toast, user?.id, isRecording]);

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

        const uploadResponse = await fetch('/api/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        const uploadResult = await uploadResponse.json();
        
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
          description: `${newUploadedFiles.length} file(s) ready for analysis. Click send to have ONES AI analyze your results.`,
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
  
  // Start new consultation session
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
    
    toast({
      title: "New Consultation Started",
      description: "Ready to discuss your health goals with ONES AI.",
      variant: "default"
    });
  }, [toast, user?.name]);
  
  // Load previous session
  const handleLoadSession = useCallback((session: ChatSession) => {
    if (historyData && historyData.messages[session.id]) {
      // Convert timestamp strings to Date objects
      const messagesWithDates = historyData.messages[session.id].map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      
      setMessages(messagesWithDates);
      setCurrentSessionId(session.id);
      setIsNewSession(false);
      setShowHistory(false);
      setShowSuggestions(false);
    }
  }, [historyData]);
  
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
      title: 'ONES AI Consultation',
      text: formula 
        ? `Check out my personalized supplement formula from ONES AI:\n\n${content}\n\nTotal: ${formula.totalMg}mg formula with ${formula.bases.length} base formulas and ${formula.additions?.length || 0} additions.`
        : `ONES AI Health Consultation:\n\n${content}`,
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
  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim()) return messages;
    return messages.filter(msg => 
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [messages, searchTerm]);

  return (
    <div className="flex h-full max-h-[calc(100vh-4rem)]" data-testid="page-consultation">
      {/* History Sidebar */}
      {showHistory && (
        <Card className="w-80 rounded-r-none border-r flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Consultation History</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full px-4">
              <div className="space-y-2 pb-4">
                {isLoadingHistory ? (
                  <div className="space-y-2">
                    {Array.from({length: 5}).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : sessionHistory.length > 0 ? (
                  sessionHistory.map((session) => (
                    <div
                      key={session.id}
                      className="p-3 border rounded-lg hover-elevate cursor-pointer group"
                      onClick={() => handleLoadSession(session)}
                      data-testid={`session-${session.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{session.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {session.lastMessage}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {session.messageCount} messages
                            </Badge>
                            {session.hasFormula && (
                              <Badge variant="secondary" className="text-xs">
                                <FlaskConical className="w-3 h-3 mr-1" />
                                Formula
                              </Badge>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(session.timestamp).toLocaleDateString()}
                        </span>
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
          </CardContent>
        </Card>
      )}
      
      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Enhanced Header */}
        <Card className={`rounded-b-none border-b ${showHistory ? 'rounded-l-none' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" alt="ONES AI" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Brain className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl flex items-center gap-2" data-testid="text-consultation-title">
                    ONES AI Consultation
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI-Powered
                    </Badge>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    Your personalized supplement consultant
                    {isConnected && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                        Connected
                      </Badge>
                    )}
                    {currentSessionId && (
                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                        Session Active
                      </Badge>
                    )}
                  </CardDescription>
                </div>
              </div>
              
              {/* Header Actions */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowHistory(!showHistory)}
                  data-testid="button-toggle-history"
                >
                  <History className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleNewSession}
                  data-testid="button-new-session"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleExportConsultation}
                  disabled={messages.length === 0}
                  data-testid="button-export"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Search Bar (when enabled) */}
            {searchTerm && (
              <div className="mt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
          </CardHeader>
        </Card>

        {/* Messages Area */}
        <ScrollArea className="flex-1" data-testid="container-chat-messages">
          <div className="p-6 space-y-6">
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
                    className={`max-w-[85%] rounded-lg p-4 space-y-3 ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-foreground border shadow-sm'
                    }`}
                  >
                  <div className={`flex items-start gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    {message.sender === 'ai' && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10">
                          <Brain className="w-4 h-4 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {message.sender === 'user' && (
                      <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-white/20 dark:ring-white/20">
                        <AvatarFallback className="bg-white/20 dark:bg-white/20 text-white dark:text-white">
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium ${message.sender === 'user' ? 'text-white/90 dark:text-white/90' : 'text-muted-foreground'}`}>
                          {message.sender === 'user' ? 'You' : 'ONES AI'}
                        </span>
                        <span className={`text-xs ${message.sender === 'user' ? 'text-white/60 dark:text-white/60' : 'text-muted-foreground/70'}`}>
                          {message.timestamp && !isNaN(new Date(message.timestamp).getTime()) 
                            ? new Date(message.timestamp).toLocaleTimeString() 
                            : 'Just now'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyMessage(message.content)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-copy-message-${message.id}`}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShareMessage(message.content, message.formula)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-share-message-${message.id}`}
                        >
                          <Share2 className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      
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
                        <div className="mt-4 p-4 bg-card rounded-lg border animate-in fade-in-50 duration-500">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-base flex items-center gap-2 text-primary">
                              <CheckCircle className="w-5 h-5 text-green-500 animate-in zoom-in-50 duration-700" />
                              Your Personalized Formula
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {message.formula.totalMg}mg total
                              </Badge>
                              <Progress 
                                value={(message.formula.totalMg / 800) * 100} 
                                className="w-20 h-2"
                              />
                            </div>
                          </div>
                          
                          {message.formula.bases.length > 0 && (
                            <div className="mb-4 space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">Base Formulas:</p>
                              <div className="grid gap-2">
                                {message.formula.bases.map((base, idx) => (
                                  <div 
                                    key={idx} 
                                    className="flex items-center justify-between p-3 bg-muted/50 rounded border hover-elevate cursor-pointer group"
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                  >
                                    <div className="flex-1">
                                      <span className="font-medium text-sm">{base.name}</span>
                                      <p className="text-xs text-muted-foreground mt-1">{base.purpose}</p>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">{base.dose}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {message.formula.additions.length > 0 && (
                            <div className="mb-4 space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">Additional Ingredients:</p>
                              <div className="grid gap-2">
                                {message.formula.additions.map((addition, idx) => (
                                  <div 
                                    key={idx} 
                                    className="flex items-center justify-between p-3 bg-muted/30 rounded border-dashed border hover-elevate cursor-pointer"
                                    style={{ animationDelay: `${((message.formula?.bases?.length || 0) + idx) * 100}ms` }}
                                  >
                                    <div className="flex-1">
                                      <span className="font-medium text-sm">{addition.name}</span>
                                      <p className="text-xs text-muted-foreground mt-1">{addition.purpose}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">{addition.dose}</Badge>
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
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
            
            {/* Enhanced Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start" data-testid="indicator-typing">
                <div className="bg-background rounded-lg p-4 max-w-[85%] border shadow-sm">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10">
                        <Brain className="w-4 h-4 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        ONES AI is analyzing your request...
                      </p>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Enhanced Input Area */}
        <Card className="rounded-t-none border-t">
          <CardContent className="p-4 space-y-4">
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
            
            {/* Input Area */}
            <div className="flex space-x-3 items-end">
              <div className="flex-1 space-y-2">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask about your supplement formula, health goals, or upload lab results..."
                  className="min-h-[44px] max-h-[120px] resize-none"
                  rows={1}
                  disabled={isTyping}
                  data-testid="input-consultation-message"
                />
                {/* Quick Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="w-3 h-3" />
                    <span>Upload files or type your question</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Ctrl+N: New</span>
                    <span>•</span>
                    <span>Ctrl+E: Export</span>
                    <span>•</span>
                    <span>Enter: Send</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleFileUpload}
                  disabled={isUploading}
                  className="flex-shrink-0 hover-elevate"
                  data-testid="button-upload-file"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleVoiceInput}
                  disabled={isRecording || isTyping}
                  className={`flex-shrink-0 hover-elevate ${isRecording ? 'bg-red-50 border-red-200' : ''}`}
                  data-testid="button-voice-input"
                >
                  {isRecording ? (
                    <div className="flex items-center">
                      <Mic className="w-4 h-4 text-red-500 animate-pulse" />
                    </div>
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  onClick={() => handleSendMessage(inputValue, uploadedFiles)}
                  size="icon"
                  disabled={(!inputValue.trim() && uploadedFiles.length === 0) || isTyping}
                  className="flex-shrink-0 hover-elevate"
                  data-testid="button-send-message"
                >
                  {isTyping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}