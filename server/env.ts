/**
 * Environment Variable Validation with Fail-Fast Behavior
 * 
 * This module ensures all required environment variables are present and valid
 * at startup, preventing the "works in Replit preview, fails on deploy" class
 * of null reference errors.
 */

import { z } from "zod";

const EnvSchema = z.object({
  // Database Configuration - Required
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  
  // Session Management - Required
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters for security"),
  
  // Stripe Configuration - Required for production billing
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Stripe Price IDs for different plans
  PRICE_TRIAL: z.string().optional(),
  PRICE_BASIC: z.string().optional(),
  PRICE_SMALL: z.string().optional(),
  PRICE_MEDIUM: z.string().optional(),
  PRICE_LARGE: z.string().optional(),
  PRICE_UNLIMITED: z.string().optional(),
  
  // Email Configuration - Optional but validated if present
  SENDGRID_API_KEY: z.string().optional(),

  // Error monitoring configuration
  DISCORD_WEBHOOK_URL: z.string().url().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  ENABLE_DEV_NOTIFICATIONS: z.string().transform(val => val === 'true').optional(),
  
  // Firebase Configuration - Optional for legacy support
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  
  // Runtime Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  
  // Deployment Configuration
  REPLIT_DEPLOYMENT: z.string().optional(),
  PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(65535)).default("5000"),
  
  // Optional Security Headers
  CORS_ORIGIN: z.string().url().optional(),
  
  // Optional Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).optional(),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).optional(),
});

/**
 * Validated environment variables
 * This will throw an error with detailed validation messages if any required
 * environment variables are missing or invalid.
 */
export const ENV = (() => {
  try {
    const parsed = EnvSchema.parse(process.env);
    
    // Additional runtime validation
    if (parsed.NODE_ENV === 'production') {
      // In production, ensure critical services are configured
      if (!parsed.STRIPE_SECRET_KEY || !parsed.STRIPE_WEBHOOK_SECRET) {
        console.error('❌ Production environment requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET');
        process.exit(1);
      }
      if (!parsed.SENDGRID_API_KEY) {
        console.warn('⚠️  SENDGRID_API_KEY not configured - email functionality will be disabled');
      }
    } else {
      // Development warnings for missing optional services
      if (!parsed.STRIPE_SECRET_KEY || !parsed.STRIPE_WEBHOOK_SECRET) {
        console.warn('⚠️  Stripe not configured - payment features will be disabled in development');
      }
    }
    
    // Log successful validation in development
    if (parsed.NODE_ENV === 'development') {
      console.log('✅ Environment variables validated successfully');
      console.log(`📊 Environment: ${parsed.NODE_ENV}`);
      console.log(`🚀 Port: ${parsed.PORT}`);
      console.log(`💾 Database: ${parsed.DATABASE_URL ? 'Connected' : 'Not configured'}`);
      console.log(`💳 Stripe: ${parsed.STRIPE_SECRET_KEY ? 'Configured' : 'Not configured'}`);
      console.log(`📧 SendGrid: ${parsed.SENDGRID_API_KEY ? 'Configured' : 'Not configured'}`);
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`   ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\n💡 Please check your environment variables and try again.');
      
      // In development, provide helpful hints
      if (process.env.NODE_ENV !== 'production') {
        console.error('\n🔧 Development setup hints:');
        console.error('   DATABASE_URL: Check your PostgreSQL connection');
        console.error('   SESSION_SECRET: Generate with: openssl rand -base64 32');
        console.error('   STRIPE_*: Get from your Stripe dashboard');
      }
    } else {
      console.error('❌ Unexpected error during environment validation:', error);
    }
    
    process.exit(1);
  }
})();

/**
 * Type-safe environment variable access
 */
export type EnvConfig = z.infer<typeof EnvSchema>;

/**
 * Helper functions for environment-specific behavior
 */
export const isProduction = () => ENV.NODE_ENV === 'production';
export const isDevelopment = () => ENV.NODE_ENV === 'development';
export const isTest = () => ENV.NODE_ENV === 'test';

/**
 * Feature flags based on environment configuration
 */
export const features = {
  stripe: Boolean(ENV.STRIPE_SECRET_KEY && ENV.STRIPE_WEBHOOK_SECRET),
  email: Boolean(ENV.SENDGRID_API_KEY),
  firebase: Boolean(ENV.FIREBASE_PROJECT_ID),
  rateLimit: Boolean(ENV.RATE_LIMIT_WINDOW_MS && ENV.RATE_LIMIT_MAX_REQUESTS),
} as const;

/**
 * Safe database URL parsing
 */
export const getDatabaseConfig = () => {
  const url = new URL(ENV.DATABASE_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1),
    ssl: isProduction(),
  };
};

/**
 * Export for use in other modules
 */
export default ENV;