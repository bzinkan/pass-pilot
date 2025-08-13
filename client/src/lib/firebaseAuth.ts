// Firebase authentication disabled - using database authentication only
// This service is now a stub that redirects to the main auth system

export interface PassPilotUser {
  id: string;
  email: string;
  name: string;
  schoolId: string;
  schoolName?: string;
  isAdmin: boolean;
  assignedGrades: string[];
  status: 'pending' | 'active' | 'suspended';
  createdAt: Date;
}

// Stub class - Firebase authentication disabled, redirects to database auth
class FirebaseAuthService {
  private static instance: FirebaseAuthService;

  private constructor() {
    console.log('Firebase authentication disabled - using database auth system');
  }

  public static getInstance(): FirebaseAuthService {
    if (!FirebaseAuthService.instance) {
      FirebaseAuthService.instance = new FirebaseAuthService();
    }
    return FirebaseAuthService.instance;
  }

  // Stub methods that throw helpful errors
  public isAuthenticated(): boolean {
    return false;
  }

  public onAuthStateChange(callback: (user: PassPilotUser | null) => void): () => void {
    // Immediately call with null to indicate no Firebase user
    setTimeout(() => callback(null), 0);
    return () => {}; // Empty unsubscribe function
  }

  public async signInWithEmailAndPassword(email: string, password: string): Promise<PassPilotUser> {
    throw new Error('Firebase auth disabled. Use the main database login system.');
  }

  public async createSchoolAdmin(email: string, password: string, adminName: string, schoolName: string, schoolId: string): Promise<PassPilotUser> {
    throw new Error('Firebase auth disabled. Use the main database registration system.');
  }

  public async activateTeacher(email: string, password: string): Promise<PassPilotUser> {
    throw new Error('Firebase auth disabled. Use the main database login system.');
  }

  public async updateUserProfile(updates: Partial<PassPilotUser>): Promise<void> {
    throw new Error('Firebase auth disabled. Use the main database user system.');
  }

  public async signOut(): Promise<void> {
    throw new Error('Firebase auth disabled. Use the main database logout system.');
  }
}

export const firebaseAuthService = FirebaseAuthService.getInstance();