import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Mic, MicOff, Brain, User, AlertTriangle, CheckCircle } from 'lucide-react';
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
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    // Save message to localStorage and redirect to signup
    try {
      localStorage.setItem('preAuthMessage', inputValue);
      
      // Show user message in UI
      const userMessage: Message = {
        id: Date.now().toString(),
        content: inputValue,
        sender: 'user',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setInputValue('');

      // Show brief loading state to indicate message was received
      setIsTyping(true);
      
      // Brief delay to show the message was received, then redirect
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


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          
          if (event.error === 'not-allowed') {
            toast({
              title: "Microphone Access Denied",
              description: "Please allow microphone access to use voice input.",
              variant: "destructive"
            });
          } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
            toast({
              title: "Voice Input Error",
              description: "Unable to process voice input. Please try again.",
              variant: "destructive"
            });
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice Input Unavailable",
        description: "Your browser doesn't support voice input. Please use Chrome, Edge, or Safari.",
        variant: "destructive"
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast({
          title: "Listening...",
          description: "Speak now to tell us about your health goals.",
          variant: "default"
        });
      } catch (error) {
        console.error('Error starting recognition:', error);
        setIsListening(false);
      }
    }
  };

  return (
    <Card className="w-full max-w-md h-[500px] flex flex-col glass shadow-premium-lg border-none" data-testid="card-ai-chat">
      {/* Chat Header */}
      <div className="p-4 border-b border-card-border">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" />
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
                  <Brain className="w-4 h-4 mt-0.5 flex-shrink-0" />
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
                <Brain className="w-4 h-4" />
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
            onClick={handleVoiceInput}
            className={`micro-bounce transition-all duration-300 ${isListening ? 'bg-red-500 text-white border-red-600 animate-pulse' : ''}`}
            data-testid="button-voice-input"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
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
        <p className="text-xs text-muted-foreground mt-2">
          Use voice input or type to tell us about your health goals
          {sessionId && <span className="ml-2 text-green-600">• Connected</span>}
        </p>
      </div>
    </Card>
  );
}