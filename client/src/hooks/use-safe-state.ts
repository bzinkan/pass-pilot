/**
 * Safe State Management Hooks with Null Protection
 */

import { useState, useCallback, useEffect } from 'react';
import { invariant, withDefault, isNotNull } from '@/lib/null-guards';

/**
 * Safe localStorage hook with null protection
 */
export function useSafeLocalStorage<T>(
  key: string,
  defaultValue: T,
  serializer = JSON
): [T, (value: T) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? serializer.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      invariant(value !== null && value !== undefined, 'Cannot store null or undefined in localStorage');
      setStoredValue(value);
      window.localStorage.setItem(key, serializer.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, serializer]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(defaultValue);
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Safe array state with null protection
 */
export function useSafeArray<T>(initialValue: T[] = []): {
  items: T[];
  addItem: (item: T) => void;
  removeItem: (predicate: (item: T) => boolean) => void;
  updateItem: (predicate: (item: T) => boolean, updater: (item: T) => T) => void;
  clearItems: () => void;
  findItem: (predicate: (item: T) => boolean) => T | undefined;
} {
  const [items, setItems] = useState<T[]>(withDefault(initialValue, []));

  const addItem = useCallback((item: T) => {
    invariant(item, 'Cannot add null or undefined item to array');
    setItems(prev => [...prev, item]);
  }, []);

  const removeItem = useCallback((predicate: (item: T) => boolean) => {
    setItems(prev => prev.filter(item => !predicate(item)));
  }, []);

  const updateItem = useCallback((
    predicate: (item: T) => boolean,
    updater: (item: T) => T
  ) => {
    setItems(prev => prev.map(item => {
      if (predicate(item)) {
        const updated = updater(item);
        invariant(updated, 'Updater function cannot return null or undefined');
        return updated;
      }
      return item;
    }));
  }, []);

  const clearItems = useCallback(() => {
    setItems([]);
  }, []);

  const findItem = useCallback((predicate: (item: T) => boolean) => {
    return items.find(predicate);
  }, [items]);

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    clearItems,
    findItem
  };
}

/**
 * Safe object state with null protection
 */
export function useSafeObject<T extends Record<string, any>>(
  initialValue: T
): [T, (updater: Partial<T> | ((prev: T) => T)) => void, () => void] {
  const [object, setObject] = useState<T>(() => {
    invariant(initialValue, 'Initial value cannot be null or undefined');
    return initialValue;
  });

  const updateObject = useCallback((updater: Partial<T> | ((prev: T) => T)) => {
    setObject(prev => {
      const updated = typeof updater === 'function' 
        ? updater(prev)
        : { ...prev, ...updater };
      
      invariant(updated, 'Updated object cannot be null or undefined');
      return updated;
    });
  }, []);

  const resetObject = useCallback(() => {
    setObject(initialValue);
  }, [initialValue]);

  return [object, updateObject, resetObject];
}

/**
 * Safe async state with null protection
 */
export function useSafeAsync<T, E = Error>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList = []
): {
  data: T | null;
  error: E | null;
  loading: boolean;
  execute: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<E | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFn();
      setData(result);
    } catch (err) {
      setError(err as E);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, error, loading, execute };
}

/**
 * Safe form state with validation and null protection
 */
export function useSafeForm<T extends Record<string, any>>(
  initialValues: T,
  validate?: (values: T) => Record<string, string>
): {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  setValue: (field: keyof T, value: T[keyof T]) => void;
  setValues: (values: Partial<T>) => void;
  setTouched: (field: keyof T) => void;
  reset: () => void;
  isValid: boolean;
} {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});

  const validateValues = useCallback((vals: T) => {
    if (!validate) return {};
    return validate(vals);
  }, [validate]);

  useEffect(() => {
    const newErrors = validateValues(values);
    setErrors(newErrors);
  }, [values, validateValues]);

  const setValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValuesState(prev => ({ ...prev, [field]: value }));
  }, []);

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  const setTouched = useCallback((field: keyof T) => {
    setTouchedState(prev => ({ ...prev, [field]: true }));
  }, []);

  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setTouchedState({});
  }, [initialValues]);

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    setValue,
    setValues,
    setTouched,
    reset,
    isValid
  };
}