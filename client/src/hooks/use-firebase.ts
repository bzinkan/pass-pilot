import { useState, useEffect } from 'react';
import { firebaseService } from '@/lib/firebase';
import { useQuery } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await firebaseService.signOut();
    } catch (error) {
      console.warn('Firebase logout failed:', error);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return { user, login, logout };
}

export function useRealtimeData<T>(path: string, initialData: T) {
  const [data, setData] = useState<T>(initialData);

  useEffect(() => {
    const unsubscribe = firebaseService.onSnapshot(path, (newData: any[]) => {
      setData(newData as T);
    });

    return unsubscribe;
  }, [path]);

  return data;
}

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

export function useFirebaseAuth() {
  const [isConnected, setIsConnected] = useState(false);
  const [auth, setAuth] = useState<any>(null);

  useEffect(() => {
    if (firebaseService.isConfigured()) {
      const authInstance = getAuth();
      setAuth(authInstance);
      setIsConnected(true);
    } else {
      setIsConnected(false);
      setAuth(null);
    }
  }, []);

  return { auth, isConnected };
}
