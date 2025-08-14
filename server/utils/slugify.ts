// server/utils/slugify.ts
import { db } from "../db";
import { schools } from "../../shared/schema";
import { eq } from "drizzle-orm";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * Generate a unique slug for a school name
 * 
 * If the base slug already exists, append a number to make it unique
 * Example: "bayside" -> "bayside-2" -> "bayside-3"
 */
export async function generateUniqueSlug(schoolName: string): Promise<string> {
  const baseSlug = slugify(schoolName);
  
  // Check if base slug is available
  const [existing] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.slug, baseSlug))
    .limit(1);
  
  if (!existing) {
    return baseSlug;
  }
  
  // Base slug is taken, try with numbers
  let attempt = 2;
  let candidateSlug = `${baseSlug}-${attempt}`;
  
  while (attempt <= 100) { // Prevent infinite loops
    const [existingCandidate] = await db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.slug, candidateSlug))
      .limit(1);
    
    if (!existingCandidate) {
      return candidateSlug;
    }
    
    attempt++;
    candidateSlug = `${baseSlug}-${attempt}`;
  }
  
  // Fallback: append timestamp if all numbered attempts are taken
  const timestamp = Date.now().toString().slice(-6);
  return `${baseSlug}-${timestamp}`;
}