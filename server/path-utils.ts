/**
 * Path utility that works in both development and production
 * Fixes import.meta.dirname being undefined in bundled code
 */
import path from "path";
import { fileURLToPath } from "url";

/**
 * Get the current directory path, works in both dev and production
 */
export function getCurrentDir(): string {
  // In development, use import.meta.dirname if available
  if (import.meta.dirname) {
    return import.meta.dirname;
  }
  
  // In production (bundled), fall back to process.cwd() + server
  // This assumes the built file is in /app/dist/ and we need /app/server/ equivalent
  return path.join(process.cwd(), "server");
}

/**
 * Get the project root directory
 */
export function getProjectRoot(): string {
  // In development, go up from server directory
  if (import.meta.dirname) {
    return path.resolve(import.meta.dirname, "..");
  }
  
  // In production, use current working directory
  return process.cwd();
}