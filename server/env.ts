import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 chars"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().transform(Number).default("5000"),
  PRICE_TRIAL: z.string().optional(),
  PRICE_BASIC: z.string().optional(),
  PRICE_SMALL: z.string().optional(),
  PRICE_MEDIUM: z.string().optional(),
  PRICE_LARGE: z.string().optional(),
  PRICE_UNLIMITED: z.string().optional(),
});

export const ENV = EnvSchema.parse(process.env);