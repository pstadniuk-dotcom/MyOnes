import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ThinkingIndicatorProps {
  message?: string;
}

export default function ThinkingIndicator({ message }: ThinkingIndicatorProps) {
  const [dots, setDots] = useState('');
  
  console.log('🎨 ThinkingIndicator RENDER - message:', message);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border/50"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex-shrink-0 mt-1">
        <Loader2 className="h-5 w-5 text-primary animate-spin" data-testid="thinking-spinner" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground" data-testid="thinking-status">
            {message || 'Thinking'}
          </span>
          <span className="text-sm text-muted-foreground font-mono" style={{ minWidth: '1.5em' }}>
            {dots}
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary/60 animate-pulse rounded-full"
              style={{
                animation: 'thinking-pulse 1.5s ease-in-out infinite'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
