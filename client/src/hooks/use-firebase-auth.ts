import { useState, useEffect } from 'react';
import { firebaseAuthService, type PassPilotUser } from '@/lib/firebaseAuth';

export function useFirebaseAuth() {
  const [user, setUser] = useState<PassPilotUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
      setInitialized(true);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const user = await firebaseAuthService.signInWithEmailAndPassword(email, password);
      return user;
    } catch (error: any) {
      // Check if this is a pending teacher account
      if (error.code === 'auth/user-not-found') {
        try {
          // Try to activate pending teacher account
          const user = await firebaseAuthService.activateTeacher(email, password);
          return user;
        } catch (activationError: any) {
          throw new Error('Invalid credentials or account not found');
        }
      }
      throw error;
    }
  };

  const signUp = async (email: string, password: string, adminName: string, schoolName: string) => {
    const schoolId = `school_${Date.now()}`;
    return firebaseAuthService.createSchoolAdmin(email, password, adminName, schoolName, schoolId);
  };

  const signOut = async () => {
    await firebaseAuthService.signOut();
  };

  const updateProfile = async (updates: Partial<PassPilotUser>) => {
    await firebaseAuthService.updateUserProfile(updates);
  };

  return {
    user,
    loading,
    initialized,
    isAuthenticated: firebaseAuthService.isAuthenticated(),
    isAdmin: firebaseAuthService.isAdmin(),
    schoolId: firebaseAuthService.getSchoolId(),
    signIn,
    signUp,
    signOut,
    updateProfile,
  };
}