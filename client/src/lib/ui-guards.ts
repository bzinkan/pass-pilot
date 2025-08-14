/**
 * React UI Guard Utilities
 * 
 * Stop rendering until data exists. Gate on loading states.
 * Provide default params for props. Never assume arrays/objects exist.
 */

import React, { ReactNode } from 'react';

/**
 * Safe array rendering helper - ensures array exists before mapping
 */
export function safeMap<T, R>(
  array: T[] | null | undefined,
  mapFn: (item: T, index: number) => R,
  fallback: R[] = []
): R[] {
  if (!Array.isArray(array)) return fallback;
  return array.map(mapFn);
}

/**
 * Safe object property access with default
 */
export function safeProp<T>(
  obj: Record<string, any> | null | undefined,
  key: string,
  defaultValue: T
): T {
  if (!obj || typeof obj !== 'object') return defaultValue;
  return obj[key] ?? defaultValue;
}

/**
 * Safe array length check
 */
export function hasItems<T>(array: T[] | null | undefined): array is T[] {
  return Array.isArray(array) && array.length > 0;
}

/**
 * Safe object check
 */
export function isValidObject(obj: any): obj is Record<string, any> {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
}

/**
 * Safe string check
 */
export function isNonEmptyString(str: any): str is string {
  return typeof str === 'string' && str.trim().length > 0;
}

/**
 * Component guard hook for consistent loading/error states
 */
export interface GuardedComponentProps {
  isLoading?: boolean;
  error?: Error | string | null;
  data?: any;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  emptyComponent?: ReactNode;
}

/**
 * Higher-order component for consistent data guards
 */
export function withDataGuards<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: {
    loadingComponent?: ReactNode;
    errorComponent?: ReactNode;
    emptyComponent?: ReactNode;
    dataKey?: keyof T;
  } = {}
) {
  return function GuardedComponent(props: T & GuardedComponentProps) {
    const {
      isLoading = false,
      error = null,
      data,
      loadingComponent,
      errorComponent,
      emptyComponent,
      ...componentProps
    } = props as any;

    // Loading state
    if (isLoading) {
      return loadingComponent || options.loadingComponent || React.createElement('div', null, 'Loading...');
    }

    // Error state
    if (error) {
      const errorMessage = typeof error === 'string' ? error : error.message;
      return errorComponent || options.errorComponent || React.createElement('div', { className: 'text-red-600' }, `Error: ${errorMessage}`);
    }

    // Empty/no data state
    const dataToCheck = options.dataKey ? props[options.dataKey] : data;
    if (!dataToCheck || (Array.isArray(dataToCheck) && dataToCheck.length === 0)) {
      return emptyComponent || options.emptyComponent || React.createElement('div', { className: 'text-gray-500' }, 'No data available');
    }

    return React.createElement(Component, componentProps);
  };
}

/**
 * Typing helpers for component props with defaults
 */
export type WithDefaults<T, D extends Partial<T>> = Omit<T, keyof D> & Partial<Pick<T, keyof D>>;

/**
 * Hook for safe query state management
 */
export interface SafeQueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
  hasData: boolean;
}

export function useSafeQueryState<T>(queryResult: {
  data?: T;
  isLoading?: boolean;
  error?: Error | null;
}): SafeQueryState<T> {
  const { data, isLoading = false, error = null } = queryResult;

  const hasData = data !== null && data !== undefined;
  const isEmpty = !hasData || (Array.isArray(data) && data.length === 0);

  return {
    data: data || null,
    isLoading,
    error,
    isEmpty,
    hasData,
  };
}