import express, { type Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ENV } from "./env";
import "./passResetScheduler"; // Initialize the pass reset scheduler

const app = express();
app.set('trust proxy', 1); // Trust Railway/Replit proxy for secure cookies

// Stripe webhook FIRST — raw body required  
app.post('/api/stripe/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  // Import webhook handler dynamically to avoid circular dependencies
  try {
    const { stripeWebhook } = await import("./routes-billing");
    return stripeWebhook(req, res);
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).json({ error: 'Webhook handler not available' });
  }
});

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

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const isProduction = ENV.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1";
  log(`Environment check - NODE_ENV: ${ENV.NODE_ENV}, REPLIT_DEPLOYMENT: ${process.env.REPLIT_DEPLOYMENT}, isProduction: ${isProduction}`);
  
  if (!isProduction) {
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

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

// Global error handler - must be at the very end
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ ok: false, error: "Internal Server Error" });
});
