/**
 * Enhanced Type Definitions with Null Safety for PassPilot
 */

// Base types with null safety
export interface User {
  id: string;
  email: string;
  name: string;
  schoolId: string;
  schoolName: string | null;
  role: 'ADMIN' | 'TEACHER' | 'STAFF' | 'STUDENT';
  isAdmin: boolean; // Maintained for backward compatibility
  isFirstLogin: boolean;
  enableNotifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface School {
  id: string;
  name: string;
  plan: string;
  currentTeachers: number;
  maxTeachers: number;
  currentStudents: number;
  maxStudents: number;
  trialEndDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Grade {
  id: string;
  name: string;
  schoolId: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Student {
  id: string;
  name: string;
  gradeId: string;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Pass {
  id: string;
  studentId: string;
  issuedAt: Date;
  returnedAt: Date | null;
  duration: number;
  location: string | null;
  notes: string | null;
  status: PassStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum PassStatus {
  ACTIVE = 'active',
  RETURNED = 'returned',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}

// API Response types with null safety
export interface ApiResponse<T> {
  data: T;
  message: string | null;
  success: boolean;
}

export interface ApiError {
  message: string;
  code: string | null;
  details: unknown | null;
}

// Form types with null safety
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  schoolName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface ForgotPasswordForm {
  email: string;
}

// Component props with null safety
export interface TabProps {
  user: User;
}

export interface AdminTabProps extends TabProps {
  // Admin-specific props
}

export interface RosterTabProps extends TabProps {
  selectedGrades: Set<string>;
  onGradeClick: (gradeName: string) => void;
}

export interface MyClassTabProps extends TabProps {
  selectedGrades: Set<string>;
  currentGrade: string | null;
  onRemoveGrade: (gradeName: string) => void;
}

export interface PassesTabProps extends TabProps {
  selectedGrades?: Set<string>;
}

// Utility types for null safety
export type NonNullable<T> = T extends null | undefined ? never : T;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// State types
export interface AppState {
  user: User | null;
  isLoading: boolean;
  selectedGrades: Set<string>;
  currentGrade: string | null;
}

// Error handling types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrors {
  [field: string]: string | undefined;
}