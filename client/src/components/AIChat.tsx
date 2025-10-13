import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Upload, Bot, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

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
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    try {
      localStorage.setItem('preAuthMessage', inputValue);
      
      const userMessage: Message = {
        id: Date.now().toString(),
        content: inputValue,
        sender: 'user',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setInputValue('');

      setIsTyping(true);
      
      setTimeout(() => {
        setLocation('/signup');
      }, 500);

    } catch (error) {
      console.error('Error saving message to localStorage:', error);
      toast({
        title: "Storage Error",
        description: "Unable to save your message. Please try again.",
        variant: "destructive"
      });
    }
  }, [inputValue, toast, setLocation]);

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
    <Card className="w-full h-[550px] flex flex-col border-border/50 shadow-lg overflow-hidden" data-testid="card-ai-chat">
      {/* Chat Header */}
      <div className="p-5 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm" data-testid="text-ai-name">ONES AI</h3>
            <p className="text-xs text-muted-foreground">Your health consultant</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4" data-testid="container-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            data-testid={`message-${message.sender}-${message.id}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 space-y-3 ${
                message.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-foreground'
              }`}
            >
              <div className="flex items-start gap-2">
                {message.sender === 'ai' && (
                  <Bot className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                )}
                <div className="flex-1">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  
                  {message.formula && (
                    <div className="mt-3 p-4 bg-background/80 rounded-xl border border-border/50">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        Personalized Formula ({message.formula.totalMg}mg)
                      </h4>
                      
                      {message.formula.bases.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Base Formulas:</p>
                          <div className="space-y-1.5">
                            {message.formula.bases.map((base, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="font-medium">{base.name}</span>
                                <Badge variant="secondary" className="text-xs">{base.dose}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {message.formula.additions.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Additional Ingredients:</p>
                          <div className="space-y-1.5">
                            {message.formula.additions.map((addition, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="font-medium">{addition.name}</span>
                                <Badge variant="outline" className="text-xs">{addition.dose}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {message.formula.warnings.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-amber-600 dark:text-amber-500 mb-1.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Important Warnings:
                          </p>
                          <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                            {message.formula.warnings.map((warning, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-amber-600 dark:text-amber-500 mt-0.5">•</span>
                                {warning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {message.formula.disclaimers.length > 0 && (
                        <div className="text-xs text-muted-foreground border-t border-border/50 pt-2 mt-2">
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
            <div className="bg-muted/50 text-foreground rounded-2xl px-4 py-3 max-w-[85%]">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-5 border-t border-border/50 bg-card/50">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tell me about your health goals..."
            className="flex-1 bg-background/50"
            data-testid="input-chat-message"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleFileUpload}
            data-testid="button-upload-file"
          >
            <Upload className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleSendMessage}
            size="icon"
            disabled={!inputValue.trim() || isTyping}
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
        <p className="text-xs text-muted-foreground mt-2.5">
          Upload blood tests (PDF/image) or describe your health goals
          {sessionId && <span className="ml-2 text-primary">• Connected</span>}
        </p>
      </div>
    </Card>
  );
}
