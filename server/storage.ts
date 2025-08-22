import { type User, type InsertUser, type School, type InsertSchool, type Grade, type InsertGrade, type Student, type InsertStudent, type Pass, type InsertPass, type Payment, type InsertPayment } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users, schools, grades, students, passes, payments } from "@shared/schema";
import { eq, and, lt, gte, lte } from "drizzle-orm";
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
  getSchoolsByEmailDomain(domain: string): Promise<School[]>;
  setSchoolVerificationToken(schoolId: string, token: string, expiry: Date): Promise<void>;
  verifySchoolEmail(token: string): Promise<School | undefined>;
  checkAndPromoteFirstAdmin(schoolId: string, userId: string): Promise<void>;
  
  // Grades
  getGradesBySchool(schoolId: string): Promise<Grade[]>;
  getGrade(id: string): Promise<Grade | undefined>;
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
  // Remove this class for brevity as it's not used in production
  async getUser(id: string): Promise<User | undefined> { throw new Error("MemStorage not implemented"); }
  async getUserByEmail(email: string): Promise<User | undefined> { throw new Error("MemStorage not implemented"); }
  async getUsersByEmail(email: string): Promise<User[]> { throw new Error("MemStorage not implemented"); }
  async getUserByEmailAndSchool(email: string, schoolId: string): Promise<User | undefined> { throw new Error("MemStorage not implemented"); }
  async getUsersBySchool(schoolId: string): Promise<User[]> { throw new Error("MemStorage not implemented"); }
  async getTeachersBySchool(schoolId: string): Promise<User[]> { throw new Error("MemStorage not implemented"); }
  async authenticateUser(email: string, password: string): Promise<User | null> { throw new Error("MemStorage not implemented"); }
  async createUser(user: InsertUser): Promise<User> { throw new Error("MemStorage not implemented"); }
  async updateUser(id: string, updates: Partial<User>): Promise<User> { throw new Error("MemStorage not implemented"); }
  async deleteUser(id: string): Promise<void> { throw new Error("MemStorage not implemented"); }
  async getUserByResetToken(token: string): Promise<User | undefined> { throw new Error("MemStorage not implemented"); }
  async setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void> { throw new Error("MemStorage not implemented"); }
  async clearPasswordResetToken(userId: string): Promise<void> { throw new Error("MemStorage not implemented"); }
  async getSchool(id: string): Promise<School | undefined> { throw new Error("MemStorage not implemented"); }
  async getSchoolById(id: string): Promise<School | undefined> { throw new Error("MemStorage not implemented"); }
  async getSchoolBySlug(slug: string): Promise<School | undefined> { throw new Error("MemStorage not implemented"); }
  async getSchoolsByIds(ids: string[]): Promise<School[]> { throw new Error("MemStorage not implemented"); }
  async getAllSchools(): Promise<School[]> { throw new Error("MemStorage not implemented"); }
  async getActiveSchools(): Promise<School[]> { throw new Error("MemStorage not implemented"); }
  async createSchool(school: InsertSchool): Promise<School> { throw new Error("MemStorage not implemented"); }
  async updateSchool(id: string, updates: Partial<School>): Promise<School> { throw new Error("MemStorage not implemented"); }
  async upgradeSchoolPlan(schoolId: string, newPlan: string, newMaxTeachers: number, newMaxStudents: number): Promise<School> { throw new Error("MemStorage not implemented"); }
  async deleteSchool(id: string): Promise<void> { throw new Error("MemStorage not implemented"); }
  async getTrialAccountByDomain(emailDomain: string): Promise<School | undefined> { throw new Error("MemStorage not implemented"); }
  async getGradesBySchool(schoolId: string): Promise<Grade[]> { throw new Error("MemStorage not implemented"); }
  async getGrade(id: string): Promise<Grade | undefined> { throw new Error("MemStorage not implemented"); }
  async createGrade(grade: InsertGrade): Promise<Grade> { throw new Error("MemStorage not implemented"); }
  async updateGrade(id: string, updates: Partial<Grade>): Promise<Grade> { throw new Error("MemStorage not implemented"); }
  async deleteGrade(id: string): Promise<void> { throw new Error("MemStorage not implemented"); }
  async getStudentsBySchool(schoolId: string, grade?: string): Promise<Student[]> { throw new Error("MemStorage not implemented"); }
  async getStudent(id: string): Promise<Student | undefined> { throw new Error("MemStorage not implemented"); }
  async createStudent(student: InsertStudent): Promise<Student> { throw new Error("MemStorage not implemented"); }
  async updateStudent(id: string, updates: Partial<Student>): Promise<Student> { throw new Error("MemStorage not implemented"); }
  async deleteStudent(id: string): Promise<void> { throw new Error("MemStorage not implemented"); }
  async getActivePassesBySchool(schoolId: string): Promise<(Pass & { student: Student })[]> { throw new Error("MemStorage not implemented"); }
  async getActivePassesByTeacher(teacherId: string): Promise<(Pass & { studentName: string })[]> { throw new Error("MemStorage not implemented"); }
  async getPassesBySchool(schoolId: string, filters?: any): Promise<(Pass & { student: Student; teacher: User })[]> { throw new Error("MemStorage not implemented"); }
  async createPass(pass: InsertPass): Promise<Pass> { throw new Error("MemStorage not implemented"); }
  async updatePass(id: string, updates: Partial<Pass>): Promise<Pass> { throw new Error("MemStorage not implemented"); }
  async returnAllActivePasses(schoolId: string): Promise<number> { throw new Error("MemStorage not implemented"); }
  async createPayment(payment: InsertPayment): Promise<Payment> { throw new Error("MemStorage not implemented"); }
  async getPaymentsBySchool(schoolId: string): Promise<Payment[]> { throw new Error("MemStorage not implemented"); }
  async getAllPayments(): Promise<Payment[]> { throw new Error("MemStorage not implemented"); }
  async getSchoolsByEmailDomain(domain: string): Promise<School[]> { throw new Error("MemStorage not implemented"); }
  async setSchoolVerificationToken(schoolId: string, token: string, expiry: Date): Promise<void> { throw new Error("MemStorage not implemented"); }
  async verifySchoolEmail(token: string): Promise<School | undefined> { throw new Error("MemStorage not implemented"); }
  async checkAndPromoteFirstAdmin(schoolId: string, userId: string): Promise<void> { throw new Error("MemStorage not implemented"); }
}

