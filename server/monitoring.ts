/**
 * Error Monitoring and Null Detection
 * 
 * Catch unexpected nulls early with comprehensive logging and optional
 * external notifications (Discord/Slack) for production environments.
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ENV } from './env';
import { sendErr } from './api-response';

/**
 * Enhanced error information for monitoring
 */
interface ErrorInfo {
  message: string;
  stack?: string;
  url: string;
  method: string;
  userAgent?: string;
  userId?: string;
  timestamp: string;
  environment: string;
  requestId: string;
}

/**
 * Send error notification to external services
 */
async function sendErrorNotification(error: ErrorInfo): Promise<void> {
  // Skip notifications in development unless explicitly enabled
  if (ENV.NODE_ENV === 'development' && !ENV.ENABLE_DEV_NOTIFICATIONS) {
    return;
  }

  const promises: Promise<void>[] = [];

  // Discord webhook notification
  if (ENV.DISCORD_WEBHOOK_URL) {
    promises.push(sendDiscordNotification(error));
  }

  // Slack webhook notification  
  if (ENV.SLACK_WEBHOOK_URL) {
    promises.push(sendSlackNotification(error));
  }

  // Wait for all notifications (but don't fail if they error)
  await Promise.allSettled(promises);
}

/**
 * Send error to Discord webhook
 */
async function sendDiscordNotification(error: ErrorInfo): Promise<void> {
  try {
    const payload = {
      embeds: [{
        title: '🚨 PassPilot Application Error',
        color: 0xff0000, // Red
        fields: [
          {
            name: 'Error Message',
            value: `\`\`\`${error.message}\`\`\``,
            inline: false
          },
          {
            name: 'Endpoint',
            value: `${error.method} ${error.url}`,
            inline: true
          },
          {
            name: 'Environment',
            value: error.environment,
            inline: true
          },
          {
            name: 'Timestamp',
            value: error.timestamp,
            inline: true
          },
          {
            name: 'Request ID',
            value: error.requestId,
            inline: true
          }
        ],
        footer: {
          text: 'PassPilot Error Monitor'
        }
      }]
    };

    // Include stack trace if available (truncated for Discord)
    if (error.stack) {
      const truncatedStack = error.stack.length > 1000 
        ? error.stack.substring(0, 1000) + '...' 
        : error.stack;
      
      payload.embeds[0].fields.push({
        name: 'Stack Trace',
        value: `\`\`\`${truncatedStack}\`\`\``,
        inline: false
      });
    }

    const response = await fetch(ENV.DISCORD_WEBHOOK_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Failed to send Discord notification:', response.statusText);
    }
  } catch (err) {
    console.error('Discord notification error:', err);
  }
}

/**
 * Send error to Slack webhook
 */
async function sendSlackNotification(error: ErrorInfo): Promise<void> {
  try {
    const payload = {
      text: '🚨 PassPilot Application Error',
      attachments: [{
        color: 'danger',
        fields: [
          {
            title: 'Error Message',
            value: error.message,
            short: false
          },
          {
            title: 'Endpoint',
            value: `${error.method} ${error.url}`,
            short: true
          },
          {
            title: 'Environment',
            value: error.environment,
            short: true
          },
          {
            title: 'Request ID',
            value: error.requestId,
            short: true
          }
        ],
        footer: 'PassPilot Error Monitor',
        ts: Math.floor(new Date(error.timestamp).getTime() / 1000)
      }]
    };

    // Add stack trace as a separate attachment if available
    if (error.stack) {
      payload.attachments.push({
        color: 'warning',
        title: 'Stack Trace',
        text: `\`\`\`${error.stack}\`\`\``,
        footer: 'PassPilot Error Monitor'
      });
    }

    const response = await fetch(ENV.SLACK_WEBHOOK_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Failed to send Slack notification:', response.statusText);
    }
  } catch (err) {
    console.error('Slack notification error:', err);
  }
}

/**
 * Detect null/undefined access patterns in error messages
 */
function detectNullAccess(error: Error): boolean {
  const nullPatterns = [
    /cannot read propert(y|ies) .* of (null|undefined)/i,
    /null is not an object/i,
    /undefined is not an object/i,
    /cannot access .* before initialization/i,
    /.*\..*\s+is not a function/i, // obj.method is not a function (often due to null)
  ];

  return nullPatterns.some(pattern => pattern.test(error.message));
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract user ID from request if available
 */
function extractUserId(req: Request): string | undefined {
  const authReq = req as any;
  return authReq.user?.id || authReq.user?.userId;
}

/**
 * Global error handler with comprehensive monitoring
 * 
 * Place this at the very bottom of your Express middleware stack
 */
export const globalErrorHandler: ErrorRequestHandler = async (
  err: any, 
  req: Request, 
  res: Response, 
  _next: NextFunction
) => {
  const requestId = generateRequestId();
  
  // Build comprehensive error information
  const errorInfo: ErrorInfo = {
    message: err.message || 'Unknown error',
    stack: err.stack,
    url: req.originalUrl || req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    userId: extractUserId(req),
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV || 'unknown',
    requestId,
  };

  // Enhanced logging with null detection
  const isNullError = detectNullAccess(err);
  const logLevel = isNullError ? '🔴 NULL ACCESS DETECTED' : '❌ ERROR';
  
  console.error(`${logLevel} [${requestId}]`, {
    message: errorInfo.message,
    endpoint: `${errorInfo.method} ${errorInfo.url}`,
    userId: errorInfo.userId,
    userAgent: errorInfo.userAgent,
    isNullError,
    timestamp: errorInfo.timestamp,
  });

  // Log full stack trace separately for readability
  if (errorInfo.stack) {
    console.error(`Stack trace [${requestId}]:`, errorInfo.stack);
  }

  // Send external notifications for production errors
  try {
    await sendErrorNotification(errorInfo);
  } catch (notificationError) {
    console.error('Failed to send error notification:', notificationError);
  }

  // Return consistent error response
  const statusCode = err.status || err.statusCode || 500;
  const publicMessage = statusCode < 500 ? err.message : 'Internal Server Error';
  
  return sendErr(res, publicMessage, statusCode, 'UNHANDLED_ERROR', {
    requestId,
    timestamp: errorInfo.timestamp,
  });
};

/**
 * Request tracking middleware
 * 
 * Adds request ID to all requests for better error correlation
 */
export function requestTrackingMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = generateRequestId();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

/**
 * Null safety middleware for critical routes
 * 
 * Add extra validation for routes that commonly encounter null errors
 */
export function nullSafetyMiddleware(req: Request, res: Response, next: NextFunction) {
  const authReq = req as any;
  
  // Validate authenticated requests have required user data
  if (authReq.user) {
    if (!authReq.user.id) {
      console.error('🔴 NULL USER ID DETECTED:', {
        url: req.url,
        method: req.method,
        user: authReq.user,
      });
      return sendErr(res, 'Invalid user session', 401, 'NULL_USER_ID');
    }
    
    if (req.url.includes('school') && !authReq.user.schoolId) {
      console.error('🔴 NULL SCHOOL ID DETECTED:', {
        url: req.url,
        method: req.method,
        userId: authReq.user.id,
      });
      return sendErr(res, 'User not associated with school', 400, 'NULL_SCHOOL_ID');
    }
  }
  
  next();
}

/**
 * Health check endpoint for monitoring services
 */
export function healthCheckHandler(req: Request, res: Response) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
  };
  
  res.json(health);
}