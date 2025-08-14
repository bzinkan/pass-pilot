import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { randomUUID } from "crypto";
import { type User, type InsertUser, type School, type InsertSchool, type Grade, type InsertGrade, type Student, type InsertStudent, type Pass, type InsertPass } from "@shared/schema";
import type { IStorage } from "./storage";

// Initialize Firebase Admin (server-side)
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    // Use Application Default Credentials for Replit environment
    // In production, you'd set GOOGLE_APPLICATION_CREDENTIALS environment variable
    const app = initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
    return app;
  }
  return getApps()[0];
};

export class FirebaseStorage implements IStorage {
  private db!: FirebaseFirestore.Firestore;
  private auth: any;
  private initialized = false;

  constructor() {
    this.initializeFirebase();
  }

  private async initializeFirebase() {
    try {
      initializeFirebaseAdmin();
      this.db = getFirestore();
      this.auth = getAuth();
      this.initialized = true;
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Firebase Admin initialization failed:', error);
      this.initialized = false;
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeFirebase();
    }
    if (!this.initialized) {
      throw new Error('Firebase not properly initialized. Check your Firebase configuration.');
    }
  }

  private getEnvironmentPrefix(): string {
    // Use environment-based collections for dev/staging/production separation
    const env = process.env.NODE_ENV || 'development';
    return env === 'production' ? 'prod' : 'dev';
  }

  private getCollection(name: string): string {
    return `${this.getEnvironmentPrefix()}_${name}`;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const doc = await this.db.collection(this.getCollection('users')).doc(id).get();
    if (!doc.exists) return undefined;
    
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
    } as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const querySnapshot = await this.db
      .collection(this.getCollection('users'))
      .where('email', '==', email)
      .limit(1)
      .get();

