/**
 * Null Protection Utilities for PassPilot
 * 
 * These utilities enforce null safety throughout the application
 * and work with TypeScript's strict null checking.
 */

/**
 * Asserts that a value is not null or undefined
 * Throws an error if the value is null/undefined
 */
export function invariant<T>(
  value: T,
  message?: string
): asserts value is NonNullable<T> {
  if (value == null) {
    throw new Error(message ?? 'Invariant violation: value cannot be null or undefined');
  }
}

/**
 * Safely unwraps a potentially null/undefined value
 * Throws an error if the value is null/undefined
 */
export function unwrap<T>(
  value: T | null | undefined,
  message?: string
): T {
  if (value == null) {
    throw new Error(message ?? 'Cannot unwrap null or undefined value');
  }
  return value;
}

/**
 * Provides a default value for null/undefined values
 */
export function withDefault<T>(
  value: T | null | undefined,
  defaultValue: T
): T {
  return value ?? defaultValue;
}

/**
 * Type guard to check if value is not null/undefined
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value != null;
}

/**
 * Type guard to check if value is null or undefined
 */
export function isNull<T>(value: T | null | undefined): value is null | undefined {
  return value == null;
}

/**
 * Safe array access with optional chaining
 */
export function safeArrayAccess<T>(
  array: T[] | null | undefined,
  index: number
): T | undefined {
  return array?.[index];
}

/**
 * Safe object property access
 */
export function safeProp<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K
): T[K] | undefined {
  return obj?.[key];
}

/**
 * Filters out null and undefined values from arrays
 */
export function filterNotNull<T>(array: (T | null | undefined)[]): T[] {
  return array.filter(isNotNull);
}

/**
 * Safe string operations
 */
export const SafeString = {
  /**
   * Safe substring operation
   */
  substring(str: string | null | undefined, start: number, end?: number): string {
    return str?.substring(start, end) ?? '';
  },

  /**
   * Safe trim operation
   */
  trim(str: string | null | undefined): string {
    return str?.trim() ?? '';
  },

  /**
   * Safe toLowerCase operation
   */
  toLowerCase(str: string | null | undefined): string {
    return str?.toLowerCase() ?? '';
  },

  /**
   * Safe split operation
   */
  split(str: string | null | undefined, separator: string): string[] {
    return str?.split(separator) ?? [];
  }
};

/**
 * Safe number operations
 */
export const SafeNumber = {
  /**
   * Parse number with default
   */
  parse(value: string | null | undefined, defaultValue = 0): number {
    if (value == null) return defaultValue;
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  },

  /**
   * Safe toString operation
   */
  toString(num: number | null | undefined): string {
    return num?.toString() ?? '';
  }
};

/**
 * Safe date operations
 */
export const SafeDate = {
  /**
   * Parse date with null safety
   */
  parse(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  },

  /**
   * Format date safely
   */
  format(date: Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
    return date?.toLocaleDateString(undefined, options) ?? '';
  }
};