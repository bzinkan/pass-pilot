import { type User, type InsertUser, type School, type InsertSchool, type Grade, type InsertGrade, type Student, type InsertStudent, type Pass, type InsertPass, type Payment, type InsertPayment, type OrganizerCategory, type InsertOrganizerCategory, type OrganizerEntry, type InsertOrganizerEntry, type OrganizerEvent, type InsertOrganizerEvent } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users, schools, grades, students, passes, payments, organizerCategories, organizerEntries, organizerEvents } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import { unwrap } from "./safe";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByEmail(email: string): Promise<User[]>; // Get all users with this email across schools
  getUserByEmailAndSchool(email: string, schoolId: string): Promise<User | undefined>;
  getUsersBySchool(schoolId: string): Promise<User[]>;
  getTeachersBySchool(schoolId: string): Promise<User[]>;
  authenticateUser(email: string, password: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  clearPasswordResetToken(userId: string): Promise<void>;
  
  // Schools
  getSchool(id: string): Promise<School | undefined>;
  getSchoolById(id: string): Promise<School | undefined>; // Alias for getSchool
  getSchoolBySlug(slug: string): Promise<School | undefined>; // Get school by unique slug
  getSchoolsByIds(ids: string[]): Promise<School[]>; // Get multiple schools by IDs
  getAllSchools(): Promise<School[]>;
  getActiveSchools(): Promise<School[]>; // Schools with active subscriptions or valid trials
  createSchool(school: InsertSchool): Promise<School>;
  updateSchool(id: string, updates: Partial<School>): Promise<School>;
  upgradeSchoolPlan(schoolId: string, newPlan: string, newMaxTeachers: number, newMaxStudents: number): Promise<School>;
  deleteSchool(id: string): Promise<void>; // Delete expired/cancelled schools
  getTrialAccountByDomain(emailDomain: string): Promise<School | undefined>;
  getTrialAccountBySchoolName(schoolName: string): Promise<School | undefined>;
  getSchoolsByEmailDomain(emailDomain: string): Promise<School[]>;
  getSchoolByVerificationToken(token: string): Promise<School | undefined>;
  verifySchoolEmail(schoolId: string): Promise<School>;
  cleanupExpiredTrials(): Promise<number>; // Returns count of removed expired trials only
  
  // Grades
  getGradesBySchool(schoolId: string): Promise<Grade[]>;
  createGrade(grade: InsertGrade): Promise<Grade>;
  updateGrade(id: string, updates: Partial<Grade>): Promise<Grade>;
  deleteGrade(id: string): Promise<void>;
  
  // Students
  getStudentsBySchool(schoolId: string, grade?: string): Promise<Student[]>;
  getStudent(id: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, updates: Partial<Student>): Promise<Student>;
  deleteStudent(id: string): Promise<void>;
  
  // Passes
  getActivePassesBySchool(schoolId: string): Promise<(Pass & { student: Student })[]>;
  getActivePassesByTeacher(teacherId: string): Promise<(Pass & { studentName: string })[]>;
  getPassesBySchool(schoolId: string, filters?: { 
    dateStart?: Date; 
    dateEnd?: Date; 
    grade?: string; 
    teacherId?: string; 
  }): Promise<(Pass & { student: Student; teacher: User })[]>;
  createPass(pass: InsertPass): Promise<Pass>;
  updatePass(id: string, updates: Partial<Pass>): Promise<Pass>;
  returnAllActivePasses(schoolId: string): Promise<number>;
  
  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsBySchool(schoolId: string): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;
  
  // Organizer - Categories
  getOrganizerCategories(schoolId: string): Promise<OrganizerCategory[]>;
  createOrganizerCategory(category: InsertOrganizerCategory): Promise<OrganizerCategory>;
  deleteOrganizerCategory(id: string, schoolId: string): Promise<void>;
  
  // Organizer - Entries
  getOrganizerEntries(schoolId: string, categoryId?: string): Promise<OrganizerEntry[]>;
  createOrganizerEntry(entry: InsertOrganizerEntry): Promise<OrganizerEntry>;
  updateOrganizerEntry(id: string, updates: Partial<OrganizerEntry>, schoolId: string): Promise<OrganizerEntry>;
  deleteOrganizerEntry(id: string, schoolId: string): Promise<void>;
  
  // Organizer - Events
  getOrganizerEvents(schoolId: string): Promise<OrganizerEvent[]>;
  createOrganizerEvent(event: InsertOrganizerEvent): Promise<OrganizerEvent>;
  deleteOrganizerEvent(id: string, schoolId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private schools = new Map<string, School>();
  private grades = new Map<string, Grade>();
  private students = new Map<string, Student>();
  private passes = new Map<string, Pass>();
  private payments = new Map<string, Payment>();
  private organizerCategories = new Map<string, OrganizerCategory>();
  private organizerEntries = new Map<string, OrganizerEntry>();
  private organizerEvents = new Map<string, OrganizerEvent>();

  constructor() {
    // Initialize with demo data
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Create demo school
    const school: School = {
      id: randomUUID(),
      name: "Lincoln Elementary School",
      slug: "lincoln-elementary-school",
      emailDomain: "lincolnelementary.edu",
      status: "active",
      plan: "free_trial",
      maxTeachers: 10,
      maxStudents: 500,
      currentTeachers: 0,
      currentStudents: 0,
      trialStartDate: new Date(),
      trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      isTrialExpired: false,
      subscriptionStatus: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      emailVerified: false,
      emailVerificationToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.schools.set(school.id, school);

    // Create demo admin user
    const admin: User = {
      id: randomUUID(),
      schoolId: school.id,
      email: "admin@lincolnelementary.edu",
      password: "password123", // In real app, this would be hashed
      firstName: "Principal",
      lastName: "Smith",
      role: "ADMIN",
      isAdmin: true,
      isFirstLogin: false,
      enableNotifications: true,
      status: "active",
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(admin.id, admin);

    // Create demo teacher
    const teacher: User = {
      id: randomUUID(),
      schoolId: school.id,
      email: "johnson@lincolnelementary.edu",
      password: "password123",
      firstName: "Ms.",
      lastName: "Johnson",
      role: "TEACHER",
      isAdmin: false,
      isFirstLogin: false,
      enableNotifications: true,
      status: "active",
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(teacher.id, teacher);

    // Create demo grades
    const grade3: Grade = {
      id: randomUUID(),
      name: "3",
      schoolId: school.id,
      displayOrder: 3,
      createdAt: new Date(),
    };
    this.grades.set(grade3.id, grade3);

    const grade4: Grade = {
      id: randomUUID(),
      name: "4",
      schoolId: school.id,
      displayOrder: 4,
      createdAt: new Date(),
    };
    this.grades.set(grade4.id, grade4);

    // Create demo students
    const students = [
      { name: "Alex Johnson", grade: "3", studentId: "12345" },
      { name: "Sarah Martinez", grade: "4", studentId: "12346" },
      { name: "Tyler Roberts", grade: "3", studentId: "12347" },
      { name: "Emma Davis", grade: "4", studentId: "12348" },
      { name: "Michael Brown", grade: "3", studentId: "12349" },
    ];

    students.forEach(studentData => {
      const student: Student = {
        id: randomUUID(),
        schoolId: school.id,
        gradeId: studentData.grade === "3" ? grade3.id : grade4.id,
        firstName: studentData.name.split(' ')[0],
        lastName: studentData.name.split(' ').slice(1).join(' '),
        studentId: studentData.studentId,
        email: null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.students.set(student.id, student);
    });

    // Demo data initialization complete
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || user.status !== 'active') {
      return null;
    }
    
    // In demo mode, we store passwords in plain text
    // In production, you would use bcrypt.compare(password, user.password)
    if (user.password === password) {
      return user;
    }
    
    return null;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      resetToken: null,
      resetTokenExpiry: null,
      // Ensure required fields have defaults
      role: insertUser.role || 'TEACHER',
      status: insertUser.status || 'active',
      isAdmin: insertUser.isAdmin || false,
      isFirstLogin: insertUser.isFirstLogin || false,
      enableNotifications: insertUser.enableNotifications || true,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser: User = { 
      ...user, 
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUsersBySchool(schoolId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.schoolId === schoolId);
  }

  async getTeachersBySchool(schoolId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => 
      user.schoolId === schoolId && !user.isPlatformOwner
    );
  }

  async getUsersByEmail(email: string): Promise<User[]> {
    const emailNorm = email.trim().toLowerCase();
    return Array.from(this.users.values()).filter(user => 
      user.email.toLowerCase() === emailNorm
    );
  }

  async getUserByEmailAndSchool(email: string, schoolId: string): Promise<User | undefined> {
    const emailNorm = email.trim().toLowerCase();
    return Array.from(this.users.values()).find(user => 
      user.email.toLowerCase() === emailNorm && user.schoolId === schoolId
    );
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  // Schools
  async getSchool(id: string): Promise<School | undefined> {
    return this.schools.get(id);
  }

  async getSchoolById(id: string): Promise<School | undefined> {
    return this.getSchool(id); // Alias for getSchool
  }

  async getSchoolBySlug(slug: string): Promise<School | undefined> {
    return Array.from(this.schools.values()).find(school => school.slug === slug);
  }

  async getSchoolsByIds(ids: string[]): Promise<School[]> {
    return Array.from(this.schools.values()).filter(school => ids.includes(school.id));
  }

  async createSchool(insertSchool: InsertSchool): Promise<School> {
    const id = randomUUID();
    const school = {
      id,
      ...insertSchool,
      createdAt: new Date(),
    } as School;
    
    this.schools.set(id, school);
    return school;
  }

  async updateSchool(id: string, updates: Partial<School>): Promise<School> {
    const existing = this.schools.get(id);
    if (!existing) {
      throw new Error('School not found');
    }
    
    const updated = { ...existing, ...updates };
    this.schools.set(id, updated);
    return updated;
  }

  async getAllSchools(): Promise<School[]> {
    return Array.from(this.schools.values());
  }

  async getActiveSchools(): Promise<School[]> {
    const now = new Date();
    return Array.from(this.schools.values()).filter(school => {
      // Include paid schools (not on free trial)
      if (school.plan !== 'free_trial') {
        // If subscription was cancelled, show it until subscription ends
        if (school.subscriptionCancelledAt && school.subscriptionEndsAt) {
          return true; // Always show cancelled subscriptions until manual deletion
        }
        // Active paid subscription
        return true;
      }
      
      // For trial schools, check if trial is still valid (hide expired trials after 7 days)
      if (school.plan === 'TRIAL') {
        if (school.isTrialExpired) return false;
        if (school.trialEndDate && now > school.trialEndDate) {
          const daysSinceExpiry = (now.getTime() - school.trialEndDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceExpiry <= 7; // Show expired trials for 7 days
        }
        return true;
      }
      
      return false;
    });
  }

  async deleteSchool(id: string): Promise<void> {
    this.schools.delete(id);
    
    // Also clean up related data
    const schoolUsers = Array.from(this.users.values()).filter(user => user.schoolId === id);
    schoolUsers.forEach(user => this.users.delete(user.id));
    
    const schoolGrades = Array.from(this.grades.values()).filter(grade => grade.schoolId === id);
    schoolGrades.forEach(grade => this.grades.delete(grade.id));
    
    const schoolStudents = Array.from(this.students.values()).filter(student => student.schoolId === id);
    schoolStudents.forEach(student => this.students.delete(student.id));
    
    const schoolPasses = Array.from(this.passes.values()).filter(pass => pass.schoolId === id);
    schoolPasses.forEach(pass => this.passes.delete(pass.id));
  }

  async cleanupExpiredTrials(): Promise<number> {
    const now = new Date();
    const allSchools = Array.from(this.schools.values());
    let removedCount = 0;
    
    for (const school of allSchools) {
      // Only remove expired trials (expired for more than 7 days)
      if (school.plan === 'free_trial' && school.trialEndDate) {
        const daysSinceExpiry = (now.getTime() - school.trialEndDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceExpiry > 7) {
          await this.deleteSchool(school.id);
          removedCount++;
        }
      }
    }
    
    return removedCount;
  }





  async upgradeSchoolPlan(schoolId: string, newPlan: string, newMaxTeachers: number, newMaxStudents: number): Promise<School> {
    const school = this.schools.get(schoolId);
    if (!school) throw new Error("School not found");
    
    console.log(`Upgrading school ${school.name} from ${school.plan} to ${newPlan}`);
    console.log(`Teacher limit: ${school.maxTeachers} → ${newMaxTeachers}`);
    console.log(`Student limit: ${school.maxStudents} → ${newMaxStudents}`);
    
    // Update school plan and limits
    const upgradedSchool = { 
      ...school, 
      plan: newPlan,
      maxTeachers: newMaxTeachers,
      maxStudents: newMaxStudents,
      // Remove trial-specific fields for paid plans
      trialStartDate: newPlan === 'free_trial' ? school.trialStartDate : null,
      trialEndDate: newPlan === 'free_trial' ? school.trialEndDate : null,
      isTrialExpired: newPlan === 'free_trial' ? school.isTrialExpired : false
    };
    
    this.schools.set(schoolId, upgradedSchool);
    
    console.log(`School upgrade completed: ${school.name} is now on ${newPlan} plan`);
    return upgradedSchool;
  }

  async getTrialAccountByDomain(emailDomain: string): Promise<School | undefined> {
    // Check for existing trial accounts by matching admin email domain
    for (const school of Array.from(this.schools.values())) {
      if (school.plan === 'free_trial' && school.adminEmail) {
        const schoolDomain = school.adminEmail.split('@')[1]?.toLowerCase();
        if (schoolDomain === emailDomain.toLowerCase()) {
          return school;
        }
      }
    }
    return undefined;
  }

  async getTrialAccountBySchoolName(schoolName: string): Promise<School | undefined> {
    return Array.from(this.schools.values()).find(school => 
      school.plan === 'free_trial' && school.name.toLowerCase() === schoolName.toLowerCase()
    );
  }

  async getSchoolsByEmailDomain(emailDomain: string): Promise<School[]> {
    // Find all schools that have teachers with this email domain
    return Array.from(this.schools.values()).filter(school => 
      school.emailDomain?.toLowerCase() === emailDomain.toLowerCase()
    );
  }

  async getSchoolByVerificationToken(token: string): Promise<School | undefined> {
    for (const school of Array.from(this.schools.values())) {
      if (school.verificationToken === token && school.verificationTokenExpiry && school.verificationTokenExpiry > new Date()) {
        return school;
      }
    }
    return undefined;
  }

  async verifySchoolEmail(schoolId: string): Promise<School> {
    const school = this.schools.get(schoolId);
    if (!school) throw new Error("School not found");
    
    const now = new Date();
    const trialEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    const updatedSchool = { 
      ...school, 
      verified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
      trialStartDate: now,
      trialEndDate: trialEndDate
    };
    this.schools.set(schoolId, updatedSchool);
    return updatedSchool;
  }



  // Grades
  async getGradesBySchool(schoolId: string): Promise<Grade[]> {
    return Array.from(this.grades.values()).filter(grade => grade.schoolId === schoolId);
  }

  async createGrade(insertGrade: InsertGrade): Promise<Grade> {
    const id = randomUUID();
    const grade: Grade = { 
      ...insertGrade, 
      id,
      createdAt: new Date(),
    };
    this.grades.set(id, grade);
    return grade;
  }

  async updateGrade(id: string, updates: Partial<Grade>): Promise<Grade> {
    const grade = this.grades.get(id);
    if (!grade) {
      throw new Error('Grade not found');
    }

    const oldName = grade.name;
    const updatedGrade = { ...grade, ...updates };
    this.grades.set(id, updatedGrade);

    // Update student grades if grade name changed
    if (updates.name && oldName !== updates.name) {
      Array.from(this.students.entries()).forEach(([studentId, student]) => {
        if (student.grade === oldName) {
          this.students.set(studentId, { ...student, grade: updates.name! });
        }
      });
    }

    return updatedGrade;
  }

  async deleteGrade(id: string): Promise<void> {
    const grade = this.grades.get(id);
    if (!grade) {
      throw new Error('Grade not found');
    }

    // Delete students in this grade
    Array.from(this.students.entries()).forEach(([studentId, student]) => {
      if (student.grade === grade.name) {
        this.students.delete(studentId);
      }
    });

    this.grades.delete(id);
  }

  // Students
  async getStudentsBySchool(schoolId: string, grade?: string): Promise<Student[]> {
    return Array.from(this.students.values())
      .filter(student => 
        student.schoolId === schoolId && 
        (!grade || student.grade === grade)
      );
  }

  async getStudent(id: string): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const id = randomUUID();
    const student: Student = { 
      ...insertStudent, 
      id,
      studentId: insertStudent.studentId ?? null,
      createdAt: new Date(),
    };
    this.students.set(id, student);
    return student;
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
    const student = this.students.get(id);
    if (!student) throw new Error("Student not found");
    
    const updatedStudent = { ...student, ...updates };
    this.students.set(id, updatedStudent);
    return updatedStudent;
  }

  async deleteStudent(id: string): Promise<void> {
    this.students.delete(id);
  }

  // Passes
  async getActivePassesBySchool(schoolId: string): Promise<(Pass & { student: Student; teacher: User })[]> {
    return Array.from(this.passes.values())
      .filter(pass => pass.schoolId === schoolId && pass.status === "out")
      .map(pass => {
        const student = this.students.get(pass.studentId);
        const teacher = this.users.get(pass.teacherId);
        if (!student) throw new Error("Student not found for pass");
        if (!teacher) throw new Error("Teacher not found for pass");
        return { ...pass, student, teacher };
      });
  }

  async getActivePassesByTeacher(teacherId: string): Promise<(Pass & { studentName: string })[]> {
    return Array.from(this.passes.values())
      .filter(pass => pass.teacherId === teacherId && pass.status === "out")
      .map(pass => {
        const student = this.students.get(pass.studentId);
        if (!student) throw new Error("Student not found for pass");
        return { ...pass, studentName: student.name };
      });
  }

  async getPassesBySchool(
    schoolId: string, 
    filters?: { 
      dateStart?: Date; 
      dateEnd?: Date; 
      grade?: string; 
      teacherId?: string; 
    }
  ): Promise<(Pass & { student: Student; teacher: User })[]> {
    return Array.from(this.passes.values())
      .filter(pass => {
        if (pass.schoolId !== schoolId) return false;
        if (filters?.dateStart && pass.checkoutTime && pass.checkoutTime < filters.dateStart) return false;
        if (filters?.dateEnd && pass.checkoutTime && pass.checkoutTime > filters.dateEnd) return false;
        if (filters?.teacherId && pass.teacherId !== filters.teacherId) return false;
        if (filters?.grade) {
          const student = this.students.get(pass.studentId);
          if (!student || student.grade !== filters.grade) return false;
        }
        return true;
      })
      .map(pass => {
        const student = this.students.get(pass.studentId);
        const teacher = this.users.get(pass.teacherId);
        if (!student || !teacher) throw new Error("Student or teacher not found for pass");
        return { ...pass, student, teacher };
      });
  }

  async createPass(insertPass: InsertPass): Promise<Pass> {
    const id = randomUUID();
    const now = new Date();
    const pass: Pass = { 
      ...insertPass,
      id,
      checkoutTime: now,
      issuedAt: now, // Add issuedAt timestamp
      returnTime: null,
      status: "out",
      passType: insertPass.passType || "general",
      customReason: insertPass.customReason || null,
      duration: insertPass.duration || 0,
    };
    this.passes.set(id, pass);
    return pass;
  }

  async updatePass(id: string, updates: Partial<Pass>): Promise<Pass> {
    const pass = this.passes.get(id);
    if (!pass) throw new Error("Pass not found");
    
    const updatedPass = { ...pass, ...updates };
    
    // Calculate duration if returning
    if (updates.status === "returned" && !updatedPass.returnTime && updatedPass.checkoutTime) {
      updatedPass.returnTime = new Date();
      updatedPass.duration = Math.floor(
        (updatedPass.returnTime.getTime() - updatedPass.checkoutTime.getTime()) / (1000 * 60)
      );
    }
    
    this.passes.set(id, updatedPass);
    return updatedPass;
  }

  async returnAllActivePasses(schoolId: string): Promise<number> {
    const activePasses = Array.from(this.passes.values())
      .filter(pass => pass.schoolId === schoolId && pass.status === "out");
    
    let count = 0;
    for (const pass of activePasses) {
      const returnTime = new Date();
      const duration = pass.checkoutTime 
        ? Math.floor((returnTime.getTime() - pass.checkoutTime.getTime()) / (1000 * 60))
        : null;
      
      const updatedPass = {
        ...pass,
        status: "returned" as const,
        returnTime,
        duration
      };
      
      this.passes.set(pass.id, updatedPass);
      count++;
    }
    
    return count;
  }

  // Password reset methods
  async getUserByResetToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.resetToken === token);
  }

  async setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, resetToken: token, resetTokenExpiry: expiry };
    this.users.set(userId, updatedUser);
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, resetToken: null, resetTokenExpiry: null };
    this.users.set(userId, updatedUser);
  }

  // Payment methods
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const payment: Payment = {
      ...insertPayment,
      id,
      createdAt: new Date()
    };
    this.payments.set(id, payment);
    return payment;
  }

  async getPaymentsBySchool(schoolId: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.schoolId === schoolId);
  }

  async getAllPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values());
  }

  // Organizer - Categories
  async getOrganizerCategories(schoolId: string): Promise<OrganizerCategory[]> {
    return Array.from(this.organizerCategories.values())
      .filter(category => category.schoolId === schoolId);
  }

  async createOrganizerCategory(category: InsertOrganizerCategory): Promise<OrganizerCategory> {
    const id = randomUUID();
    const newCategory: OrganizerCategory = {
      ...category,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.organizerCategories.set(id, newCategory);
    return newCategory;
  }

  async deleteOrganizerCategory(id: string, schoolId: string): Promise<void> {
    const category = this.organizerCategories.get(id);
    if (category && category.schoolId === schoolId) {
      this.organizerCategories.delete(id);
    }
  }

  // Organizer - Entries
  async getOrganizerEntries(schoolId: string, categoryId?: string): Promise<OrganizerEntry[]> {
    let entries = Array.from(this.organizerEntries.values())
      .filter(entry => entry.schoolId === schoolId);
    
    if (categoryId) {
      entries = entries.filter(entry => entry.categoryId === categoryId);
    }
    
    return entries;
  }

  async createOrganizerEntry(entry: InsertOrganizerEntry): Promise<OrganizerEntry> {
    const id = randomUUID();
    const newEntry: OrganizerEntry = {
      ...entry,
      id,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.organizerEntries.set(id, newEntry);
    return newEntry;
  }

  async updateOrganizerEntry(id: string, updates: Partial<OrganizerEntry>, schoolId: string): Promise<OrganizerEntry> {
    const entry = this.organizerEntries.get(id);
    if (!entry || entry.schoolId !== schoolId) {
      throw new Error("Entry not found");
    }
    
    const updatedEntry = {
      ...entry,
      ...updates,
      updatedAt: new Date()
    };
    this.organizerEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteOrganizerEntry(id: string, schoolId: string): Promise<void> {
    const entry = this.organizerEntries.get(id);
    if (entry && entry.schoolId === schoolId) {
      this.organizerEntries.delete(id);
    }
  }

  // Organizer - Events
  async getOrganizerEvents(schoolId: string): Promise<OrganizerEvent[]> {
    return Array.from(this.organizerEvents.values())
      .filter(event => event.schoolId === schoolId);
  }

  async createOrganizerEvent(event: InsertOrganizerEvent): Promise<OrganizerEvent> {
    const id = randomUUID();
    const newEvent: OrganizerEvent = {
      ...event,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.organizerEvents.set(id, newEvent);
    return newEvent;
  }

  async deleteOrganizerEvent(id: string, schoolId: string): Promise<void> {
    const event = this.organizerEvents.get(id);
    if (event && event.schoolId === schoolId) {
      this.organizerEvents.delete(id);
    }
  }
}

export class DatabaseStorage implements IStorage {
  // Add missing methods from interface
  async getActiveSchools(): Promise<School[]> {
    const activeSchools = await db.select().from(schools);
    return activeSchools.filter(school => {
      const now = new Date();
      // Include active paid plans and valid trials
      return school.plan !== 'TRIAL' || 
             (school.trialEndDate && school.trialEndDate > now && !school.isTrialExpired);
    });
  }

  async deleteSchool(id: string): Promise<void> {
    await db.delete(schools).where(eq(schools.id, id));
  }

  async cleanupExpiredTrials(): Promise<number> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const expiredTrials = await db.select()
      .from(schools)
      .where(
        and(
          eq(schools.plan, 'TRIAL'),
          // Trial ended more than 7 days ago
          lt(schools.trialEndDate, sevenDaysAgo)
        )
      );

    for (const school of expiredTrials) {
      await this.deleteSchool(school.id);
    }

    return expiredTrials.length;
  }

  async getSchoolsByEmailDomain(emailDomain: string): Promise<School[]> {
    return await db.select()
      .from(schools)
      .where(eq(schools.emailDomain, emailDomain.toLowerCase()));
  }

  async getTrialAccountByDomain(emailDomain: string): Promise<School | undefined> {
    const [school] = await db.select()
      .from(schools)
      .where(
        and(
          eq(schools.plan, 'TRIAL'),
          eq(schools.emailDomain, emailDomain.toLowerCase())
        )
      );
    return school || undefined;
  }

  async getTrialAccountBySchoolName(schoolName: string): Promise<School | undefined> {
    const [school] = await db.select()
      .from(schools)
      .where(
        and(
          eq(schools.plan, 'TRIAL'),
          eq(schools.name, schoolName)
        )
      );
    return school || undefined;
  }

  async getSchoolByVerificationToken(token: string): Promise<School | undefined> {
    const [school] = await db.select()
      .from(schools)
      .where(eq(schools.verificationToken, token));
    return school || undefined;
  }

  async verifySchoolEmail(schoolId: string): Promise<School> {
    const [school] = await db.update(schools)
      .set({
        verified: true,
        verificationToken: null,
        verificationTokenExpiry: null
      })
      .where(eq(schools.id, schoolId))
      .returning();
    
    if (!school) throw new Error("School not found");
    return school;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUsersByEmail(email: string): Promise<User[]> {
    const userList = await db.select().from(users).where(eq(users.email, email));
    return userList;
  }

  async getUserByEmailAndSchool(email: string, schoolId: string): Promise<User | undefined> {
    console.log('getUserByEmailAndSchool called with:', { email, schoolId });
    const [user] = await db.select().from(users).where(
      and(eq(users.email, email), eq(users.schoolId, schoolId))
    );
    console.log('Found user:', user ? 'YES' : 'NO');
    return user || undefined;
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || user.status !== 'active') {
      return null;
    }
    
    // In demo mode, we store passwords in plain text
    // In production, you would use bcrypt.compare(password, user.password)  
    if (user.password === password) {
      return user;
    }
    
    return null;
  }

  async getUsersBySchool(schoolId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.schoolId, schoolId));
  }

  async checkAndPromoteFirstAdmin(schoolId: string, userId: string): Promise<boolean> {
    // Check if this school has any existing admins
    const existingAdmins = await db.select()
      .from(users)
      .where(and(eq(users.schoolId, schoolId), eq(users.isAdmin, true)));
    
    // If no admins exist, promote this user to admin
    if (existingAdmins.length === 0) {
      await db.update(users)
        .set({ 
          role: 'ADMIN',
          isAdmin: true 
        })
        .where(eq(users.id, userId));
      console.log(`Promoted first user ${userId} to admin for school ${schoolId}`);
      return true;
    }
    
    return false;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userWithDefaults = {
      ...insertUser,
      resetToken: null,
      resetTokenExpiry: null,
      // Ensure required fields have proper values, preserving explicit admin assignments
      role: insertUser.role || 'TEACHER',
      status: insertUser.status || 'active',
      isAdmin: insertUser.isAdmin !== undefined ? insertUser.isAdmin : false,
      isFirstLogin: insertUser.isFirstLogin !== undefined ? insertUser.isFirstLogin : false,
      enableNotifications: insertUser.enableNotifications !== undefined ? insertUser.enableNotifications : true,
    };
    const [user] = await db.insert(users).values(userWithDefaults).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Schools
  async getSchool(id: string): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school || undefined;
  }

  async getSchoolById(id: string): Promise<School | undefined> {
    return this.getSchool(id); // Alias for getSchool
  }

  async getSchoolBySlug(slug: string): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.slug, slug));
    return school || undefined;
  }

  async getSchoolsByIds(ids: string[]): Promise<School[]> {
    if (ids.length === 0) return [];
    const schoolList = await db.select().from(schools).where(
      ids.length === 1 ? eq(schools.id, ids[0]) : eq(schools.id, ids[0]) // Simple implementation for now
    );
    return schoolList.filter(school => ids.includes(school.id));
  }

  async createSchool(insertSchool: InsertSchool): Promise<School> {
    const [school] = await db
      .insert(schools)
      .values(insertSchool)
      .returning();
    return school;
  }

  async updateSchool(id: string, updates: Partial<School>): Promise<School> {
    const [school] = await db
      .update(schools)
      .set(updates)
      .where(eq(schools.id, id))
      .returning();
    
    if (!school) {
      throw new Error('School not found');
    }
    
    return school;
  }

  async upgradeSchoolPlan(schoolId: string, newPlan: string, newMaxTeachers: number, newMaxStudents: number): Promise<School> {
    console.log(`Upgrading school ${schoolId} to ${newPlan} plan`);
    console.log(`New limits - Teachers: ${newMaxTeachers}, Students: ${newMaxStudents}`);
    
    const updates: Partial<School> = {
      plan: newPlan,
      maxTeachers: newMaxTeachers,
      maxStudents: newMaxStudents,
      // Remove trial-specific fields for paid plans
      trialStartDate: newPlan === 'free_trial' ? undefined : null,
      trialEndDate: newPlan === 'free_trial' ? undefined : null,
      isTrialExpired: newPlan === 'free_trial' ? undefined : false
    };
    
    const [school] = await db.update(schools).set(updates).where(eq(schools.id, schoolId)).returning();
    if (!school) throw new Error("School not found");
    
    console.log(`School upgrade completed: ${school.name} is now on ${newPlan} plan`);
    return school;
  }

  async getAllSchools(): Promise<School[]> {
    return await db.select().from(schools);
  }



  // Grades
  async getGradesBySchool(schoolId: string): Promise<Grade[]> {
    return await db.select().from(grades).where(eq(grades.schoolId, schoolId));
  }

  async createGrade(insertGrade: InsertGrade): Promise<Grade> {
    const [grade] = await db.insert(grades).values(insertGrade).returning();
    return grade;
  }

  async updateGrade(id: string, updates: Partial<Grade>): Promise<Grade> {
    const [grade] = await db.update(grades).set(updates).where(eq(grades.id, id)).returning();
    if (!grade) throw new Error("Grade not found");
    return grade;
  }

  async deleteGrade(id: string): Promise<void> {
    await db.delete(grades).where(eq(grades.id, id));
  }

  // Students
  async getStudentsBySchool(schoolId: string, grade?: string): Promise<Student[]> {
    if (grade) {
      return await db.select().from(students).where(and(eq(students.schoolId, schoolId), eq(students.grade, grade)));
    }
    return await db.select().from(students).where(eq(students.schoolId, schoolId));
  }

  async getStudent(id: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || undefined;
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const [student] = await db.insert(students).values(insertStudent).returning();
    return student;
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
    const [student] = await db.update(students).set(updates).where(eq(students.id, id)).returning();
    if (!student) throw new Error("Student not found");
    return student;
  }

  async deleteStudent(id: string): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
  }

  // Passes
  async getActivePassesBySchool(schoolId: string): Promise<(Pass & { student: Student & { grade?: string }; teacher: User })[]> {
    const result = await db.select({
      pass: passes,
      student: students,
      teacher: users,
      grade: grades,
    }).from(passes)
      .innerJoin(students, eq(passes.studentId, students.id))
      .innerJoin(users, eq(passes.teacherId, users.id))
      .leftJoin(grades, eq(students.gradeId, grades.id))
      .where(and(eq(passes.schoolId, schoolId), eq(passes.status, "active")));

    return result.map(row => ({
      ...row.pass,
      student: {
        ...row.student,
        grade: row.grade?.name || undefined,
      },
      teacher: row.teacher,
    }));
  }

  async getActivePassesByTeacher(teacherId: string): Promise<(Pass & { studentName: string })[]> {
    const result = await db.select({
      pass: passes,
      student: students,
    }).from(passes)
      .innerJoin(students, eq(passes.studentId, students.id))
      .where(and(eq(passes.teacherId, teacherId), eq(passes.status, "active")));

    return result.map(row => ({
      ...row.pass,
      studentName: `${row.student.firstName} ${row.student.lastName}`,
    }));
  }

  async getPassesBySchool(schoolId: string, filters?: { 
    dateStart?: Date; 
    dateEnd?: Date; 
    grade?: string; 
    teacherId?: string; 
  }): Promise<(Pass & { student: Student & { grade?: string }; teacher: User })[]> {
    let query = db.select({
      pass: passes,
      student: students,
      teacher: users,
      grade: grades,
    }).from(passes)
      .innerJoin(students, eq(passes.studentId, students.id))
      .innerJoin(users, eq(passes.teacherId, users.id))
      .leftJoin(grades, eq(students.gradeId, grades.id))
      .where(eq(passes.schoolId, schoolId));

    const result = await query;

    // Apply filters in memory (could be optimized with SQL)
    let filteredResult = result;

    if (filters?.dateStart) {
      filteredResult = filteredResult.filter(row => 
        row.pass.issuedAt && row.pass.issuedAt >= filters.dateStart!
      );
    }

    if (filters?.dateEnd) {
      filteredResult = filteredResult.filter(row => 
        row.pass.issuedAt && row.pass.issuedAt <= filters.dateEnd!
      );
    }

    if (filters?.grade) {
      filteredResult = filteredResult.filter(row => row.grade?.name === filters.grade);
    }

    if (filters?.teacherId) {
      filteredResult = filteredResult.filter(row => row.pass.teacherId === filters.teacherId);
    }

    return filteredResult.map(row => ({
      ...row.pass,
      student: {
        ...row.student,
        grade: row.grade?.name || undefined,
      },
      teacher: row.teacher,
    }));
  }

  async createPass(insertPass: InsertPass): Promise<Pass> {
    const [pass] = await db.insert(passes).values(insertPass).returning();
    return pass;
  }

  async updatePass(id: string, updates: Partial<Pass>): Promise<Pass> {
    // If returning a pass, calculate duration automatically
    if (updates.status === "returned") {
      const [currentPass] = await db.select().from(passes).where(eq(passes.id, id));
      if (!currentPass) throw new Error("Pass not found");
      
      if (!currentPass.returnTime && currentPass.checkoutTime) {
        updates.returnTime = new Date();
        updates.duration = Math.floor(
          (updates.returnTime.getTime() - currentPass.checkoutTime.getTime()) / (1000 * 60)
        );
      }
    }
    
    const [pass] = await db.update(passes).set(updates).where(eq(passes.id, id)).returning();
    if (!pass) throw new Error("Pass not found");
    return pass;
  }

  async returnAllActivePasses(schoolId: string): Promise<number> {
    const returnTime = new Date();
    
    // First get all active passes to calculate durations
    const activePasses = await db.select()
      .from(passes)
      .where(and(eq(passes.schoolId, schoolId), eq(passes.status, "active")));
    
    if (activePasses.length === 0) {
      return 0;
    }
    
    // Update all active passes to returned with calculated duration
    const updatePromises = activePasses.map(async (pass) => {
      const duration = pass.checkoutTime 
        ? Math.floor((returnTime.getTime() - pass.checkoutTime.getTime()) / (1000 * 60))
        : null;
      
      return db.update(passes)
        .set({
          status: "returned",
          returnTime,
          duration
        })
        .where(eq(passes.id, pass.id));
    });
    
    await Promise.all(updatePromises);
    return activePasses.length;
  }

  // Password reset methods
  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user || undefined;
  }

  async setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db.update(users).set({
      resetToken: token,
      resetTokenExpiry: expiry
    }).where(eq(users.id, userId));
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db.update(users).set({
      resetToken: null,
      resetTokenExpiry: null
    }).where(eq(users.id, userId));
  }

  // Payment methods
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }

  async getPaymentsBySchool(schoolId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.schoolId, schoolId));
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments);
  }

  // Organizer - Categories
  async getOrganizerCategories(schoolId: string): Promise<OrganizerCategory[]> {
    return await db.select().from(organizerCategories).where(eq(organizerCategories.schoolId, schoolId));
  }

  async createOrganizerCategory(category: InsertOrganizerCategory): Promise<OrganizerCategory> {
    const [newCategory] = await db.insert(organizerCategories).values(category).returning();
    return newCategory;
  }

  async deleteOrganizerCategory(id: string, schoolId: string): Promise<void> {
    await db.delete(organizerCategories).where(
      and(eq(organizerCategories.id, id), eq(organizerCategories.schoolId, schoolId))
    );
  }

  // Organizer - Entries
  async getOrganizerEntries(schoolId: string, categoryId?: string): Promise<OrganizerEntry[]> {
    if (categoryId) {
      return await db.select().from(organizerEntries).where(
        and(eq(organizerEntries.schoolId, schoolId), eq(organizerEntries.categoryId, categoryId))
      );
    } else {
      return await db.select().from(organizerEntries).where(eq(organizerEntries.schoolId, schoolId));
    }
  }

  async createOrganizerEntry(entry: InsertOrganizerEntry): Promise<OrganizerEntry> {
    const [newEntry] = await db.insert(organizerEntries).values(entry).returning();
    return newEntry;
  }

  async updateOrganizerEntry(id: string, updates: Partial<OrganizerEntry>, schoolId: string): Promise<OrganizerEntry> {
    const [updatedEntry] = await db.update(organizerEntries)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(organizerEntries.id, id), eq(organizerEntries.schoolId, schoolId)))
      .returning();
    return updatedEntry;
  }

  async deleteOrganizerEntry(id: string, schoolId: string): Promise<void> {
    await db.delete(organizerEntries).where(
      and(eq(organizerEntries.id, id), eq(organizerEntries.schoolId, schoolId))
    );
  }

  // Organizer - Events
  async getOrganizerEvents(schoolId: string): Promise<OrganizerEvent[]> {
    return await db.select().from(organizerEvents).where(eq(organizerEvents.schoolId, schoolId));
  }

  async createOrganizerEvent(event: InsertOrganizerEvent): Promise<OrganizerEvent> {
    const [newEvent] = await db.insert(organizerEvents).values(event).returning();
    return newEvent;
  }

  async deleteOrganizerEvent(id: string, schoolId: string): Promise<void> {
    await db.delete(organizerEvents).where(
      and(eq(organizerEvents.id, id), eq(organizerEvents.schoolId, schoolId))
    );
  }
}

// Switch back to DatabaseStorage temporarily for stability
export const storage = new DatabaseStorage();
