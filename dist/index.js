var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/env.ts
import { z } from "zod";
var EnvSchema, ENV, isProduction, features;
var init_env = __esm({
  "server/env.ts"() {
    "use strict";
    EnvSchema = z.object({
      // Database Configuration - Required
      DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
      // Session Management - Required
      SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters for security"),
      // Stripe Configuration - Required for production billing
      STRIPE_SECRET_KEY: z.string().optional(),
      STRIPE_WEBHOOK_SECRET: z.string().optional(),
      // Stripe Price IDs for different plans
      PRICE_TRIAL: z.string().optional(),
      PRICE_BASIC: z.string().optional(),
      PRICE_SMALL: z.string().optional(),
      PRICE_MEDIUM: z.string().optional(),
      PRICE_LARGE: z.string().optional(),
      PRICE_UNLIMITED: z.string().optional(),
      // Email Configuration - Optional but validated if present
      SENDGRID_API_KEY: z.string().optional(),
      // Error monitoring configuration
      DISCORD_WEBHOOK_URL: z.string().url().optional(),
      SLACK_WEBHOOK_URL: z.string().url().optional(),
      ENABLE_DEV_NOTIFICATIONS: z.string().transform((val) => val === "true").optional(),
      // Firebase Configuration - Optional for legacy support
      FIREBASE_PROJECT_ID: z.string().optional(),
      FIREBASE_CLIENT_EMAIL: z.string().optional(),
      FIREBASE_PRIVATE_KEY: z.string().optional(),
      // Runtime Environment
      NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      // Deployment Configuration
      REPLIT_DEPLOYMENT: z.string().optional(),
      PORT: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(65535)).default("5000"),
      // Optional Security Headers
      CORS_ORIGIN: z.string().url().optional(),
      // Optional Rate Limiting
      RATE_LIMIT_WINDOW_MS: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().positive()).optional(),
      RATE_LIMIT_MAX_REQUESTS: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().positive()).optional()
    });
    ENV = (() => {
      try {
        const parsed = EnvSchema.parse(process.env);
        if (!parsed.STRIPE_SECRET_KEY || !parsed.STRIPE_WEBHOOK_SECRET) {
          if (parsed.NODE_ENV === "production") {
            console.warn("\u26A0\uFE0F  Stripe not configured - payment features will be disabled in production");
          } else {
            console.warn("\u26A0\uFE0F  Stripe not configured - payment features will be disabled in development");
          }
        }
        if (!parsed.SENDGRID_API_KEY) {
          console.warn("\u26A0\uFE0F  SENDGRID_API_KEY not configured - email functionality will be disabled");
        }
        if (parsed.NODE_ENV === "development") {
          console.log("\u2705 Environment variables validated successfully");
          console.log(`\u{1F4CA} Environment: ${parsed.NODE_ENV}`);
          console.log(`\u{1F680} Port: ${parsed.PORT}`);
          console.log(`\u{1F4BE} Database: ${parsed.DATABASE_URL ? "Connected" : "Not configured"}`);
          console.log(`\u{1F4B3} Stripe: ${parsed.STRIPE_SECRET_KEY ? "Configured" : "Not configured"}`);
          console.log(`\u{1F4E7} SendGrid: ${parsed.SENDGRID_API_KEY ? "Configured" : "Not configured"}`);
        }
        return parsed;
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("\u274C Environment validation failed:");
          error.errors.forEach((err4) => {
            console.error(`   ${err4.path.join(".")}: ${err4.message}`);
          });
          console.error("\n\u{1F4A1} Please check your environment variables and try again.");
          if (process.env.NODE_ENV !== "production") {
            console.error("\n\u{1F527} Development setup hints:");
            console.error("   DATABASE_URL: Check your PostgreSQL connection");
            console.error("   SESSION_SECRET: Generate with: openssl rand -base64 32");
            console.error("   STRIPE_*: Get from your Stripe dashboard");
          }
        } else {
          console.error("\u274C Unexpected error during environment validation:", error);
        }
        process.exit(1);
      }
    })();
    isProduction = () => ENV.NODE_ENV === "production";
    features = {
      stripe: Boolean(ENV.STRIPE_SECRET_KEY && ENV.STRIPE_WEBHOOK_SECRET),
      email: Boolean(ENV.SENDGRID_API_KEY),
      firebase: Boolean(ENV.FIREBASE_PROJECT_ID),
      rateLimit: Boolean(ENV.RATE_LIMIT_WINDOW_MS && ENV.RATE_LIMIT_MAX_REQUESTS)
    };
  }
});

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminUsers: () => adminUsers,
  grades: () => grades,
  insertGradeSchema: () => insertGradeSchema,
  insertPassSchema: () => insertPassSchema,
  insertPassSchemaFull: () => insertPassSchemaFull,
  insertPaymentSchema: () => insertPaymentSchema,
  insertRegistrationSchema: () => insertRegistrationSchema,
  insertSchoolSchema: () => insertSchoolSchema,
  insertStudentSchema: () => insertStudentSchema,
  insertUserSchema: () => insertUserSchema,
  loginSchema: () => loginSchema,
  passes: () => passes,
  passwordResetSchema: () => passwordResetSchema,
  payments: () => payments,
  registerSchoolSchema: () => registerSchoolSchema,
  registrations: () => registrations,
  schools: () => schools,
  students: () => students,
  subscriptionEvents: () => subscriptionEvents,
  updatePasswordSchema: () => updatePasswordSchema,
  users: () => users
});
import { pgTable, text, timestamp, integer, boolean, uuid, unique, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z as z2 } from "zod";
var registrations, schools, users, grades, students, passes, payments, insertSchoolSchema, insertUserSchema, insertGradeSchema, insertStudentSchema, insertPassSchema, insertPassSchemaFull, insertPaymentSchema, insertRegistrationSchema, adminUsers, subscriptionEvents, loginSchema, registerSchoolSchema, passwordResetSchema, updatePasswordSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    registrations = pgTable("registrations", {
      id: uuid("id").defaultRandom().primaryKey(),
      status: text("status").notNull().default("PENDING"),
      // PENDING|ACTIVE|FAILED
      adminEmail: text("admin_email").notNull(),
      schoolName: text("school_name").notNull(),
      plan: text("plan").notNull(),
      // TRIAL|BASIC|SMALL|MEDIUM|LARGE|UNLIMITED
      stripeCheckoutSessionId: text("stripe_checkout_session_id").notNull().unique(),
      stripeCustomerId: text("stripe_customer_id"),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    schools = pgTable("schools", {
      id: uuid("id").defaultRandom().primaryKey(),
      name: text("name").notNull(),
      slug: text("slug").notNull().unique(),
      // URL-safe identifier
      emailDomain: text("email_domain"),
      // Optional: for validation
      status: text("status").notNull().default("active"),
      // active, suspended, cancelled
      plan: text("plan").notNull().default("free_trial"),
      // free_trial, basic, premium
      maxTeachers: integer("max_teachers").notNull().default(10),
      maxStudents: integer("max_students").notNull().default(500),
      currentTeachers: integer("current_teachers").notNull().default(0),
      currentStudents: integer("current_students").notNull().default(0),
      trialStartDate: timestamp("trial_start_date").defaultNow(),
      trialEndDate: timestamp("trial_end_date"),
      isTrialExpired: boolean("is_trial_expired").notNull().default(false),
      subscriptionStatus: text("subscription_status"),
      // Stripe subscription status
      stripeCustomerId: text("stripe_customer_id"),
      stripeSubscriptionId: text("stripe_subscription_id"),
      emailVerified: boolean("email_verified").notNull().default(false),
      emailVerificationToken: text("email_verification_token"),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    users = pgTable("users", {
      id: uuid("id").defaultRandom().primaryKey(),
      schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
      email: text("email").notNull(),
      password: text("password").notNull(),
      firstName: text("first_name").notNull(),
      lastName: text("last_name").notNull(),
      role: text("role").notNull().default("TEACHER"),
      // ADMIN, TEACHER, STAFF, STUDENT
      isAdmin: boolean("is_admin").notNull().default(false),
      // Maintained for backward compatibility
      isFirstLogin: boolean("is_first_login").notNull().default(false),
      enableNotifications: boolean("enable_notifications").notNull().default(true),
      status: text("status").notNull().default("active"),
      // active, suspended, pending
      resetToken: text("reset_token"),
      resetTokenExpiry: timestamp("reset_token_expiry"),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    }, (table) => ({
      // Unique constraint on email + schoolId combination
      unq: unique().on(table.email, table.schoolId)
    }));
    grades = pgTable("grades", {
      id: uuid("id").defaultRandom().primaryKey(),
      schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      // e.g., "6th Grade", "Freshman", "Senior"
      displayOrder: integer("display_order").notNull().default(0),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    students = pgTable("students", {
      id: uuid("id").defaultRandom().primaryKey(),
      schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
      gradeId: uuid("grade_id").references(() => grades.id, { onDelete: "set null" }),
      firstName: text("first_name").notNull(),
      lastName: text("last_name").notNull(),
      studentId: text("student_id"),
      // School's internal ID
      email: text("email"),
      status: text("status").notNull().default("active"),
      // active, inactive, transferred
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    }, (table) => ({
      // Unique student ID within school
      unq: unique().on(table.studentId, table.schoolId)
    }));
    passes = pgTable("passes", {
      id: uuid("id").defaultRandom().primaryKey(),
      schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
      studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
      teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      destination: text("destination").notNull(),
      customDestination: text("custom_destination"),
      duration: integer("duration").notNull(),
      // in minutes
      notes: text("notes"),
      status: text("status").notNull().default("active"),
      // active, expired, returned, revoked
      issuedAt: timestamp("issued_at").notNull().defaultNow(),
      expiresAt: timestamp("expires_at").notNull(),
      returnedAt: timestamp("returned_at"),
      passNumber: integer("pass_number").notNull(),
      qrCode: text("qr_code"),
      // Optional QR code data
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    payments = pgTable("payments", {
      id: uuid("id").defaultRandom().primaryKey(),
      schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
      stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      currency: text("currency").notNull().default("usd"),
      status: text("status").notNull(),
      // succeeded, failed, pending, cancelled
      description: text("description"),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    insertSchoolSchema = createInsertSchema(schools).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      currentTeachers: true,
      currentStudents: true
    });
    insertUserSchema = createInsertSchema(users).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      resetToken: true,
      resetTokenExpiry: true
    });
    insertGradeSchema = createInsertSchema(grades).omit({
      id: true,
      createdAt: true
    });
    insertStudentSchema = createInsertSchema(students).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      // Make schoolId optional since it's added by the server
      schoolId: z2.string().uuid().optional(),
      // Make studentId optional and nullable
      studentId: z2.string().optional().nullable(),
      // Make email optional
      email: z2.string().email().optional().nullable()
    });
    insertPassSchema = z2.object({
      studentId: z2.string(),
      schoolId: z2.string().optional(),
      // Will be set by server
      teacherId: z2.string().optional(),
      // Will be set by server
      passType: z2.string().optional().default("general"),
      customReason: z2.string().optional(),
      destination: z2.string().optional()
      // Will be derived from passType if not provided
    });
    insertPassSchemaFull = createInsertSchema(passes).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      passNumber: true,
      qrCode: true
    });
    insertPaymentSchema = createInsertSchema(payments).omit({
      id: true,
      createdAt: true
    });
    insertRegistrationSchema = createInsertSchema(registrations);
    adminUsers = pgTable("admin_users", {
      id: uuid("id").defaultRandom().primaryKey(),
      email: text("email").notNull().unique(),
      password: text("password").notNull(),
      firstName: text("first_name").notNull(),
      lastName: text("last_name").notNull(),
      role: text("role").notNull().default("admin"),
      // admin, super_admin
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    subscriptionEvents = pgTable("subscription_events", {
      id: uuid("id").defaultRandom().primaryKey(),
      schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
      eventType: text("event_type").notNull(),
      // subscription.created, subscription.updated, etc.
      stripeEventId: text("stripe_event_id").unique(),
      data: text("data"),
      // JSON string of event data
      processed: boolean("processed").notNull().default(false),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    loginSchema = z2.object({
      email: z2.string().email(),
      password: z2.string().min(1),
      schoolId: z2.string().uuid().optional()
    });
    registerSchoolSchema = z2.object({
      schoolName: z2.string().min(2),
      adminFirstName: z2.string().min(1),
      adminLastName: z2.string().min(1),
      adminEmail: z2.string().email(),
      adminPassword: z2.string().min(8),
      plan: z2.enum(["TRIAL", "BASIC", "SMALL", "MEDIUM", "LARGE", "UNLIMITED"]).default("TRIAL")
    });
    passwordResetSchema = z2.object({
      email: z2.string().email(),
      schoolId: z2.string().uuid().optional()
    });
    updatePasswordSchema = z2.object({
      token: z2.string(),
      newPassword: z2.string().min(8)
    });
  }
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    neonConfig.webSocketConstructor = ws;
    pool = new Pool({ connectionString: ENV.DATABASE_URL });
    db = drizzle({ client: pool, schema: schema_exports });
  }
});

// server/utils/slugify.ts
var slugify_exports = {};
__export(slugify_exports, {
  generateUniqueSlug: () => generateUniqueSlug,
  slugify: () => slugify
});
import { eq as eq2 } from "drizzle-orm";
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}
async function generateUniqueSlug(schoolName) {
  const baseSlug = slugify(schoolName);
  const [existing] = await db.select({ id: schools.id }).from(schools).where(eq2(schools.slug, baseSlug)).limit(1);
  if (!existing) {
    return baseSlug;
  }
  let attempt = 2;
  let candidateSlug = `${baseSlug}-${attempt}`;
  while (attempt <= 100) {
    const [existingCandidate] = await db.select({ id: schools.id }).from(schools).where(eq2(schools.slug, candidateSlug)).limit(1);
    if (!existingCandidate) {
      return candidateSlug;
    }
    attempt++;
    candidateSlug = `${baseSlug}-${attempt}`;
  }
  const timestamp2 = Date.now().toString().slice(-6);
  return `${baseSlug}-${timestamp2}`;
}
var init_slugify = __esm({
  "server/utils/slugify.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/index.ts
init_env();
import express2 from "express";
import cookieParser from "cookie-parser";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
init_db();
init_schema();
import { eq, and, lt } from "drizzle-orm";
var DatabaseStorage = class {
  // Add missing methods from interface
  async getActiveSchools() {
    const activeSchools = await db.select().from(schools);
    return activeSchools.filter((school) => {
      const now = /* @__PURE__ */ new Date();
      return school.plan !== "TRIAL" || school.trialEndDate && school.trialEndDate > now && !school.isTrialExpired;
    });
  }
  async deleteSchool(id) {
    await db.delete(schools).where(eq(schools.id, id));
  }
  async cleanupExpiredTrials() {
    const now = /* @__PURE__ */ new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
    const expiredTrials = await db.select().from(schools).where(
      and(
        eq(schools.plan, "TRIAL"),
        // Trial ended more than 7 days ago
        lt(schools.trialEndDate, sevenDaysAgo)
      )
    );
    for (const school of expiredTrials) {
      await this.deleteSchool(school.id);
    }
    return expiredTrials.length;
  }
  async getSchoolsByEmailDomain(emailDomain) {
    return await db.select().from(schools).where(eq(schools.emailDomain, emailDomain.toLowerCase()));
  }
  async getTrialAccountByDomain(emailDomain) {
    const [school] = await db.select().from(schools).where(
      and(
        eq(schools.plan, "TRIAL"),
        eq(schools.emailDomain, emailDomain.toLowerCase())
      )
    );
    return school || void 0;
  }
  async getTrialAccountBySchoolName(schoolName) {
    const [school] = await db.select().from(schools).where(
      and(
        eq(schools.plan, "TRIAL"),
        eq(schools.name, schoolName)
      )
    );
    return school || void 0;
  }
  async getSchoolByVerificationToken(token) {
    const [school] = await db.select().from(schools).where(eq(schools.verificationToken, token));
    return school || void 0;
  }
  async verifySchoolEmail(schoolId) {
    const [school] = await db.update(schools).set({
      verified: true,
      verificationToken: null,
      verificationTokenExpiry: null
    }).where(eq(schools.id, schoolId)).returning();
    if (!school) throw new Error("School not found");
    return school;
  }
  // Users
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async getUsersByEmail(email) {
    const userList = await db.select().from(users).where(eq(users.email, email));
    return userList;
  }
  async getUserByEmailAndSchool(email, schoolId) {
    console.log("getUserByEmailAndSchool called with:", { email, schoolId });
    const [user] = await db.select().from(users).where(
      and(eq(users.email, email), eq(users.schoolId, schoolId))
    );
    console.log("Found user:", user ? "YES" : "NO");
    return user || void 0;
  }
  async authenticateUser(email, password) {
    const user = await this.getUserByEmail(email);
    if (!user || user.status !== "active") {
      return null;
    }
    if (user.password === password) {
      return user;
    }
    return null;
  }
  async getUsersBySchool(schoolId) {
    return await db.select().from(users).where(eq(users.schoolId, schoolId));
  }
  async createUser(insertUser) {
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
  async updateUser(id, updates) {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!user) throw new Error("User not found");
    return user;
  }
  async deleteUser(id) {
    await db.delete(users).where(eq(users.id, id));
  }
  // Schools
  async getSchool(id) {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school || void 0;
  }
  async getSchoolById(id) {
    return this.getSchool(id);
  }
  async getSchoolBySlug(slug) {
    const [school] = await db.select().from(schools).where(eq(schools.slug, slug));
    return school || void 0;
  }
  async getSchoolsByIds(ids) {
    if (ids.length === 0) return [];
    const schoolList = await db.select().from(schools).where(
      ids.length === 1 ? eq(schools.id, ids[0]) : eq(schools.id, ids[0])
      // Simple implementation for now
    );
    return schoolList.filter((school) => ids.includes(school.id));
  }
  async createSchool(insertSchool) {
    const [school] = await db.insert(schools).values(insertSchool).returning();
    return school;
  }
  async updateSchool(id, updates) {
    const [school] = await db.update(schools).set(updates).where(eq(schools.id, id)).returning();
    if (!school) {
      throw new Error("School not found");
    }
    return school;
  }
  async upgradeSchoolPlan(schoolId, newPlan, newMaxTeachers, newMaxStudents) {
    console.log(`Upgrading school ${schoolId} to ${newPlan} plan`);
    console.log(`New limits - Teachers: ${newMaxTeachers}, Students: ${newMaxStudents}`);
    const updates = {
      plan: newPlan,
      maxTeachers: newMaxTeachers,
      maxStudents: newMaxStudents,
      // Remove trial-specific fields for paid plans
      trialStartDate: newPlan === "free_trial" ? void 0 : null,
      trialEndDate: newPlan === "free_trial" ? void 0 : null,
      isTrialExpired: newPlan === "free_trial" ? void 0 : false
    };
    const [school] = await db.update(schools).set(updates).where(eq(schools.id, schoolId)).returning();
    if (!school) throw new Error("School not found");
    console.log(`School upgrade completed: ${school.name} is now on ${newPlan} plan`);
    return school;
  }
  async getAllSchools() {
    return await db.select().from(schools);
  }
  // Grades
  async getGradesBySchool(schoolId) {
    return await db.select().from(grades).where(eq(grades.schoolId, schoolId));
  }
  async createGrade(insertGrade) {
    const [grade] = await db.insert(grades).values(insertGrade).returning();
    return grade;
  }
  async updateGrade(id, updates) {
    const [grade] = await db.update(grades).set(updates).where(eq(grades.id, id)).returning();
    if (!grade) throw new Error("Grade not found");
    return grade;
  }
  async deleteGrade(id) {
    await db.delete(grades).where(eq(grades.id, id));
  }
  // Students
  async getStudentsBySchool(schoolId, grade) {
    if (grade) {
      return await db.select().from(students).where(and(eq(students.schoolId, schoolId), eq(students.grade, grade)));
    }
    return await db.select().from(students).where(eq(students.schoolId, schoolId));
  }
  async getStudent(id) {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || void 0;
  }
  async createStudent(insertStudent) {
    const [student] = await db.insert(students).values(insertStudent).returning();
    return student;
  }
  async updateStudent(id, updates) {
    const [student] = await db.update(students).set(updates).where(eq(students.id, id)).returning();
    if (!student) throw new Error("Student not found");
    return student;
  }
  async deleteStudent(id) {
    await db.delete(students).where(eq(students.id, id));
  }
  // Passes
  async getActivePassesBySchool(schoolId) {
    const result = await db.select({
      pass: passes,
      student: students,
      teacher: users,
      grade: grades
    }).from(passes).innerJoin(students, eq(passes.studentId, students.id)).innerJoin(users, eq(passes.teacherId, users.id)).leftJoin(grades, eq(students.gradeId, grades.id)).where(and(eq(passes.schoolId, schoolId), eq(passes.status, "active")));
    return result.map((row) => ({
      ...row.pass,
      student: {
        ...row.student,
        grade: row.grade?.name || void 0
      },
      teacher: row.teacher
    }));
  }
  async getActivePassesByTeacher(teacherId) {
    const result = await db.select({
      pass: passes,
      student: students
    }).from(passes).innerJoin(students, eq(passes.studentId, students.id)).where(and(eq(passes.teacherId, teacherId), eq(passes.status, "active")));
    return result.map((row) => ({
      ...row.pass,
      studentName: `${row.student.firstName} ${row.student.lastName}`
    }));
  }
  async getPassesBySchool(schoolId, filters) {
    let query = db.select({
      pass: passes,
      student: students,
      teacher: users,
      grade: grades
    }).from(passes).innerJoin(students, eq(passes.studentId, students.id)).innerJoin(users, eq(passes.teacherId, users.id)).leftJoin(grades, eq(students.gradeId, grades.id)).where(eq(passes.schoolId, schoolId));
    const result = await query;
    let filteredResult = result;
    if (filters?.dateStart) {
      filteredResult = filteredResult.filter(
        (row) => row.pass.issuedAt && row.pass.issuedAt >= filters.dateStart
      );
    }
    if (filters?.dateEnd) {
      filteredResult = filteredResult.filter(
        (row) => row.pass.issuedAt && row.pass.issuedAt <= filters.dateEnd
      );
    }
    if (filters?.grade) {
      filteredResult = filteredResult.filter((row) => row.grade?.name === filters.grade);
    }
    if (filters?.teacherId) {
      filteredResult = filteredResult.filter((row) => row.pass.teacherId === filters.teacherId);
    }
    return filteredResult.map((row) => ({
      ...row.pass,
      student: {
        ...row.student,
        grade: row.grade?.name || void 0
      },
      teacher: row.teacher
    }));
  }
  async createPass(insertPass) {
    const [pass] = await db.insert(passes).values(insertPass).returning();
    return pass;
  }
  async updatePass(id, updates) {
    if (updates.status === "returned") {
      const [currentPass] = await db.select().from(passes).where(eq(passes.id, id));
      if (!currentPass) throw new Error("Pass not found");
      if (!currentPass.returnTime && currentPass.checkoutTime) {
        updates.returnTime = /* @__PURE__ */ new Date();
        updates.duration = Math.floor(
          (updates.returnTime.getTime() - currentPass.checkoutTime.getTime()) / (1e3 * 60)
        );
      }
    }
    const [pass] = await db.update(passes).set(updates).where(eq(passes.id, id)).returning();
    if (!pass) throw new Error("Pass not found");
    return pass;
  }
  async returnAllActivePasses(schoolId) {
    const returnTime = /* @__PURE__ */ new Date();
    const activePasses = await db.select().from(passes).where(and(eq(passes.schoolId, schoolId), eq(passes.status, "active")));
    if (activePasses.length === 0) {
      return 0;
    }
    const updatePromises = activePasses.map(async (pass) => {
      const duration = pass.checkoutTime ? Math.floor((returnTime.getTime() - pass.checkoutTime.getTime()) / (1e3 * 60)) : null;
      return db.update(passes).set({
        status: "returned",
        returnTime,
        duration
      }).where(eq(passes.id, pass.id));
    });
    await Promise.all(updatePromises);
    return activePasses.length;
  }
  // Password reset methods
  async getUserByResetToken(token) {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user || void 0;
  }
  async setPasswordResetToken(userId, token, expiry) {
    await db.update(users).set({
      resetToken: token,
      resetTokenExpiry: expiry
    }).where(eq(users.id, userId));
  }
  async clearPasswordResetToken(userId) {
    await db.update(users).set({
      resetToken: null,
      resetTokenExpiry: null
    }).where(eq(users.id, userId));
  }
  // Payment methods
  async createPayment(insertPayment) {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }
  async getPaymentsBySchool(schoolId) {
    return await db.select().from(payments).where(eq(payments.schoolId, schoolId));
  }
  async getAllPayments() {
    return await db.select().from(payments);
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
init_schema();
init_env();
import { z as z4 } from "zod";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

// server/validate.ts
import { ZodError, z as z3 } from "zod";
function validate(opts) {
  return (req, res, next) => {
    try {
      req.valid = {};
      if (opts.body) {
        req.valid.body = opts.body.parse(req.body);
      }
      if (opts.query) {
        req.valid.query = opts.query.parse(req.query);
      }
      if (opts.params) {
        req.valid.params = opts.params.parse(req.params);
      }
      next();
    } catch (err4) {
      if (err4 instanceof ZodError) {
        const formattedErrors = err4.errors.map((error) => ({
          field: error.path.join("."),
          message: error.message,
          received: error.received
        }));
        return res.status(400).json({
          error: "Validation failed",
          details: formattedErrors,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return res.status(400).json({
        error: "Invalid request",
        details: String(err4),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  };
}
var commonSchemas = {
  // UUID parameter validation
  uuidParam: {
    id: z3.string().uuid("Invalid UUID format")
  },
  // Pagination query validation
  pagination: {
    page: z3.string().transform((val) => parseInt(val, 10)).pipe(z3.number().min(1)).optional(),
    limit: z3.string().transform((val) => parseInt(val, 10)).pipe(z3.number().min(1).max(100)).optional()
  },
  // Common string validations
  nonEmptyString: z3.string().min(1, "Field cannot be empty"),
  email: z3.string().email("Invalid email format"),
  password: z3.string().min(8, "Password must be at least 8 characters")
};
var validatePagination = validate({
  query: z3.object({
    page: z3.string().transform((val) => parseInt(val, 10)).pipe(z3.number().min(1)).optional(),
    limit: z3.string().transform((val) => parseInt(val, 10)).pipe(z3.number().min(1).max(100)).optional()
  })
});

// server/safe.ts
function invariant(condition, msg) {
  if (!condition) {
    console.error(`\u274C Invariant failed: ${msg}`);
    throw new Error(msg);
  }
}
function unwrap(v, msg = "Unexpected null") {
  if (v == null) {
    console.error(`\u274C Unwrap failed: ${msg} (received: ${v})`);
    throw new Error(msg);
  }
  return v;
}
function assertValidUuid(id, msg = "Invalid UUID") {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    console.error(`\u274C UUID validation failed: ${msg} (received: ${id})`);
    throw new Error(msg);
  }
  return id;
}

// server/api-response.ts
function ok(data) {
  return {
    ok: true,
    data,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function err(message, code, details) {
  return {
    ok: false,
    error: message,
    code,
    details,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function sendOk(res, data, status = 200) {
  return res.status(status).json(ok(data));
}
function sendErr(res, message, status = 400, code, details) {
  return res.status(status).json(err(message, code, details));
}
function catchAsync(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error("Route handler error:", error);
      return sendErr(
        res,
        error.message || "Internal server error",
        500,
        "INTERNAL_ERROR",
        process.env.NODE_ENV === "development" ? error.stack : void 0
      );
    }
  };
}
var ErrorResponses = {
  notFound: (resource = "Resource") => err(`${resource} not found`, "NOT_FOUND"),
  unauthorized: (message = "Authentication required") => err(message, "UNAUTHORIZED"),
  forbidden: (message = "Access denied") => err(message, "FORBIDDEN"),
  badRequest: (message = "Invalid request") => err(message, "BAD_REQUEST"),
  conflict: (message = "Resource already exists") => err(message, "CONFLICT"),
  internal: (message = "Internal server error") => err(message, "INTERNAL_ERROR")
};

// server/routes.ts
var auth = {
  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  },
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  },
  generateSessionToken() {
    return randomUUID();
  }
};
var sessions = /* @__PURE__ */ new Map();
var requireAuth = (req, res, next) => {
  const authToken = req.headers.authorization?.replace("Bearer ", "") || req.cookies.pp_session;
  if (!authToken) {
    res.status(401).json(ErrorResponses.unauthorized());
    return;
  }
  const session = sessions.get(authToken);
  if (!session || session.expires < /* @__PURE__ */ new Date()) {
    sessions.delete(authToken);
    res.status(401).json(ErrorResponses.unauthorized("Session expired"));
    return;
  }
  req.user = { id: session.userId, schoolId: session.schoolId };
  next();
};
async function registerRoutes(app2) {
  app2.get("/api/health", (_req, res) => res.send("ok"));
  app2.get("/api/health/db", async (_req, res) => {
    try {
      await storage.getAllSchools();
      res.send("ok");
    } catch (e) {
      console.error(e);
      res.status(500).send("db-fail");
    }
  });
  const RegisterBody = z4.object({
    schoolName: z4.string().min(2),
    adminEmail: z4.string().email(),
    plan: z4.enum(["TRIAL", "BASIC", "SMALL", "MEDIUM", "LARGE", "UNLIMITED"])
  });
  app2.post("/api/register-simple", validate({ body: RegisterBody }), catchAsync(async (req, res) => {
    const { schoolName, adminEmail, plan } = req.valid.body;
    console.log("Validated data:", { schoolName, adminEmail, plan });
    return sendOk(res, { received: { schoolName, adminEmail, plan } });
  }));
  app2.post("/api/auth/register", validate({ body: registerSchoolSchema }), async (req, res) => {
    try {
      const { schoolName, adminEmail, adminFirstName, adminLastName, adminPassword, plan } = req.valid.body;
      const { generateUniqueSlug: generateUniqueSlug2 } = await Promise.resolve().then(() => (init_slugify(), slugify_exports));
      const uniqueSlug = await generateUniqueSlug2(schoolName);
      const schoolData = {
        name: schoolName,
        slug: uniqueSlug,
        status: "active",
        plan: plan.toLowerCase(),
        trialStartDate: /* @__PURE__ */ new Date(),
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3)
        // 14 days
      };
      const school = await storage.createSchool(schoolData);
      const hashedPassword = await auth.hashPassword(adminPassword);
      const userData = {
        schoolId: school.id,
        email: adminEmail,
        password: hashedPassword,
        firstName: adminFirstName,
        lastName: adminLastName,
        isAdmin: true
      };
      const user = await storage.createUser(userData);
      res.json({ ok: true, school: { id: school.id, name: school.name }, user: { id: user.id, email: user.email } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });
  const loginBodySchema = z4.object({
    email: z4.string().email("Invalid email format"),
    password: z4.string().min(1, "Password is required"),
    schoolId: z4.string().uuid().optional()
  });
  app2.post("/api/auth/login", validate({ body: loginBodySchema }), async (req, res) => {
    try {
      const { email, password, schoolId } = req.valid.body;
      const normalizedEmail = email.trim().toLowerCase();
      if (schoolId) {
        const user = await storage.getUserByEmailAndSchool(normalizedEmail, schoolId);
        invariant(user, "Invalid credentials");
        if (user.isFirstLogin) {
          return res.json({
            ok: false,
            isFirstLogin: true,
            email: normalizedEmail,
            schoolId,
            message: "First time login - please set your password"
          });
        }
        const isValid2 = await auth.comparePassword(password, user.password);
        invariant(isValid2, "Invalid credentials");
        const sessionToken = auth.generateSessionToken();
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1e3);
        sessions.set(sessionToken, {
          userId: user.id,
          schoolId: user.schoolId,
          expires
        });
        res.cookie("pp_session", sessionToken, {
          httpOnly: true,
          secure: ENV.NODE_ENV === "production",
          sameSite: ENV.NODE_ENV === "production" ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 3600 * 1e3,
          signed: false
        });
        const { password: _, ...userWithoutPassword } = user;
        return res.json({ ok: true, user: userWithoutPassword, redirect: "/app" });
      }
      const candidates = await storage.getUsersByEmail(normalizedEmail);
      if (candidates.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const firstLoginUser = candidates.find((user) => user.isFirstLogin);
      if (firstLoginUser) {
        if (candidates.length === 1) {
          return res.json({
            ok: false,
            isFirstLogin: true,
            email: normalizedEmail,
            schoolId: firstLoginUser.schoolId,
            message: "First time login - please set your password"
          });
        } else {
          const schools3 = candidates.map((user) => ({
            id: user.schoolId,
            name: user.schoolId,
            // This should ideally be school name
            isFirstLogin: user.isFirstLogin
          }));
          return res.json({
            ok: false,
            requiresSchool: true,
            schools: schools3,
            hasFirstLogin: true,
            email: normalizedEmail
          });
        }
      }
      const isValid = candidates.length > 0 && await auth.comparePassword(password, candidates[0].password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (candidates.length === 1) {
        const user = candidates[0];
        const sessionToken = auth.generateSessionToken();
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1e3);
        sessions.set(sessionToken, {
          userId: user.id,
          schoolId: user.schoolId,
          expires
        });
        res.cookie("pp_session", sessionToken, {
          httpOnly: true,
          secure: ENV.NODE_ENV === "production",
          sameSite: ENV.NODE_ENV === "production" ? "none" : "lax",
          path: "/",
          maxAge: 7 * 24 * 3600 * 1e3,
          signed: false
        });
        const { password: _, ...userWithoutPassword } = user;
        return res.json({ ok: true, user: userWithoutPassword, redirect: "/app" });
      }
      const schoolIds = candidates.map((c) => c.schoolId);
      const schools2 = await storage.getSchoolsByIds(schoolIds);
      return res.json({
        success: false,
        requiresSchool: true,
        schools: schools2.map((s) => ({ id: s.id, name: s.name }))
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  app2.get("/api/auth/me", requireAuth, async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const authReq = req;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, "User not found");
      const { password: _, ...userWithoutPassword } = validUser;
      return sendOk(res, { user: userWithoutPassword });
    } catch (error) {
      console.error("Get user error:", error);
      return sendErr(res, "Failed to get user", 500, "USER_FETCH_ERROR");
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    const authToken = req.headers.authorization?.replace("Bearer ", "") || req.cookies.pp_session;
    if (authToken) {
      sessions.delete(authToken);
    }
    res.clearCookie("pp_session");
    res.json({ success: true });
  });
  app2.get("/api/school/:id", requireAuth, async (req, res) => {
    try {
      const schoolId = assertValidUuid(req.params.id, "Invalid school ID format");
      const school = await storage.getSchool(schoolId);
      const validSchool = unwrap(school, "School not found or access denied");
      res.json(validSchool);
    } catch (error) {
      console.error("Get school error:", error);
      res.status(500).json({ message: "Failed to get school" });
    }
  });
  app2.get("/api/grades/:schoolId", requireAuth, async (req, res) => {
    try {
      const schoolId = req.params.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID is required" });
      }
      const grades2 = await storage.getGradesBySchool(schoolId);
      res.json(grades2);
    } catch (error) {
      console.error("Get grades error:", error);
      res.status(500).json({ message: "Failed to get grades" });
    }
  });
  app2.post("/api/grades", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const { schoolId } = authReq.user;
      if (!schoolId) {
        return res.status(400).json({ message: "User must be associated with a school" });
      }
      const data = {
        name: req.body.name,
        displayOrder: req.body.displayOrder || 0,
        schoolId
        // Ensure schoolId from auth user
      };
      const grade = await storage.createGrade(data);
      res.json(grade);
    } catch (error) {
      console.error("Create grade error:", error);
      res.status(400).json({ message: error.message || "Failed to create grade" });
    }
  });
  app2.put("/api/grades/:id", requireAuth, validate({ body: insertGradeSchema }), async (req, res) => {
    try {
      const gradeId = req.params.id;
      if (!gradeId) {
        return res.status(400).json({ message: "Grade ID is required" });
      }
      const data = req.valid.body;
      const grade = await storage.updateGrade(gradeId, data);
      res.json(grade);
    } catch (error) {
      console.error("Update grade error:", error);
      res.status(400).json({ message: error.message || "Failed to update grade" });
    }
  });
  app2.delete("/api/grades/:id", requireAuth, async (req, res) => {
    try {
      const gradeId = req.params.id;
      if (!gradeId) {
        return res.status(400).json({ message: "Grade ID is required" });
      }
      await storage.deleteGrade(gradeId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete grade error:", error);
      res.status(400).json({ message: error.message || "Failed to delete grade" });
    }
  });
  app2.get("/api/students/:schoolId", requireAuth, async (req, res) => {
    try {
      const schoolId = req.params.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID is required" });
      }
      const students2 = await storage.getStudentsBySchool(schoolId);
      res.json(students2);
    } catch (error) {
      console.error("Get students error:", error);
      res.status(500).json({ message: "Failed to get students" });
    }
  });
  app2.get("/api/students", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const { schoolId } = authReq.user;
      const { grade } = req.query;
      const students2 = await storage.getStudentsBySchool(schoolId, grade);
      res.json(students2);
    } catch (error) {
      console.error("Get students error:", error);
      res.status(500).json({ message: "Failed to get students" });
    }
  });
  app2.post("/api/students", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const { schoolId } = authReq.user;
      const requestData = req.body;
      if (!requestData.firstName && !requestData.name) {
        return res.status(400).json({
          message: "Student name is required (firstName or name field)"
        });
      }
      if (!requestData.gradeId && !requestData.grade) {
        return res.status(400).json({
          message: "Grade is required (gradeId or grade field)"
        });
      }
      let firstName = requestData.firstName;
      let lastName = requestData.lastName || "";
      if (!firstName && requestData.name) {
        const nameParts = requestData.name.trim().split(" ");
        firstName = nameParts[0] || "Student";
        lastName = nameParts.slice(1).join(" ") || "";
      }
      let gradeId = requestData.gradeId;
      if (!gradeId && requestData.grade) {
        const grades2 = await storage.getGradesBySchool(schoolId);
        const grade = grades2.find((g) => g.name === requestData.grade);
        if (!grade) {
          return res.status(400).json({
            message: `Grade "${requestData.grade}" not found`
          });
        }
        gradeId = grade.id;
      }
      const data = {
        schoolId,
        firstName,
        lastName,
        gradeId,
        studentId: requestData.studentId || null,
        email: requestData.email || null,
        status: requestData.status || "active"
      };
      const student = await storage.createStudent(data);
      res.json(student);
    } catch (error) {
      console.error("Create student error:", error);
      res.status(400).json({ message: error.message || "Failed to create student" });
    }
  });
  app2.put("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const { schoolId } = authReq.user;
      const studentId = req.params.id;
      if (!studentId) {
        return res.status(400).json({ message: "Student ID is required" });
      }
      const requestData = req.body;
      let firstName = requestData.firstName;
      let lastName = requestData.lastName || "";
      if (!firstName && requestData.name) {
        const nameParts = requestData.name.trim().split(" ");
        firstName = nameParts[0] || "Student";
        lastName = nameParts.slice(1).join(" ") || "";
      }
      let gradeId = requestData.gradeId;
      if (!gradeId && requestData.grade) {
        const grades2 = await storage.getGradesBySchool(schoolId);
        const grade = grades2.find((g) => g.name === requestData.grade);
        if (!grade) {
          return res.status(400).json({
            message: `Grade "${requestData.grade}" not found`
          });
        }
        gradeId = grade.id;
      }
      const data = {
        firstName,
        lastName,
        gradeId,
        studentId: requestData.studentId || null,
        email: requestData.email || null,
        status: requestData.status || "active"
      };
      const student = await storage.updateStudent(studentId, data);
      res.json(student);
    } catch (error) {
      console.error("Update student error:", error);
      res.status(400).json({ message: error.message || "Failed to update student" });
    }
  });
  app2.delete("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const studentId = req.params.id;
      if (!studentId) {
        return res.status(400).json({ message: "Student ID is required" });
      }
      await storage.deleteStudent(studentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete student error:", error);
      res.status(400).json({ message: error.message || "Failed to delete student" });
    }
  });
  app2.get("/api/passes/active/:schoolId", requireAuth, async (req, res) => {
    try {
      const schoolId = req.params.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID is required" });
      }
      const passes2 = await storage.getActivePassesBySchool(schoolId);
      res.json(passes2);
    } catch (error) {
      console.error("Get active passes error:", error);
      res.status(500).json({ message: "Failed to get active passes" });
    }
  });
  app2.get("/api/passes/active", requireAuth, async (req, res) => {
    try {
      const { teacherId } = req.query;
      const { schoolId } = req.user;
      if (teacherId) {
        const allPasses = await storage.getActivePassesBySchool(schoolId);
        const teacherPasses = allPasses.filter((pass) => pass.teacherId === teacherId);
        res.json(teacherPasses);
      } else {
        const passes2 = await storage.getActivePassesBySchool(schoolId);
        res.json(passes2);
      }
    } catch (error) {
      console.error("Get active passes error:", error);
      res.status(500).json({ message: "Failed to get active passes" });
    }
  });
  app2.post("/api/passes", requireAuth, validate({ body: insertPassSchema }), async (req, res) => {
    try {
      const authReq = req;
      const { schoolId } = authReq.user;
      let destination = req.valid.body.destination;
      if (!destination) {
        const passType = req.valid.body.passType || "general";
        switch (passType) {
          case "nurse":
            destination = "Nurse's Office";
            break;
          case "discipline":
            destination = "Principal's Office";
            break;
          case "restroom":
            destination = "Restroom";
            break;
          case "library":
            destination = "Library";
            break;
          case "office":
            destination = "Main Office";
            break;
          default:
            destination = req.valid.body.customReason || "General Hall Pass";
        }
      }
      const data = {
        ...req.valid.body,
        schoolId,
        // Ensure schoolId from auth user
        teacherId: authReq.user.id,
        // Ensure teacherId from auth user
        destination,
        // Ensure destination is provided
        duration: req.valid.body.duration || 10,
        // Default 10 minutes
        passNumber: Math.floor(Math.random() * 9e3) + 1e3,
        // Generate 4-digit pass number
        expiresAt: new Date(Date.now() + (req.valid.body.duration || 10) * 60 * 1e3)
        // Set expiration time
      };
      const pass = await storage.createPass(data);
      res.json(pass);
    } catch (error) {
      console.error("Create pass error:", error);
      res.status(400).json({ message: error.message || "Failed to create pass" });
    }
  });
  app2.patch("/api/passes/:id/status", requireAuth, async (req, res) => {
    try {
      const passId = req.params.id;
      if (!passId) {
        return res.status(400).json({ message: "Pass ID is required" });
      }
      const { status } = req.body;
      const pass = await storage.updatePass(passId, { status });
      res.json(pass);
    } catch (error) {
      console.error("Update pass error:", error);
      res.status(500).json({ message: "Failed to update pass" });
    }
  });
  app2.put("/api/passes/:id/return", requireAuth, async (req, res) => {
    try {
      const passId = req.params.id;
      if (!passId) {
        return res.status(400).json({ message: "Pass ID is required" });
      }
      const pass = await storage.updatePass(passId, { status: "returned" });
      res.json(pass);
    } catch (error) {
      console.error("Return pass error:", error);
      res.status(500).json({ message: "Failed to return pass" });
    }
  });
  app2.get("/api/payments/:schoolId", requireAuth, async (req, res) => {
    try {
      const schoolId = req.params.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID is required" });
      }
      const payments2 = await storage.getPaymentsBySchool(schoolId);
      res.json(payments2);
    } catch (error) {
      console.error("Get payments error:", error);
      res.status(500).json({ message: "Failed to get payments" });
    }
  });
  app2.get("/api/admin/teachers", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, "User not found");
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const teachers = await storage.getUsersBySchool(validUser.schoolId);
      const teachersWithoutPasswords = teachers.map((teacher) => {
        const { password: _, ...teacherWithoutPassword } = teacher;
        return teacherWithoutPassword;
      });
      res.json(teachersWithoutPasswords);
    } catch (error) {
      console.error("Get teachers error:", error);
      res.status(500).json({ message: "Failed to get teachers" });
    }
  });
  app2.post("/api/admin/teachers", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, "User not found");
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { email, name } = req.body;
      const normalizedEmail = email.trim().toLowerCase();
      const existingTeacher = await storage.getUserByEmailAndSchool(normalizedEmail, validUser.schoolId);
      if (existingTeacher) {
        return res.status(400).json({ message: "Teacher already exists in this school" });
      }
      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const teacherData = {
        schoolId: validUser.schoolId,
        email: normalizedEmail,
        firstName,
        lastName,
        isAdmin: false,
        isFirstLogin: true,
        // Flag for first-time login
        password: ""
        // Will be set on first login
      };
      const newTeacher = await storage.createUser(teacherData);
      const { password: _, ...teacherWithoutPassword } = newTeacher;
      res.json({
        success: true,
        teacher: teacherWithoutPassword,
        message: "Teacher invited successfully. They will set their password on first login."
      });
    } catch (error) {
      console.error("Create teacher error:", error);
      res.status(400).json({ message: error.message || "Failed to create teacher" });
    }
  });
  app2.delete("/api/admin/teachers/:teacherId", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, "User not found");
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const teacherId = req.params.teacherId;
      const teacher = await storage.getUser(teacherId);
      if (!teacher || teacher.schoolId !== validUser.schoolId) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      if (teacher.isAdmin && teacher.id === validUser.id) {
        return res.status(400).json({ message: "Cannot remove yourself" });
      }
      await storage.deleteUser(teacherId);
      res.json({ success: true, message: "Teacher removed successfully" });
    } catch (error) {
      console.error("Delete teacher error:", error);
      res.status(500).json({ message: error.message || "Failed to remove teacher" });
    }
  });
  app2.patch("/api/admin/teachers/:teacherId/promote", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, "User not found");
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const teacherId = req.params.teacherId;
      const teacher = await storage.getUser(teacherId);
      if (!teacher || teacher.schoolId !== validUser.schoolId) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      await storage.updateUser(teacherId, { isAdmin: true });
      res.json({ success: true, message: "Teacher promoted to admin successfully" });
    } catch (error) {
      console.error("Promote teacher error:", error);
      res.status(500).json({ message: error.message || "Failed to promote teacher" });
    }
  });
  app2.patch("/api/admin/teachers/:teacherId/demote", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, "User not found");
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const teacherId = req.params.teacherId;
      const teacher = await storage.getUser(teacherId);
      if (!teacher || teacher.schoolId !== validUser.schoolId) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      if (teacher.id === validUser.id) {
        return res.status(400).json({ message: "Cannot demote yourself" });
      }
      await storage.updateUser(teacherId, { isAdmin: false });
      res.json({ success: true, message: "Admin demoted to teacher successfully" });
    } catch (error) {
      console.error("Demote admin error:", error);
      res.status(500).json({ message: error.message || "Failed to demote admin" });
    }
  });
  app2.patch("/api/admin/teachers/:teacherId", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, "User not found");
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { teacherId } = req.params;
      const { firstName, lastName, email } = req.body;
      const teacher = await storage.getUser(teacherId);
      if (!teacher || teacher.schoolId !== validUser.schoolId) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      const updatedTeacher = await storage.updateUser(teacherId, {
        firstName: firstName || teacher.firstName,
        lastName: lastName || teacher.lastName,
        email: email || teacher.email
      });
      res.json({ message: "Teacher updated successfully", teacher: updatedTeacher });
    } catch (error) {
      console.error("Teacher update error:", error);
      res.status(400).json({ message: error.message || "Failed to update teacher" });
    }
  });
  app2.post("/api/admin/teachers/:teacherId/reset-password", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, "User not found");
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { teacherId } = req.params;
      const teacher = await storage.getUser(teacherId);
      if (!teacher || teacher.schoolId !== validUser.schoolId) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      await storage.updateUser(teacherId, {
        password: "",
        isFirstLogin: true
      });
      res.json({ success: true, message: "Password reset successfully. Teacher will set new password on next login." });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(400).json({ message: error.message || "Failed to reset password" });
    }
  });
  app2.get("/api/admin/school-info", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, "User not found");
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const school = await storage.getSchool(validUser.schoolId);
      const validSchool = unwrap(school, "School not found");
      res.json(validSchool);
    } catch (error) {
      console.error("Get school info error:", error);
      res.status(500).json({ message: "Failed to get school information" });
    }
  });
  app2.post("/api/auth/first-login", async (req, res) => {
    try {
      const { email, password, schoolId } = req.body;
      const normalizedEmail = email.trim().toLowerCase();
      const user = await storage.getUserByEmailAndSchool(normalizedEmail, schoolId);
      if (!user) {
        return res.status(400).json({ message: "Invalid email or school" });
      }
      if (!user.isFirstLogin) {
        return res.status(400).json({ message: "User has already set their password" });
      }
      const hashedPassword = await auth.hashPassword(password);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        isFirstLogin: false
      });
      const sessionToken = auth.generateSessionToken();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1e3);
      sessions.set(sessionToken, {
        userId: user.id,
        schoolId: user.schoolId,
        expires
      });
      res.cookie("pp_session", sessionToken, {
        httpOnly: true,
        secure: ENV.NODE_ENV === "production",
        sameSite: ENV.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        maxAge: 7 * 24 * 3600 * 1e3,
        signed: false
      });
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        ok: true,
        user: { ...userWithoutPassword, isFirstLogin: false },
        redirect: "/app"
      });
    } catch (error) {
      console.error("First login error:", error);
      res.status(500).json({ message: "Failed to set password" });
    }
  });
  app2.get("/api/passes", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const { schoolId } = authReq.user;
      const { dateStart, dateEnd, grade, teacherId, passType } = req.query;
      const allPasses = await storage.getPassesBySchool(schoolId);
      let filteredPasses = allPasses;
      if (dateStart) {
        const startDate = new Date(dateStart);
        filteredPasses = filteredPasses.filter(
          (pass) => new Date(pass.issuedAt) >= startDate
        );
      }
      if (dateEnd) {
        const endDate = new Date(dateEnd);
        filteredPasses = filteredPasses.filter(
          (pass) => new Date(pass.issuedAt) <= endDate
        );
      }
      if (teacherId && teacherId !== "all") {
        filteredPasses = filteredPasses.filter((pass) => pass.teacherId === teacherId);
      }
      if (passType && passType !== "all") {
        filteredPasses = filteredPasses.filter(
          (pass) => (pass.destination || "general") === passType
        );
      }
      res.json(filteredPasses);
    } catch (error) {
      console.error("Get passes error:", error);
      res.status(500).json({ message: "Failed to get passes" });
    }
  });
  app2.get("/api/grades", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const { schoolId } = authReq.user;
      const grades2 = await storage.getGradesBySchool(schoolId);
      res.json(grades2);
    } catch (error) {
      console.error("Get grades error:", error);
      res.status(500).json({ message: "Failed to get grades" });
    }
  });
  app2.get("/api/teachers", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const { schoolId } = authReq.user;
      const teachers = await storage.getUsersBySchool(schoolId);
      const teachersWithoutPasswords = teachers.map((teacher) => {
        const { password: _, ...teacherData } = teacher;
        return {
          ...teacherData,
          name: `${teacher.firstName} ${teacher.lastName}`.trim()
        };
      });
      res.json(teachersWithoutPasswords);
    } catch (error) {
      console.error("Get teachers error:", error);
      res.status(500).json({ message: "Failed to get teachers" });
    }
  });
  app2.patch("/api/profile", requireAuth, async (req, res) => {
    try {
      const authReq = req;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, "User not found");
      const { firstName, lastName, currentPassword, newPassword } = req.body;
      const updates = {};
      if (firstName && lastName) {
        updates.firstName = firstName.trim();
        updates.lastName = lastName.trim();
      }
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required to change password" });
        }
        if (newPassword.length < 6) {
          return res.status(400).json({ message: "New password must be at least 6 characters long" });
        }
        const isCurrentPasswordValid = await auth.comparePassword(currentPassword, validUser.password);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
        updates.password = await auth.hashPassword(newPassword);
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid updates provided" });
      }
      await storage.updateUser(validUser.id, updates);
      const updatedUser = await storage.getUser(validUser.id);
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({
        success: true,
        user: userWithoutPassword,
        message: "Profile updated successfully"
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: error.message || "Failed to update profile" });
    }
  });
  const server = createServer(app2);
  return server;
}

