import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Upload, Bot, User, AlertTriangle, CheckCircle, Sparkles, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  formula?: {
    bases: { name: string; dose: string; purpose: string }[];
    additions: { name: string; dose: string; purpose: string }[];
    totalMg: number;
    warnings: string[];
    rationale: string;
    disclaimers: string[];
  };
}

export default function ConsultationPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm ONES AI, your personalized supplement consultant. I'm here to help you optimize your health through personalized supplement formulations based on your unique biochemistry and health goals.\n\nHow can I assist you today? You can:\n• Ask about your current formula\n• Upload new lab results for analysis\n• Discuss health concerns or goals\n• Get recommendations for formula adjustments",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  // Check for preserved message on component mount
  useEffect(() => {
    const preservedMessage = localStorage.getItem('preAuthMessage');
    if (preservedMessage) {
      localStorage.removeItem('preAuthMessage');
      setInputValue(preservedMessage);
      
      setTimeout(() => {
        handleSendMessage(preservedMessage);
      }, 1000);
    }
  }, []);

  const handleSendMessage = useCallback(async (messageText?: string) => {
    const currentMessage = messageText || inputValue;
    if (!currentMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: currentMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 120000);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          sessionId,
          userId: user?.id || 'authenticated-user'
        }),
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
                  
                  if (data.sessionId && !sessionId) {
                    setSessionId(data.sessionId);
                  }
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
  }, [inputValue, sessionId, toast, user?.id]);

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileMessage: Message = {
        id: Date.now().toString(),
        content: `📄 Uploaded: ${file.name}`,
        sender: 'user',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fileMessage]);
      
      setInputValue(`I've uploaded my lab results: ${file.name}. Please analyze them and provide insights for optimizing my supplement formula.`);
      
      toast({
        title: "File Uploaded",
        description: `${file.name} ready for analysis. Click send to have ONES AI analyze your results.`,
        variant: "default"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]" data-testid="page-consultation">
      {/* Header */}
      <Card className="rounded-b-none border-b">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
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
                  {isConnected && <Badge variant="outline" className="text-xs text-green-600 border-green-200">Connected</Badge>}
                  {sessionId && <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">Session Active</Badge>}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/20" data-testid="container-chat-messages">
        {messages.map((message, index) => (
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
              <div className="flex items-start space-x-3">
                {message.sender === 'ai' && (
                  <Bot className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                )}
                {message.sender === 'user' && (
                  <User className="w-5 h-5 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  
                  {/* Enhanced formula visualization */}
                  {message.formula && (
                    <div className="mt-4 p-4 bg-background rounded-lg border">
                      <h4 className="font-semibold text-base mb-3 flex items-center gap-2 text-primary">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        Your Personalized Formula ({message.formula.totalMg}mg)
                      </h4>
                      
                      {message.formula.bases.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-muted-foreground mb-2">Base Formulas:</p>
                          <div className="grid gap-2">
                            {message.formula.bases.map((base, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                                <div className="flex-1">
                                  <span className="font-medium text-sm">{base.name}</span>
                                  <p className="text-xs text-muted-foreground">{base.purpose}</p>
                                </div>
                                <Badge variant="secondary" className="text-xs">{base.dose}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {message.formula.additions.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-muted-foreground mb-2">Additional Ingredients:</p>
                          <div className="grid gap-2">
                            {message.formula.additions.map((addition, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded border-dashed border">
                                <div className="flex-1">
                                  <span className="font-medium text-sm">{addition.name}</span>
                                  <p className="text-xs text-muted-foreground">{addition.purpose}</p>
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
                      
                      {message.formula.warnings.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" />
                            Important Warnings:
                          </p>
                          <ul className="space-y-1">
                            {message.formula.warnings.map((warning, idx) => (
                              <li key={idx} className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-amber-800 dark:text-amber-300">
                                <span className="text-amber-600 mt-0.5 font-bold">•</span>
                                <span className="text-sm">{warning}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {message.formula.disclaimers.length > 0 && (
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
        ))}
        
        {isTyping && (
          <div className="flex justify-start" data-testid="indicator-typing">
            <div className="bg-background rounded-lg p-4 max-w-[85%] border shadow-sm">
              <div className="flex items-center space-x-3">
                <Bot className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">ONES AI is analyzing...</p>
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

      {/* Input Area */}
      <Card className="rounded-t-none border-t">
        <CardContent className="p-4">
          <div className="flex space-x-3 items-end">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your supplement formula, health goals, or upload lab results..."
                className="min-h-[44px] max-h-[120px] resize-none"
                rows={1}
                data-testid="input-consultation-message"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleFileUpload}
              className="flex-shrink-0 hover-elevate transition-all duration-300"
              data-testid="button-upload-file"
            >
              <Upload className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => handleSendMessage()}
              size="icon"
              disabled={!inputValue.trim() || isTyping}
              className="flex-shrink-0 hover-elevate transition-all duration-300"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
            data-testid="input-file-upload"
          />
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Upload blood tests, medical reports, or continue your health consultation
          </p>
        </CardContent>
      </Card>
    </div>
  );
}