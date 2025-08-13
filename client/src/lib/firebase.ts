// Firebase removed - using database authentication only
// This file is kept for any potential future integrations but Firebase auth is disabled

export const auth = null;
export const db = null;

// Stub Firebase service for compatibility
export const firebaseService = {
  isConfigured: () => false,
  signInWithGoogle: () => Promise.reject(new Error('Firebase disabled')),
  handleRedirectResult: () => Promise.reject(new Error('Firebase disabled')),
  signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase disabled')),
  createUserWithEmailAndPassword: () => Promise.reject(new Error('Firebase disabled')),
  signOut: () => Promise.reject(new Error('Firebase disabled')),
};