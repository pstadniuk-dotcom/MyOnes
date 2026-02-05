interface ThinkingIndicatorProps {
  message?: string;
}

export default function ThinkingIndicator({ message }: ThinkingIndicatorProps) {
  return (
    <div 
      className="text-sm text-muted-foreground leading-relaxed italic"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span>{message || 'Thinking...'}</span>
      <span className="inline-block w-0.5 h-4 bg-primary/60 ml-1 animate-pulse align-middle" />
    </div>
  );
}
