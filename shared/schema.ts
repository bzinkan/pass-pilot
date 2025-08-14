import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("student"), // "teacher" or "student"
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  studentId: text("student_id"), // Only for students
});

export const passes = pgTable("passes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  studentName: text("student_name").notNull(),
  teacherId: varchar("teacher_id").notNull(),
  teacherName: text("teacher_name").notNull(),
  destination: text("destination").notNull(),
  customDestination: text("custom_destination"),
  duration: integer("duration").notNull(), // in minutes
  notes: text("notes"),
  status: text("status").notNull().default("active"), // "active", "expired", "returned", "revoked"
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  returnedAt: timestamp("returned_at"),
  passNumber: integer("pass_number").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  firstName: true,
  lastName: true,
  studentId: true,
});

export const insertPassSchema = createInsertSchema(passes).pick({
  studentId: true,
  studentName: true,
  teacherId: true,
  teacherName: true,
  destination: true,
  customDestination: true,
  duration: true,
  notes: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPass = z.infer<typeof insertPassSchema>;
export type Pass = typeof passes.$inferSelect;
