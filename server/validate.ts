/**
 * Request Validation Middleware with Zod
 * 
 * Validates request body, query parameters, and route parameters at runtime.
 * Ensures req.valid is guaranteed non-null after validation passes.
 */

import { ZodSchema, ZodError, z } from "zod";
import type { Request, Response, NextFunction } from "express";

// Extend Express Request type to include validated data
declare global {
  namespace Express {
    interface Request {
      valid: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}

export function validate(opts: {
  body?: ZodSchema<any>;
  query?: ZodSchema<any>;
  params?: ZodSchema<any>;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Initialize the valid object
      req.valid = {};

      // Validate body if schema provided
      if (opts.body) {
        req.valid.body = opts.body.parse(req.body);
      }

      // Validate query parameters if schema provided
      if (opts.query) {
        req.valid.query = opts.query.parse(req.query);
      }

      // Validate route parameters if schema provided
      if (opts.params) {
        req.valid.params = opts.params.parse(req.params);
      }

      next();
    } catch (err: any) {
      // Enhanced error handling for Zod validation errors
      if (err instanceof ZodError) {
        const formattedErrors = err.errors.map(error => ({
          field: error.path.join('.'),
          message: error.message,
          received: error.received,
        }));

        return res.status(400).json({
          error: "Validation failed",
          details: formattedErrors,
          timestamp: new Date().toISOString(),
        });
      }

      // Handle other validation errors
      return res.status(400).json({
        error: "Invalid request",
        details: String(err),
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Common validation schemas for reuse across routes
 */
export const commonSchemas = {
  // UUID parameter validation
  uuidParam: {
    id: z.string().uuid("Invalid UUID format"),
  },

  // Pagination query validation
  pagination: {
    page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  },

  // Common string validations
  nonEmptyString: z.string().min(1, "Field cannot be empty"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
} as const;

/**
 * Middleware for common validation patterns
 */
export const validateUuidParam = (paramName: string = 'id') => {
  const schema = z.object({
    [paramName]: z.string().uuid(`Invalid ${paramName} format`),
  });
  
  return validate({ params: schema });
};

export const validatePagination = validate({
  query: z.object({
    page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  }),
});

/**
 * Type-safe request handler factory
 * 
 * Usage:
 * const handler = createHandler(
 *   { body: loginSchema, params: uuidSchema },
 *   (req, res) => {
 *     // req.valid.body and req.valid.params are fully typed and guaranteed valid
 *     const { email, password } = req.valid.body;
 *     const { id } = req.valid.params;
 *   }
 * );
 */
export function createHandler<T extends {
  body?: ZodSchema<any>;
  query?: ZodSchema<any>;
  params?: ZodSchema<any>;
}>(
  validation: T,
  handler: (req: Request, res: Response, next: NextFunction) => void | Promise<void>
) {
  return [
    validate(validation),
    handler
  ];
}