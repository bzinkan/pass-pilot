import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

export interface User {
  id: string;
  email: string;
  name: string;
  schoolId: string;
  isAdmin: boolean;
  schoolName: string;
  assignedGrades?: string[];
}

export function useAuth() {
  const [isInitialized, setIsInitialized] = useState(false);

  // Check authentication status
  const { data: authData, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const user = (authData && typeof authData === 'object' && 'authenticated' in authData && authData.authenticated) ? (authData as any).user : null;
  const isAuthenticated = !!user;

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password, schoolId }: { email: string; password: string; schoolId?: string }) => {
      const response = await apiRequest('POST', '/api/auth/login', { email, password, schoolId });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/auth/logout');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.clear(); // Clear all cached data
    },
  });

  // Mark as initialized once we have initial auth status
  useEffect(() => {
    if (!isLoading && !isInitialized) {
      setIsInitialized(true);
    }
  }, [isLoading, isInitialized]);

  const login = async (email: string, password: string, schoolId?: string) => {
    const result = await loginMutation.mutateAsync({ email, password, schoolId });
    return result;
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  // Register school mutation
  const registerSchoolMutation = useMutation({
    mutationFn: async (formData: {
      schoolName: string;
      adminName: string;
      adminEmail: string;
      adminPassword: string;
      plan?: string;
    }) => {
      const response = await apiRequest('POST', '/api/auth/register-school', {
        email: formData.adminEmail,
        password: formData.adminPassword,
        name: formData.adminName,
        schoolName: formData.schoolName,
        plan: formData.plan || 'free_trial'
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const registerSchool = async (formData: {
    schoolName: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    plan?: string;
  }) => {
    const result = await registerSchoolMutation.mutateAsync(formData);
    return result;
  };

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    isInitialized,
    login,
    logout,
    registerSchool,
    loginError: loginMutation.error,
    registerError: registerSchoolMutation.error,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isRegistering: registerSchoolMutation.isPending,
  };
}

// Hook for data that requires authentication
export function useAuthenticatedQuery<T>(
  queryKey: string | (string | any)[],
  options?: any
) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery<T>({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    enabled: isAuthenticated && !authLoading,
    ...options,
  });
}

// Hook for students data
export function useStudents(grade?: string) {
  const queryKey = grade ? ['/api/students', { grade }] : ['/api/students'];
  
  return useAuthenticatedQuery<any[]>(queryKey, {
    refetchInterval: 10000, // Poll every 10 seconds
  });
}

// Hook for active passes
export function useActivePasses() {
  return useAuthenticatedQuery<any[]>(['/api/passes/active'], {
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });
}

// Hook for grades
export function useGrades() {
  return useAuthenticatedQuery<any[]>(['/api/grades']);
}