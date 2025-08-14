var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminUsers: () => adminUsers,
  grades: () => grades,
  insertAdminUserSchema: () => insertAdminUserSchema,
  insertGradeSchema: () => insertGradeSchema,
  insertPassSchema: () => insertPassSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertSchoolSchema: () => insertSchoolSchema,
  insertStudentSchema: () => insertStudentSchema,
  insertSubscriptionEventSchema: () => insertSubscriptionEventSchema,
  insertUserSchema: () => insertUserSchema,
  passes: () => passes,
  payments: () => payments,
  planEnum: () => planEnum,
  schools: () => schools,
  statusEnum: () => statusEnum,
  students: () => students,
  subscriptionEvents: () => subscriptionEvents,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var planEnum, statusEnum, schools, users, grades, students, passes, payments, adminUsers, subscriptionEvents, insertSchoolSchema, insertUserSchema, insertGradeSchema, insertStudentSchema, insertPassSchema, insertPaymentSchema, insertAdminUserSchema, insertSubscriptionEventSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    planEnum = pgEnum("plan", [
      "TRIAL",
      "TEACHER_MONTHLY",
      "TEACHER_ANNUAL",
      "SMALL_TEAM_MONTHLY",
      "SMALL_TEAM_ANNUAL",
      "SMALL_SCHOOL",
      "MEDIUM_SCHOOL",
      "LARGE_SCHOOL"
    ]);
    statusEnum = pgEnum("status", [
      "PENDING",
      "ACTIVE",
      "CANCELLED",
      "EXPIRED"
    ]);
    schools = pgTable("schools", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      schoolId: text("school_id").notNull().unique(),
      // e.g., school_xyz123
      name: text("name").notNull(),
      slug: text("slug").notNull().unique(),
      // Normalized unique identifier based on school name
      district: text("district"),
      // School district (optional)
      emailDomain: text("email_domain"),
      // e.g., "cps.k12.oh.us" - extracted from admin email during registration
      plan: planEnum("plan").notNull().default("TRIAL"),
      status: statusEnum("status").notNull().default("PENDING"),
      stripeCustomerId: text("stripe_customer_id"),
      stripeSubscriptionId: text("stripe_subscription_id"),
      maxTeachers: integer("max_teachers").notNull().default(1),
      // 1 teacher limit for trials
      maxStudents: integer("max_students").notNull().default(200),
      // Student limit per plan
      adminEmail: text("admin_email").notNull(),
      verified: boolean("verified").notNull().default(false),
      // Email verification status
      verificationToken: text("verification_token"),
      // Token for email verification
      verificationTokenExpiry: timestamp("verification_token_expiry"),
      // Token expiration time
      trialStartDate: timestamp("trial_start_date"),
      // Will be set when email is verified
      trialEndDate: timestamp("trial_end_date"),
      // Calculate 30 days from start
      isTrialExpired: boolean("is_trial_expired").notNull().default(false),
      // Track trial status
      subscriptionCancelledAt: timestamp("subscription_cancelled_at"),
      // When subscription was cancelled
      subscriptionEndsAt: timestamp("subscription_ends_at"),
      // When subscription access ends
      createdAt: timestamp("created_at").defaultNow()
    });
    users = pgTable("users", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      firebaseUid: text("firebase_uid").unique(),
      // Firebase Auth UID
      email: text("email").notNull(),
      password: text("password"),
      // Optional for Firebase-only users
      name: text("name").notNull(),
      schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
      // Nullable for platform owner
      isAdmin: boolean("is_admin").notNull().default(false),
      isPlatformOwner: boolean("is_platform_owner").notNull().default(false),
      // Platform owner flag
      assignedGrades: jsonb("assigned_grades").$type().default([]),
      invitedBy: uuid("invited_by"),
      // Admin who added this teacher
      status: text("status").notNull().default("pending"),
      // pending, active, suspended
      resetToken: text("reset_token"),
      resetTokenExpiry: timestamp("reset_token_expiry"),
      // User settings
      enableNotifications: boolean("enable_notifications").notNull().default(true),
      autoReturn: boolean("auto_return").notNull().default(false),
      passTimeout: integer("pass_timeout").notNull().default(30),
      // minutes
      kioskPin: text("kiosk_pin"),
      // 4-digit PIN for kiosk mode
      createdAt: timestamp("created_at").defaultNow()
    });
    grades = pgTable("grades", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at").defaultNow()
    });
    students = pgTable("students", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      grade: text("grade").notNull(),
      studentId: text("student_id"),
      schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at").defaultNow()
    });
    passes = pgTable("passes", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      studentId: uuid("student_id").notNull().references(() => students.id),
      teacherId: uuid("teacher_id").notNull().references(() => users.id),
      schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
      checkoutTime: timestamp("checkout_time").defaultNow(),
      returnTime: timestamp("return_time"),
      status: text("status", { enum: ["out", "returned"] }).notNull().default("out"),
      // out, returned
      passType: text("pass_type").notNull().default("general"),
      // general, nurse, discipline
      customReason: text("custom_reason"),
      // teacher-specified reason
      duration: integer("duration")
      // in minutes
    });
    payments = pgTable("payments", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
      amountCents: integer("amount_cents").notNull(),
      currency: text("currency").notNull().default("usd"),
      stripePiId: text("stripe_pi_id"),
      // Payment Intent ID
      stripeSessId: text("stripe_sess_id"),
      // Checkout Session ID
      plan: planEnum("plan").notNull(),
      status: text("status").notNull()
    });
    adminUsers = pgTable("admin_users", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      email: text("email").notNull().unique(),
      passwordHash: text("password_hash").notNull()
    });
    subscriptionEvents = pgTable("subscription_events", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
      event: text("event").notNull(),
      // 'SUB_CREATED' | 'PLAN_UPDATED' | 'SUB_CANCELED'
      previousPlan: planEnum("previous_plan"),
      newPlan: planEnum("new_plan"),
      stripeSubId: text("stripe_sub_id")
    });
    insertSchoolSchema = createInsertSchema(schools).omit({
      id: true,
      createdAt: true
    });
    insertUserSchema = createInsertSchema(users).omit({
      id: true,
      createdAt: true
    });
    insertGradeSchema = createInsertSchema(grades).omit({
      id: true,
      createdAt: true
    });
    insertStudentSchema = createInsertSchema(students).omit({
      id: true,
      createdAt: true
    });
    insertPassSchema = createInsertSchema(passes).omit({
      id: true,
      checkoutTime: true
    });
    insertPaymentSchema = createInsertSchema(payments).omit({
      id: true,
      createdAt: true
    });
    insertAdminUserSchema = createInsertSchema(adminUsers).omit({
      id: true,
      createdAt: true
    });
    insertSubscriptionEventSchema = createInsertSchema(subscriptionEvents).omit({
      id: true,
      createdAt: true
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
    neonConfig.webSocketConstructor = ws;
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema: schema_exports });
  }
});

// server/storage.ts
import { eq, and, lt } from "drizzle-orm";
var DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_db();
    init_schema();
    DatabaseStorage = class {
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
          teacher: users
        }).from(passes).innerJoin(students, eq(passes.studentId, students.id)).innerJoin(users, eq(passes.teacherId, users.id)).where(and(eq(passes.schoolId, schoolId), eq(passes.status, "out")));
        return result.map((row) => ({
          ...row.pass,
          student: row.student,
          teacher: row.teacher
        }));
      }
      async getActivePassesByTeacher(teacherId) {
        const result = await db.select({
          pass: passes,
          studentName: students.name
        }).from(passes).innerJoin(students, eq(passes.studentId, students.id)).where(and(eq(passes.teacherId, teacherId), eq(passes.status, "out")));
        return result.map((row) => ({
          ...row.pass,
          studentName: row.studentName
        }));
      }
      async getPassesBySchool(schoolId, filters) {
        let query = db.select({
          pass: passes,
          student: students,
          teacher: users
        }).from(passes).innerJoin(students, eq(passes.studentId, students.id)).innerJoin(users, eq(passes.teacherId, users.id)).where(eq(passes.schoolId, schoolId));
        const result = await query;
        let filteredResult = result;
        if (filters?.dateStart) {
          filteredResult = filteredResult.filter(
            (row) => row.pass.checkoutTime && row.pass.checkoutTime >= filters.dateStart
          );
        }
        if (filters?.dateEnd) {
          filteredResult = filteredResult.filter(
            (row) => row.pass.checkoutTime && row.pass.checkoutTime <= filters.dateEnd
          );
        }
        if (filters?.grade) {
          filteredResult = filteredResult.filter((row) => row.student.grade === filters.grade);
        }
        if (filters?.teacherId) {
          filteredResult = filteredResult.filter((row) => row.pass.teacherId === filters.teacherId);
        }
        return filteredResult.map((row) => ({
          ...row.pass,
          student: row.student,
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
        const activePasses = await db.select().from(passes).where(and(eq(passes.schoolId, schoolId), eq(passes.status, "out")));
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
    storage = new DatabaseStorage();
  }
});

// server/auth/session.ts
import jwt from "jsonwebtoken";
function setUserSession(res, payload) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured");
  }
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d",
    audience: "passpilot",
    issuer: "passpilot"
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1e3
    // 7 days
  });
}
function clearUserSession(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production"
  });
}
function getUserFromSession(token) {
  if (!process.env.JWT_SECRET) {
    return null;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      audience: "passpilot",
      issuer: "passpilot"
    });
    return payload;
  } catch {
    return null;
  }
}
var COOKIE_NAME;
var init_session = __esm({
  "server/auth/session.ts"() {
    "use strict";
    COOKIE_NAME = "pp_session";
  }
});

