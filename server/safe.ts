/**
 * Edge Guard Helpers - Defend Your Assumptions
 * 
 * These tiny helpers throw immediately if something you assume isn't there.
 * Use them to guard your "edges" and fail fast when data doesn't match expectations.
 */

/**
 * Assert that a condition is true, throwing immediately if not.
 * TypeScript will narrow the type based on the assertion.
 * 
 * @param condition - The condition to check
 * @param msg - Error message if condition is false
 * 
 * @example
 * invariant(user.isAdmin, "User must be admin");
 * invariant(email.includes("@"), "Invalid email format");
 */
export function invariant(condition: any, msg: string): asserts condition {
  if (!condition) {
    console.error(`❌ Invariant failed: ${msg}`);
    throw new Error(msg);
  }
}

/**
 * Unwrap a potentially null/undefined value, throwing if null.
 * Use this when you expect a value to exist and want to fail fast if it doesn't.
 * 
 * @param v - The value to unwrap
 * @param msg - Error message if value is null/undefined
 * @returns The unwrapped value with null/undefined removed from type
 * 
 * @example
 * const user = await getUserById(id);
 * const schoolId = unwrap(user?.schoolId, "User missing schoolId");
 * const email = unwrap(user.email, "User email is required");
 */
export function unwrap<T>(v: T | null | undefined, msg = "Unexpected null"): T {
  if (v == null) {
    console.error(`❌ Unwrap failed: ${msg} (received: ${v})`);
    throw new Error(msg);
  }
  return v;
}

/**
 * Additional guard helpers for common patterns
 */

/**
 * Assert that a string is not empty, throwing if it is.
 * 
 * @param str - The string to check
 * @param msg - Error message if string is empty
 * @returns The non-empty string
 */
export function assertNonEmpty(str: string | null | undefined, msg = "String cannot be empty"): string {
  const trimmed = (str || "").trim();
  if (!trimmed) {
    console.error(`❌ Empty string assertion failed: ${msg}`);
    throw new Error(msg);
  }
  return trimmed;
}

/**
 * Assert that an array has items, throwing if empty.
 * 
 * @param arr - The array to check
 * @param msg - Error message if array is empty
 * @returns The non-empty array
 */
export function assertNonEmptyArray<T>(arr: T[] | null | undefined, msg = "Array cannot be empty"): T[] {
  if (!arr || arr.length === 0) {
    console.error(`❌ Empty array assertion failed: ${msg}`);
    throw new Error(msg);
  }
  return arr;
}

/**
 * Assert that a value is a valid UUID, throwing if not.
 * 
 * @param id - The ID to validate
 * @param msg - Error message if not a valid UUID
 * @returns The validated UUID
 */
export function assertValidUuid(id: string | null | undefined, msg = "Invalid UUID"): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    console.error(`❌ UUID validation failed: ${msg} (received: ${id})`);
    throw new Error(msg);
  }
  return id;
}

/**
 * Safe type casting with runtime validation
 * 
 * @param value - The value to cast
 * @param validator - Function that returns true if value is of expected type
 * @param msg - Error message if validation fails
 * @returns The value cast to the expected type
 */
export function safeCast<T>(value: unknown, validator: (v: unknown) => v is T, msg = "Type cast failed"): T {
  if (!validator(value)) {
    console.error(`❌ Safe cast failed: ${msg} (received: ${typeof value})`);
    throw new Error(msg);
  }
  return value;
}