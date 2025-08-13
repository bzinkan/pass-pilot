// Firebase authentication disabled - this hook is now a stub
// Use the main useAuth hook instead for database authentication

import { useState, useEffect } from 'react';
import type { PassPilotUser } from '@/lib/firebaseAuth';

export function useFirebaseAuth() {
  const [user, setUser] = useState<PassPilotUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(true);

  useEffect(() => {
    console.log('Firebase auth hook disabled - use main useAuth hook instead');
  }, []);

  const signIn = async (email: string, password: string) => {
    throw new Error('Firebase auth disabled. Use the main database login system.');
  };

  const signUp = async (email: string, password: string, adminName: string, schoolName: string) => {
    throw new Error('Firebase auth disabled. Use the main database registration system.');
  };

  const signOut = async () => {
    throw new Error('Firebase auth disabled. Use the main database logout system.');
  };

  const updateProfile = async (updates: Partial<PassPilotUser>) => {
    throw new Error('Firebase auth disabled. Use the main database user system.');
  };

  return {
    user,
    loading,
    initialized,
    isAuthenticated: false,
    isAdmin: firebaseAuthService.isAdmin(),
    schoolId: firebaseAuthService.getSchoolId(),
    signIn,
    signUp,
    signOut,
    updateProfile,
  };
}