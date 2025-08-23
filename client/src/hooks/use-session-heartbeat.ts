import { useEffect, useRef } from 'react';

interface UseSessionHeartbeatOptions {
  enabled: boolean;
  interval?: number; // in milliseconds
  onSessionExpired?: () => void;
}

export function useSessionHeartbeat({ 
  enabled, 
  interval = 5 * 60 * 1000, // 5 minutes default - more frequent to detect issues earlier
  onSessionExpired 
}: UseSessionHeartbeatOptions) {
  const heartbeatRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;

    // Track user activity
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Check session health periodically
    const checkSession = async () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      
      // Only check if user has been active recently (within 4 hours)
      if (timeSinceActivity > 4 * 60 * 60 * 1000) {
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.status === 401) {
          onSessionExpired?.();
        }
      } catch (error) {
        // Network error - don't treat as session expiry
        console.warn('Session heartbeat failed due to network error:', error);
      }
    };

    heartbeatRef.current = window.setInterval(checkSession, interval);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [enabled, interval, onSessionExpired]);

  // Also check session when page becomes visible (PWA focus)
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include',
          });

          if (response.status === 401) {
            onSessionExpired?.();
          }
        } catch (error) {
          console.warn('Session check on visibility change failed:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, onSessionExpired]);
}