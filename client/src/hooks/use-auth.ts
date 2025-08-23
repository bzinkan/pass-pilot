import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from './use-toast';
import { useSessionHeartbeat } from './use-session-heartbeat';
import type { User } from '@shared/schema';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, schoolId?: string) => Promise<void>;
  logout: () => void;
  register: (data: any) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check for existing session on mount and handle session expiry
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await apiRequest('GET', '/api/auth/me');
        const userData = await response.json();
        if (response.ok && userData.data) {
          setUser(userData.data.user);
        } else {
          // Clear any stale session data
          setUser(null);
        }
      } catch (error) {
        // No existing session - clear user state
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  // Listen for profile updates from React Query cache
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey?.[0] === '/api/users/me' && 
          event?.type === 'updated' && 
          event?.query?.state?.data) {
        // Update user state when profile data changes
        setUser(event.query.state.data);
      }
    });

    return unsubscribe;
  }, [queryClient]);

  // Handle session expiry monitoring
  useEffect(() => {
    
    // Listen for session expiry events from failed API calls
    const handleSessionExpired = (event: CustomEvent) => {
      setUser(null);
      queryClient.clear();
      toast({
        title: "Session expired",
        description: event.detail.message || "Please log in again to continue.",
        variant: "destructive",
      });
    };

    window.addEventListener('session-expired', handleSessionExpired as EventListener);
    
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired as EventListener);
    };
  }, [queryClient, toast]);

  // Use session heartbeat to keep session alive and detect expiry
  useSessionHeartbeat({
    enabled: !!user, // Only when user is logged in
    interval: 15 * 60 * 1000, // Check every 15 minutes
    onSessionExpired: () => {
      setUser(null);
      queryClient.clear();
      toast({
        title: "Session expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password, schoolId }: { email: string; password: string; schoolId?: string }) => {
      const response = await apiRequest('POST', '/api/auth/login', { email, password, schoolId });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      return response.json();
    },
    onSuccess: (userData) => {
      setUser(userData);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/auth/register', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration successful!",
        description: "Please check your email to verify your account.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const login = async (email: string, password: string, schoolId?: string) => {
    await loginMutation.mutateAsync({ email, password, ...(schoolId && { schoolId }) });
  };

  const logout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
    } catch (error) {
      // Continue with logout even if server request fails
    } finally {
      setUser(null);
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    }
  };

  const register = async (data: any) => {
    await registerMutation.mutateAsync(data);
  };

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    }
  };

  return {
    user,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
    login,
    logout,
    register,
    refreshUser,
  };
}