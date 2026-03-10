import { useEffect, useRef, useCallback } from 'react';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Show warning 2 minutes before logout
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];

interface UseIdleTimeoutOptions {
  onWarning: () => void;
  onTimeout: () => void;
  enabled?: boolean;
  timeoutMs?: number;
}

export function useIdleTimeout({
  onWarning,
  onTimeout,
  enabled = true,
  timeoutMs = IDLE_TIMEOUT_MS,
}: UseIdleTimeoutOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasWarnedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    clearTimers();
    hasWarnedRef.current = false;

    // Set warning timer (fires 2 min before logout)
    warningRef.current = setTimeout(() => {
      hasWarnedRef.current = true;
      onWarning();
    }, timeoutMs - WARNING_BEFORE_MS);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, timeoutMs);
  }, [enabled, timeoutMs, onWarning, onTimeout, clearTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Start the timer
    resetTimer();

    // Reset on user activity
    const handleActivity = () => {
      resetTimer();
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, resetTimer, clearTimers]);

  return { resetTimer };
}
