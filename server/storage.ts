import { type User, type InsertUser, type School, type InsertSchool, type Grade, type InsertGrade, type Student, type InsertStudent, type Pass, type InsertPass, type Payment, type InsertPayment } from "@shared/schema";
import { db } from "./db";
import { users, schools, grades, students, passes, payments, adminUsers } from "@shared/schema";
import { eq, and, lt, count, desc, ne, gt, sql } from "drizzle-orm";

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

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
  getSchoolById(id: string): Promise<School | undefined>;
  getSchoolBySlug(slug: string): Promise<School | undefined>;
  getAllSchools(): Promise<School[]>;
  getActiveSchools(): Promise<School[]>;
  createSchool(school: InsertSchool): Promise<School>;
  updateSchool(id: string, updates: Partial<School>): Promise<School>;
  upgradeSchoolPlan(schoolId: string, newPlan: string, newMaxTeachers: number, newMaxStudents: number): Promise<School>;
  deleteSchool(id: string): Promise<void>;
  getTrialAccountByDomain(emailDomain: string): Promise<School | undefined>;
  getTrialAccountBySchoolName(schoolName: string): Promise<School | undefined>;
  getSchoolsByEmailDomain(emailDomain: string): Promise<School[]>;
  getSchoolByVerificationToken(token: string): Promise<School | undefined>;
  verifySchoolEmail(schoolId: string): Promise<School>;
  cleanupExpiredTrials(): Promise<number>;
  
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
  getPassesBySchool(schoolId: string, filters?: { status?: string; startDate?: Date; endDate?: Date }): Promise<(Pass & { student: Student })[]>;
  getPass(id: string): Promise<Pass | undefined>;
  createPass(pass: InsertPass): Promise<Pass>;
  updatePass(id: string, updates: Partial<Pass>): Promise<Pass>;
  deletePass(id: string): Promise<void>;
  
  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentByStripeSessionId(sessionId: string): Promise<Payment | undefined>;
  
  // Multi-school user lookup
  getUsersByEmail(email: string): Promise<User[]>;
  
  // Super Admin functions
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  getAllAdminUsers(): Promise<AdminUser[]>;
  createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser>;
  getAllSchoolsWithStats(): Promise<(School & { userCount: number; studentCount: number; activePassCount: number })[]>;
  getPlatformStats(): Promise<{
    totalSchools: number;
    totalUsers: number;
    totalStudents: number;
    trialAccounts: number;
    paidPlans: number;
    monthlyRevenue: number;
    annualRevenue: number;
    totalRevenue: number;
    newSubscriptions: number;
    canceledSubscriptions: number;
    activeSubscriptions: number;
  }>;
  updateSchoolAsAdmin(schoolId: string, updates: Partial<School>): Promise<School | undefined>;
  deleteSchoolCompletely(schoolId: string): Promise<{ success: boolean; deletedCounts: any }>;
  getRecentPlatformActivity(limit: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getActiveSchools(): Promise<School[]> {
    const activeSchools = await db.select().from(schools);
    return activeSchools.filter(school => {
      // Include active paid plans and all trials for testing
      return school.plan !== 'TRIAL' || true;
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
      .where(and(
        eq(schools.emailDomain, emailDomain.toLowerCase()),
        eq(schools.plan, 'TRIAL')
      ));
    return school;
  }

  async getTrialAccountBySchoolName(schoolName: string): Promise<School | undefined> {
    const [school] = await db.select()
      .from(schools)
      .where(eq(schools.name, schoolName));
    return school;
  }

  async getSchoolByVerificationToken(token: string): Promise<School | undefined> {
    const [school] = await db.select()
      .from(schools)
      .where(eq(schools.verificationToken, token));
    return school;
  }

  async verifySchoolEmail(schoolId: string): Promise<School> {
    const [updated] = await db.update(schools)
      .set({ 
        verified: true, 
        verificationToken: null,
        verificationTokenExpiry: null 
      })
      .where(eq(schools.id, schoolId))
      .returning();
    return updated;
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByEmailAndSchool(email: string, schoolId: string): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.schoolId, schoolId)));
    return user;
  }

  async getUsersBySchool(schoolId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.schoolId, schoolId));
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user && user.password === password) {
      return user;
    }
    return null;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [updated] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.resetToken, token));
    return user;
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

  async getUsersByEmail(email: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.email, email));
  }

  // School methods
  async getSchool(id: string): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school;
  }

  async getSchoolById(id: string): Promise<School | undefined> {
    return this.getSchool(id);
  }

  async getSchoolBySlug(slug: string): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.schoolId, slug));
    return school;
  }

  async getAllSchools(): Promise<School[]> {
    return await db.select().from(schools);
  }

  async createSchool(school: InsertSchool): Promise<School> {
    const [newSchool] = await db.insert(schools).values(school).returning();
    return newSchool;
  }

  async updateSchool(id: string, updates: Partial<School>): Promise<School> {
    const [updated] = await db.update(schools)
      .set(updates)
      .where(eq(schools.id, id))
      .returning();
    return updated;
  }

  async upgradeSchoolPlan(schoolId: string, newPlan: string, newMaxTeachers: number, newMaxStudents: number): Promise<School> {
    const [updated] = await db.update(schools)
      .set({
        plan: newPlan,
        maxTeachers: newMaxTeachers,
        maxStudents: newMaxStudents
      })
      .where(eq(schools.id, schoolId))
      .returning();
    return updated;
  }

  // Grade methods
  async getGradesBySchool(schoolId: string): Promise<Grade[]> {
    return await db.select().from(grades).where(eq(grades.schoolId, schoolId));
  }

  async createGrade(grade: InsertGrade): Promise<Grade> {
    const [newGrade] = await db.insert(grades).values(grade).returning();
    return newGrade;
  }

  async updateGrade(id: string, updates: Partial<Grade>): Promise<Grade> {
    const [updated] = await db.update(grades)
      .set(updates)
      .where(eq(grades.id, id))
      .returning();
    return updated;
  }

  async deleteGrade(id: string): Promise<void> {
    await db.delete(grades).where(eq(grades.id, id));
  }

  // Student methods
  async getStudentsBySchool(schoolId: string, grade?: string): Promise<Student[]> {
    let query = db.select().from(students).where(eq(students.schoolId, schoolId));
    if (grade) {
      query = query.where(eq(students.gradeLevel, grade)) as any;
    }
    return await query;
  }

  async getStudent(id: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db.insert(students).values(student).returning();
    return newStudent;
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
    const [updated] = await db.update(students)
      .set(updates)
      .where(eq(students.id, id))
      .returning();
    return updated;
  }

  async deleteStudent(id: string): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
  }

  // Pass methods
  async getActivePassesBySchool(schoolId: string): Promise<(Pass & { student: Student })[]> {
    const result = await db.select()
      .from(passes)
      .leftJoin(students, eq(passes.studentId, students.id))
      .where(and(
        eq(passes.schoolId, schoolId),
        eq(passes.status, "active")
      ));

    return result.map(row => ({
      ...row.passes,
      student: row.students!
    }));
  }

  async getPassesBySchool(schoolId: string, filters?: { status?: string; startDate?: Date; endDate?: Date }): Promise<(Pass & { student: Student })[]> {
    let conditions = [eq(passes.schoolId, schoolId)];
    
    if (filters?.status) {
      conditions.push(eq(passes.status, filters.status));
    }
    
    const result = await db.select()
      .from(passes)
      .leftJoin(students, eq(passes.studentId, students.id))
      .where(and(...conditions));

    return result.map(row => ({
      ...row.passes,
      student: row.students!
    }));
  }

  async getPass(id: string): Promise<Pass | undefined> {
    const [pass] = await db.select().from(passes).where(eq(passes.id, id));
    return pass;
  }

  async createPass(pass: InsertPass): Promise<Pass> {
    const [newPass] = await db.insert(passes).values(pass).returning();
    return newPass;
  }

  async updatePass(id: string, updates: Partial<Pass>): Promise<Pass> {
    const [updated] = await db.update(passes)
      .set(updates)
      .where(eq(passes.id, id))
      .returning();
    return updated;
  }

  async deletePass(id: string): Promise<void> {
    await db.delete(passes).where(eq(passes.id, id));
  }

  // Payment methods
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async getPaymentByStripeSessionId(sessionId: string): Promise<Payment | undefined> {
    const [payment] = await db.select()
      .from(payments)
      .where(eq(payments.stripeSessionId, sessionId));
    return payment;
  }

  // Super Admin methods
  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return admin;
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return await db.select().from(adminUsers);
  }

  async createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser> {
    const [newAdmin] = await db.insert(adminUsers).values(adminUser).returning();
    return newAdmin;
  }

  async getAllSchoolsWithStats(): Promise<(School & { userCount: number; studentCount: number; activePassCount: number })[]> {
    const schoolsList = await db.select().from(schools);
    
    const schoolsWithStats = await Promise.all(
      schoolsList.map(async (school) => {
        const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.schoolId, school.id));
        const [studentCount] = await db.select({ count: count() }).from(students).where(eq(students.schoolId, school.id));
        const [activePassCount] = await db.select({ count: count() }).from(passes).where(and(eq(passes.schoolId, school.id), eq(passes.status, "active")));
        
        return {
          ...school,
          userCount: userCount.count,
          studentCount: studentCount.count,
          activePassCount: activePassCount.count
        };
      })
    );

    return schoolsWithStats;
  }

  async getPlatformStats(): Promise<{
    totalSchools: number;
    totalUsers: number;
    totalStudents: number;
    trialAccounts: number;
    paidPlans: number;
    monthlyRevenue: number;
    annualRevenue: number;
    totalRevenue: number;
    newSubscriptions: number;
    canceledSubscriptions: number;
    activeSubscriptions: number;
  }> {
    const [totalSchools] = await db.select({ count: count() }).from(schools);
    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [totalStudents] = await db.select({ count: count() }).from(students);
    const [trialAccounts] = await db.select({ count: count() }).from(schools).where(eq(schools.plan, 'free_trial'));
    const [paidPlans] = await db.select({ count: count() }).from(schools).where(ne(schools.plan, 'free_trial'));

    // Mock revenue data for demo
    return {
      totalSchools: totalSchools.count,
      totalUsers: totalUsers.count,
      totalStudents: totalStudents.count,
      trialAccounts: trialAccounts.count,
      paidPlans: paidPlans.count,
      monthlyRevenue: 875,
      annualRevenue: 10500,
      totalRevenue: 1375,
      newSubscriptions: 3,
      canceledSubscriptions: 1,
      activeSubscriptions: paidPlans.count
    };
  }

  async updateSchoolAsAdmin(schoolId: string, updates: Partial<School>): Promise<School | undefined> {
    const [updated] = await db.update(schools)
      .set(updates)
      .where(eq(schools.id, schoolId))
      .returning();
    return updated;
  }

  async deleteSchoolCompletely(schoolId: string): Promise<{ success: boolean; deletedCounts: any }> {
    const school = await this.getSchool(schoolId);
    if (!school) return { success: false, deletedCounts: {} };

    // Count what we're deleting
    const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.schoolId, schoolId));
    const [studentCount] = await db.select({ count: count() }).from(students).where(eq(students.schoolId, schoolId));
    const [passCount] = await db.select({ count: count() }).from(passes).where(eq(passes.schoolId, schoolId));
    const [gradeCount] = await db.select({ count: count() }).from(grades).where(eq(grades.schoolId, schoolId));
    const [paymentCount] = await db.select({ count: count() }).from(payments).where(eq(payments.schoolId, schoolId));

    // Delete all related data
    await db.delete(users).where(eq(users.schoolId, schoolId));
    await db.delete(students).where(eq(students.schoolId, schoolId));
    await db.delete(passes).where(eq(passes.schoolId, schoolId));
    await db.delete(grades).where(eq(grades.schoolId, schoolId));
    await db.delete(payments).where(eq(payments.schoolId, schoolId));
    await db.delete(schools).where(eq(schools.id, schoolId));

    return {
      success: true,
      deletedCounts: {
        school: 1,
        users: userCount.count,
        students: studentCount.count,
        passes: passCount.count,
        grades: gradeCount.count,
        payments: paymentCount.count
      }
    };
  }

  async getRecentPlatformActivity(limit: number): Promise<any[]> {
    // Mock activity data for demo
    return [
      {
        type: 'school_created',
        timestamp: new Date(),
        description: 'New school registered',
        data: { schoolName: 'Demo School' }
      }
    ];
  }
}

export const storage = new DatabaseStorage();