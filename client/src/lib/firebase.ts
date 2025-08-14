import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, orderBy } from "firebase/firestore";

// Check if Firebase is configured
const isFirebaseConfigured = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_APP_ID
);

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase only if configured
let app: any = null;
let auth: any = null;
let db: any = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
}

export { auth, db };

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

export class FirebaseService {
  private static instance: FirebaseService;
  
  private constructor() {}
  
  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  // Check if Firebase is properly configured
  isConfigured(): boolean {
    return !!(
      import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_APP_ID
    );
  }

  // Google Sign In with redirect
  async signInWithGoogle() {
    if (!this.isConfigured()) {
      throw new Error('Firebase not configured');
    }
    return signInWithRedirect(auth, googleProvider);
  }

  // Handle redirect result
  async handleRedirectResult() {
    if (!this.isConfigured()) {
      throw new Error('Firebase not configured');
    }
    return getRedirectResult(auth);
  }

  // Email/Password authentication
  async signInWithEmailAndPassword(email: string, password: string) {
    if (!this.isConfigured()) {
      throw new Error('Firebase not configured');
    }
    return signInWithEmailAndPassword(auth, email, password);
  }

  async createUserWithEmailAndPassword(email: string, password: string) {
    if (!this.isConfigured()) {
      throw new Error('Firebase not configured');
    }
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async signOut() {
    if (!this.isConfigured()) {
      throw new Error('Firebase not configured');
    }
    return signOut(auth);
  }

  // Firestore methods
  async setDocument(path: string, data: any) {
    if (!this.isConfigured()) {
      throw new Error('Firebase not configured');
    }
    const docRef = doc(db, path);
    return setDoc(docRef, data);
  }

  async updateDocument(path: string, data: any) {
    if (!this.isConfigured()) {
      throw new Error('Firebase not configured');
    }
    const docRef = doc(db, path);
    return updateDoc(docRef, data);
  }

  async deleteDocument(path: string) {
    if (!this.isConfigured()) {
      throw new Error('Firebase not configured');
    }
    const docRef = doc(db, path);
    return deleteDoc(docRef);
  }

  // Real-time listeners
  onSnapshot(collectionPath: string, callback: (data: any[]) => void) {
    if (!this.isConfigured()) {
      console.warn('Firebase not configured, using mock data');
      return () => {};
    }

    const collectionRef = collection(db, collectionPath);
    const q = query(collectionRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(data);
    });
  }
}

export const firebaseService = FirebaseService.getInstance();
