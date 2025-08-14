/**
 * Validation utilities with null safety for PassPilot
 */

import { invariant, SafeString } from './null-guards';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FieldValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Safe email validation
 */
export function validateEmail(email: string | null | undefined): FieldValidationResult {
  const cleanEmail = SafeString.trim(email);
  
  if (!cleanEmail) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true, error: null };
}

/**
 * Safe password validation
 */
export function validatePassword(password: string | null | undefined): FieldValidationResult {
  const cleanPassword = SafeString.trim(password);
  
  if (!cleanPassword) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (cleanPassword.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  
  return { isValid: true, error: null };
}

/**
 * Safe school name validation
 */
export function validateSchoolName(name: string | null | undefined): FieldValidationResult {
  const cleanName = SafeString.trim(name);
  
  if (!cleanName) {
    return { isValid: false, error: 'School name is required' };
  }
  
  if (cleanName.length < 2) {
    return { isValid: false, error: 'School name must be at least 2 characters long' };
  }
  
  if (cleanName.length > 100) {
    return { isValid: false, error: 'School name must be less than 100 characters' };
  }
  
  return { isValid: true, error: null };
}

/**
 * Safe person name validation
 */
export function validatePersonName(name: string | null | undefined): FieldValidationResult {
  const cleanName = SafeString.trim(name);
  
  if (!cleanName) {
    return { isValid: false, error: 'Name is required' };
  }
  
  if (cleanName.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' };
  }
  
  if (cleanName.length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' };
  }
  
  return { isValid: true, error: null };
}

/**
 * Safe grade name validation
 */
export function validateGradeName(name: string | null | undefined): FieldValidationResult {
  const cleanName = SafeString.trim(name);
  
  if (!cleanName) {
    return { isValid: false, error: 'Grade name is required' };
  }
  
  if (cleanName.length < 1) {
    return { isValid: false, error: 'Grade name cannot be empty' };
  }
  
  if (cleanName.length > 20) {
    return { isValid: false, error: 'Grade name must be less than 20 characters' };
  }
  
  return { isValid: true, error: null };
}

/**
 * Validate form data with null safety
 */
export function validateForm<T extends Record<string, any>>(
  data: T,
  validators: Partial<Record<keyof T, (value: any) => FieldValidationResult>>
): ValidationResult {
  const errors: string[] = [];
  
  for (const [field, validator] of Object.entries(validators)) {
    if (validator && field in data) {
      const result = validator(data[field as keyof T]);
      if (!result.isValid && result.error) {
        errors.push(`${field}: ${result.error}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Safe required field validation
 */
export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string
): FieldValidationResult {
  if (value == null || (typeof value === 'string' && SafeString.trim(value) === '')) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  return { isValid: true, error: null };
}

/**
 * Safe string length validation
 */
export function validateStringLength(
  value: string | null | undefined,
  fieldName: string,
  minLength: number,
  maxLength?: number
): FieldValidationResult {
  const cleanValue = SafeString.trim(value);
  
  if (cleanValue.length < minLength) {
    return { 
      isValid: false, 
      error: `${fieldName} must be at least ${minLength} characters long` 
    };
  }
  
  if (maxLength && cleanValue.length > maxLength) {
    return { 
      isValid: false, 
      error: `${fieldName} must be less than ${maxLength} characters` 
    };
  }
  
  return { isValid: true, error: null };
}

/**
 * Safe number validation
 */
export function validateNumber(
  value: string | number | null | undefined,
  fieldName: string,
  min?: number,
  max?: number
): FieldValidationResult {
  if (value == null) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const numValue = typeof value === 'string' ? Number(value) : value;
  
  if (isNaN(numValue)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }
  
  if (min !== undefined && numValue < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }
  
  if (max !== undefined && numValue > max) {
    return { isValid: false, error: `${fieldName} must be at most ${max}` };
  }
  
  return { isValid: true, error: null };
}

/**
 * Validation helpers for specific forms
 */
export const FormValidators = {
  login: {
    email: validateEmail,
    password: validatePassword
  },
  
  register: {
    schoolName: validateSchoolName,
    adminName: validatePersonName,
    adminEmail: validateEmail,
    adminPassword: validatePassword
  },
  
  forgotPassword: {
    email: validateEmail
  },
  
  grade: {
    name: validateGradeName
  },
  
  student: {
    name: validatePersonName
  }
};