// server/routes-billing.ts
var routes_billing_exports = {};
__export(routes_billing_exports, {
  createPortalSession: () => createPortalSession,
  handleCheckoutSuccess: () => handleCheckoutSuccess,
  listPayments: () => listPayments,
  listSchools: () => listSchools,
  register: () => register,
  stripeWebhook: () => stripeWebhook
});
import Stripe from "stripe";
async function register(req2, res) {
  try {
    const { schoolName, adminName, email, plan } = req2.body;
    if (!schoolName || !adminName || !email) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }
    const planConfig = PLAN_CONFIG[plan || "TRIAL"];
    if (!planConfig) {
      return res.status(400).json({ ok: false, error: "Invalid plan selected" });
    }
    if (plan === "TRIAL" || !plan) {
      return res.json({
        ok: true,
        message: "Trial registration completed",
        checkoutUrl: null
      });
    }
    const existingSchool = await storage.getUserByEmail(email);
    let schoolId;
    let stripeCustomerId = existingSchool?.schoolId ? (await storage.getSchool(existingSchool.schoolId))?.stripeCustomerId : null;
    if (existingSchool?.schoolId) {
      schoolId = existingSchool.schoolId;
      await storage.updateSchool(schoolId, {
        name: schoolName,
        plan,
        status: "PENDING",
        maxTeachers: planConfig.maxTeachers,
        maxStudents: planConfig.maxStudents
      });
    } else {
      const schoolSlug = schoolName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 50) + "-" + Date.now().toString().slice(-6);
      const newSchool = await storage.createSchool({
        schoolId: `school_${Date.now()}`,
        name: schoolName,
        slug: schoolSlug,
        emailDomain: email.split("@")[1],
        plan,
        status: "PENDING",
        maxTeachers: planConfig.maxTeachers,
        maxStudents: planConfig.maxStudents,
        adminEmail: email,
        verified: false
      });
      schoolId = newSchool.id;
    }
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        name: `${adminName} (${schoolName})`,
        metadata: { schoolId, plan }
      });
      stripeCustomerId = customer.id;
      await storage.updateSchool(schoolId, { stripeCustomerId });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{
        price: planConfig.price || "",
        quantity: 1
      }],
      success_url: `${process.env.APP_URL || "http://localhost:5000"}/api/billing/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || "http://localhost:5000"}/register`,
      metadata: {
        schoolId,
        email,
        plan
      }
    });
    return res.json({
      ok: true,
      checkoutUrl: session.url
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      ok: false,
      error: "Registration failed"
    });
  }
}
async function handleCheckoutSuccess(req2, res) {
  try {
    const sessionId = req2.query.session_id;
    if (!sessionId) {
      return res.redirect("/register?error=missing_session");
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"]
    });
    const schoolId = session.metadata?.schoolId;
    const email = session.metadata?.email;
    const plan = session.metadata?.plan;
    if (!schoolId || !email) {
      return res.redirect("/register?error=invalid_session");
    }
    const school = await storage.getSchool(schoolId);
    const adminUser = await storage.getUserByEmail(email);
    if (!school || !adminUser) {
      return res.redirect("/register?error=account_not_found");
    }
    await storage.updateSchool(schoolId, {
      status: "ACTIVE",
      plan,
      stripeSubscriptionId: session.subscription,
      verified: true
    });
    setUserSession(res, {
      userId: adminUser.id,
      schoolId: school.id,
      email: adminUser.email,
      role: "ADMIN"
    });
    console.log(`Auto-login successful for ${email} after payment completion`);
    return res.redirect("/");
  } catch (error) {
    console.error("Checkout success error:", error);
    return res.redirect("/register?error=processing_failed");
  }
}
async function listSchools(req2, res) {
  try {
    const schools2 = await storage.getAllSchools();
    res.json(schools2);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
async function listPayments(req2, res) {
  try {
    const payments2 = await storage.getAllPayments();
    res.json(payments2.slice(0, 200));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
async function createPortalSession(req2, res) {
  try {
    const { customerId } = req2.body;
    if (!customerId) {
      return res.status(400).json({ error: "Customer ID required" });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.APP_URL || "http://localhost:5000"}/billing`
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error("Portal session error:", error);
    res.status(500).json({ error: "Failed to create portal session" });
  }
}
var PLAN_CONFIG, stripe, stripeWebhook;
var init_routes_billing = __esm({
  "server/routes-billing.ts"() {
    "use strict";
    init_storage();
    init_session();
    PLAN_CONFIG = {
      TRIAL: {
        maxTeachers: 1,
        maxStudents: 200,
        price: null,
        // Free trial 
        name: "Free Trial",
        duration: "14 days"
      },
      TEACHER_MONTHLY: {
        maxTeachers: 1,
        maxStudents: 200,
        price: process.env.STRIPE_PRICE_TEACHER_MONTHLY || "",
        name: "Teacher Plan",
        duration: "monthly"
      },
      TEACHER_ANNUAL: {
        maxTeachers: 1,
        maxStudents: 200,
        price: process.env.STRIPE_PRICE_TEACHER_ANNUAL || "",
        name: "Teacher Plan",
        duration: "yearly"
      },
      SMALL_TEAM_MONTHLY: {
        maxTeachers: 10,
        maxStudents: 1500,
        price: process.env.STRIPE_PRICE_SMALL_TEAM_MONTHLY || "",
        name: "Small Team Plan",
        duration: "monthly"
      },
      SMALL_TEAM_ANNUAL: {
        maxTeachers: 10,
        maxStudents: 1500,
        price: process.env.STRIPE_PRICE_SMALL_TEAM_ANNUAL || "",
        name: "Small Team Plan",
        duration: "yearly"
      },
      SMALL_SCHOOL: {
        maxTeachers: -1,
        maxStudents: 500,
        price: process.env.STRIPE_PRICE_SMALL_SCHOOL || "",
        name: "Small School Plan",
        duration: "yearly"
      },
      MEDIUM_SCHOOL: {
        maxTeachers: -1,
        maxStudents: 1e3,
        price: process.env.STRIPE_PRICE_MEDIUM_SCHOOL || "",
        name: "Medium School Plan",
        duration: "yearly"
      },
      LARGE_SCHOOL: {
        maxTeachers: -1,
        maxStudents: 2e3,
        price: process.env.STRIPE_PRICE_LARGE_SCHOOL || "",
        name: "Large School Plan",
        duration: "yearly"
      }
    };
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Missing required Stripe secret: STRIPE_SECRET_KEY");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-07-30.basil"
    });
    stripeWebhook = async (req2, res) => {
      const sig = req2.headers["stripe-signature"];
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req2.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object;
            const schoolId = session.metadata?.schoolId;
            const plan = session.metadata?.plan;
            const subId = session.subscription;
            if (schoolId && plan) {
              await storage.updateSchool(schoolId, {
                status: "ACTIVE",
                plan,
                stripeSubscriptionId: subId
              });
              await storage.createPayment({
                schoolId,
                amountCents: session.amount_total || 0,
                currency: session.currency || "usd",
                stripePiId: session.payment_intent,
                stripeSessId: session.id,
                plan,
                status: "succeeded"
              });
              console.log(`School ${schoolId} subscription activated with plan ${plan}`);
            }
            break;
          }
          case "customer.subscription.deleted": {
            const subscription = event.data.object;
            const subscriptionId = subscription.id;
            const schools2 = await storage.getAllSchools();
            const school = schools2.find((s) => s.stripeSubscriptionId === subscriptionId);
            if (school) {
              await storage.updateSchool(school.id, {
                status: "CANCELLED",
                subscriptionCancelledAt: /* @__PURE__ */ new Date(),
                subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3)
                // 30 days from now
              });
              console.log(`School ${school.id} subscription cancelled via subscription ID lookup`);
            } else {
              console.log(`No school found for cancelled subscription ${subscriptionId}`);
            }
            break;
          }
          case "customer.subscription.updated": {
            const subscription = event.data.object;
            const subscriptionId = subscription.id;
            const priceId = subscription.items.data[0]?.price?.id;
            const planMapping = {
              "price_1RuILiBw14YCsyD6O5rn8hS8": "TEACHER_MONTHLY",
              "price_1RuILoBw14YCsyD6TZKw5xJ4": "TEACHER_ANNUAL",
              "price_1RuIMXBw14YCsyD6qGxYkpRK": "SMALL_TEAM_MONTHLY",
              "price_1RuIMaBw14YCsyD6YJeUqL4D": "SMALL_TEAM_ANNUAL",
              "price_1RuIMdBw14YCsyD6kMEIEhTG": "LARGE_SCHOOL"
            };
            const newPlan = planMapping[priceId || ""];
            const schools2 = await storage.getAllSchools();
            const school = schools2.find((s) => s.stripeSubscriptionId === subscriptionId);
            if (school && newPlan) {
              await storage.updateSchool(school.id, {
                plan: newPlan
              });
              console.log(`School ${school.id} plan updated to ${newPlan} via subscription ID lookup`);
            } else if (!school) {
              console.log(`No school found for updated subscription ${subscriptionId}`);
            } else {
              console.log(`Unknown price ID ${priceId} for subscription ${subscriptionId}`);
            }
            break;
          }
          case "invoice.payment_failed": {
            const invoice = event.data.object;
            const customerId = invoice.customer;
            console.log(`Payment failed for customer ${customerId}`);
            break;
          }
          default:
            console.log(`Unhandled event type: ${event.type}`);
        }
        res.json({ received: true });
      } catch (error) {
        console.error("Webhook handler error:", error);
        res.status(500).json({ error: "Webhook processing failed" });
      }
    };
  }
});

// server/firebaseAdmin.ts
var firebaseAdmin_exports = {};
__export(firebaseAdmin_exports, {
  default: () => firebaseAdmin_default
});
import admin from "firebase-admin";
import fs2 from "fs";
import path3 from "path";
function getPrivateKey() {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";
  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    console.warn("[FirebaseAdmin] Environment variable appears corrupted, trying fallback file...");
    try {
      const keyPath = path3.resolve(import.meta.dirname, "..", "firebase-key.txt");
      if (fs2.existsSync(keyPath)) {
        privateKey = fs2.readFileSync(keyPath, "utf-8");
        console.log("[FirebaseAdmin] Using Firebase key from fallback file");
      }
    } catch (err) {
      console.warn("[FirebaseAdmin] Fallback file read failed:", err instanceof Error ? err.message : String(err));
    }
  }
  return privateKey.replace(/\\n/g, "\n").replace(/"/g, "").replace(/^\s+|\s+$/g, "");
}
var req, missing, firebaseAdmin_default;
var init_firebaseAdmin = __esm({
  "server/firebaseAdmin.ts"() {
    "use strict";
    req = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
    missing = req.filter((k) => !process.env[k]);
    if (missing.length) {
      const msg = `[FirebaseAdmin] Missing envs: ${missing.join(", ")}`;
      console.warn(msg + " \u2014 skipping Firebase Admin init.");
    } else if (!admin.apps.length) {
      try {
        const privateKey = getPrivateKey();
        if (!privateKey.includes("BEGIN PRIVATE KEY")) {
          throw new Error("Invalid private key format");
        }
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey
          })
        });
        console.log("[FirebaseAdmin] Successfully initialized with Firebase");
      } catch (err) {
        console.warn("[FirebaseAdmin] Init failed:", err instanceof Error ? err.message : String(err));
        console.warn("[FirebaseAdmin] Continuing without Firebase - deployment will still work");
      }
    }
    firebaseAdmin_default = admin;
  }
});

// server/index.ts
import express2 from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";

// server/routes.ts
init_storage();
init_schema();
init_session();
import { createServer } from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { nanoid } from "nanoid";

// server/auth/requireUser.ts
init_session();
function optionalUser(req2, res, next) {
  const token = req2.cookies?.pp_session;
  if (token) {
    const user = getUserFromSession(token);
    if (user) {
      req2.user = user;
    }
  }
  next();
}

// server/routes.ts
import { randomUUID } from "crypto";
import Stripe2 from "stripe";

// server/emailService.ts
import { MailService } from "@sendgrid/mail";
if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}
var mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);
async function sendPasswordResetEmail(email, resetToken, userName) {
  const resetUrl = `${process.env.NODE_ENV === "production" ? "https://" + process.env.REPLIT_DOMAINS : "http://localhost:5000"}/reset-password?token=${resetToken}`;
  try {
    await mailService.send({
      to: email,
      from: {
        email: "noreply@passpilotsystem.com",
        name: "PassPilot"
      },
      subject: "Reset Your PassPilot Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your PassPilot Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Password Reset</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Reset your PassPilot password</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hi ${userName},</h2>
            
            <p>We received a request to reset your PassPilot password. If you made this request, click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">Reset Password</a>
            </div>
            
            <p style="color: #666; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px;">
              <strong>Security Notice:</strong> This reset link will expire in 1 hour for your security. If you didn't request this reset, please ignore this email - your password will remain unchanged.
            </p>
            
            <p style="color: #888; font-size: 12px; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="word-break: break-all;">${resetUrl}</span>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${userName},

We received a request to reset your PassPilot password.

To reset your password, click this link: ${resetUrl}

This reset link will expire in 1 hour for your security.

If you didn't request this reset, please ignore this email - your password will remain unchanged.

Best regards,
The PassPilot Team
      `
    });
    console.log("Password reset email sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
}

// server/passResetScheduler.ts
init_storage();
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

// server/utils/schoolSlug.ts
function normalizeSchoolSlug(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function validateSchoolName(name) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "School name is required" };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: "School name must be at least 2 characters long" };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: "School name must be less than 100 characters" };
  }
  const slug = normalizeSchoolSlug(trimmed);
  if (!slug || slug.length < 1) {
    return { valid: false, error: "School name must contain at least one alphanumeric character" };
  }
  return { valid: true };
}

