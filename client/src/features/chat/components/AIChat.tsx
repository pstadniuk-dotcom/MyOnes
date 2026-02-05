import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Send, Mic, MicOff, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
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
  const initialInputRef = useRef<string>('');
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSendMessage = useCallback(async () => {
    // Stop voice recording if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

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
  }, [inputValue, toast, setLocation, isListening]);


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Cleanup voice recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const handleVoiceInput = useCallback(async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast({
        title: "Voice Input Not Supported",
        description: "Your browser doesn't support voice recognition.",
        variant: "destructive"
      });
      return;
    }

    // If already recording, do nothing (user clicks Send to stop)
    if (isListening && recognitionRef.current) {
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
        setIsListening(true);
        // Store the initial input value when recording starts
        initialInputRef.current = inputValue;
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
        const baseText = initialInputRef.current.trim();
        const combinedTranscript = (finalTranscript + interimTranscript).trim();
        const newValue = baseText + (baseText && combinedTranscript ? ' ' : '') + combinedTranscript + (interimTranscript ? ' [Speaking...]' : '');
        setInputValue(newValue);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
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
        setIsListening(false);
        recognitionRef.current = null;

        // Clean up the [Speaking...] indicator
        setInputValue(prev => prev.replace(' [Speaking...]', '').trim());
      };

      recognition.start();
    } catch (error) {
      setIsListening(false);
      recognitionRef.current = null;
      toast({
        title: "Voice Input Error",
        description: "Unable to start voice recognition.",
        variant: "destructive"
      });
    }
  }, [toast, isListening, inputValue]);

  return (
    <Card className="w-full max-w-md h-[500px] flex flex-col glass shadow-premium-lg border-none" data-testid="card-ai-chat">
      {/* Chat Header */}
      <div className="p-4 border-b border-card-border">
        <div>
          <h3 className="font-medium text-sm" data-testid="text-ai-name">Ones AI</h3>
          <p className="text-xs text-muted-foreground">Your health consultant</p>
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
              className={`max-w-[80%] rounded-lg p-3 space-y-3 ${message.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
                }`}
            >
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
                      <p className="text-xs font-medium text-muted-foreground mb-1">System Supports:</p>
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
        ))}

        {isTyping && (
          <div className="flex justify-start" data-testid="indicator-typing">
            <div className="bg-muted text-muted-foreground rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold">Ones</span>
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

      {/* Input Area - Fixed at bottom on mobile */}
      <div className="p-4 border-t border-card-border bg-background safe-bottom">
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tell me about your health goals..."
            className="flex-1 h-11 text-base"
            data-testid="input-chat-message"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleVoiceInput}
            className={`h-11 w-11 micro-bounce transition-all duration-300 touch-feedback ${isListening ? 'bg-red-500 text-white border-red-600 animate-pulse' : ''}`}
            data-testid="button-voice-input"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button
            onClick={handleSendMessage}
            size="icon"
            disabled={!inputValue.trim() || isTyping}
            className="h-11 w-11 micro-bounce micro-glow transition-all duration-300 touch-feedback"
            data-testid="button-send-message"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 hidden md:block">
          Click the mic to speak, then click send when done
          {sessionId && <span className="ml-2 text-green-600">• Connected</span>}
        </p>
      </div>
    </Card>
  );
}