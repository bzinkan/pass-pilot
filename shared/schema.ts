import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "pending"]);
export const planEnum = pgEnum("plan", [
  "free_trial", "TRIAL", "TEACHER_MONTHLY", "TEACHER_ANNUAL", 
  "SMALL_TEAM_MONTHLY", "SMALL_TEAM_ANNUAL", "SMALL_SCHOOL", 
  "MEDIUM_SCHOOL", "LARGE_SCHOOL"
]);
export const passStatusEnum = pgEnum("pass_status", ["active", "returned", "overdue", "expired"]);

// Schools table
export const schools = pgTable("schools", {
  id: varchar("id").primaryKey(),
  schoolId: varchar("school_id").unique().notNull(),
  name: text("name").notNull(),
  district: text("district"),
  adminEmail: text("admin_email").notNull(),
  plan: planEnum("plan").notNull().default("free_trial"),
  maxTeachers: integer("max_teachers").notNull().default(1),
  maxStudents: integer("max_students").notNull().default(200),
  verified: boolean("verified").notNull().default(false),
  emailDomain: text("email_domain"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  trialStartDate: timestamp("trial_start_date"),
  trialEndDate: timestamp("trial_end_date"),
  isTrialExpired: boolean("is_trial_expired").notNull().default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpiry: timestamp("verification_token_expiry"),
  subscriptionCancelledAt: timestamp("subscription_cancelled_at"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  slug: text("slug").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  firebaseUid: text("firebase_uid"),
  email: text("email").notNull(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  schoolId: varchar("school_id").notNull().references(() => schools.id),
  isAdmin: boolean("is_admin").notNull().default(false),
  isPlatformOwner: boolean("is_platform_owner").notNull().default(false),
  assignedGrades: text("assigned_grades").array().default([]),
  invitedBy: varchar("invited_by"),
  status: userStatusEnum("status").notNull().default("active"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  enableNotifications: boolean("enable_notifications").default(true),
  autoReturn: boolean("auto_return").default(false),
  passTimeout: integer("pass_timeout").default(15),
  kioskPin: text("kiosk_pin"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Grades table
export const grades = pgTable("grades", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  schoolId: varchar("school_id").notNull().references(() => schools.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Students table
export const students = pgTable("students", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  grade: text("grade").notNull(),
  gradeId: varchar("grade_id").references(() => grades.id),
  schoolId: varchar("school_id").notNull().references(() => schools.id),
  studentId: text("student_id"), // School's internal student ID
  homeroom: text("homeroom"),
  initials: text("initials"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Passes table
export const passes = pgTable("passes", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: varchar("student_id").notNull().references(() => students.id),
  teacherId: varchar("teacher_id").notNull().references(() => users.id),
  schoolId: varchar("school_id").notNull().references(() => schools.id),
  destination: text("destination").notNull(),
  duration: integer("duration"), // in minutes - can be null initially
  status: passStatusEnum("status").notNull().default("active"),
  timeOut: timestamp("time_out").notNull(),
  timeIn: timestamp("time_in"),
  checkoutTime: timestamp("checkout_time").notNull(),
  returnTime: timestamp("return_time"),
  issuingTeacher: text("issuing_teacher").notNull(),
  passType: text("pass_type").default("general"),
  td: text("td").default("general"), // Pass type/destination - guaranteed non-null by trigger
  customReason: text("custom_reason"),
  notes: text("notes"),
  printRequested: boolean("print_requested").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey(),
  schoolId: varchar("school_id").notNull().references(() => schools.id),
  stripePaymentId: text("stripe_payment_id").notNull(),
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin Users table (for platform super admins)
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("superadmin"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscription Events table (for tracking billing events)
export const subscriptionEvents = pgTable("subscription_events", {
  id: varchar("id").primaryKey(),
  schoolId: varchar("school_id").notNull().references(() => schools.id),
  eventType: text("event_type").notNull(), // subscription.created, subscription.updated, etc.
  stripeEventId: text("stripe_event_id").notNull().unique(),
  data: text("data"), // JSON data from Stripe
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionEventSchema = createInsertSchema(subscriptionEvents).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type School = typeof schools.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type Grade = typeof grades.$inferSelect;
export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Pass = typeof passes.$inferSelect;
export type InsertPass = z.infer<typeof insertPassSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
export type InsertSubscriptionEvent = z.infer<typeof insertSubscriptionEventSchema>;

// Extended types with relationships
export type PassWithStudent = Pass & {
  student: Student;
};

export type PassWithStudentAndTeacher = Pass & {
  student: Student;
  teacher: User;
};

export type UserWithSchool = User & {
  school: School;
};

export type StudentWithGrade = Student & {
  grade: Grade;
};