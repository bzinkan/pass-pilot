import { type User, type InsertUser, type School, type InsertSchool, type Grade, type InsertGrade, type Student, type InsertStudent, type Pass, type InsertPass, type Payment, type InsertPayment } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users, schools, grades, students, passes, payments } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import { unwrap } from "./safe";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByEmailAndSchool(email: string, schoolId: string): Promise<User | undefined>;
  getUsersBySchool(schoolId: string): Promise<User[]>;
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
}

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private schools = new Map<string, School>();
  private grades = new Map<string, Grade>();
  private students = new Map<string, Student>();
  private passes = new Map<string, Pass>();
  private payments = new Map<string, Payment>();

  constructor() {
    // Initialize with demo data
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Create demo school
    const school: School = {
      id: randomUUID(),
      schoolId: "school_demo123",
      name: "Lincoln Elementary School",
      district: null,
      emailDomain: "lincolnelementary.edu", // Add email domain for demo
      plan: "standard_50",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      maxTeachers: 50,
      maxStudents: 1000, // Add missing maxStudents property
      adminEmail: "admin@lincolnelementary.edu",
      verified: false,
      verificationToken: null,
      verificationTokenExpiry: null,
      trialStartDate: null,
      trialEndDate: null,
      isTrialExpired: false,
      subscriptionCancelledAt: null,
      subscriptionEndsAt: null,
      createdAt: new Date(),
    };
    this.schools.set(school.id, school);

    // Create demo admin user
    const admin: User = {
      id: randomUUID(),
      firebaseUid: null,
      email: "admin@lincolnelementary.edu",
      password: "password123", // In real app, this would be hashed
      name: "Principal Smith",
      schoolId: school.id,
      isAdmin: true,
      isPlatformOwner: false,
      assignedGrades: [] as string[],
      invitedBy: null,
      status: "active",
      createdAt: new Date(),
      resetToken: null,
      resetTokenExpiry: null,
      enableNotifications: true,
      autoReturn: false,
      passTimeout: 15,
      kioskPin: null,
    };
    this.users.set(admin.id, admin);

    // Create demo teacher
    const teacher: User = {
      id: randomUUID(),
      firebaseUid: null,
      email: "johnson@lincolnelementary.edu",
      password: "password123",
      name: "Ms. Johnson",
      schoolId: school.id,
      isAdmin: false,
      isPlatformOwner: false,
      assignedGrades: ["3", "4"],
      invitedBy: null,
      status: "active",
      createdAt: new Date(),
      resetToken: null,
      resetTokenExpiry: null,
      enableNotifications: true,
      autoReturn: false,
      passTimeout: 15,
      kioskPin: null,
    };
    this.users.set(teacher.id, teacher);

    // Create demo grades
    const grade3: Grade = {
      id: randomUUID(),
      name: "3",
      schoolId: school.id,
      createdAt: new Date(),
    };
    this.grades.set(grade3.id, grade3);

    const grade4: Grade = {
      id: randomUUID(),
      name: "4",
      schoolId: school.id,
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
        name: studentData.name,
        grade: studentData.grade,
        studentId: studentData.studentId,
        schoolId: school.id,
        createdAt: new Date(),
      };
      this.students.set(student.id, student);
    });

    // Create platform owner account
    const platformOwner: User = {
      id: randomUUID(),
      firebaseUid: null,
      email: "passpilotapp@gmail.com",
      password: "platformowner123", // In real app, this would be hashed
      name: "PassPilot Platform Owner",
      schoolId: null, // Platform owner doesn't belong to a specific school
      isAdmin: false, // Not a school admin
      isPlatformOwner: true, // Platform owner flag
      assignedGrades: [] as string[],
      invitedBy: null,
      status: "active",
      createdAt: new Date(),
      resetToken: null,
      resetTokenExpiry: null,
      enableNotifications: true,
      autoReturn: false,
      passTimeout: 30,
      kioskPin: null,
    };
    this.users.set(platformOwner.id, platformOwner);

    // Create additional demo schools for the platform owner to manage
    const demoSchools = [
      {
        schoolId: "school_riverside",
        name: "Riverside Middle School",
        district: "Central District",
        plan: "basic_10",
        adminEmail: "admin@riverside.edu",
        maxTeachers: 10,
        isCancelled: false
      },
      {
        schoolId: "school_oakwood",
        name: "Oakwood High School", 
        district: "North District",
        plan: "premium_50",
        adminEmail: "principal@oakwood.edu",
        maxTeachers: 50,
        isCancelled: true, // Cancelled subscription
        cancelledDays: 15  // Cancelled 15 days ago, still has time left
      },
      {
        schoolId: "school_valley",
        name: "Valley Elementary",
        district: null,
        plan: "free_trial",
        adminEmail: "admin@valley.k12.edu",
        maxTeachers: -1,
        isCancelled: false
      },
      {
        schoolId: "school_sunset",
        name: "Sunset High School",
        district: "West District", 
        plan: "standard_25",
        adminEmail: "admin@sunsethigh.edu",
        maxTeachers: 25,
        isCancelled: true, // Cancelled subscription
        cancelledDays: 5   // Recently cancelled, lots of time left
      },
      // Demo schools for Cincinnati Public Schools (shared domain example)
      {
        schoolId: "school_roosevelt_cps",
        name: "Roosevelt Elementary School",
        district: "Cincinnati Public Schools",
        plan: "premium_100",
        adminEmail: "principal.roosevelt@cps.k12.oh.us",
        maxTeachers: 100,
        isCancelled: false
      },
      {
        schoolId: "school_washington_cps",
        name: "Washington High School",
        district: "Cincinnati Public Schools",
        plan: "premium_100",
        adminEmail: "principal.washington@cps.k12.oh.us",
        maxTeachers: 100,
        isCancelled: false
      },
      {
        schoolId: "school_jefferson_cps",
        name: "Jefferson Middle School",
        district: "Cincinnati Public Schools",
        plan: "standard_50",
        adminEmail: "principal.jefferson@cps.k12.oh.us",
        maxTeachers: 50,
        isCancelled: false
      }
    ];

    demoSchools.forEach(schoolData => {
      const now = new Date();
      const isCancelled = schoolData.isCancelled || false;
      const cancelledDaysAgo = schoolData.cancelledDays || 0;
      
      const demoSchool: School = {
        id: randomUUID(),
        schoolId: schoolData.schoolId,
        name: schoolData.name,
        district: schoolData.district,
        emailDomain: schoolData.adminEmail.split('@')[1], // Extract domain from admin email
        plan: schoolData.plan as any,
        status: "ACTIVE" as any,
        stripeCustomerId: schoolData.plan !== "TRIAL" ? `cus_${randomUUID().slice(0, 8)}` : null,
        stripeSubscriptionId: schoolData.plan !== "TRIAL" ? `sub_${randomUUID().slice(0, 8)}` : null,
        maxTeachers: schoolData.maxTeachers,
        maxStudents: schoolData.maxStudents || 1000,
        adminEmail: schoolData.adminEmail,
        verified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
        trialStartDate: schoolData.plan === "TRIAL" ? new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) : null,
        trialEndDate: schoolData.plan === "TRIAL" ? new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000) : null,
        isTrialExpired: false,
        // Set cancellation dates if this is a cancelled subscription
        subscriptionCancelledAt: isCancelled ? new Date(now.getTime() - cancelledDaysAgo * 24 * 60 * 60 * 1000) : null,
        subscriptionEndsAt: isCancelled ? new Date(now.getTime() + (30 - cancelledDaysAgo) * 24 * 60 * 60 * 1000) : null, // 30 days from cancellation
        createdAt: new Date(),
      };
      this.schools.set(demoSchool.id, demoSchool);
    });
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
      firebaseUid: insertUser.firebaseUid ?? null,
      password: insertUser.password ?? null,
      schoolId: insertUser.schoolId ?? null,
      isAdmin: insertUser.isAdmin ?? false,
      isPlatformOwner: insertUser.isPlatformOwner ?? false,
      assignedGrades: (insertUser.assignedGrades as string[]) ?? [],
      invitedBy: insertUser.invitedBy ?? null,
      status: insertUser.status ?? "pending",
      createdAt: new Date(),
      resetToken: null,
      resetTokenExpiry: null,
      enableNotifications: true,
      autoReturn: false,
      passTimeout: 15,
      kioskPin: null,
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
      // Ensure required fields are not undefined
      password: updates.password !== undefined ? updates.password : user.password,
      firebaseUid: updates.firebaseUid !== undefined ? updates.firebaseUid : user.firebaseUid,
      invitedBy: updates.invitedBy !== undefined ? updates.invitedBy : user.invitedBy,
      status: updates.status !== undefined ? updates.status : user.status,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUsersBySchool(schoolId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.schoolId === schoolId);
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
    const pass: Pass = { 
      ...insertPass,
      id,
      checkoutTime: new Date(),
      returnTime: null,
      status: "out",
      passType: insertPass.passType || "general",
      customReason: insertPass.customReason || null,
      duration: null,
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const userWithDefaults = {
      ...insertUser,
      resetToken: null,
      resetTokenExpiry: null,
      enableNotifications: true,
      autoReturn: false,
      passTimeout: 15
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
  async getActivePassesBySchool(schoolId: string): Promise<(Pass & { student: Student; teacher: User })[]> {
    const result = await db.select({
      pass: passes,
      student: students,
      teacher: users,
    }).from(passes)
      .innerJoin(students, eq(passes.studentId, students.id))
      .innerJoin(users, eq(passes.teacherId, users.id))
      .where(and(eq(passes.schoolId, schoolId), eq(passes.status, "out")));

    return result.map(row => ({
      ...row.pass,
      student: row.student,
      teacher: row.teacher,
    }));
  }

  async getActivePassesByTeacher(teacherId: string): Promise<(Pass & { studentName: string })[]> {
    const result = await db.select({
      pass: passes,
      studentName: students.name,
    }).from(passes)
      .innerJoin(students, eq(passes.studentId, students.id))
      .where(and(eq(passes.teacherId, teacherId), eq(passes.status, "out")));

    return result.map(row => ({
      ...row.pass,
      studentName: row.studentName,
    }));
  }

  async getPassesBySchool(schoolId: string, filters?: { 
    dateStart?: Date; 
    dateEnd?: Date; 
    grade?: string; 
    teacherId?: string; 
  }): Promise<(Pass & { student: Student; teacher: User })[]> {
    let query = db.select({
      pass: passes,
      student: students,
      teacher: users,
    }).from(passes)
      .innerJoin(students, eq(passes.studentId, students.id))
      .innerJoin(users, eq(passes.teacherId, users.id))
      .where(eq(passes.schoolId, schoolId));

    const result = await query;

    // Apply filters in memory (could be optimized with SQL)
    let filteredResult = result;

    if (filters?.dateStart) {
      filteredResult = filteredResult.filter(row => 
        row.pass.checkoutTime && row.pass.checkoutTime >= filters.dateStart!
      );
    }

    if (filters?.dateEnd) {
      filteredResult = filteredResult.filter(row => 
        row.pass.checkoutTime && row.pass.checkoutTime <= filters.dateEnd!
      );
    }

    if (filters?.grade) {
      filteredResult = filteredResult.filter(row => row.student.grade === filters.grade);
    }

    if (filters?.teacherId) {
      filteredResult = filteredResult.filter(row => row.pass.teacherId === filters.teacherId);
    }

    return filteredResult.map(row => ({
      ...row.pass,
      student: row.student,
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
      .where(and(eq(passes.schoolId, schoolId), eq(passes.status, "out")));
    
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
}

// Switch back to DatabaseStorage temporarily for stability
export const storage = new DatabaseStorage();
