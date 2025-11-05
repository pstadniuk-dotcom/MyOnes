import { useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

/**
 * Hook to auto-detect and save user's timezone on login
 * Uses the browser's Intl API to get the IANA timezone (e.g., "America/New_York")
 */
export function useTimezoneSync() {
  useEffect(() => {
    const syncTimezone = async () => {
      try {
        // Get timezone from browser
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        if (!timezone) {
          console.warn('Could not detect timezone');
          return;
        }
        
        // Save to backend
        await apiRequest('PATCH', '/api/users/me/timezone', { timezone });
        
        console.log(`✅ Timezone synced: ${timezone}`);
      } catch (error) {
        console.error('Failed to sync timezone:', error);
      }
    };
    
    // Sync timezone once on mount
    syncTimezone();
  }, []);
}

/**
 * Get the current user's timezone from the browser
 */
export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
}
