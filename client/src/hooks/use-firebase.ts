import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// Removed Firebase realtime data - using React Query for data fetching

export function useActivePasses() {
  const { data: passes = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/passes/active'],
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  return { passes, isLoading };
}

export function useStudents(grade?: string) {
  const queryKey = grade ? ['/api/students', { grade }] : ['/api/students'];
  
  const { data: students = [], isLoading } = useQuery<any[]>({
    queryKey,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  return { students, isLoading };
}

// Firebase auth removed - using session-based authentication
