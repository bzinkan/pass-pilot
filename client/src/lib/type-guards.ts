/**
 * Type Guards and Null Safety Utilities for PassPilot
 */

import type { User, School, Student, Pass, Grade } from '@shared/types';

/**
 * Type guard for User objects
 */
export function isValidUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const user = value as Record<string, unknown>;
  
  return (
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.name === 'string' &&
    typeof user.schoolId === 'string' &&
    (typeof user.schoolName === 'string' || user.schoolName === null) &&
    typeof user.isAdmin === 'boolean' &&
    typeof user.isFirstLogin === 'boolean' &&
    typeof user.enableNotifications === 'boolean' &&
    user.createdAt instanceof Date &&
    user.updatedAt instanceof Date
  );
}

/**
 * Type guard for School objects
 */
export function isValidSchool(value: unknown): value is School {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const school = value as Record<string, unknown>;
  
  return (
    typeof school.id === 'string' &&
    typeof school.name === 'string' &&
    typeof school.plan === 'string' &&
    typeof school.currentTeachers === 'number' &&
    typeof school.maxTeachers === 'number' &&
    typeof school.currentStudents === 'number' &&
    typeof school.maxStudents === 'number' &&
    (school.trialEndDate instanceof Date || school.trialEndDate === null) &&
    school.createdAt instanceof Date &&
    school.updatedAt instanceof Date
  );
}

/**
 * Type guard for Student objects
 */
export function isValidStudent(value: unknown): value is Student {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const student = value as Record<string, unknown>;
  
  return (
    typeof student.id === 'string' &&
    typeof student.name === 'string' &&
    typeof student.gradeId === 'string' &&
    typeof student.schoolId === 'string' &&
    student.createdAt instanceof Date &&
    student.updatedAt instanceof Date
  );
}

/**
 * Type guard for Grade objects
 */
export function isValidGrade(value: unknown): value is Grade {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const grade = value as Record<string, unknown>;
  
  return (
    typeof grade.id === 'string' &&
    typeof grade.name === 'string' &&
    typeof grade.schoolId === 'string' &&
    typeof grade.displayOrder === 'number' &&
    grade.createdAt instanceof Date &&
    grade.updatedAt instanceof Date
  );
}

/**
 * Type guard for Pass objects
 */
export function isValidPass(value: unknown): value is Pass {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const pass = value as Record<string, unknown>;
  
  return (
    typeof pass.id === 'string' &&
    typeof pass.studentId === 'string' &&
    pass.issuedAt instanceof Date &&
    (pass.returnedAt instanceof Date || pass.returnedAt === null) &&
    typeof pass.duration === 'number' &&
    (typeof pass.location === 'string' || pass.location === null) &&
    (typeof pass.notes === 'string' || pass.notes === null) &&
    typeof pass.status === 'string' &&
    pass.createdAt instanceof Date &&
    pass.updatedAt instanceof Date
  );
}

/**
 * Array type guards
 */
export function isValidUserArray(value: unknown): value is User[] {
  return Array.isArray(value) && value.every(isValidUser);
}

export function isValidSchoolArray(value: unknown): value is School[] {
  return Array.isArray(value) && value.every(isValidSchool);
}

export function isValidStudentArray(value: unknown): value is Student[] {
  return Array.isArray(value) && value.every(isValidStudent);
}

export function isValidGradeArray(value: unknown): value is Grade[] {
  return Array.isArray(value) && value.every(isValidGrade);
}

export function isValidPassArray(value: unknown): value is Pass[] {
  return Array.isArray(value) && value.every(isValidPass);
}

/**
 * Generic type guards
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidEmail(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

export function isValidId(value: unknown): value is string {
  return isNonEmptyString(value) && value.length >= 1;
}

/**
 * Form validation type guards
 */
export function isValidLoginForm(value: unknown): value is { email: string; password: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const form = value as Record<string, unknown>;
  return isValidEmail(form.email) && isNonEmptyString(form.password);
}

export function isValidRegisterForm(value: unknown): value is {
  schoolName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
} {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const form = value as Record<string, unknown>;
  return (
    isNonEmptyString(form.schoolName) &&
    isNonEmptyString(form.adminName) &&
    isValidEmail(form.adminEmail) &&
    isNonEmptyString(form.adminPassword)
  );
}

/**
 * API response type guards
 */
export function isApiResponse<T>(
  value: unknown,
  dataValidator: (data: unknown) => data is T
): value is { data: T; message: string | null; success: boolean } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const response = value as Record<string, unknown>;
  return (
    dataValidator(response.data) &&
    (typeof response.message === 'string' || response.message === null) &&
    typeof response.success === 'boolean'
  );
}

export function isApiError(value: unknown): value is { message: string; code?: string; details?: unknown } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const error = value as Record<string, unknown>;
  return (
    typeof error.message === 'string' &&
    (typeof error.code === 'string' || error.code === undefined) &&
    (error.details !== undefined || error.details === undefined)
  );
}

/**
 * Safe type assertion helpers
 */
export function assertIsUser(value: unknown, context = 'user'): asserts value is User {
  if (!isValidUser(value)) {
    throw new Error(`Invalid ${context}: expected valid User object`);
  }
}

export function assertIsSchool(value: unknown, context = 'school'): asserts value is School {
  if (!isValidSchool(value)) {
    throw new Error(`Invalid ${context}: expected valid School object`);
  }
}

export function assertIsStudent(value: unknown, context = 'student'): asserts value is Student {
  if (!isValidStudent(value)) {
    throw new Error(`Invalid ${context}: expected valid Student object`);
  }
}

export function assertIsGrade(value: unknown, context = 'grade'): asserts value is Grade {
  if (!isValidGrade(value)) {
    throw new Error(`Invalid ${context}: expected valid Grade object`);
  }
}

export function assertIsPass(value: unknown, context = 'pass'): asserts value is Pass {
  if (!isValidPass(value)) {
    throw new Error(`Invalid ${context}: expected valid Pass object`);
  }
}

/**
 * Null-safe object property access
 */
export function hasProperty<T extends Record<string, unknown>, K extends string>(
  obj: T | null | undefined,
  key: K
): obj is T & Record<K, unknown> {
  return obj != null && typeof obj === 'object' && key in obj;
}

export function getProperty<T extends Record<string, unknown>, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue?: T[K]
): T[K] | typeof defaultValue {
  if (obj == null || typeof obj !== 'object') {
    return defaultValue as T[K];
  }
  
  return obj[key] ?? defaultValue as T[K];
}