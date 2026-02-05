import { PauseCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { format, parseISO } from 'date-fns';

interface PausedBannerProps {
  until: string; // ISO date string (YYYY-MM-DD)
}

export function PausedBanner({ until }: PausedBannerProps) {
  const formattedDate = format(parseISO(until), 'MMM d, yyyy');
  
  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-800">
      <PauseCircle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-700">
        Tracking paused until <span className="font-medium">{formattedDate}</span>. 
        Your streaks won't break during this time.
      </AlertDescription>
    </Alert>
  );
}
