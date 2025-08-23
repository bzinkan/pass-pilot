// Environment validation MUST be first - fail fast on missing env vars
import { ENV, isProduction, isDevelopment, features } from "./env";

import express, { type Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { registerV2Routes } from "./routes/register-v2";
import { setupVite, serveStatic, log } from "./vite";
import "./passResetScheduler"; // Initialize the pass reset scheduler

const app = express();
app.set('trust proxy', 1); // Trust Railway/Replit proxy for secure cookies

// V2 Stripe webhook FIRST — raw body required
import { registerStripeWebhook } from "./stripe/webhook-v2";
registerStripeWebhook(app);

// Now regular parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(ENV.SESSION_SECRET)); // Add signed cookie parsing for admin authentication

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Enhanced error monitoring and request tracking
import { globalErrorHandler, requestTrackingMiddleware, healthCheckHandler } from './monitoring';

(async () => {
  const server = await registerRoutes(app);
  registerV2Routes(app);

  // Add request tracking to all routes
  app.use(requestTrackingMiddleware);

  // Health check endpoint MUST be registered BEFORE server starts
  app.get("/api/health", (_req, res) => res.status(200).json({status:"ok"}));
  log('✅ Health check endpoint registered at /api/health');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const isProductionEnv = isProduction() || process.env.REPLIT_DEPLOYMENT === "1";
  log(`Environment check - NODE_ENV: ${ENV.NODE_ENV}, REPLIT_DEPLOYMENT: ${process.env.REPLIT_DEPLOYMENT}, isProduction: ${isProductionEnv}`);
  
  if (!isProductionEnv) {
    log("Setting up Vite development server");
    await setupVite(app, server);
  } else {
    log("Setting up production static file serving");
    
    // Add cache-control headers for index.html to prevent aggressive caching
    app.use((req, res, next) => {
      if (req.path === '/' || req.path.endsWith('/index.html')) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        log(`No-cache headers set for: ${req.path}`);
      }
      next();
    });
    
    serveStatic(app);
  }

  // Global error handler - must be at the very end
  app.use(globalErrorHandler);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to Railway's port if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = Number(process.env.PORT || 8080);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => log(`serving on port ${port}`));
})();