// server/routes/register-v2.ts
init_schema();
init_db();
import { z as z5 } from "zod";
import Stripe from "stripe";

// server/utils/priceId.ts
init_env();
var map = {
  TRIAL: ENV.PRICE_TRIAL,
  BASIC: ENV.PRICE_BASIC,
  SMALL: ENV.PRICE_SMALL,
  MEDIUM: ENV.PRICE_MEDIUM,
  LARGE: ENV.PRICE_LARGE,
  UNLIMITED: ENV.PRICE_UNLIMITED
};
function priceIdForPlan(plan) {
  const id = map[plan];
  if (!id) throw new Error(`No price id configured for plan ${plan}`);
  return id;
}

// server/routes/register-v2.ts
init_env();
import { eq as eq3 } from "drizzle-orm";
var registrationBodySchema = z5.object({
  schoolName: z5.string().min(2, "School name must be at least 2 characters"),
  adminEmail: z5.string().email("Invalid email format"),
  plan: z5.enum(["TRIAL", "BASIC", "SMALL", "MEDIUM", "LARGE", "UNLIMITED"])
});
var registrationParamsSchema = z5.object({
  sessionId: z5.string().min(1, "Session ID is required")
});
function originFromRequest(req) {
  const proto = (req.headers["x-forwarded-proto"] || "http").toString();
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}
function registerV2Routes(app2) {
  if (!ENV.STRIPE_SECRET_KEY) {
    console.warn("STRIPE_SECRET_KEY not configured, V2 registration routes will work in demo mode");
  }
  const stripe = ENV.STRIPE_SECRET_KEY ? new Stripe(ENV.STRIPE_SECRET_KEY, { apiVersion: "2025-07-30.basil" }) : null;
  app2.post("/api/register/init", validate({ body: registrationBodySchema }), async (req, res) => {
    try {
      const { schoolName, adminEmail, plan } = req.valid.body;
      let session;
      if (stripe) {
        session = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price: priceIdForPlan(plan), quantity: 1 }],
          success_url: `${originFromRequest(req)}/register/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${originFromRequest(req)}/register/cancel`,
          metadata: { schoolName, adminEmail, plan },
          client_reference_id: adminEmail
        });
      } else {
        session = {
          id: `cs_demo_${Date.now()}`,
          url: `${originFromRequest(req)}/register/success?session_id=cs_demo_${Date.now()}`
        };
      }
      await db.insert(registrations).values({
        adminEmail,
        schoolName,
        plan,
        stripeCheckoutSessionId: session.id
      }).onConflictDoNothing();
      return sendOk(res, { url: session.url, sessionId: session.id });
    } catch (error) {
      console.error("Registration init error:", error);
      return sendErr(res, "Registration initialization failed", 500, "REGISTRATION_ERROR", error.message);
    }
  });
  const statusQuerySchema = z5.object({
    session_id: z5.string().min(1, "Session ID is required")
  });
  app2.get("/api/register/status", validate({ query: statusQuerySchema }), async (req, res) => {
    try {
      const { session_id: sessionId } = req.valid.query;
      const [row] = await db.select().from(registrations).where(eq3(registrations.stripeCheckoutSessionId, sessionId)).limit(1);
      return sendOk(res, {
        status: row?.status ?? "PENDING",
        sessionId,
        registration: row ? {
          schoolName: row.schoolName,
          adminEmail: row.adminEmail,
          plan: row.plan
        } : null
      });
    } catch (error) {
      console.error("Registration status error:", error);
      return sendErr(res, "Failed to get registration status", 500, "STATUS_ERROR", error.message);
    }
  });
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/passResetScheduler.ts
var PassResetScheduler = class {
  scheduledResets = /* @__PURE__ */ new Map();
  constructor() {
    this.startDailyResetScheduler();
  }
  startDailyResetScheduler() {
    this.scheduleNextMidnightReset();
  }
  scheduleNextMidnightReset() {
    const now = /* @__PURE__ */ new Date();
    const nextMidnight = /* @__PURE__ */ new Date();
    nextMidnight.setDate(now.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    const timeUntilMidnight = nextMidnight.getTime() - now.getTime();
    console.log(`Scheduling next pass reset for ${nextMidnight.toLocaleString()} (in ${Math.round(timeUntilMidnight / 1e3 / 60)} minutes)`);
    setTimeout(async () => {
      await this.performDailyReset();
      this.scheduleNextMidnightReset();
    }, timeUntilMidnight);
  }
  async performDailyReset() {
    try {
      console.log("Starting daily pass reset at midnight...");
      const schools2 = await this.getAllSchools();
      let totalReturned = 0;
      for (const school of schools2) {
        const returned = await storage.returnAllActivePasses(school.schoolId);
        totalReturned += returned;
        if (returned > 0) {
          console.log(`Daily reset: Returned ${returned} active passes for school ${school.name}`);
        }
      }
      console.log(`Daily reset completed. Total passes returned: ${totalReturned}`);
    } catch (error) {
      console.error("Error during daily pass reset:", error);
    }
  }
  async getAllSchools() {
    try {
      return await storage.getAllSchools();
    } catch (error) {
      console.error("Error getting schools for daily reset:", error);
      return [];
    }
  }
  // Manual reset for testing
  async manualReset(schoolId) {
    console.log(`Manual pass reset initiated for school ${schoolId}`);
    const returned = await storage.returnAllActivePasses(schoolId);
    console.log(`Manual reset completed. Returned ${returned} passes for school ${schoolId}`);
    return returned;
  }
  // Get time until next reset (for display purposes)
  getTimeUntilNextReset() {
    const now = /* @__PURE__ */ new Date();
    const nextMidnight = /* @__PURE__ */ new Date();
    nextMidnight.setDate(now.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    const diffMs = nextMidnight.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1e3 * 60 * 60));
    const minutes = Math.floor(diffMs % (1e3 * 60 * 60) / (1e3 * 60));
    return { hours, minutes };
  }
};
var passResetScheduler = new PassResetScheduler();

