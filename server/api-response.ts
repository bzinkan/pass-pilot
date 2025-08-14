/**
 * Safer API Response Helpers
 * 
 * Always send a consistent shape so the frontend never sees "missing fields."
 * This prevents runtime errors and makes error handling predictable.
 */

/**
 * Successful API response with data
 */
export type ApiOk<T> = { 
  ok: true; 
  data: T;
  timestamp: string;
};

/**
 * Error API response with consistent error information
 */
export type ApiErr = { 
  ok: false; 
  error: string;
  code?: string;
  details?: unknown;
  timestamp: string;
};

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiOk<T> | ApiErr;

/**
 * Create a successful API response
 * 
 * @param data - The data to return
 * @returns Consistent success response
 * 
 * @example
 * return res.json(ok({ user: userData, schools: schoolList }));
 */
export function ok<T>(data: T): ApiOk<T> {
  return { 
    ok: true, 
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create an error API response
 * 
 * @param message - Error message for the user
 * @param code - Optional error code for programmatic handling
 * @param details - Optional additional error details
 * @returns Consistent error response
 * 
 * @example
 * return res.status(400).json(err("User not found", "USER_NOT_FOUND"));
 * return res.status(500).json(err("Database connection failed", "DB_ERROR", error));
 */
export function err(message: string, code?: string, details?: unknown): ApiErr {
  return { 
    ok: false, 
    error: message,
    code,
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * Helper for sending consistent success responses
 * 
 * @param res - Express response object
 * @param data - Data to send
 * @param status - HTTP status code (defaults to 200)
 */
export function sendOk<T>(res: any, data: T, status = 200) {
  return res.status(status).json(ok(data));
}

/**
 * Helper for sending consistent error responses
 * 
 * @param res - Express response object
 * @param message - Error message
 * @param status - HTTP status code (defaults to 400)
 * @param code - Optional error code
 * @param details - Optional error details
 */
export function sendErr(res: any, message: string, status = 400, code?: string, details?: unknown) {
  return res.status(status).json(err(message, code, details));
}

/**
 * Wrap async route handlers to ensure consistent error responses
 * 
 * @param handler - The async route handler
 * @returns Wrapped handler with consistent error handling
 * 
 * @example
 * app.get('/api/users', catchAsync(async (req, res) => {
 *   const users = await getUsersFromDB();
 *   return sendOk(res, { users });
 * }));
 */
export function catchAsync(handler: (req: any, res: any, next?: any) => Promise<any>) {
  return async (req: any, res: any, next: any) => {
    try {
      await handler(req, res, next);
    } catch (error: any) {
      console.error('Route handler error:', error);
      
      // Send consistent error response
      return sendErr(
        res,
        error.message || 'Internal server error',
        500,
        'INTERNAL_ERROR',
        process.env.NODE_ENV === 'development' ? error.stack : undefined
      );
    }
  };
}

/**
 * Validation error response helper
 * 
 * @param res - Express response object
 * @param validationErrors - Array of validation errors from Zod
 */
export function sendValidationError(res: any, validationErrors: any[]) {
  return sendErr(
    res,
    'Validation failed',
    400,
    'VALIDATION_ERROR',
    validationErrors
  );
}

/**
 * Common error response patterns
 */
export const ErrorResponses = {
  notFound: (resource = 'Resource') => err(`${resource} not found`, 'NOT_FOUND'),
  unauthorized: (message = 'Authentication required') => err(message, 'UNAUTHORIZED'),
  forbidden: (message = 'Access denied') => err(message, 'FORBIDDEN'),
  badRequest: (message = 'Invalid request') => err(message, 'BAD_REQUEST'),
  conflict: (message = 'Resource already exists') => err(message, 'CONFLICT'),
  internal: (message = 'Internal server error') => err(message, 'INTERNAL_ERROR'),
} as const;