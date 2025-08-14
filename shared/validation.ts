import { z } from "zod";

// Pass creation validation schema
export const CreatePassSchema = z.object({
  schoolId: z.string().min(1, "School ID is required"),
  studentId: z.string().min(1, "Student ID is required"), 
  teacherId: z.string().min(1, "Teacher ID is required"),
  destination: z.string().min(1, "Destination is required"),
  customReason: z.string().optional(),
  duration: z.number().positive().optional(),
  passType: z.string().default("general"),
  td: z.string().default("general"), // Pass type/destination field
  tdv: z.string().optional(), // Pass type variant (not stored in DB, used for validation only)
  notes: z.string().optional(),
}).strict(); // Reject unknown properties

export type CreatePassInput = z.infer<typeof CreatePassSchema>;

// Enhanced pass validation with additional safety checks
export const validatePassData = (data: any): CreatePassInput => {
  // Remove any null, undefined, or empty string values
  const cleaned = Object.fromEntries(
    Object.entries(data)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([_, value]) => value !== '')
  );
  
  return CreatePassSchema.parse(cleaned);
};