// server/stripe/webhook-v2.ts
init_env();
init_db();
init_schema();
init_slugify();
import Stripe2 from "stripe";
import bodyParser from "body-parser";
import { eq as eq4 } from "drizzle-orm";
function registerStripeWebhook(app2) {
  if (!ENV.STRIPE_SECRET_KEY || !ENV.STRIPE_WEBHOOK_SECRET) {
    console.warn("Stripe configuration missing, webhook not registered");
    return;
  }
  const stripe = new Stripe2(ENV.STRIPE_SECRET_KEY, { apiVersion: "2025-07-30.basil" });
  app2.post("/api/stripe/webhook", bodyParser.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      if (!sig) throw new Error("Missing stripe-signature header");
      event = stripe.webhooks.constructEvent(req.body, sig, ENV.STRIPE_WEBHOOK_SECRET);
    } catch (err4) {
      console.error("Webhook signature verification failed:", err4.message);
      return res.status(400).send(`Webhook Error: ${err4.message}`);
    }
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const md = s.metadata ?? {};
      const schoolName = md.schoolName || "";
      const adminEmail = md.adminEmail || "";
      const plan = md.plan || "TRIAL";
      const slug = await generateUniqueSlug(schoolName);
      try {
        const [existing] = await db.select().from(registrations).where(eq4(registrations.stripeCheckoutSessionId, s.id)).limit(1);
        if (existing?.status === "ACTIVE") {
          console.log(`Registration ${s.id} already ACTIVE, skipping`);
          return res.json({ received: true });
        }
        await db.transaction(async (tx) => {
          if (!existing) {
            await tx.insert(registrations).values({
              adminEmail,
              schoolName,
              plan,
              stripeCheckoutSessionId: s.id,
              stripeCustomerId: String(s.customer || "")
            }).onConflictDoNothing();
          }
          const [school] = await tx.insert(schools).values({
            name: schoolName,
            slug,
            plan,
            status: "ACTIVE",
            stripeCustomerId: String(s.customer || "")
          }).onConflictDoNothing().returning();
          if (school) {
            await tx.insert(users).values({
              email: adminEmail,
              firstName: "Admin",
              // Will be updated on first login
              lastName: "User",
              password: "",
              // Will be set on first login
              role: "SUPER_ADMIN",
              isAdmin: true,
              isFirstLogin: true,
              schoolId: school.id
            }).onConflictDoNothing();
          }
          await tx.update(registrations).set({
            status: "ACTIVE",
            stripeCustomerId: String(s.customer || "")
          }).where(eq4(registrations.stripeCheckoutSessionId, s.id));
        });
        console.log(`Successfully provisioned school "${schoolName}" for ${adminEmail}`);
      } catch (error) {
        console.error("Error processing webhook:", error);
        try {
          await db.update(registrations).set({ status: "FAILED" }).where(eq4(registrations.stripeCheckoutSessionId, s.id));
        } catch (updateError) {
          console.error("Failed to update registration status to FAILED:", updateError);
        }
        return res.status(500).json({ error: "Failed to process registration" });
      }
    }
    res.json({ received: true });
  });
}