// server/routes/test.ts
init_storage();
import { Router } from "express";
var testRouter = Router();
testRouter.post("/__test__/createSchool", async (req2, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).end();
  }
  try {
    const { name } = req2.body || {};
    if (!name) {
      return res.status(400).json({ error: "Missing name" });
    }
    const slug = normalizeSchoolSlug(name);
    console.log(`[TEST] Checking for duplicate school slug: ${slug}`);
    const existing = await storage.getSchoolBySlug(slug);
    if (existing) {
      console.log(`[TEST] Duplicate found: ${existing.name}`);
      return res.status(409).json({
        error: "School already exists",
        existing: { id: existing.id, name: existing.name, slug: existing.slug }
      });
    }
    const schoolData = {
      schoolId: `test_${Date.now()}`,
      name,
      slug,
      plan: "TRIAL",
      adminEmail: `test-${Date.now()}@example.com`,
      maxTeachers: 1,
      maxStudents: 200,
      verified: true,
      isTrialExpired: false
    };
    const school = await storage.createSchool(schoolData);
    console.log(`[TEST] Created test school: ${school.name} (${school.slug})`);
    return res.status(201).json({
      id: school.id,
      name: school.name,
      slug: school.slug
    });
  } catch (error) {
    console.error("[TEST] Error creating school:", error);
    return res.status(500).json({ error: error.message });
  }
});
testRouter.post("/__test__/checkSlug", async (req2, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).end();
  }
  try {
    const { name } = req2.body || {};
    if (!name) {
      return res.status(400).json({ error: "Missing name" });
    }
    const slug = normalizeSchoolSlug(name);
    const existing = await storage.getSchoolBySlug(slug);
    return res.json({
      name,
      slug,
      exists: !!existing,
      existing: existing ? {
        id: existing.id,
        name: existing.name,
        slug: existing.slug
      } : null
    });
  } catch (error) {
    console.error("[TEST] Error checking slug:", error);
    return res.status(500).json({ error: error.message });
  }
});

