import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, uuid, unique, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Schools table - represents educational institutions
export const schools = pgTable("schools", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-safe identifier
  emailDomain: text("email_domain"), // Optional: for validation
  status: text("status").notNull().default("active"), // active, suspended, cancelled
  plan: text("plan").notNull().default("free_trial"), // free_trial, basic, premium
  maxTeachers: integer("max_teachers").notNull().default(10),
  maxStudents: integer("max_students").notNull().default(500),
  currentTeachers: integer("current_teachers").notNull().default(0),
  currentStudents: integer("current_students").notNull().default(0),
  trialStartDate: timestamp("trial_start_date").defaultNow(),
  trialEndDate: timestamp("trial_end_date"),
  isTrialExpired: boolean("is_trial_expired").notNull().default(false),
  subscriptionStatus: text("subscription_status"), // Stripe subscription status
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Users table - teachers and administrators
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  status: text("status").notNull().default("active"), // active, suspended, pending
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint on email + schoolId combination
  unq: unique().on(table.email, table.schoolId),
}));

// Grades table - grade levels within schools
export const grades = pgTable("grades", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "6th Grade", "Freshman", "Senior"
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Students table
export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  gradeId: uuid("grade_id").references(() => grades.id, { onDelete: "set null" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  studentId: text("student_id"), // School's internal ID
  email: text("email"),
  status: text("status").notNull().default("active"), // active, inactive, transferred
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Unique student ID within school
  unq: unique().on(table.studentId, table.schoolId),
}));

// Passes table - hall passes issued to students
export const passes = pgTable("passes", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  destination: text("destination").notNull(),
  customDestination: text("custom_destination"),
  duration: integer("duration").notNull(), // in minutes
  notes: text("notes"),
  status: text("status").notNull().default("active"), // active, expired, returned, revoked
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  returnedAt: timestamp("returned_at"),
  passNumber: integer("pass_number").notNull(),
  qrCode: text("qr_code"), // Optional QR code data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Payments table - for tracking subscription payments
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull(), // succeeded, failed, pending, cancelled
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas for validation
export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentTeachers: true,
  currentStudents: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resetToken: true,
  resetTokenExpiry: true,
});

export const insertGradeSchema = createInsertSchema(grades).omit({
  id: true,
  createdAt: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPassSchema = createInsertSchema(passes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  passNumber: true,
  qrCode: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Types
export type School = typeof schools.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Grade = typeof grades.$inferSelect;
export type InsertGrade = z.infer<typeof insertGradeSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type Pass = typeof passes.$inferSelect;
export type InsertPass = z.infer<typeof insertPassSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Admin users table (for platform administration)
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("admin"), // admin, super_admin
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Subscription events table
export const subscriptionEvents = pgTable("subscription_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // subscription.created, subscription.updated, etc.
  stripeEventId: text("stripe_event_id").unique(),
  data: text("data"), // JSON string of event data
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Types for new tables
export type AdminUser = typeof adminUsers.$inferSelect;
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;

// Additional validation schemas for specific use cases
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  schoolId: z.string().uuid().optional(),
});

export const registerSchoolSchema = z.object({
  schoolName: z.string().min(2),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  plan: z.enum(["TRIAL","BASIC","SMALL","MEDIUM","LARGE","UNLIMITED"]).default("TRIAL"),
});

export const passwordResetSchema = z.object({
  email: z.string().email(),
  schoolId: z.string().uuid().optional(),
});

export const updatePasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});