// server/monitoring.ts
init_env();
async function sendErrorNotification(error) {
  if (ENV.NODE_ENV === "development" && !ENV.ENABLE_DEV_NOTIFICATIONS) {
    return;
  }
  const promises = [];
  if (ENV.DISCORD_WEBHOOK_URL) {
    promises.push(sendDiscordNotification(error));
  }
  if (ENV.SLACK_WEBHOOK_URL) {
    promises.push(sendSlackNotification(error));
  }
  await Promise.allSettled(promises);
}
async function sendDiscordNotification(error) {
  try {
    const payload = {
      embeds: [{
        title: "\u{1F6A8} PassPilot Application Error",
        color: 16711680,
        // Red
        fields: [
          {
            name: "Error Message",
            value: `\`\`\`${error.message}\`\`\``,
            inline: false
          },
          {
            name: "Endpoint",
            value: `${error.method} ${error.url}`,
            inline: true
          },
          {
            name: "Environment",
            value: error.environment,
            inline: true
          },
          {
            name: "Timestamp",
            value: error.timestamp,
            inline: true
          },
          {
            name: "Request ID",
            value: error.requestId,
            inline: true
          }
        ],
        footer: {
          text: "PassPilot Error Monitor"
        }
      }]
    };
    if (error.stack) {
      const truncatedStack = error.stack.length > 1e3 ? error.stack.substring(0, 1e3) + "..." : error.stack;
      payload.embeds[0].fields.push({
        name: "Stack Trace",
        value: `\`\`\`${truncatedStack}\`\`\``,
        inline: false
      });
    }
    const response = await fetch(ENV.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error("Failed to send Discord notification:", response.statusText);
    }
  } catch (err4) {
    console.error("Discord notification error:", err4);
  }
}
async function sendSlackNotification(error) {
  try {
    const payload = {
      text: "\u{1F6A8} PassPilot Application Error",
      attachments: [{
        color: "danger",
        fields: [
          {
            title: "Error Message",
            value: error.message,
            short: false
          },
          {
            title: "Endpoint",
            value: `${error.method} ${error.url}`,
            short: true
          },
          {
            title: "Environment",
            value: error.environment,
            short: true
          },
          {
            title: "Request ID",
            value: error.requestId,
            short: true
          }
        ],
        footer: "PassPilot Error Monitor",
        ts: Math.floor(new Date(error.timestamp).getTime() / 1e3)
      }]
    };
    if (error.stack) {
      payload.attachments.push({
        color: "warning",
        title: "Stack Trace",
        text: `\`\`\`${error.stack}\`\`\``,
        footer: "PassPilot Error Monitor"
      });
    }
    const response = await fetch(ENV.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error("Failed to send Slack notification:", response.statusText);
    }
  } catch (err4) {
    console.error("Slack notification error:", err4);
  }
}
function detectNullAccess(error) {
  const nullPatterns = [
    /cannot read propert(y|ies) .* of (null|undefined)/i,
    /null is not an object/i,
    /undefined is not an object/i,
    /cannot access .* before initialization/i,
    /.*\..*\s+is not a function/i
    // obj.method is not a function (often due to null)
  ];
  return nullPatterns.some((pattern) => pattern.test(error.message));
}
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function extractUserId(req) {
  const authReq = req;
  return authReq.user?.id || authReq.user?.userId;
}
var globalErrorHandler = async (err4, req, res, _next) => {
  const requestId = generateRequestId();
  const errorInfo = {
    message: err4.message || "Unknown error",
    stack: err4.stack,
    url: req.originalUrl || req.url,
    method: req.method,
    userAgent: req.get("User-Agent"),
    userId: extractUserId(req),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    environment: ENV.NODE_ENV || "unknown",
    requestId
  };
  const isNullError = detectNullAccess(err4);
  const logLevel = isNullError ? "\u{1F534} NULL ACCESS DETECTED" : "\u274C ERROR";
  console.error(`${logLevel} [${requestId}]`, {
    message: errorInfo.message,
    endpoint: `${errorInfo.method} ${errorInfo.url}`,
    userId: errorInfo.userId,
    userAgent: errorInfo.userAgent,
    isNullError,
    timestamp: errorInfo.timestamp
  });
  if (errorInfo.stack) {
    console.error(`Stack trace [${requestId}]:`, errorInfo.stack);
  }
  try {
    await sendErrorNotification(errorInfo);
  } catch (notificationError) {
    console.error("Failed to send error notification:", notificationError);
  }
  const statusCode = err4.status || err4.statusCode || 500;
  const publicMessage = statusCode < 500 ? err4.message : "Internal Server Error";
  return sendErr(res, publicMessage, statusCode, "UNHANDLED_ERROR", {
    requestId,
    timestamp: errorInfo.timestamp
  });
};
function requestTrackingMiddleware(req, res, next) {
  const requestId = generateRequestId();
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
}
function healthCheckHandler(req, res) {
  const health = {
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    environment: ENV.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  };
  res.json(health);
}

// server/index.ts
var app = express2();
app.set("trust proxy", 1);
registerStripeWebhook(app);
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(cookieParser(ENV.SESSION_SECRET));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  registerV2Routes(app);
  app.use((err4, _req, res, _next) => {
    const status = err4.status || err4.statusCode || 500;
    const message = err4.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err4;
  });
  const isProductionEnv = isProduction() || process.env.REPLIT_DEPLOYMENT === "1";
  log(`Environment check - NODE_ENV: ${ENV.NODE_ENV}, REPLIT_DEPLOYMENT: ${process.env.REPLIT_DEPLOYMENT}, isProduction: ${isProductionEnv}`);
  if (!isProductionEnv) {
    log("Setting up Vite development server");
    await setupVite(app, server);
  } else {
    log("Setting up production static file serving");
    app.use((req, res, next) => {
      if (req.path === "/" || req.path.endsWith("/index.html")) {
        res.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
        log(`No-cache headers set for: ${req.path}`);
      }
      next();
    });
    serveStatic(app);
  }
  const port = ENV.PORT;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
app.use(requestTrackingMiddleware);
app.get("/api/health", healthCheckHandler);
app.use(globalErrorHandler);
