import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  grade: text("grade").notNull(),
  room: text("room").notNull(),
  initials: text("initials").notNull(),
});

export const hallPasses = pgTable("hall_passes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => students.id),
  destination: text("destination").notNull(),
  duration: integer("duration").notNull(), // in minutes
  timeOut: timestamp("time_out").notNull(),
  timeIn: timestamp("time_in"),
  issuingTeacher: text("issuing_teacher").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("active"), // active, returned, overdue
  printRequested: boolean("print_requested").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
});

export const insertHallPassSchema = createInsertSchema(hallPasses).omit({
  id: true,
  createdAt: true,
}).extend({
  timeOut: z.string().optional(),
  timeIn: z.string().optional(),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type HallPass = typeof hallPasses.$inferSelect;
export type InsertHallPass = z.infer<typeof insertHallPassSchema>;

export type HallPassWithStudent = HallPass & {
  student: Student;
};
