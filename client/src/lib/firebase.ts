// Firebase removed - using session-based authentication with JWT cookies
// This is a compatibility stub to prevent import errors

export const auth = null;
export const db = null;

// Compatibility stub for FirebaseService
export class FirebaseService {
  private static instance: FirebaseService;
  
  private constructor() {}
  
  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  // Firebase is not configured - using session auth instead
  isConfigured(): boolean {
    return false;
  }

  // Stubs to prevent errors - not functional
  async signInWithGoogle() {
    throw new Error('Firebase not configured - use session-based auth');
  }

  async handleRedirectResult() {
    return null;
  }

  // Email/Password authentication stubs
  async signInWithEmailAndPassword(email: string, password: string) {
    throw new Error('Firebase not configured - use session-based auth');
  }

  async createUserWithEmailAndPassword(email: string, password: string) {
    throw new Error('Firebase not configured - use session-based auth');
  }

  async signOut() {
    // No-op for compatibility
    return Promise.resolve();
  }

  // Firestore method stubs
  async setDocument(path: string, data: any) {
    throw new Error('Firebase not configured - use API endpoints');
  }

  async updateDocument(path: string, data: any) {
    throw new Error('Firebase not configured - use API endpoints');
  }

  async deleteDocument(path: string) {
    throw new Error('Firebase not configured - use API endpoints');
  }

  // Real-time listeners stub
  onSnapshot(collectionPath: string, callback: (data: any[]) => void) {
    console.warn('Firebase not configured - use React Query for data fetching');
    return () => {}; // Return empty unsubscribe function
  }
}

export const firebaseService = FirebaseService.getInstance();