// Real storage implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUsersByEmail(email: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.email, email));
  }

  async getUserByEmailAndSchool(email: string, schoolId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(
      and(eq(users.email, email), eq(users.schoolId, schoolId))
    ).limit(1);
    return result[0];
  }

  async getUsersBySchool(schoolId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.schoolId, schoolId));
  }

  async getTeachersBySchool(schoolId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.schoolId, schoolId));
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const bcrypt = await import("bcryptjs");
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return unwrap(newUser);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return unwrap(updatedUser);
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
    return result[0];
  }

  async setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db.update(users)
      .set({ resetToken: token, resetTokenExpiry: expiry })
      .where(eq(users.id, userId));
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db.update(users)
      .set({ resetToken: null, resetTokenExpiry: null })
      .where(eq(users.id, userId));
  }

  // School methods
  async getSchool(id: string): Promise<School | undefined> {
    const result = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
    return result[0];
  }

  async getSchoolById(id: string): Promise<School | undefined> {
    return this.getSchool(id);
  }

  async getSchoolBySlug(slug: string): Promise<School | undefined> {
    const result = await db.select().from(schools).where(eq(schools.slug, slug)).limit(1);
    return result[0];
  }

  async getSchoolsByIds(ids: string[]): Promise<School[]> {
    if (ids.length === 0) return [];
    // Note: Drizzle doesn't have a direct 'in' operator, so we use multiple OR conditions or a raw query
    const results = await Promise.all(ids.map(id => this.getSchool(id)));
    return results.filter((school): school is School => school !== undefined);
  }

  async getAllSchools(): Promise<School[]> {
    return await db.select().from(schools);
  }

  async getActiveSchools(): Promise<School[]> {
    const now = new Date();
    return await db.select().from(schools).where(
      and(
        eq(schools.status, "active"),
        // Add subscription status checks here if needed
      )
    );
  }

  async createSchool(school: InsertSchool): Promise<School> {
    const [newSchool] = await db.insert(schools).values(school).returning();
    return unwrap(newSchool);
  }

  async updateSchool(id: string, updates: Partial<School>): Promise<School> {
    const [updatedSchool] = await db.update(schools)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schools.id, id))
      .returning();
    return unwrap(updatedSchool);
  }

  async upgradeSchoolPlan(schoolId: string, newPlan: string, newMaxTeachers: number, newMaxStudents: number): Promise<School> {
    return this.updateSchool(schoolId, {
      plan: newPlan,
      maxTeachers: newMaxTeachers,
      maxStudents: newMaxStudents
    });
  }

  async deleteSchool(id: string): Promise<void> {
    await db.delete(schools).where(eq(schools.id, id));
  }

  async getTrialAccountByDomain(emailDomain: string): Promise<School | undefined> {
    const result = await db.select().from(schools).where(eq(schools.emailDomain, emailDomain)).limit(1);
    return result[0];
  }

  async getSchoolsByEmailDomain(domain: string): Promise<School[]> {
    return await db.select().from(schools).where(eq(schools.emailDomain, domain));
  }

  async setSchoolVerificationToken(schoolId: string, token: string, expiry: Date): Promise<void> {
    await db.update(schools)
      .set({ emailVerificationToken: token })
      .where(eq(schools.id, schoolId));
  }

  async verifySchoolEmail(token: string): Promise<School | undefined> {
    const result = await db.select().from(schools).where(eq(schools.emailVerificationToken, token)).limit(1);
    return result[0];
  }

  async checkAndPromoteFirstAdmin(schoolId: string, userId: string): Promise<void> {
    // Get all users in the school
    const schoolUsers = await db.select().from(users).where(eq(users.schoolId, schoolId));
    
    // If this is the first user in the school, promote them to admin
    if (schoolUsers.length === 1) {
      await db.update(users)
        .set({ isAdmin: true, role: 'admin' })
        .where(eq(users.id, userId));
    }
  }

  // Grade methods
  async getGradesBySchool(schoolId: string): Promise<Grade[]> {
    return await db.select().from(grades).where(eq(grades.schoolId, schoolId));
  }

  async getGrade(id: string): Promise<Grade | undefined> {
    const result = await db.select().from(grades).where(eq(grades.id, id)).limit(1);
    return result[0];
  }

  async createGrade(grade: InsertGrade): Promise<Grade> {
    const [newGrade] = await db.insert(grades).values(grade).returning();
    return unwrap(newGrade);
  }

  async updateGrade(id: string, updates: Partial<Grade>): Promise<Grade> {
    const [updatedGrade] = await db.update(grades)
      .set(updates)
      .where(eq(grades.id, id))
      .returning();
    return unwrap(updatedGrade);
  }

  async deleteGrade(id: string): Promise<void> {
    await db.delete(grades).where(eq(grades.id, id));
  }

  // Student methods
  async getStudentsBySchool(schoolId: string, grade?: string): Promise<Student[]> {
    if (grade) {
      return await db.select().from(students).where(
        and(eq(students.schoolId, schoolId), eq(students.gradeId, grade))
      );
    }
    return await db.select().from(students).where(eq(students.schoolId, schoolId));
  }

  async getStudent(id: string): Promise<Student | undefined> {
    const result = await db.select().from(students).where(eq(students.id, id)).limit(1);
    return result[0];
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const studentData = {
      id: randomUUID(),
      ...student,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: student.status || 'active',
      schoolId: student.schoolId || '',
      email: student.email || null,
      gradeId: student.gradeId || null,
      studentId: student.studentId || null
    };
    const [newStudent] = await db.insert(students).values(studentData).returning();
    return unwrap(newStudent);
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
    const [updatedStudent] = await db.update(students)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(students.id, id))
      .returning();
    return unwrap(updatedStudent);
  }

  async deleteStudent(id: string): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
  }

  // Pass methods
  async getActivePassesBySchool(schoolId: string): Promise<(Pass & { student: Student; teacher: User })[]> {
    const result = await db.select({
      pass: passes,
      student: students,
      teacher: users
    })
    .from(passes)
    .leftJoin(students, eq(passes.studentId, students.id))
    .leftJoin(users, eq(passes.teacherId, users.id))
    .where(and(eq(passes.schoolId, schoolId), eq(passes.status, "active")));

    return result.map(row => ({
      ...row.pass,
      student: unwrap(row.student),
      teacher: unwrap(row.teacher)
    }));
  }

  async getActivePassesByTeacher(teacherId: string): Promise<(Pass & { studentName: string })[]> {
    const result = await db.select({
      pass: passes,
      student: students
    })
    .from(passes)
    .leftJoin(students, eq(passes.studentId, students.id))
    .where(and(eq(passes.teacherId, teacherId), eq(passes.status, "active")));

    return result.map(row => ({
      ...row.pass,
      studentName: `${row.student?.firstName} ${row.student?.lastName}` || "Unknown Student"
    }));
  }

  async getPassesBySchool(schoolId: string, filters?: {
    dateStart?: Date;
    dateEnd?: Date;
    grade?: string;
    teacherId?: string;
  }): Promise<(Pass & { student: Student; teacher: User })[]> {
    let whereConditions = eq(passes.schoolId, schoolId);

    // Apply filters
    if (filters?.teacherId) {
      whereConditions = and(whereConditions, eq(passes.teacherId, filters.teacherId)) as any;
    }
    
    // Apply date filters
    if (filters?.dateStart) {
      whereConditions = and(whereConditions, gte(passes.issuedAt, filters.dateStart)) as any;
    }
    
    if (filters?.dateEnd) {
      whereConditions = and(whereConditions, lte(passes.issuedAt, filters.dateEnd)) as any;
    }

    // Join with grades table if grade filter is needed
    let query = db.select({
      pass: passes,
      student: students,
      teacher: users,
      grade: grades
    })
    .from(passes)
    .leftJoin(students, eq(passes.studentId, students.id))
    .leftJoin(users, eq(passes.teacherId, users.id))
    .leftJoin(grades, eq(students.gradeId, grades.id));

    // Apply grade filter
    if (filters?.grade) {
      whereConditions = and(whereConditions, eq(grades.name, filters.grade)) as any;
    }

    const result = await query.where(whereConditions);

    return result.map(row => ({
      ...row.pass,
      student: unwrap(row.student),
      teacher: unwrap(row.teacher)
    }));
  }

  async createPass(pass: InsertPass): Promise<Pass> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (15 * 60 * 1000)); // 15 minutes from now
    
    const passData = {
      id: randomUUID(),
      schoolId: pass.schoolId || '',
      studentId: pass.studentId,
      teacherId: pass.teacherId || '',
      destination: pass.destination || 'General',
      customDestination: pass.customReason || null,
      duration: 15,
      notes: null,
      status: 'active',
      issuedAt: now,
      expiresAt: expiresAt,
      returnedAt: null,
      passNumber: Math.floor(Math.random() * 10000),
      qrCode: null,
      createdAt: now,
      updatedAt: now
    };
    const [newPass] = await db.insert(passes).values(passData).returning();
    return unwrap(newPass);
  }

  async updatePass(id: string, updates: Partial<Pass>): Promise<Pass> {
    // Only allow updates to specific fields to match schema
    const allowedUpdates: Partial<typeof passes.$inferInsert> = {};
    
    if (updates.status) allowedUpdates.status = updates.status;
    if (updates.notes) allowedUpdates.notes = updates.notes;
    if (updates.returnedAt) allowedUpdates.returnedAt = updates.returnedAt;
    
    allowedUpdates.updatedAt = new Date();
    
    const [updatedPass] = await db.update(passes)
      .set(allowedUpdates)
      .where(eq(passes.id, id))
      .returning();
    return unwrap(updatedPass);
  }

  async returnAllActivePasses(schoolId: string): Promise<number> {
    const activePasses = await db.select().from(passes).where(
      and(eq(passes.schoolId, schoolId), eq(passes.status, "active"))
    );

    const updatePromises = activePasses.map(pass =>
      this.updatePass(pass.id, { status: "returned", returnedAt: new Date() })
    );

    await Promise.all(updatePromises);
    return activePasses.length;
  }

  // Payment methods
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return unwrap(newPayment);
  }

  async getPaymentsBySchool(schoolId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.schoolId, schoolId));
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments);
  }
}

export const storage: IStorage = new DatabaseStorage();