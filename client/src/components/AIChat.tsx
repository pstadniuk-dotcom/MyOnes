import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Upload, Bot, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Let's build your perfect supplement. Tell me about yourself and what you're looking to accomplish with your health.",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputValue;
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
          userId: 'demo-user' // In production, get from auth context
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
    <Card className="w-full max-w-md h-[500px] flex flex-col glass shadow-premium-lg border-none" data-testid="card-ai-chat">
      {/* Chat Header */}
      <div className="p-4 border-b border-card-border">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-sm" data-testid="text-ai-name">ONES AI</h3>
            <p className="text-xs text-muted-foreground">Your health consultant</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="container-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            data-testid={`message-${message.sender}-${message.id}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 space-y-3 ${
                message.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.sender === 'ai' && (
                  <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                {message.sender === 'user' && (
                  <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Formula visualization */}
                  {message.formula && (
                    <div className="mt-3 p-3 bg-background/50 rounded-lg border text-foreground">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Personalized Formula ({message.formula.totalMg}mg)
                      </h4>
                      
                      {/* Formula Bases */}
                      {message.formula.bases.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Base Formulas:</p>
                          <div className="space-y-1">
                            {message.formula.bases.map((base, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="font-medium">{base.name}</span>
                                <Badge variant="secondary" className="text-xs">{base.dose}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Additional Ingredients */}
                      {message.formula.additions.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Additional Ingredients:</p>
                          <div className="space-y-1">
                            {message.formula.additions.map((addition, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="font-medium">{addition.name}</span>
                                <Badge variant="outline" className="text-xs">{addition.dose}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Warnings */}
                      {message.formula.warnings.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Important Warnings:
                          </p>
                          <ul className="text-xs text-amber-700 space-y-1">
                            {message.formula.warnings.map((warning, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-amber-600 mt-0.5">•</span>
                                {warning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Disclaimers */}
                      {message.formula.disclaimers.length > 0 && (
                        <div className="text-xs text-muted-foreground border-t pt-2">
                          {message.formula.disclaimers.map((disclaimer, idx) => (
                            <p key={idx} className="mb-1">• {disclaimer}</p>
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
            <div className="bg-muted text-muted-foreground rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-card-border">
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tell me about your health goals..."
            className="flex-1"
            data-testid="input-chat-message"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleFileUpload}
            className="micro-bounce transition-all duration-300"
            data-testid="button-upload-file"
          >
            <Upload className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleSendMessage}
            size="icon"
            disabled={!inputValue.trim() || isTyping}
            className="micro-bounce micro-glow transition-all duration-300"
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
        <p className="text-xs text-muted-foreground mt-2">
          Upload blood tests (PDF/image) or describe your health goals
          {sessionId && <span className="ml-2 text-green-600">• Connected</span>}
        </p>
      </div>
    </Card>
  );
}