    if (querySnapshot.empty) return undefined;

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
    } as User;
  }

  async getUsersBySchool(schoolId: string): Promise<User[]> {
    await this.ensureInitialized();
    const querySnapshot = await this.db
      .collection(this.getCollection('users'))
      .where('schoolId', '==', schoolId)
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
    } as User));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureInitialized();
    const id = randomUUID();
    const userData = {
      ...insertUser,
      createdAt: Timestamp.now(),
    };

    await this.db.collection(this.getCollection('users')).doc(id).set(userData);
    
    return {
      id,
      ...insertUser,
      createdAt: new Date(),
    } as User;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    await this.ensureInitialized();
    const userRef = this.db.collection(this.getCollection('users')).doc(id);
    
    const updateData = { ...updates };
    delete updateData.id;
    delete updateData.createdAt;

    await userRef.update(updateData);
    
    const updatedDoc = await userRef.get();
    if (!updatedDoc.exists) {
      throw new Error("User not found");
    }

    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
    } as User;
  }

  async deleteUser(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db.collection(this.getCollection('users')).doc(id).delete();
  }

  // Schools
  async getSchool(id: string): Promise<School | undefined> {
    await this.ensureInitialized();
    const doc = await this.db.collection(this.getCollection('schools')).doc(id).get();
    if (!doc.exists) return undefined;

    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
    } as School;
  }

  async createSchool(insertSchool: InsertSchool): Promise<School> {
    await this.ensureInitialized();
    const id = randomUUID();
    const schoolData = {
      ...insertSchool,
      createdAt: Timestamp.now(),
    };

    await this.db.collection(this.getCollection('schools')).doc(id).set(schoolData);
    
    return {
      id,
      ...insertSchool,
      createdAt: new Date(),
    } as School;
  }

  async updateSchool(id: string, updates: Partial<School>): Promise<School> {
    await this.ensureInitialized();
    const schoolRef = this.db.collection(this.getCollection('schools')).doc(id);
    
    const updateData = { ...updates };
    delete updateData.id;
    delete updateData.createdAt;

    await schoolRef.update(updateData);
    
    const updatedDoc = await schoolRef.get();
    if (!updatedDoc.exists) {
      throw new Error("School not found");
    }

    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
    } as School;
  }

  // Grades
  async getGradesBySchool(schoolId: string): Promise<Grade[]> {
    await this.ensureInitialized();
    const querySnapshot = await this.db
      .collection(this.getCollection('grades'))
      .where('schoolId', '==', schoolId)
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
    } as Grade));
  }

  async createGrade(insertGrade: InsertGrade): Promise<Grade> {
    await this.ensureInitialized();
    const id = randomUUID();
    const gradeData = {
      ...insertGrade,
      createdAt: Timestamp.now(),
    };

    await this.db.collection(this.getCollection('grades')).doc(id).set(gradeData);
    
    return {
      id,
      ...insertGrade,
      createdAt: new Date(),
    } as Grade;
  }

  async updateGrade(id: string, updates: Partial<Grade>): Promise<Grade> {
    await this.ensureInitialized();
    const gradeRef = this.db.collection(this.getCollection('grades')).doc(id);
    
    const updateData = { ...updates };
    delete updateData.id;
    delete updateData.createdAt;

    await userRef.update(updateData);
    
    const updatedDoc = await gradeRef.get();
    if (!updatedDoc.exists) {
      throw new Error("Grade not found");
    }

    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
    } as Grade;
  }

  async deleteGrade(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db.collection(this.getCollection('grades')).doc(id).delete();
  }

  // Students
  async getStudentsBySchool(schoolId: string, grade?: string): Promise<Student[]> {
    await this.ensureInitialized();
    let query = this.db
      .collection(this.getCollection('students'))
      .where('schoolId', '==', schoolId);

    if (grade) {
      query = query.where('grade', '==', grade);
    }

    const querySnapshot = await query.get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
    } as Student));
  }

  async getStudent(id: string): Promise<Student | undefined> {
    await this.ensureInitialized();
    const doc = await this.db.collection(this.getCollection('students')).doc(id).get();
    if (!doc.exists) return undefined;

    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
    } as Student;
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    await this.ensureInitialized();
    const id = randomUUID();
    const studentData = {
      ...insertStudent,
      createdAt: Timestamp.now(),
    };

    await this.db.collection(this.getCollection('students')).doc(id).set(studentData);
    
    return {
      id,
      ...insertStudent,
      createdAt: new Date(),
    } as Student;
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
    await this.ensureInitialized();
    const studentRef = this.db.collection(this.getCollection('students')).doc(id);
    
    const updateData = { ...updates };
    delete updateData.id;
    delete updateData.createdAt;

    await studentRef.update(updateData);
    
    const updatedDoc = await studentRef.get();
    if (!updatedDoc.exists) {
      throw new Error("Student not found");
    }

    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
    } as Student;
  }

  async deleteStudent(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db.collection(this.getCollection('students')).doc(id).delete();
  }

  // Passes
  async getActivePassesBySchool(schoolId: string): Promise<(Pass & { student: Student })[]> {
    await this.ensureInitialized();
    const passesSnapshot = await this.db
      .collection(this.getCollection('passes'))
      .where('schoolId', '==', schoolId)
      .where('status', '==', 'out')
      .get();

    const results = [];
    for (const passDoc of passesSnapshot.docs) {
      const passData = passDoc.data();
      const studentDoc = await this.db
        .collection(this.getCollection('students'))
        .doc(passData.studentId)
        .get();

      if (studentDoc.exists) {
        results.push({
          id: passDoc.id,
          ...passData,
          checkoutTime: passData.checkoutTime?.toDate() || new Date(),
          returnTime: passData.returnTime?.toDate() || null,
          student: {
            id: studentDoc.id,
            ...studentDoc.data(),
            createdAt: studentDoc.data()?.createdAt?.toDate() || new Date(),
          }
        } as Pass & { student: Student });
      }
    }

    return results;
  }

  async getPassesBySchool(schoolId: string, filters?: { 
    dateStart?: Date; 
    dateEnd?: Date; 
    grade?: string; 
    teacherId?: string; 
  }): Promise<(Pass & { student: Student; teacher: User })[]> {
    await this.ensureInitialized();
    let query = this.db
      .collection(this.getCollection('passes'))
      .where('schoolId', '==', schoolId);

    if (filters?.teacherId) {
      query = query.where('teacherId', '==', filters.teacherId);
    }

    const passesSnapshot = await query.get();

    const results = [];
    for (const passDoc of passesSnapshot.docs) {
      const passData = passDoc.data();
      const checkoutTime = passData.checkoutTime?.toDate();

      // Apply date filters
      if (filters?.dateStart && checkoutTime && checkoutTime < filters.dateStart) continue;
      if (filters?.dateEnd && checkoutTime && checkoutTime > filters.dateEnd) continue;

      const [studentDoc, teacherDoc] = await Promise.all([
        this.db.collection(this.getCollection('students')).doc(passData.studentId).get(),
        this.db.collection(this.getCollection('users')).doc(passData.teacherId).get()
      ]);

      if (studentDoc.exists && teacherDoc.exists) {
        const studentData = studentDoc.data();
        
        // Apply grade filter
        if (filters?.grade && studentData?.grade !== filters.grade) continue;

        results.push({
          id: passDoc.id,
          ...passData,
          checkoutTime: checkoutTime || new Date(),
          returnTime: passData.returnTime?.toDate() || null,
          student: {
            id: studentDoc.id,
            ...studentData,
            createdAt: studentData?.createdAt?.toDate() || new Date(),
          },
          teacher: {
            id: teacherDoc.id,
            ...teacherDoc.data(),
            createdAt: teacherDoc.data()?.createdAt?.toDate() || new Date(),
          }
        } as Pass & { student: Student; teacher: User });
      }
    }

    return results.sort((a, b) => {
      const aTime = a.checkoutTime ? a.checkoutTime.getTime() : 0;
      const bTime = b.checkoutTime ? b.checkoutTime.getTime() : 0;
      return bTime - aTime;
    });
  }

  async createPass(insertPass: InsertPass): Promise<Pass> {
    await this.ensureInitialized();
    const id = randomUUID();
    const passData = {
      ...insertPass,
      checkoutTime: Timestamp.now(),
      returnTime: null,
      status: insertPass.status || 'out',
      passType: insertPass.passType || 'general',
    };

    await this.db.collection(this.getCollection('passes')).doc(id).set(passData);
    
    return {
      id,
      ...insertPass,
      checkoutTime: new Date(),
      returnTime: null,
      status: insertPass.status || 'out',
      passType: insertPass.passType || 'general',
      customReason: insertPass.customReason || null,
      duration: null,
    } as Pass;
  }

  async updatePass(id: string, updates: Partial<Pass>): Promise<Pass> {
    await this.ensureInitialized();
    const passRef = this.db.collection(this.getCollection('passes')).doc(id);
    
    const updateData = { ...updates };
    delete updateData.id;

    // Convert dates to Timestamps for Firebase
    if (updateData.returnTime instanceof Date) {
      updateData.returnTime = Timestamp.fromDate(updateData.returnTime);
    }
    if (updateData.checkoutTime instanceof Date) {
      updateData.checkoutTime = Timestamp.fromDate(updateData.checkoutTime);
    }

    // Calculate duration if returning
    if (updates.status === "returned" && !updates.returnTime) {
      (updateData as any).returnTime = Timestamp.now();
      const passDoc = await passRef.get();
      if (passDoc.exists) {
        const passData = passDoc.data();
        const checkoutTime = passData?.checkoutTime?.toDate();
        if (checkoutTime) {
          const returnTime = new Date();
          updateData.duration = Math.floor(
            (returnTime.getTime() - checkoutTime.getTime()) / (1000 * 60)
          );
        }
      }
    }

    await passRef.update(updateData);
    
    const updatedDoc = await passRef.get();
    if (!updatedDoc.exists) {
      throw new Error("Pass not found");
    }

    const data = updatedDoc.data();
    return {
      id: updatedDoc.id,
      ...data,
      checkoutTime: data?.checkoutTime?.toDate() || new Date(),
      returnTime: data?.returnTime?.toDate() || null,
    } as Pass;
  }
}