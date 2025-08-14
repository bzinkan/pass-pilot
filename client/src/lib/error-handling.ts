/**
 * Null-Safe Error Handling Utilities for PassPilot
 */

import { invariant, withDefault, SafeString } from './null-guards';
import type { ApiError, ValidationError } from '@shared/types';

/**
 * Safe error message extraction
 */
export function extractErrorMessage(error: unknown): string {
  if (error == null) {
    return 'An unknown error occurred';
  }

  // Handle API errors
  if (typeof error === 'object' && 'message' in error) {
    const apiError = error as ApiError;
    return SafeString.trim(apiError.message) || 'An error occurred';
  }

  // Handle native Error objects
  if (error instanceof Error) {
    return SafeString.trim(error.message) || 'An error occurred';
  }

  // Handle string errors
  if (typeof error === 'string') {
    return SafeString.trim(error) || 'An error occurred';
  }

  // Handle response errors
  if (typeof error === 'object' && 'response' in error) {
    const response = (error as any).response;
    if (response?.data?.message) {
      return SafeString.trim(response.data.message) || 'An error occurred';
    }
  }

  return 'An unexpected error occurred';
}

/**
 * Safe validation error formatting
 */
export function formatValidationErrors(errors: ValidationError[] | null | undefined): string {
  if (!errors || errors.length === 0) {
    return '';
  }

  const messages = errors
    .map(err => `${err.field}: ${err.message}`)
    .filter(msg => SafeString.trim(msg));

  return messages.join(', ');
}

/**
 * Error boundary helper
 */
export class SafeErrorBoundary {
  private static instance: SafeErrorBoundary;

  static getInstance(): SafeErrorBoundary {
    if (!SafeErrorBoundary.instance) {
      SafeErrorBoundary.instance = new SafeErrorBoundary();
    }
    return SafeErrorBoundary.instance;
  }

  /**
   * Safe function execution with error handling
   */
  async safeExecute<T>(
    fn: () => Promise<T>,
    fallback?: T,
    onError?: (error: Error) => void
  ): Promise<T | undefined> {
    try {
      const result = await fn();
      invariant(result !== null && result !== undefined, 'Function returned null or undefined');
      return result;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      const safeError = new Error(errorMessage);
      
      if (onError) {
        onError(safeError);
      } else {
        console.error('SafeErrorBoundary caught error:', safeError);
      }
      
      return fallback;
    }
  }

  /**
   * Safe synchronous function execution
   */
  safeExecuteSync<T>(
    fn: () => T,
    fallback?: T,
    onError?: (error: Error) => void
  ): T | undefined {
    try {
      const result = fn();
      invariant(result !== null && result !== undefined, 'Function returned null or undefined');
      return result;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      const safeError = new Error(errorMessage);
      
      if (onError) {
        onError(safeError);
      } else {
        console.error('SafeErrorBoundary caught error:', safeError);
      }
      
      return fallback;
    }
  }
}

/**
 * Safe API error handling
 */
export class ApiErrorHandler {
  /**
   * Handle API response with null safety
   */
  static async handleResponse<T>(response: Response): Promise<T> {
    invariant(response, 'Response cannot be null');

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = extractErrorMessage(errorData);
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    try {
      const data = await response.json();
      invariant(data !== null && data !== undefined, 'API response data cannot be null');
      return data;
    } catch (parseError) {
      throw new Error('Failed to parse API response');
    }
  }

  /**
   * Create safe fetch wrapper
   */
  static safeFetch = async <T>(
    url: string,
    options?: RequestInit
  ): Promise<T> => {
    invariant(url, 'URL cannot be null or empty');

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      return await ApiErrorHandler.handleResponse<T>(response);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  };
}

/**
 * Form error helpers with null safety
 */
export const FormErrorHelpers = {
  /**
   * Get error message for a specific field
   */
  getFieldError(
    errors: Record<string, string> | null | undefined,
    field: string
  ): string | null {
    if (!errors || !field) return null;
    return withDefault(errors[field], null);
  },

  /**
   * Check if field has error
   */
  hasFieldError(
    errors: Record<string, string> | null | undefined,
    field: string
  ): boolean {
    return Boolean(this.getFieldError(errors, field));
  },

  /**
   * Get all error messages as array
   */
  getAllErrors(
    errors: Record<string, string> | null | undefined
  ): string[] {
    if (!errors) return [];
    return Object.values(errors).filter(error => Boolean(SafeString.trim(error)));
  },

  /**
   * Format errors for display
   */
  formatErrors(
    errors: Record<string, string> | null | undefined,
    separator = ', '
  ): string {
    const allErrors = this.getAllErrors(errors);
    return allErrors.join(separator);
  }
};

/**
 * Safe promise helpers
 */
export const SafePromise = {
  /**
   * All settled with null protection
   */
  async allSettledSafe<T>(
    promises: Promise<T>[]
  ): Promise<Array<{ success: boolean; value?: T; error?: string }>> {
    invariant(promises, 'Promises array cannot be null');
    
    const results = await Promise.allSettled(promises);
    
    return results.map(result => {
      if (result.status === 'fulfilled') {
        return { success: true, value: result.value };
      } else {
        return { 
          success: false, 
          error: extractErrorMessage(result.reason)
        };
      }
    });
  },

  /**
   * Timeout wrapper with null safety
   */
  async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage = 'Operation timed out'
  ): Promise<T> {
    invariant(promise, 'Promise cannot be null');
    invariant(timeoutMs > 0, 'Timeout must be positive');

    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      ),
    ]);
  }
};

/**
 * Export singleton instance
 */
export const safeErrorBoundary = SafeErrorBoundary.getInstance();