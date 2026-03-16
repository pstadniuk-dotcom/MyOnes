/**
 * VoiceInput — Browser-native speech-to-text button
 *
 * Uses the Web Speech API (SpeechRecognition). Works in Chrome, Edge, Safari.
 * Provides a microphone toggle button + optional inline status indicator.
 *
 * Usage:
 *   <VoiceInput onTranscript={(text) => setValue(prev => prev + ' ' + text)} />
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// Extend Window for vendor-prefixed SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface VoiceInputProps {
  /** Called with the transcribed text when a final result is available */
  onTranscript: (text: string) => void;
  /** Button size variant */
  size?: 'sm' | 'default' | 'icon';
  /** Additional class names for the button */
  className?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Show label text next to icon */
  showLabel?: boolean;
}

export function VoiceInput({
  onTranscript,
  size = 'sm',
  className,
  disabled = false,
  showLabel = false,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => !!getSpeechRecognition());
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    // Stop any existing instance
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Collect all new final results
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript.trim()) {
        onTranscript(transcript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[VoiceInput] Error:', event.error);
      if (event.error !== 'aborted') {
        stopListening();
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onTranscript, stopListening]);

  const toggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  if (!isSupported) return null;

  return (
    <Button
      type="button"
      size={size}
      variant={isListening ? 'default' : 'ghost'}
      onClick={toggle}
      disabled={disabled}
      className={cn(
        isListening && 'bg-red-500 hover:bg-red-600 text-white animate-pulse',
        className,
      )}
      title={isListening ? 'Stop listening' : 'Voice input'}
    >
      {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      {showLabel && (
        <span className="ml-1.5 text-xs">
          {isListening ? 'Listening...' : 'Voice'}
        </span>
      )}
    </Button>
  );
}
