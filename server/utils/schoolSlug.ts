/**
 * School slug utilities for duplicate prevention
 */

/**
 * Normalizes a school name into a unique slug
 * Examples:
 * - "DeSales High School" -> "desales-high-school"
 * - "St. Mary's Elementary" -> "st-marys-elementary"
 * - "Lincoln Middle School" -> "lincoln-middle-school"
 */
export function normalizeSchoolSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');     // Remove leading/trailing hyphens
}

/**
 * Validates that a school name is acceptable for slug generation
 */
export function validateSchoolName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'School name is required' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'School name must be at least 2 characters long' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'School name must be less than 100 characters' };
  }
  
  const slug = normalizeSchoolSlug(trimmed);
  if (!slug || slug.length < 1) {
    return { valid: false, error: 'School name must contain at least one alphanumeric character' };
  }
  
  return { valid: true };
}