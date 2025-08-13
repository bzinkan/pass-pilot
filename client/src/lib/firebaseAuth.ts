import { 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User as FirebaseUser
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp 
} from "firebase/firestore";
import { auth, db } from "./firebase";

export interface PassPilotUser {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  schoolId: string;
  schoolName?: string;
  isAdmin: boolean;
  assignedGrades: string[];
  status: 'pending' | 'active' | 'suspended';
  createdAt: Date;
}

class FirebaseAuthService {
  private static instance: FirebaseAuthService;
  private currentUser: PassPilotUser | null = null;
  private authCallbacks: ((user: PassPilotUser | null) => void)[] = [];
  private initialized = false;

  private constructor() {
    this.initializeAuth();
  }

  public static getInstance(): FirebaseAuthService {
    if (!FirebaseAuthService.instance) {
      FirebaseAuthService.instance = new FirebaseAuthService();
    }
    return FirebaseAuthService.instance;
  }

  private async initializeAuth() {
    try {
      // Set persistence to LOCAL so users stay logged in
      await setPersistence(auth, browserLocalPersistence);
      
      // Listen for auth state changes
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const passPilotUser = await this.getPassPilotUser(firebaseUser);
            this.currentUser = passPilotUser;
            this.notifyAuthCallbacks(passPilotUser);
          } catch (error) {
            console.error('Error loading user data:', error);
            this.currentUser = null;
            this.notifyAuthCallbacks(null);
          }
        } else {
          this.currentUser = null;
          this.notifyAuthCallbacks(null);
        }
      });

      this.initialized = true;
      console.log('Firebase Auth initialized with persistence');
    } catch (error) {
      console.error('Firebase Auth initialization failed:', error);
    }
  }

  private getEnvironmentPrefix(): string {
    const env = import.meta.env.MODE || 'development';
    return env === 'production' ? 'prod' : 'dev';
  }

  private getCollection(name: string): string {
    return `${this.getEnvironmentPrefix()}_${name}`;
  }

  private async getPassPilotUser(firebaseUser: FirebaseUser): Promise<PassPilotUser | null> {
    const userDoc = await getDoc(doc(db, this.getCollection('users'), firebaseUser.uid));
    
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    const schoolDoc = await getDoc(doc(db, this.getCollection('schools'), userData.schoolId));
    const schoolName = schoolDoc.exists() ? schoolDoc.data().name : 'Unknown School';

    return {
      id: firebaseUser.uid,
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email!,
      name: userData.name,
      schoolId: userData.schoolId,
      schoolName,
      isAdmin: userData.isAdmin,
      assignedGrades: userData.assignedGrades || [],
      status: userData.status,
      createdAt: userData.createdAt?.toDate() || new Date(),
    };
  }

  private notifyAuthCallbacks(user: PassPilotUser | null) {
    this.authCallbacks.forEach(callback => callback(user));
  }

  public onAuthStateChange(callback: (user: PassPilotUser | null) => void): () => void {
    this.authCallbacks.push(callback);
    
    // Call immediately with current user if available
    if (this.initialized) {
      callback(this.currentUser);
    }

    // Return unsubscribe function
    return () => {
      const index = this.authCallbacks.indexOf(callback);
      if (index > -1) {
        this.authCallbacks.splice(index, 1);
      }
    };
  }

  public getCurrentUser(): PassPilotUser | null {
    return this.currentUser;
  }

  public async signInWithEmailAndPassword(email: string, password: string): Promise<PassPilotUser> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const passPilotUser = await this.getPassPilotUser(userCredential.user);
    
    if (!passPilotUser) {
      throw new Error('User not found in PassPilot system. Contact your administrator.');
    }

    return passPilotUser;
  }

  public async createSchoolAdmin(
    email: string, 
    password: string, 
    adminName: string, 
    schoolName: string,
    schoolId: string
  ): Promise<PassPilotUser> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Create school document
    const schoolData = {
      id: schoolId,
      schoolId: `school_${Date.now()}`,
      name: schoolName,
      plan: 'free',
      maxTeachers: 10,
      adminEmail: email,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, this.getCollection('schools'), schoolId), schoolData);

    // Create user document
    const userData = {
      email,
      name: adminName,
      schoolId,
      isAdmin: true,
      assignedGrades: [],
      status: 'active',
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, this.getCollection('users'), firebaseUser.uid), userData);

    const passPilotUser: PassPilotUser = {
      id: firebaseUser.uid,
      firebaseUid: firebaseUser.uid,
      email,
      name: adminName,
      schoolId,
      schoolName,
      isAdmin: true,
      assignedGrades: [],
      status: 'active',
      createdAt: new Date(),
    };

    this.currentUser = passPilotUser;
    return passPilotUser;
  }

  public async createTeacher(
    email: string,
    name: string,
    schoolId: string,
    assignedGrades: string[] = [],
    invitedBy: string
  ): Promise<void> {
    // Create pending teacher account (admin will provide password later)
    const userData = {
      email,
      name,
      schoolId,
      isAdmin: false,
      assignedGrades,
      invitedBy,
      status: 'pending',
      createdAt: serverTimestamp(),
    };

    // Use email as document ID for pending accounts
    await setDoc(doc(db, this.getCollection('pending_users'), email), userData);
  }

  public async activateTeacher(
    email: string,
    password: string
  ): Promise<PassPilotUser> {
    // Get pending user data
    const pendingDoc = await getDoc(doc(db, this.getCollection('pending_users'), email));
    
    if (!pendingDoc.exists()) {
      throw new Error('Teacher invitation not found');
    }

    const pendingData = pendingDoc.data();

    // Create Firebase auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Move from pending to active users
    const userData = {
      ...pendingData,
      status: 'active',
      activatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, this.getCollection('users'), firebaseUser.uid), userData);

    // Remove from pending users
    await (await import("firebase/firestore")).deleteDoc(doc(db, this.getCollection('pending_users'), email));

    // Get school name
    const schoolDoc = await getDoc(doc(db, this.getCollection('schools'), pendingData.schoolId));
    const schoolName = schoolDoc.exists() ? schoolDoc.data().name : 'Unknown School';

    const passPilotUser: PassPilotUser = {
      id: firebaseUser.uid,
      firebaseUid: firebaseUser.uid,
      email,
      name: pendingData.name,
      schoolId: pendingData.schoolId,
      schoolName,
      isAdmin: false,
      assignedGrades: pendingData.assignedGrades || [],
      status: 'active',
      createdAt: new Date(),
    };

    this.currentUser = passPilotUser;
    return passPilotUser;
  }

  public async updateUserProfile(updates: Partial<PassPilotUser>): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    const userRef = doc(db, this.getCollection('users'), this.currentUser.id);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    // Update local user object
    this.currentUser = { ...this.currentUser, ...updates };
    this.notifyAuthCallbacks(this.currentUser);
  }

  public async signOut(): Promise<void> {
    await signOut(auth);
    this.currentUser = null;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentUser.status === 'active';
  }

  public isAdmin(): boolean {
    return this.isAuthenticated() && this.currentUser!.isAdmin;
  }

  public getSchoolId(): string | null {
    return this.currentUser?.schoolId || null;
  }
}

export const firebaseAuthService = FirebaseAuthService.getInstance();