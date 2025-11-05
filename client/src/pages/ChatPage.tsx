import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, Upload, User, AlertTriangle, CheckCircle, Menu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

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

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Welcome back! I'm Ones AI, your personalized supplement consultant. I'm here to help you create the perfect supplement formula based on your unique health profile.\n\n⚕️ Important: I provide personalized supplement recommendations, not medical advice. Always consult your healthcare provider before starting any new supplement regimen, especially if you have medical conditions or take medications.",
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
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for preserved message on component mount
  useEffect(() => {
    const preservedMessage = localStorage.getItem('preAuthMessage');
    if (preservedMessage) {
      // Remove from localStorage immediately
      localStorage.removeItem('preAuthMessage');
      
      // Set as input and auto-send
      setInputValue(preservedMessage);
      
      // Auto-send the preserved message after a brief delay
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
    
    // Create abort controller for request cancellation
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 120000); // 2 minute timeout

    try {
      // Enhanced fetch with proper error handling
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          sessionId,
          userId: 'authenticated-user' // In production, get from auth context
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

      // Add empty AI message that will be filled as we stream
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
          
          // Keep the last line in buffer (might be incomplete)
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === '') continue; // Skip empty data lines
                
                const data = JSON.parse(jsonStr);
                
                if (data.type === 'connected') {
                  connected = true;
                  setIsConnected(true);
                  console.log('Stream connected');
                } else if (data.type === 'chunk') {
                  // Update the current AI message with new content
                  setMessages(prev => prev.map(msg => 
                    msg.id === aiMessageId 
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  ));
                  
                  // Set session ID if provided
                  if (data.sessionId && !sessionId) {
                    setSessionId(data.sessionId);
                  }
                } else if (data.type === 'complete') {
                  completed = true;
                  // Add formula data if extracted
                  if (data.formula) {
                    setMessages(prev => prev.map(msg => 
                      msg.id === aiMessageId 
                        ? { ...msg, formula: data.formula }
                        : msg
                    ));
                  }
                  setIsTyping(false);
                  
                  if (data.formulaId) {
                    console.log('Formula saved with ID:', data.formulaId);
                  }
                } else if (data.type === 'formula_error') {
                  toast({
                    title: "Formula Validation Error",
                    description: data.error,
                    variant: "destructive"
                  });
                  console.error('Formula validation errors:', data.validationErrors);
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
        // Clean up reader
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
  }, [inputValue, sessionId, toast]);

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File uploaded:', file.name);
      const fileMessage: Message = {
        id: Date.now().toString(),
        content: `📄 Uploaded: ${file.name}`,
        sender: 'user',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fileMessage]);
      
      // TODO: Implement file upload to server and OCR processing
      // For now, we'll send a message indicating file upload
      setInputValue(`I've uploaded my blood test results: ${file.name}. Please analyze them and create a personalized supplement formula.`);
      
      toast({
        title: "File Uploaded",
        description: `${file.name} ready for analysis. Click send to have Ones AI analyze your results.`,
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
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-1 border-b border-border bg-card/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-primary-foreground">O</span>
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight" data-testid="text-chat-title">Ones AI</h1>
            <p className="text-xs text-muted-foreground leading-tight">
              Your personalized supplement consultant
              {isConnected && <span className="ml-2 text-green-600">• Connected</span>}
              {sessionId && <span className="ml-2 text-blue-600">• Session Active</span>}
            </p>
          </div>
        </div>
        <Link href="/" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-home">
          <Menu className="w-5 h-5" />
        </Link>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6" data-testid="container-chat-messages">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            data-testid={`message-${message.sender}-${message.id}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 space-y-3 ${
                message.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground border'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  
              {/* Enhanced formula visualization */}
              {message.formula && (
                    <div className="mt-4 p-4 bg-background rounded-lg border">
                      <h4 className="font-semibold text-base mb-3 flex items-center gap-2 text-primary">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        Your Personalized Formula ({message.formula.totalMg}mg)
                      </h4>
                      
                      {/* Formula Bases */}
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
                      
                      {/* Additional Ingredients */}
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
                      
                      {/* Rationale */}
                      {message.formula.rationale && (
                        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded border-l-4 border-blue-400">
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Why This Formula:</p>
                          <p className="text-sm text-blue-700 dark:text-blue-400">{message.formula.rationale}</p>
                        </div>
                      )}
                      
                      {/* Warnings */}
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
                      
                      {/* Disclaimers */}
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
        ))}
        
        {isTyping && (
          <div className="flex justify-start" data-testid="indicator-typing">
            <div className="bg-muted rounded-lg p-4 max-w-[80%] border">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-semibold text-primary">Ones</span>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Ones AI is thinking...</p>
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

      <Separator />

      {/* Enhanced Input Area */}
      <div className="px-4 py-1 bg-card/50 backdrop-blur">
        <div className="flex space-x-2 items-end">
          <div className="flex-1">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Continue your health consultation..."
              className="min-h-[40px] resize-none"
              data-testid="input-chat-message"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleFileUpload}
            className="hover-elevate transition-all duration-300"
            data-testid="button-upload-file"
          >
            <Upload className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => handleSendMessage()}
            size="icon"
            disabled={!inputValue.trim() || isTyping}
            className="hover-elevate transition-all duration-300"
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
        <p className="text-xs text-muted-foreground mt-1">
          Upload blood tests (PDF/image) or continue describing your health goals
        </p>
      </div>
    </div>
  );
}