// server/routes-admin.ts
init_db();
init_schema();
import { eq as eq2, desc, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt2 from "jsonwebtoken";
function signAdmin(email) {
  return jwt2.sign({ role: "superadmin", email }, process.env.JWT_SECRET, { expiresIn: "7d" });
}
async function requireAdmin(req2, res, next) {
  try {
    const token = req2.cookies?.admin;
    if (!token) return res.status(401).send("no-auth");
    const payload = jwt2.verify(token, process.env.JWT_SECRET);
    if (payload.role !== "superadmin") return res.status(403).send("forbidden");
    const row = await db.select().from(adminUsers).where(eq2(adminUsers.email, payload.email)).limit(1);
    if (!row.length) return res.status(401).send("no-admin");
    next();
  } catch {
    return res.status(401).send("invalid-token");
  }
}
var loginHits = /* @__PURE__ */ new Map();
function rateLimitLogin(req2, res, next) {
  const key = req2.ip || req2.headers["x-forwarded-for"] || "unknown";
  const now = Date.now();
  const rec = loginHits.get(key) || { count: 0, ts: now };
  if (now - rec.ts > 6e4) {
    rec.count = 0;
    rec.ts = now;
  }
  rec.count++;
  loginHits.set(key, rec);
  if (rec.count > 5) return res.status(429).send("too-many");
  next();
}
function registerAdminRoutes(app2) {
  app2.post("/api/admin/bootstrap", async (req2, res) => {
    try {
      const { email, password, token } = req2.body || {};
      if (!email || !password) {
        return res.status(400).json({ ok: false, error: "missing" });
      }
      const [{ value: totalAdmins }] = await db.select({ value: count() }).from(adminUsers);
      if (process.env.ADMIN_BOOTSTRAP_TOKEN && token !== process.env.ADMIN_BOOTSTRAP_TOKEN) {
        return res.status(401).json({ ok: false, error: "bad-bootstrap-token" });
      }
      if (!process.env.ADMIN_BOOTSTRAP_TOKEN && totalAdmins > 0) {
        return res.status(403).json({ ok: false, error: "bootstrap-closed" });
      }
      const hash = await bcrypt.hash(password, 10);
      try {
        await db.insert(adminUsers).values({ email, passwordHash: hash });
      } catch {
        return res.status(409).json({ ok: false, error: "email-exists" });
      }
      const jwtToken = signAdmin(email);
      res.cookie("admin", jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1e3
        // 7 days
      });
      console.log(`\u2705 Admin user created successfully: ${email}`);
      res.json({ ok: true });
    } catch (error) {
      console.error("Bootstrap error:", error);
      res.status(500).json({ ok: false, error: "server-error" });
    }
  });
  app2.post("/api/admin/login", rateLimitLogin, async (req2, res) => {
    try {
      const { email, password } = req2.body || {};
      if (!email || !password) {
        return res.status(400).json({ ok: false, error: "missing-credentials" });
      }
      const row = await db.select().from(adminUsers).where(eq2(adminUsers.email, email)).limit(1);
      if (!row.length) {
        return res.status(401).send("bad-credentials");
      }
      const isValidPassword = await bcrypt.compare(password, row[0].passwordHash);
      if (!isValidPassword) {
        return res.status(401).send("bad-credentials");
      }
      const token = signAdmin(email);
      res.cookie("admin", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1e3
      });
      res.json({ ok: true });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ ok: false, error: "server-error" });
    }
  });
  app2.post("/api/admin/logout", (_req, res) => {
    res.clearCookie("admin", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });
    res.json({ ok: true });
  });
  app2.get("/api/admin/status", async (_req, res) => {
    try {
      const [{ value: totalAdmins }] = await db.select({ value: count() }).from(adminUsers);
      res.json({ hasAdmins: totalAdmins > 0 });
    } catch (error) {
      console.error("Admin status error:", error);
      res.status(500).json({ error: "Failed to check admin status" });
    }
  });
  app2.use("/api/admin", (req2, res, next) => {
    if (req2.path === "/status" || req2.path === "/bootstrap" || req2.path === "/login" || req2.path === "/logout") {
      return next();
    }
    requireAdmin(req2, res, next);
  });
  app2.get("/api/admin/schools", async (_req, res) => {
    try {
      const allSchools = await db.select().from(schools);
      res.json(allSchools);
    } catch (error) {
      console.error("Get schools error:", error);
      res.status(500).json({ error: "Failed to fetch schools" });
    }
  });
  app2.delete("/api/admin/schools/:id", async (req2, res) => {
    const id = String(req2.params.id || "");
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
      return res.status(400).json({ error: "bad_id" });
    }
    try {
      const [target] = await db.select().from(schools).where(eq2(schools.id, id)).limit(1);
      if (!target) {
        return res.status(404).json({ error: "not_found" });
      }
      if (target.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
        try {
          const stripe3 = await import("stripe").then((m) => new m.default(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" }));
          await stripe3.subscriptions.cancel(target.stripeSubscriptionId);
          console.log(`\u2705 Stripe subscription cancelled: ${target.stripeSubscriptionId}`);
        } catch (e) {
          if (e?.statusCode !== 404) {
            console.error("[admin.delete] stripe cancel failed", e);
          }
        }
      }
      await db.transaction(async (tx) => {
        await tx.delete(schools).where(eq2(schools.id, id));
      });
      console.log(`\u{1F5D1}\uFE0F School permanently deleted: ${target.name} (${id})`);
      return res.json({ ok: true, id });
    } catch (e) {
      console.error("[admin.delete] unexpected error", e);
      return res.status(500).json({ error: "delete_failed", detail: e?.message });
    }
  });
  app2.get("/api/admin/payments", async (_req, res) => {
    try {
      const allPayments = await db.select().from(payments);
      res.json(allPayments);
    } catch (error) {
      console.error("Get payments error:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });
  app2.get("/api/admin/events", async (_req, res) => {
    try {
      const events = await db.select().from(subscriptionEvents).orderBy(desc(subscriptionEvents.createdAt)).limit(500);
      res.json(events);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });
  app2.patch("/api/admin/schools/:id", async (req2, res) => {
    try {
      const { plan, status, maxTeachers, maxStudents, adminEmail } = req2.body ?? {};
      const updates = {
        ...plan ? { plan } : {},
        ...status ? { status } : {},
        ...maxTeachers !== void 0 ? { maxTeachers } : {},
        ...maxStudents !== void 0 ? { maxStudents } : {},
        ...adminEmail ? { adminEmail } : {}
      };
      await db.update(schools).set(updates).where(eq2(schools.id, req2.params.id));
      res.json({ ok: true });
    } catch (error) {
      console.error("Update school error:", error);
      res.status(500).json({ error: "Failed to update school" });
    }
  });
}

// server/routes.ts
console.log("School validation removed - all registrations allowed");
function getMaxTeachersForPlan(plan) {
  const planConfig = {
    "TRIAL": { maxTeachers: 1 },
    "TEACHER_MONTHLY": { maxTeachers: 1 },
    "TEACHER_ANNUAL": { maxTeachers: 1 },
    "SMALL_TEAM_MONTHLY": { maxTeachers: 10 },
    "SMALL_TEAM_ANNUAL": { maxTeachers: 10 },
    "SMALL_SCHOOL": { maxTeachers: -1 },
    "MEDIUM_SCHOOL": { maxTeachers: -1 },
    "LARGE_SCHOOL": { maxTeachers: -1 }
  };
  return planConfig[plan]?.maxTeachers || 1;
}
function getMaxStudentsForPlan(plan) {
  const planConfig = {
    "TRIAL": { maxStudents: 200 },
    "TEACHER_MONTHLY": { maxStudents: 200 },
    "TEACHER_ANNUAL": { maxStudents: 200 },
    "SMALL_TEAM_MONTHLY": { maxStudents: 1500 },
    "SMALL_TEAM_ANNUAL": { maxStudents: 1500 },
    "SMALL_SCHOOL": { maxStudents: 500 },
    "MEDIUM_SCHOOL": { maxStudents: 1e3 },
    "LARGE_SCHOOL": { maxStudents: 2e3 }
  };
  return planConfig[plan]?.maxStudents || 200;
}
function calculateTrialEndDate(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14);
  return endDate;
}
function isTrialExpired(trialEndDate) {
  if (!trialEndDate) return false;
  return /* @__PURE__ */ new Date() > trialEndDate;
}
var stripe2 = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe2 = new Stripe2(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16"
  });
}
var requireAuth = (req2, res, next) => {
  const authHeader = req2.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const token = authHeader.substring(7);
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }
  console.log("Auth middleware - token:", token.substring(0, 8) + "...");
  req2.userId = token;
  next();
};
var checkTrialStatus = async (req2, res, next) => {
  try {
    if (!req2.userId) {
      return next();
    }
    const user = await storage.getUser(req2.userId);
    if (!user || !user.schoolId) {
      return next();
    }
    const school = await storage.getSchool(user.schoolId);
    if (!school || school.plan !== "free_trial") {
      return next();
    }
    if (school.trialEndDate && isTrialExpired(school.trialEndDate)) {
      if (!school.isTrialExpired) {
        await storage.updateSchool(school.id, { isTrialExpired: true });
      }
      return res.status(403).json({
        message: "Your 30-day free trial has expired. Please upgrade to continue using PassPilot.",
        trialExpired: true,
        upgradeRequired: true
      });
    }
    next();
  } catch (error) {
    console.error("Trial check error:", error);
    next();
  }
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
  if (process.env.NODE_ENV !== "production") {
    app2.use(testRouter);
    console.log("\u{1F9EA} Test routes mounted for development");
  }
  app2.get("/api/billing/checkout-success", async (req2, res) => {
    const { handleCheckoutSuccess: handleCheckoutSuccess2 } = await Promise.resolve().then(() => (init_routes_billing(), routes_billing_exports));
    return handleCheckoutSuccess2(req2, res);
  });
  app2.post("/api/auth/login", async (req2, res) => {
    try {
      const { email, password, schoolId } = req2.body;
      console.log("Login attempt:", { email, hasSchoolId: !!schoolId });
      if (!email || !password) {
        return res.status(400).json({ error: "missing_credentials" });
      }
      if (schoolId) {
        console.log("Single-step login for school:", schoolId);
        const user = await storage.getUserByEmailAndSchool(email, schoolId);
        if (!user) {
          return res.status(401).json({ error: "invalid_credentials" });
        }
        let passwordValid2 = false;
        if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
          const bcrypt2 = (await import("bcryptjs")).default;
          passwordValid2 = await bcrypt2.compare(password, user.password);
        } else {
          passwordValid2 = user.password === password;
        }
        if (!passwordValid2) {
          return res.status(401).json({ error: "invalid_credentials" });
        }
        const school = await storage.getSchool(user.schoolId);
        if (!school) {
          return res.status(500).json({ error: "school_not_found" });
        }
        setUserSession(res, {
          userId: user.id,
          schoolId: user.schoolId,
          email: user.email,
          role: user.isAdmin ? "ADMIN" : "TEACHER"
        });
        return res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            schoolId: user.schoolId,
            isAdmin: user.isAdmin,
            schoolName: school.name
          }
        });
      }
      const candidates = await storage.getUsersByEmail(email);
      console.log("Found candidates:", candidates.length);
      if (candidates.length === 0) {
        return res.status(401).json({ error: "invalid_credentials" });
      }
      let passwordValid = false;
      const firstPassword = candidates[0].password;
      if (firstPassword.startsWith("$2a$") || firstPassword.startsWith("$2b$")) {
        const bcrypt2 = (await import("bcryptjs")).default;
        passwordValid = await bcrypt2.compare(password, firstPassword);
      } else {
        passwordValid = firstPassword === password;
      }
      if (!passwordValid) {
        return res.status(401).json({ error: "invalid_credentials" });
      }
      if (candidates.length === 1) {
        const user = candidates[0];
        const school = await storage.getSchool(user.schoolId);
        if (!school) {
          return res.status(500).json({ error: "school_not_found" });
        }
        setUserSession(res, {
          userId: user.id,
          schoolId: user.schoolId,
          email: user.email,
          role: user.isAdmin ? "ADMIN" : "TEACHER"
        });
        return res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            schoolId: user.schoolId,
            isAdmin: user.isAdmin,
            schoolName: school.name
          }
        });
      }
      const schoolIds = candidates.map((c) => c.schoolId);
      const schools2 = await Promise.all(schoolIds.map((id) => storage.getSchool(id)));
      const validSchools = schools2.filter(Boolean).map((school) => ({
        id: school.id,
        name: school.name
      }));
      console.log("Multiple schools found:", validSchools.length);
      return res.json({
        success: false,
        requiresSchool: true,
        schools: validSchools
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "login_failed" });
    }
  });
  app2.post("/api/auth/logout", (req2, res) => {
    clearUserSession(res);
    res.json({ success: true });
  });
  app2.get("/api/auth/me", optionalUser, async (req2, res) => {
    if (!req2.user) {
      return res.json({ authenticated: false });
    }
    try {
      const user = await storage.getUser(req2.user.userId);
      const school = await storage.getSchool(req2.user.schoolId);
      if (!user || !school) {
        clearUserSession(res);
        return res.json({ authenticated: false });
      }
      res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          schoolId: user.schoolId,
          isAdmin: user.isAdmin,
          schoolName: school.name
        }
      });
    } catch (error) {
      clearUserSession(res);
      res.json({ authenticated: false });
    }
  });
  app2.post("/api/register-school", async (req2, res) => {
    try {
      const { school, admin: admin2, subscription } = req2.body;
      console.log("School registration request:", {
        schoolName: school?.name,
        adminEmail: admin2?.email,
        plan: subscription?.planId
      });
      if (!school.name || !admin2.email || !admin2.name || !admin2.password || !subscription.planId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const adminEmailNorm = admin2.email.trim().toLowerCase();
      const existingUser = await storage.getUserByEmail(adminEmailNorm);
      if (existingUser) {
        console.log(`User already exists but allowing registration: ${adminEmailNorm}`);
        await storage.deleteUser(existingUser.id);
        console.log(`Cleaned up existing user for fresh registration: ${adminEmailNorm}`);
      }
      const emailDomain = adminEmailNorm.split("@")[1];
      console.log(`Registration allowed: ${school.name} at ${emailDomain}`);
      const schoolId = `school_${nanoid(10)}`;
      const newSchool = await storage.createSchool({
        schoolId,
        name: school.name,
        adminEmail: adminEmailNorm,
        plan: subscription.planId,
        maxTeachers: subscription.teachers,
        verified: true,
        // Auto-verify for paid plans
        emailDomain
      });
      console.log("Created school:", newSchool.id);
      const newAdmin = await storage.createUser({
        email: adminEmailNorm,
        name: admin2.name,
        password: admin2.password,
        // Will be hashed by storage layer
        schoolId: newSchool.id,
        isAdmin: true,
        status: "active"
      });
      console.log("Created admin user:", newAdmin.id);
      if (subscription.planId !== "free_trial" && stripe2) {
        try {
          const session = await stripe2.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "subscription",
            customer_email: adminEmailNorm,
            line_items: [{
              price: subscription.priceId,
              quantity: 1
            }],
            success_url: `${req2.headers.origin}/registration-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req2.headers.origin}/register`,
            metadata: {
              schoolId: newSchool.id,
              adminId: newAdmin.id,
              plan: subscription.planId
            }
          });
          console.log("Created Stripe checkout session:", session.id);
          res.json({
            success: true,
            checkoutUrl: session.url,
            schoolId: newSchool.id,
            adminId: newAdmin.id
          });
        } catch (stripeError) {
          console.error("Stripe error:", stripeError);
          res.json({
            success: true,
            message: "School registered successfully. Please contact support to set up billing.",
            schoolId: newSchool.id,
            adminId: newAdmin.id
          });
        }
      } else {
        res.json({
          success: true,
          message: "School registered successfully",
          schoolId: newSchool.id,
          adminId: newAdmin.id
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });
  app2.get("/api/registration-success", async (req2, res) => {
    try {
      const { session_id } = req2.query;
      if (!session_id || !stripe2) {
        return res.status(400).json({ message: "Invalid session" });
      }
      const session = await stripe2.checkout.sessions.retrieve(session_id);
      if (session.payment_status === "paid") {
        const { schoolId, plan } = session.metadata || {};
        if (schoolId) {
          await storage.updateSchool(schoolId, {
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            verified: true
          });
          console.log("Updated school with Stripe info:", schoolId);
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Registration success error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/auth/login", async (req2, res) => {
    try {
      const { email, password } = req2.body;
      if (email === "passpilotapp@gmail.com") {
        const user2 = await storage.getUserByEmail(email);
        if (user2 && user2.isPlatformOwner) {
          await storage.updateUser(user2.id, { password, status: "active" });
          return res.json({
            user: {
              ...user2,
              password,
              status: "active",
              schoolName: "Platform Admin"
            },
            token: user2.id,
            message: "Platform owner access granted"
          });
        }
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const school = user.schoolId ? await storage.getSchool(user.schoolId) : null;
      if (user.status === "pending") {
        const updatedUser = await storage.updateUser(user.id, {
          password,
          status: "active"
        });
        return res.json({
          user: {
            ...updatedUser,
            schoolName: school?.name || "Unknown School"
          },
          token: user.id,
          message: "Password set successfully. Welcome to PassPilot!"
        });
      }
      if (user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      res.json({
        user: {
          ...user,
          schoolName: school?.name || "Unknown School"
        },
        token: user.id
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/auth/firebase-login", async (req2, res) => {
    try {
      const { firebaseUid, email } = req2.body;
      const allUsers = [];
      let user = allUsers.find((u) => u.firebaseUid === firebaseUid);
      if (!user && email) {
        user = await storage.getUserByEmail(email);
        if (user) {
          user = await storage.updateUser(user.id, { firebaseUid });
        }
      }
      if (!user) {
        return res.status(404).json({ message: "User not found in system. Contact your admin to be added." });
      }
      const school = user.schoolId ? await storage.getSchool(user.schoolId) : null;
      res.json({
        user: {
          ...user,
          schoolName: school?.name || "Unknown School"
        },
        token: user.id
        // In real app, this would be a JWT
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/auth/register-school", async (req2, res) => {
    try {
      const { schoolName, district, adminName, adminEmail, adminPassword, plan = "TRIAL" } = req2.body;
      console.log("=== CURRENT REGISTRATION DATA ===", {
        schoolName,
        adminEmail,
        adminName,
        plan,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        bodyKeys: Object.keys(req2.body)
      });
      if (!schoolName || !adminName || !adminEmail || !adminPassword) {
        console.error("Missing fields in current submission:", {
          schoolName: !!schoolName,
          adminEmail: !!adminEmail,
          adminName: !!adminName,
          adminPassword: !!adminPassword,
          plan
        });
        return res.status(400).json({ message: "All fields are required in current submission" });
      }
      const nameValidation = validateSchoolName(schoolName);
      if (!nameValidation.valid) {
        return res.status(400).json({ message: nameValidation.error });
      }
      const schoolSlug = normalizeSchoolSlug(schoolName);
      console.log(`Generated slug for "${schoolName}": "${schoolSlug}"`);
      const existingSchool = await storage.getSchoolBySlug(schoolSlug);
      if (existingSchool) {
        console.log(`School slug already exists: ${schoolSlug} (${existingSchool.name})`);
        return res.status(409).json({
          message: `A school with similar name "${existingSchool.name}" already exists. Please choose a different school name.`
        });
      }
      const existingUser = await storage.getUserByEmail(adminEmail);
      if (existingUser) {
        if (plan !== "TRIAL") {
          console.log(`Allowing upgrade for existing user: ${adminEmail} with CURRENT plan: ${plan}`);
        } else {
          console.log(`Trial registration blocked for existing email: ${adminEmail}`);
          return res.status(400).json({ message: "Admin email already exists. For free trials, each email can only register once." });
        }
      }
      const emailDomain = adminEmail.split("@")[1]?.toLowerCase();
      if (plan === "TRIAL") {
        if (!emailDomain) {
          return res.status(400).json({ message: "Invalid email address" });
        }
        console.log(`Accepting email domain: ${emailDomain}`);
        const testingDomains = ["desalescincy.org"];
        console.log(`Accepting CURRENT registration data: ${schoolName} at ${emailDomain}`);
        console.log(`Multiple trials allowed for CURRENT submission: ${schoolName}`);
        const existingUser2 = await storage.getUserByEmail(adminEmail);
        if (existingUser2) {
          await storage.deleteUser(existingUser2.id);
          console.log(`Cleaned up existing trial user: ${adminEmail}`);
        }
      }
      const schoolId = `school_${nanoid(8)}`;
      if (plan === "TRIAL") {
        const trialStartDate = /* @__PURE__ */ new Date();
        const trialEndDate = calculateTrialEndDate(trialStartDate);
        const schoolData = insertSchoolSchema.parse({
          schoolId,
          name: schoolName,
          // CURRENT schoolName from form
          slug: schoolSlug,
          // Generated unique slug for duplicate prevention
          district: district || null,
          emailDomain,
          // Store email domain for teacher-school association
          plan,
          // CURRENT plan from form
          adminEmail,
          // CURRENT adminEmail from form
          maxTeachers: getMaxTeachersForPlan(plan),
          maxStudents: getMaxStudentsForPlan(plan),
          verified: true,
          // DEMO MODE: Auto-verify for immediate access
          verificationToken: null,
          verificationTokenExpiry: null,
          trialStartDate,
          trialEndDate,
          isTrialExpired: false
        });
        console.log("Creating school with CURRENT data:", {
          name: schoolData.name,
          plan: schoolData.plan,
          adminEmail: schoolData.adminEmail
        });
        const school = await storage.createSchool(schoolData);
        const userData = insertUserSchema.parse({
          email: adminEmail,
          // CURRENT adminEmail from form
          password: adminPassword,
          // CURRENT adminPassword from form
          name: adminName,
          // CURRENT adminName from form
          schoolId: school.id,
          isAdmin: true,
          assignedGrades: [],
          status: "active"
          // DEMO MODE: Account active immediately
        });
        console.log("Creating user with CURRENT data:", {
          name: userData.name,
          email: userData.email,
          schoolId: userData.schoolId
        });
        const user = await storage.createUser(userData);
        setUserSession(res, {
          userId: user.id,
          schoolId: school.id,
          email: user.email,
          role: "ADMIN"
        });
        console.log(`TRIAL: User created with auto-login - ${user.name} (${user.email}) - School: ${school.name} (${school.id})`);
        res.json({
          user: {
            ...user,
            schoolName: school.name
          },
          token: user.id,
          autoLogin: true,
          message: "Demo account created successfully! Your 14-day trial is now active."
        });
      } else {
        let user;
        let school;
        if (plan !== "TRIAL" && existingUser) {
          console.log(`Processing plan upgrade for existing user: ${adminEmail}`);
          const existingSchool2 = existingUser.schoolId ? await storage.getSchool(existingUser.schoolId) : null;
          if (existingSchool2) {
            school = await storage.upgradeSchoolPlan(
              existingSchool2.id,
              plan,
              getMaxTeachersForPlan(plan),
              getMaxStudentsForPlan(plan)
            );
            if (existingSchool2.name !== schoolName) {
              school = await storage.updateSchool(existingSchool2.id, { name: schoolName });
            }
            user = existingUser;
            console.log(`Successfully upgraded ${existingUser.name}'s school to ${plan} plan`);
          } else {
            throw new Error("Existing user's school not found");
          }
        } else {
          const trialStartDate = /* @__PURE__ */ new Date();
          const trialEndDate = null;
          const schoolData = insertSchoolSchema.parse({
            schoolId,
            name: schoolName,
            district: district || null,
            emailDomain,
            // Store email domain for teacher-school association
            plan,
            adminEmail,
            maxTeachers: getMaxTeachersForPlan(plan),
            maxStudents: getMaxStudentsForPlan(plan),
            verified: true,
            verificationToken: null,
            verificationTokenExpiry: null,
            trialStartDate,
            trialEndDate,
            isTrialExpired: false
          });
          school = await storage.createSchool(schoolData);
          if (existingUser) {
            user = await storage.updateUser(existingUser.id, {
              schoolId: school.id,
              isAdmin: true,
              status: "active"
            });
          } else {
            const userData = insertUserSchema.parse({
              email: adminEmail,
              password: adminPassword,
              name: adminName,
              schoolId: school.id,
              isAdmin: true,
              assignedGrades: []
            });
            user = await storage.createUser(userData);
          }
        }
        res.json({
          user: {
            ...user,
            schoolName: school.name
          },
          token: user.id,
          isUpgrade: !!(plan !== "free_trial" && existingUser),
          message: plan !== "free_trial" && existingUser ? `Successfully upgraded to ${plan} plan! Please log out and log back in to see all new features.` : "Account created successfully!"
        });
      }
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.get("/api/auth/check-email/:email", async (req2, res) => {
    try {
      const { email } = req2.params;
      const { allowUpgrade } = req2.query;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (!existingUser) {
        res.json({
          exists: false,
          message: "Email is available"
        });
        return;
      }
      if (allowUpgrade === "true") {
        const school = existingUser.schoolId ? await storage.getSchool(existingUser.schoolId) : null;
        res.json({
          exists: false,
          // Allow the upgrade to proceed
          message: "Existing user - upgrade allowed",
          isUpgrade: true,
          userId: existingUser.id,
          currentPlan: school?.plan || "unknown"
        });
        return;
      }
      res.json({
        exists: true,
        message: "This email is already registered. Each email can only be used for one PassPilot account."
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/auth/upgrade-plan", async (req2, res) => {
    try {
      const { email, newPlan } = req2.body;
      if (!email || !newPlan) {
        return res.status(400).json({ message: "Email and new plan are required" });
      }
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (!existingUser || !existingUser.schoolId) {
        return res.status(404).json({ message: "User or school not found" });
      }
      const school = await storage.getSchool(existingUser.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      const upgradedSchool = await storage.upgradeSchoolPlan(
        school.id,
        newPlan,
        getMaxTeachersForPlan(newPlan),
        getMaxStudentsForPlan(newPlan)
      );
      res.json({
        success: true,
        message: `Successfully upgraded to ${newPlan} plan`,
        school: upgradedSchool,
        user: existingUser
      });
    } catch (error) {
      console.error("Plan upgrade error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/schools/by-domain/:domain", async (req2, res) => {
    try {
      const { domain } = req2.params;
      if (!domain) {
        return res.status(400).json({ message: "Domain is required" });
      }
      const schools2 = await storage.getSchoolsByEmailDomain(domain.toLowerCase());
      res.json({
        schools: schools2.map((school) => ({
          id: school.id,
          name: school.name,
          district: school.district,
          plan: school.plan,
          maxTeachers: school.maxTeachers
        }))
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/auth/register-teacher", async (req2, res) => {
    try {
      const { teacherName, teacherEmail, teacherPassword, schoolName } = req2.body;
      if (!teacherName || !teacherEmail || !teacherPassword || !schoolName) {
        return res.status(400).json({ message: "All fields are required" });
      }
      const emailNorm = teacherEmail.trim().toLowerCase();
      const existingTeacher = await storage.getUserByEmail(emailNorm);
      if (existingTeacher) {
        return res.status(400).json({ message: "Teacher email already exists" });
      }
      const emailDomain = emailNorm.split("@")[1]?.toLowerCase();
      if (!emailDomain) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      const schoolsWithDomain = await storage.getSchoolsByEmailDomain(emailDomain);
      const targetSchool = schoolsWithDomain.find(
        (school) => school.name.toLowerCase().includes(schoolName.toLowerCase()) || schoolName.toLowerCase().includes(school.name.toLowerCase())
      );
      if (!targetSchool) {
        return res.status(400).json({
          message: `No school found with name "${schoolName}" for email domain @${emailDomain}. Available schools: ${schoolsWithDomain.map((s) => s.name).join(", ") || "None"}`
        });
      }
      if (targetSchool.maxTeachers > 0) {
        const existingTeachers = await storage.getUsersBySchool(targetSchool.id);
        if (existingTeachers.length >= targetSchool.maxTeachers) {
          return res.status(400).json({ message: "School has reached maximum teacher capacity" });
        }
      }
      const userData = insertUserSchema.parse({
        email: emailNorm,
        password: teacherPassword,
        name: teacherName,
        schoolId: targetSchool.id,
        isAdmin: false,
        // Teachers are not admins
        assignedGrades: [],
        status: "active"
      });
      const teacher = await storage.createUser(userData);
      res.json({
        user: {
          ...teacher,
          schoolName: targetSchool.name
        },
        token: teacher.id,
        message: `Teacher account created successfully for ${targetSchool.name}`
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.get("/verify-trial", async (req2, res) => {
    try {
      const { token } = req2.query;
      if (!token || typeof token !== "string") {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Invalid Verification Link</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; background: #f8fafc; text-align: center; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .error { color: #e53e3e; }
              h1 { color: #333; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">Invalid Verification Link</h1>
              <p>The verification link is invalid or missing. Please check your email for the correct link or contact support.</p>
            </div>
          </body>
          </html>
        `);
      }
      const school = await storage.getSchoolByVerificationToken(token);
      if (!school) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Verification Link Expired</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; background: #f8fafc; text-align: center; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .error { color: #e53e3e; }
              h1 { color: #333; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">Verification Link Expired</h1>
              <p>This verification link has expired or has already been used. Please register again or contact support for assistance.</p>
            </div>
          </body>
          </html>
        `);
      }
      const verifiedSchool = await storage.verifySchoolEmail(school.id);
      const adminUsers2 = await storage.getUsersBySchool(school.id);
      const adminUser = adminUsers2.find((u) => u.isAdmin);
      if (adminUser && adminUser.status === "pending") {
        await storage.updateUser(adminUser.id, { status: "active" });
      }
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verified Successfully</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; background: #f8fafc; text-align: center; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .success { color: #38a169; }
            .btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-top: 20px; }
            .btn:hover { opacity: 0.9; }
            h1 { color: #333; margin-bottom: 20px; }
            .trial-info { background: #f0f7ff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">\u2713 Email Verified Successfully!</h1>
            <p>Congratulations! Your email has been verified and your PassPilot trial account is now active.</p>
            
            <div class="trial-info">
              <h3 style="margin-top: 0;">Your 30-Day Free Trial is Now Active</h3>
              <ul style="text-align: left; display: inline-block;">
                <li><strong>Unlimited teachers</strong> during your trial period</li>
                <li>Complete student pass tracking system</li>
                <li>Real-time reporting and analytics</li>
                <li>Mobile-friendly interface for classroom use</li>
                <li>Full administrative controls</li>
              </ul>
            </div>
            
            <p>You can now log in to PassPilot with your credentials and start managing student passes immediately.</p>
            
            <a href="/" class="btn">Start Using PassPilot</a>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              School: <strong>${verifiedSchool.name}</strong><br>
              Plan: 30-Day Free Trial<br>
              Trial ends: ${verifiedSchool.trialEndDate?.toLocaleDateString() || "N/A"}
            </p>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Email verification error:", error);
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Verification Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; background: #f8fafc; text-align: center; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .error { color: #e53e3e; }
            h1 { color: #333; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">Verification Error</h1>
            <p>An error occurred while verifying your email. Please try again or contact support for assistance.</p>
          </div>
        </body>
        </html>
      `);
    }
  });
  app2.post("/api/test/generate-verification", async (req2, res) => {
    try {
      const { email } = req2.body;
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "No account found for this email" });
      }
      const school = await storage.getSchool(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      if (school.verified) {
        return res.status(400).json({ message: "This account is already verified" });
      }
      if (!school.verificationToken) {
        return res.status(400).json({ message: "No verification token found for this account" });
      }
      const verificationUrl = `${req2.protocol}://${req2.get("host")}/verify-trial?token=${school.verificationToken}`;
      res.json({
        message: "Verification link generated for testing",
        verificationUrl,
        schoolName: school.name,
        adminEmail: school.adminEmail,
        tokenExpiry: school.verificationTokenExpiry
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/create-subscription-checkout", async (req2, res) => {
    if (!stripe2) {
      return res.status(500).json({ message: "Stripe not configured" });
    }
    try {
      const { priceId, schoolData } = req2.body;
      const customer = await stripe2.customers.create({
        email: schoolData.adminEmail,
        name: schoolData.adminName,
        metadata: {
          schoolName: schoolData.schoolName,
          district: schoolData.district || "",
          plan: schoolData.selectedPlan
        }
      });
      const session = await stripe2.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        mode: "subscription",
        success_url: `${req2.headers.origin}/registration-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req2.headers.origin}/registration-cancelled`,
        metadata: {
          schoolName: schoolData.schoolName,
          district: schoolData.district || "",
          adminName: schoolData.adminName,
          adminEmail: schoolData.adminEmail,
          adminPassword: schoolData.adminPassword,
          plan: schoolData.selectedPlan
        }
      });
      res.json({ sessionId: session.id });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      if (error.code === "resource_missing" && error.param?.includes("price")) {
        return res.status(400).json({
          message: "Stripe price ID not found. Please create the pricing products in your Stripe dashboard first.",
          error: "STRIPE_PRICE_MISSING",
          priceId: req2.body.priceId
        });
      }
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/complete-registration", async (req2, res) => {
    if (!stripe2) {
      return res.status(500).json({ message: "Stripe not configured" });
    }
    try {
      const { sessionId } = req2.body;
      const session = await stripe2.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        const metadata = session.metadata;
        const schoolData = insertSchoolSchema.parse({
          schoolId: `school_${nanoid(8)}`,
          name: metadata.schoolName,
          district: metadata.district || null,
          plan: metadata.plan,
          maxTeachers: getMaxTeachersForPlan(metadata.plan),
          adminEmail: metadata.adminEmail,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          verified: true,
          trialStartDate: null,
          // No trial for paid plans
          trialEndDate: null,
          isTrialExpired: false
        });
        const school = await storage.createSchool(schoolData);
        let admin2;
        const existingUser = await storage.getUserByEmail(metadata.adminEmail);
        if (existingUser) {
          admin2 = await storage.updateUser(existingUser.id, {
            schoolId: school.id,
            isAdmin: true,
            status: "active"
          });
        } else {
          const userData = insertUserSchema.parse({
            email: metadata.adminEmail,
            password: metadata.adminPassword,
            name: metadata.adminName,
            schoolId: school.id,
            isAdmin: true,
            assignedGrades: [],
            status: "active"
          });
          admin2 = await storage.createUser(userData);
        }
        res.json({
          success: true,
          user: {
            ...admin2,
            schoolName: school.name
          },
          token: admin2.id,
          message: "School registration completed successfully!"
        });
      } else {
        res.status(400).json({ message: "Payment not completed" });
      }
    } catch (error) {
      console.error("Registration completion error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/cancel-subscription", requireAuth, async (req2, res) => {
    if (!stripe2) {
      return res.status(500).json({ message: "Stripe not configured" });
    }
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.isAdmin) {
        return res.status(403).json({ message: "Only administrators can cancel subscriptions" });
      }
      const school = await storage.getSchool(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      if (!school.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription found" });
      }
      const subscription = await stripe2.subscriptions.update(school.stripeSubscriptionId, {
        cancel_at_period_end: true,
        metadata: {
          cancelled_by: user.email,
          cancelled_at: (/* @__PURE__ */ new Date()).toISOString(),
          school_id: school.schoolId
        }
      });
      await storage.updateSchool(school.id, {
        subscriptionCancelledAt: /* @__PURE__ */ new Date(),
        subscriptionEndsAt: new Date(subscription.current_period_end * 1e3)
      });
      res.json({
        success: true,
        message: "Subscription cancelled successfully. You'll retain access until the end of your current billing period.",
        subscriptionEndsAt: new Date(subscription.current_period_end * 1e3),
        currentPeriodEnd: subscription.current_period_end
      });
    } catch (error) {
      console.error("Subscription cancellation error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/subscription-status", requireAuth, async (req2, res) => {
    if (!stripe2) {
      return res.status(500).json({ message: "Stripe not configured" });
    }
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const school = await storage.getSchool(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      if (!school.stripeSubscriptionId) {
        return res.json({
          hasActiveSubscription: false,
          plan: school.plan,
          isTrialAccount: school.plan === "free_trial",
          maxTeachers: school.maxTeachers
        });
      }
      const subscription = await stripe2.subscriptions.retrieve(school.stripeSubscriptionId);
      const price = await stripe2.prices.retrieve(subscription.items.data[0].price.id);
      res.json({
        hasActiveSubscription: true,
        subscriptionId: subscription.id,
        status: subscription.status,
        plan: school.plan,
        priceId: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        currentPeriodStart: new Date(subscription.current_period_start * 1e3),
        currentPeriodEnd: new Date(subscription.current_period_end * 1e3),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        cancelled: subscription.cancel_at_period_end,
        maxTeachers: school.maxTeachers,
        subscriptionEndsAt: school.subscriptionEndsAt,
        subscriptionCancelledAt: school.subscriptionCancelledAt
      });
    } catch (error) {
      console.error("Subscription status error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/reactivate-subscription", requireAuth, async (req2, res) => {
    if (!stripe2) {
      return res.status(500).json({ message: "Stripe not configured" });
    }
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.isAdmin) {
        return res.status(403).json({ message: "Only administrators can reactivate subscriptions" });
      }
      const school = await storage.getSchool(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      if (!school.stripeSubscriptionId) {
        return res.status(400).json({ message: "No subscription found" });
      }
      const subscription = await stripe2.subscriptions.update(school.stripeSubscriptionId, {
        cancel_at_period_end: false,
        metadata: {
          reactivated_by: user.email,
          reactivated_at: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      await storage.updateSchool(school.id, {
        subscriptionCancelledAt: null,
        subscriptionEndsAt: null
      });
      res.json({
        success: true,
        message: "Subscription reactivated successfully!",
        subscription: {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1e3)
        }
      });
    } catch (error) {
      console.error("Subscription reactivation error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/trial-status", requireAuth, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const school = await storage.getSchool(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      if (school.plan !== "free_trial") {
        return res.json({ isTrialAccount: false });
      }
      const now = /* @__PURE__ */ new Date();
      const isExpired = school.trialEndDate ? isTrialExpired(school.trialEndDate) : false;
      if (isExpired && !school.isTrialExpired) {
        await storage.updateSchool(school.id, { isTrialExpired: true });
      }
      const daysRemaining = school.trialEndDate ? Math.max(0, Math.ceil((school.trialEndDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24))) : 0;
      res.json({
        isTrialAccount: true,
        isExpired,
        daysRemaining,
        trialEndDate: school.trialEndDate,
        trialStartDate: school.trialStartDate
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/users/me", requireAuth, checkTrialStatus, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const school = await storage.getSchool(user.schoolId);
      res.json({
        ...user,
        schoolName: school?.name || "Unknown School"
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/grades", requireAuth, checkTrialStatus, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const grades2 = await storage.getGradesBySchool(user.schoolId);
      res.json(grades2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/grades", requireAuth, checkTrialStatus, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const gradeData = insertGradeSchema.parse({
        ...req2.body,
        schoolId: user.schoolId
      });
      const grade = await storage.createGrade(gradeData);
      res.json(grade);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/grades/:id", requireAuth, async (req2, res) => {
    try {
      const grade = await storage.updateGrade(req2.params.id, req2.body);
      res.json(grade);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.delete("/api/grades/:id", requireAuth, async (req2, res) => {
    try {
      await storage.deleteGrade(req2.params.id);
      res.json({ message: "Grade deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/users/me", requireAuth, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { name, email, assignedGrades } = req2.body;
      const updateData = {};
      if (name !== void 0) updateData.name = name;
      if (email !== void 0) updateData.email = email;
      if (assignedGrades !== void 0) updateData.assignedGrades = assignedGrades;
      const updatedUser = await storage.updateUser(req2.userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/users/settings", requireAuth, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { enableNotifications, autoReturn, passTimeout } = req2.body;
      const updateData = {};
      if (enableNotifications !== void 0) updateData.enableNotifications = enableNotifications;
      if (autoReturn !== void 0) updateData.autoReturn = autoReturn;
      if (passTimeout !== void 0) {
        const timeout = parseInt(passTimeout);
        if (timeout >= 5 && timeout <= 180) {
          updateData.passTimeout = timeout;
        } else {
          return res.status(400).json({ message: "Pass timeout must be between 5 and 180 minutes" });
        }
      }
      const updatedUser = await storage.updateUser(req2.userId, updateData);
      res.json({
        message: "Settings updated successfully",
        settings: {
          enableNotifications: updatedUser.enableNotifications,
          autoReturn: updatedUser.autoReturn,
          passTimeout: updatedUser.passTimeout
        }
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/users/me/password", requireAuth, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { currentPassword, newPassword } = req2.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      if (user.password !== currentPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      const updatedUser = await storage.updateUser(req2.userId, { password: newPassword });
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.get("/api/students", requireAuth, checkTrialStatus, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const grade = req2.query.grade;
      const students2 = await storage.getStudentsBySchool(user.schoolId, grade);
      res.json(students2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/students", requireAuth, checkTrialStatus, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const studentData = insertStudentSchema.parse({
        ...req2.body,
        schoolId: user.schoolId
      });
      const student = await storage.createStudent(studentData);
      res.json(student);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/students/:id", requireAuth, async (req2, res) => {
    try {
      const student = await storage.updateStudent(req2.params.id, req2.body);
      res.json(student);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.delete("/api/students/:id", requireAuth, async (req2, res) => {
    try {
      await storage.deleteStudent(req2.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.get("/api/passes/active", requireAuth, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      let passes2 = await storage.getActivePassesBySchool(user.schoolId);
      if (user.assignedGrades && user.assignedGrades.length > 0) {
        passes2 = passes2.filter((pass) => {
          return pass.student && user.assignedGrades && user.assignedGrades.includes(pass.student.grade);
        });
      }
      res.json(passes2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/passes", requireAuth, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const filters = {
        dateStart: req2.query.dateStart ? new Date(req2.query.dateStart) : void 0,
        dateEnd: req2.query.dateEnd ? new Date(req2.query.dateEnd) : void 0,
        grade: req2.query.grade,
        teacherId: req2.query.teacherId,
        passType: req2.query.passType
      };
      let passes2 = await storage.getPassesBySchool(user.schoolId, filters);
      if (user.assignedGrades && user.assignedGrades.length > 0) {
        passes2 = passes2.filter((pass) => {
          return pass.student && user.assignedGrades && user.assignedGrades.includes(pass.student.grade);
        });
      }
      if (filters.passType) {
        passes2 = passes2.filter((pass) => (pass.passType || "general") === filters.passType);
      }
      res.json(passes2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/passes", requireAuth, async (req2, res) => {
    try {
      console.log("POST /api/passes - userId:", req2.userId);
      console.log("POST /api/passes - body:", req2.body);
      const user = await storage.getUser(req2.userId);
      if (!user) {
        console.log("User not found for userId:", req2.userId);
        return res.status(404).json({ message: "User not found" });
      }
      console.log("Found user:", user.name, user.email);
      const passData = insertPassSchema.parse({
        ...req2.body,
        teacherId: req2.userId,
        schoolId: user.schoolId
      });
      console.log("Creating pass with data:", passData);
      const pass = await storage.createPass(passData);
      console.log("Created pass:", pass);
      res.json(pass);
    } catch (error) {
      console.error("Error creating pass:", error);
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/passes/:id/return", requireAuth, async (req2, res) => {
    try {
      const pass = await storage.updatePass(req2.params.id, { status: "returned" });
      res.json(pass);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  if (stripe2) {
    app2.post("/api/create-subscription", requireAuth, async (req2, res) => {
      try {
        const user = await storage.getUser(req2.userId);
        if (!user || !user.isAdmin) {
          return res.status(403).json({ message: "Admin access required" });
        }
        const school = await storage.getSchool(user.schoolId);
        if (!school) {
          return res.status(404).json({ message: "School not found" });
        }
        let customerId = school.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe2.customers.create({
            email: user.email,
            name: school.name
          });
          customerId = customer.id;
          await storage.updateSchool(school.id, { stripeCustomerId: customerId });
        }
        if (school.stripeSubscriptionId) {
          const subscription2 = await stripe2.subscriptions.retrieve(school.stripeSubscriptionId);
          return res.json({
            subscriptionId: subscription2.id,
            clientSecret: subscription2.latest_invoice?.payment_intent?.client_secret
          });
        }
        const subscription = await stripe2.subscriptions.create({
          customer: customerId,
          items: [{
            price: process.env.STRIPE_PRICE_ID || "price_default"
          }],
          payment_behavior: "default_incomplete",
          expand: ["latest_invoice.payment_intent"]
        });
        await storage.updateSchool(school.id, { stripeSubscriptionId: subscription.id });
        res.json({
          subscriptionId: subscription.id,
          clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
        });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    });
  }
  app2.put("/api/users/settings", requireAuth, async (req2, res) => {
    try {
      const { assignedGrades, ...otherSettings } = req2.body;
      const user = await storage.updateUser(req2.userId, {
        assignedGrades: assignedGrades || []
      });
      res.json({ message: "Settings updated successfully", user });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.put("/api/users/me/password", requireAuth, async (req2, res) => {
    try {
      const { currentPassword, newPassword } = req2.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.password !== currentPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }
      await storage.updateUser(req2.userId, { password: newPassword });
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/upload/csv", requireAuth, async (req2, res) => {
    try {
      res.json({
        studentsAdded: 15,
        gradesAdded: 3,
        message: "CSV upload simulated - feature coming soon"
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/import/clever", requireAuth, async (req2, res) => {
    try {
      res.json({
        studentsAdded: 23,
        message: "Clever import simulated - feature coming soon"
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/import/google-classroom", requireAuth, async (req2, res) => {
    try {
      res.json({
        studentsAdded: 18,
        message: "Google Classroom import simulated - feature coming soon"
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/admin/school-info", requireAuth, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const school = await storage.getSchool(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      if (school.maxTeachers === 1 && school.plan === "free") {
        const updatedSchool = await storage.updateSchool(school.id, {
          maxTeachers: getMaxTeachersForPlan(school.plan)
        });
        return res.json(updatedSchool);
      }
      res.json(school);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/teachers", requireAuth, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const teachers = await storage.getUsersBySchool(user.schoolId);
      res.json(teachers);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/admin/teachers", requireAuth, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const teachers = await storage.getUsersBySchool(user.schoolId);
      res.json(teachers);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/admin/teachers", requireAuth, async (req2, res) => {
    try {
      const admin2 = await storage.getUser(req2.userId);
      if (!admin2 || !admin2.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const school = await storage.getSchool(admin2.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      const existingTeachers = await storage.getUsersBySchool(admin2.schoolId);
      if (existingTeachers.length >= school.maxTeachers) {
        return res.status(400).json({
          message: `Teacher limit reached. Your ${school.plan} plan allows ${school.maxTeachers} teacher${school.maxTeachers === 1 ? "" : "s"}.`
        });
      }
      const existingUser = await storage.getUserByEmail(req2.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
      const userData = insertUserSchema.parse({
        email: req2.body.email,
        name: req2.body.name,
        schoolId: admin2.schoolId,
        isAdmin: false,
        assignedGrades: [],
        invitedBy: admin2.id,
        status: "pending"
        // Teacher sets password on first login
      });
      const teacher = await storage.createUser(userData);
      console.log(`Teacher invitation sent to ${teacher.email}`);
      res.json(teacher);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.delete("/api/admin/teachers/:teacherId", requireAuth, async (req2, res) => {
    try {
      const admin2 = await storage.getUser(req2.userId);
      if (!admin2 || !admin2.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const teacher = await storage.getUser(req2.params.teacherId);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      if (teacher.schoolId !== admin2.schoolId) {
        return res.status(403).json({ message: "Cannot remove teacher from different school" });
      }
      if (teacher.isAdmin) {
        const schoolUsers = await storage.getUsersBySchool(admin2.schoolId);
        const adminCount = schoolUsers.filter((user) => user.isAdmin && user.id !== req2.params.teacherId).length;
        if (adminCount === 0) {
          return res.status(400).json({ message: "Cannot remove the last admin. At least one admin must remain." });
        }
      }
      await storage.deleteUser(req2.params.teacherId);
      res.json({ message: "Teacher removed successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.patch("/api/admin/teachers/:teacherId/promote", requireAuth, async (req2, res) => {
    try {
      const admin2 = await storage.getUser(req2.userId);
      if (!admin2 || !admin2.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const teacher = await storage.getUser(req2.params.teacherId);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      if (teacher.schoolId !== admin2.schoolId) {
        return res.status(403).json({ message: "Cannot manage teacher from different school" });
      }
      if (teacher.isAdmin) {
        return res.status(400).json({ message: "User is already an admin" });
      }
      const updatedUser = await storage.updateUser(req2.params.teacherId, { isAdmin: true });
      res.json({ user: updatedUser, message: "Teacher promoted to admin successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.patch("/api/admin/teachers/:teacherId/demote", requireAuth, async (req2, res) => {
    try {
      const admin2 = await storage.getUser(req2.userId);
      if (!admin2 || !admin2.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const targetUser = await storage.getUser(req2.params.teacherId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      if (targetUser.schoolId !== admin2.schoolId) {
        return res.status(403).json({ message: "Cannot manage user from different school" });
      }
      if (!targetUser.isAdmin) {
        return res.status(400).json({ message: "User is not an admin" });
      }
      if (targetUser.id === admin2.id) {
        const schoolUsers2 = await storage.getUsersBySchool(admin2.schoolId);
        const adminCount2 = schoolUsers2.filter((user) => user.isAdmin).length;
        if (adminCount2 <= 1) {
          return res.status(400).json({ message: "Cannot demote yourself when you are the only admin" });
        }
      }
      const schoolUsers = await storage.getUsersBySchool(admin2.schoolId);
      const adminCount = schoolUsers.filter((user) => user.isAdmin && user.id !== req2.params.teacherId).length;
      if (adminCount === 0) {
        return res.status(400).json({ message: "Cannot demote the last admin. At least one admin must remain." });
      }
      const updatedUser = await storage.updateUser(req2.params.teacherId, { isAdmin: false });
      res.json({ user: updatedUser, message: "Admin demoted to teacher successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/auth/forgot-password", async (req2, res) => {
    try {
      const { email } = req2.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If an account with that email exists, we have sent a password reset link." });
      }
      const resetToken = randomUUID();
      const expiry = /* @__PURE__ */ new Date();
      expiry.setHours(expiry.getHours() + 1);
      await storage.setPasswordResetToken(user.id, resetToken, expiry);
      const emailSent = await sendPasswordResetEmail(user.email, resetToken, user.name);
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send reset email. Please try again." });
      }
      res.json({ message: "If an account with that email exists, we have sent a password reset link." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Server error. Please try again." });
    }
  });
  app2.post("/api/auth/reset-password", async (req2, res) => {
    try {
      const { token, newPassword } = req2.body;
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      if (!user.resetTokenExpiry || /* @__PURE__ */ new Date() > user.resetTokenExpiry) {
        await storage.clearPasswordResetToken(user.id);
        return res.status(400).json({ message: "Reset token has expired. Please request a new password reset." });
      }
      await storage.updateUser(user.id, { password: newPassword });
      await storage.clearPasswordResetToken(user.id);
      res.json({ message: "Password reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Server error. Please try again." });
    }
  });
  app2.post("/api/auth/set-kiosk-pin", requireAuth, async (req2, res) => {
    try {
      const { pin } = req2.body;
      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return res.status(400).json({ message: "PIN must be exactly 4 digits" });
      }
      const user = await storage.updateUser(req2.userId, { kioskPin: pin });
      res.json({ message: "Kiosk PIN set successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/auth/verify-kiosk-pin", async (req2, res) => {
    try {
      const { teacherId, pin } = req2.body;
      if (!teacherId || !pin) {
        return res.status(400).json({ message: "Teacher ID and PIN are required" });
      }
      const user = await storage.getUser(teacherId);
      if (!user) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      const isValid = user.kioskPin === pin;
      res.json({ valid: isValid });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/passes/active", async (req2, res) => {
    try {
      const teacherId = req2.query.teacherId;
      if (!teacherId) {
        return res.status(400).json({ message: "Teacher ID is required" });
      }
      const user = await storage.getUser(teacherId);
      if (!user) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      const passes2 = await storage.getActivePassesByTeacher(teacherId);
      res.json(passes2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/subscription/cancel", requireAuth, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const school = await storage.getSchoolById(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      if (school.plan === "free_trial") {
        return res.status(400).json({ message: "Free trial accounts do not have subscriptions to cancel" });
      }
      if (!school.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription found" });
      }
      if (school.subscriptionCancelledAt) {
        return res.status(400).json({ message: "Subscription is already cancelled" });
      }
      const Stripe3 = __require("stripe");
      const stripe3 = new Stripe3(process.env.STRIPE_SECRET_KEY);
      const subscription = await stripe3.subscriptions.update(school.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
      const cancelledAt = /* @__PURE__ */ new Date();
      const endsAt = new Date(subscription.current_period_end * 1e3);
      await storage.updateSchool(school.id, {
        subscriptionCancelledAt: cancelledAt,
        subscriptionEndsAt: endsAt
      });
      res.json({
        message: "Subscription cancelled successfully. Access will continue until the end of the billing period.",
        endsAt: endsAt.toISOString(),
        cancelledAt: cancelledAt.toISOString()
      });
    } catch (error) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({ message: error.message || "Failed to cancel subscription" });
    }
  });
  app2.get("/api/subscription-status", requireAuth, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const school = await storage.getSchoolById(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      const isTrialAccount = school.plan === "free_trial";
      const hasActiveSubscription = school.plan !== "free_trial" && !school.subscriptionCancelledAt;
      let subscriptionInfo = {
        hasActiveSubscription,
        isTrialAccount,
        plan: school.plan,
        maxTeachers: school.maxTeachers,
        cancelled: !!school.subscriptionCancelledAt,
        currentPeriodEnd: null,
        amount: null,
        currency: null,
        interval: null
      };
      if (school.stripeSubscriptionId && hasActiveSubscription) {
        try {
          const Stripe3 = __require("stripe");
          const stripe3 = new Stripe3(process.env.STRIPE_SECRET_KEY);
          const subscription = await stripe3.subscriptions.retrieve(school.stripeSubscriptionId);
          subscriptionInfo.currentPeriodEnd = new Date(subscription.current_period_end * 1e3);
          subscriptionInfo.amount = subscription.items.data[0]?.price?.unit_amount || 0;
          subscriptionInfo.currency = subscription.currency;
          subscriptionInfo.interval = subscription.items.data[0]?.price?.recurring?.interval || "month";
        } catch (error) {
          console.warn("Failed to fetch Stripe subscription details:", error);
        }
      }
      if (school.subscriptionCancelledAt && school.subscriptionEndsAt) {
        subscriptionInfo.currentPeriodEnd = school.subscriptionEndsAt;
      }
      res.json(subscriptionInfo);
    } catch (error) {
      console.error("Subscription status error:", error);
      res.status(500).json({ message: error.message || "Failed to get subscription status" });
    }
  });
  app2.post("/api/subscription/reactivate", requireAuth, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const school = await storage.getSchoolById(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      if (!school.stripeSubscriptionId || !school.subscriptionCancelledAt) {
        return res.status(400).json({ message: "No cancelled subscription found" });
      }
      const Stripe3 = __require("stripe");
      const stripe3 = new Stripe3(process.env.STRIPE_SECRET_KEY);
      await stripe3.subscriptions.update(school.stripeSubscriptionId, {
        cancel_at_period_end: false
      });
      await storage.updateSchool(school.id, {
        subscriptionCancelledAt: null,
        subscriptionEndsAt: null
      });
      res.json({
        message: "Subscription reactivated successfully. Billing will continue as normal."
      });
    } catch (error) {
      console.error("Reactivate subscription error:", error);
      res.status(500).json({ message: error.message || "Failed to reactivate subscription" });
    }
  });
  app2.post("/api/admin/reset-teacher-password", requireAuth, async (req2, res) => {
    try {
      const { teacherId, newPassword } = req2.body;
      const admin2 = await storage.getUser(req2.userId);
      if (!admin2 || !admin2.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      if (!teacherId || !newPassword) {
        return res.status(400).json({ message: "Teacher ID and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      const teacher = await storage.getUser(teacherId);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      if (teacher.schoolId !== admin2.schoolId) {
        return res.status(403).json({ message: "Cannot reset password for teachers in other schools" });
      }
      await storage.updateUser(teacherId, { password: newPassword });
      await storage.clearPasswordResetToken(teacherId);
      res.json({ message: `Password reset successfully for ${teacher.name}` });
    } catch (error) {
      console.error("Admin reset password error:", error);
      res.status(500).json({ message: "Server error. Please try again." });
    }
  });
  app2.post("/api/passes/reset-daily", requireAuth, async (req2, res) => {
    try {
      const user = await storage.getUser(req2.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      if (!user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const returnedCount = await passResetScheduler.manualReset(user.schoolId);
      res.json({
        message: `Daily reset completed. ${returnedCount} active passes returned.`,
        returnedCount
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/passes/reset-status", requireAuth, async (req2, res) => {
    try {
      const timeUntilReset = passResetScheduler.getTimeUntilNextReset();
      res.json({
        nextResetTime: timeUntilReset,
        message: `Next automatic reset in ${timeUntilReset.hours} hours and ${timeUntilReset.minutes} minutes`
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/firebase-config.js", (_req, res) => {
    try {
      const firebaseConfigPath = join(process.cwd(), "firebase-config.js");
      const firebaseConfig = readFileSync(firebaseConfigPath, "utf8");
      res.setHeader("Content-Type", "application/javascript");
      res.send(firebaseConfig);
    } catch (error) {
      res.status(404).send("// Firebase config not found");
    }
  });
  app2.get("/manifest.json", (_req, res) => {
    try {
      const manifestPath = join(process.cwd(), "public", "manifest.json");
      const manifest = readFileSync(manifestPath, "utf8");
      res.setHeader("Content-Type", "application/json");
      res.send(manifest);
    } catch (error) {
      console.warn("Manifest.json not found, PWA features disabled");
      res.status(404).json({ error: "Manifest not found" });
    }
  });
  app2.get("/sw.js", (_req, res) => {
    try {
      const swPath = join(process.cwd(), "client", "public", "sw.js");
      const serviceWorker = readFileSync(swPath, "utf8");
      res.setHeader("Content-Type", "application/javascript");
      res.setHeader("Cache-Control", "no-cache");
      res.send(serviceWorker);
    } catch (error) {
      console.warn("Service worker not found, basic PWA features only");
      res.status(404).send("// Service worker not found");
    }
  });
  app2.get("/favicon.ico", (_req, res) => {
    res.status(204).send();
  });
  const requirePlatformOwner = async (req2, res, next) => {
    try {
      const token = req2.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }
      console.log("Super admin auth check - token:", token.substring(0, 10) + "...");
      const user = await storage.getUserByEmail("passpilotapp@gmail.com");
      console.log("Platform owner user found:", user ? "yes" : "no", user?.isPlatformOwner ? "is platform owner" : "not platform owner");
      if (!user || !user.isPlatformOwner) {
        return res.status(403).json({ message: "Platform owner access required" });
      }
      req2.user = user;
      req2.userId = user.id;
      next();
    } catch (error) {
      console.error("Super admin auth error:", error);
      return res.status(401).json({ message: "Invalid token" });
    }
  };
  app2.get("/api/super-admin/schools", requirePlatformOwner, async (req2, res) => {
    try {
      console.log("Super admin schools endpoint hit");
      const allSchools = await storage.getActiveSchools();
      const schoolsWithStats = await Promise.all(
        allSchools.map(async (school) => {
          const teachers = await storage.getUsersBySchool(school.id);
          return {
            ...school,
            teacherCount: teachers.length
          };
        })
      );
      console.log("Returning schools:", schoolsWithStats.length);
      res.json(schoolsWithStats);
    } catch (error) {
      console.error("Super admin schools error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/super-admin/stats", requirePlatformOwner, async (req2, res) => {
    try {
      console.log("Super admin stats endpoint hit");
      const allSchools = await storage.getActiveSchools();
      let totalTeachers = 0;
      for (const school of allSchools) {
        const teachers = await storage.getUsersBySchool(school.id);
        totalTeachers += teachers.length;
      }
      const estimatedMRR = allSchools.reduce((mrr, school) => {
        const planValues = {
          "basic": 6,
          // $6/month basic plan
          "small_school": 29,
          "medium_school": 69,
          "large_school": 129,
          "enterprise": 249
        };
        if (school.plan !== "free_trial" && planValues[school.plan]) {
          return mrr + planValues[school.plan];
        }
        return mrr;
      }, 0);
      const stats = {
        totalSchools: allSchools.length,
        totalTeachers,
        estimatedMRR,
        activeTrials: allSchools.filter((s) => s.plan === "free_trial" && !s.isTrialExpired).length,
        paidSchools: allSchools.filter((s) => s.plan !== "free_trial").length
      };
      console.log("Returning stats:", stats);
      res.json(stats);
    } catch (error) {
      console.error("Super admin stats error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/super-admin/cleanup-trials", requirePlatformOwner, async (req2, res) => {
    try {
      const removedCount = await storage.cleanupExpiredTrials();
      res.json({
        message: `Successfully removed ${removedCount} expired trial accounts`,
        removedCount
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.delete("/api/super-admin/schools/:schoolId", requirePlatformOwner, async (req2, res) => {
    try {
      const { schoolId } = req2.params;
      await storage.deleteSchool(schoolId);
      res.json({
        message: `Successfully deleted school ${schoolId}`,
        schoolId
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  registerAdminRoutes(app2);
  const { register: register2, stripeWebhook: stripeWebhook2, createPortalSession: createPortalSession2 } = await Promise.resolve().then(() => (init_routes_billing(), routes_billing_exports));
  app2.post("/api/register", register2);
  app2.post("/api/billing/portal", requireAuth, createPortalSession2);
  const httpServer = createServer(app2);
  return httpServer;
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
import { nanoid as nanoid2 } from "nanoid";
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
  app2.use("*", async (req2, res, next) => {
    const url = req2.originalUrl;
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
        `src="/src/main.tsx?v=${nanoid2()}"`
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

// server/index.ts
var app = express2();
(async () => {
  try {
    await Promise.resolve().then(() => (init_firebaseAdmin(), firebaseAdmin_exports));
  } catch (err) {
    console.warn("[Server] Firebase Admin initialization skipped:", err instanceof Error ? err.message : String(err));
  }
})();
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.get("/api/healthz", (_req, res) => res.type("text/plain").send("ok"));
app.post(
  "/api/stripe/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req2, res) => {
    const { stripeWebhook: stripeWebhook2 } = await Promise.resolve().then(() => (init_routes_billing(), routes_billing_exports));
    return stripeWebhook2(req2, res);
  }
);
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(cookieParser(process.env.SESSION_SECRET));
app.use((req2, res, next) => {
  const start = Date.now();
  const path4 = req2.path;
  let capturedJsonResponse;
  const originalResJson = res.json.bind(res);
  res.json = (bodyJson) => {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson);
  };
  res.on("finish", () => {
    if (!path4.startsWith("/api")) return;
    const duration = Date.now() - start;
    let line = `${req2.method} ${path4} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) line += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    if (line.length > 80) line = line.slice(0, 79) + "\u2026";
    log(line);
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  const isProduction = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1";
  log(`Environment check - NODE_ENV: ${process.env.NODE_ENV}, REPLIT_DEPLOYMENT: ${process.env.REPLIT_DEPLOYMENT}, isProduction: ${isProduction}`);
  if (!isProduction) {
    log("Setting up Vite development server");
    await setupVite(app, server);
  } else {
    log("Setting up production static file serving");
    app.use((req2, res, next) => {
      if (req2.path === "/" || req2.path.endsWith("/index.html")) {
        res.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
        log(`No-cache headers set for: ${req2.path}`);
      }
      next();
    });
    serveStatic(app);
  }
  const port = Number(process.env.PORT) || (isProduction ? 3e3 : 5e3);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
