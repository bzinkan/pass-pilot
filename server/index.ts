import express, { type Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";

import { registerAuthMultiRoutes } from "./routes-auth-multi";
import { registerSuperAdminRoutes } from "./routes-super-admin";
import { registerBootstrapRoute } from "./bootstrap";
import { setupVite, serveStatic, log } from "./vite";
import "./passResetScheduler"; // Initialize the pass reset scheduler

const app = express();

// Trust proxy for Replit/Railway deployments - CRITICAL for cookies
app.set("trust proxy", 1);

/**
 * Health endpoints used by Railway's health check.
 * Returns plain text "ok" with 200.
 */
app.get("/api/healthz", (_req, res) => res.type("text/plain").send("ok"));
app.get("/healthz", (_req, res) => res.type("text/plain").send("ok")); // extra path just in case

// --- DEBUG: where is prod actually connected? ---
app.get("/api/health/db-where", async (_req, res) => {
  try {
    const { Client } = await import("pg");
    const cs = process.env.DATABASE_URL;
    const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
    await client.connect();

    const meta = await client.query(`
      select current_database() as db,
             current_schema()  as schema,
             inet_server_addr() as host
    `);

    const col = await client.query(`
      select is_nullable, column_default
      from information_schema.columns
      where table_schema = current_schema()
        and table_name   = 'passes'
        and column_name  = 'tdv'
    `);

    const cnt = await client.query(`
      select count(*)::int as n
      from passes
      where tdv is null or tdv = ''
    `);

    await client.end();

    res.json({
      urlPrefix: cs ? cs.slice(0, cs.indexOf("@") > 0 ? cs.indexOf("@") : cs.length) + "@…" : null,
      db: meta.rows[0]?.db,
      schema: meta.rows[0]?.schema,
      host: meta.rows[0]?.host,
      tdv: col.rows[0] || null,
      null_or_empty: cnt.rows[0]?.n ?? null
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

/**
 * Stripe webhook FIRST — raw body required.
 * Must appear before express.json/urlencoded.
 */
app.post(
  "/api/stripe/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const { stripeWebhook } = await import("./routes-billing");
    return stripeWebhook(req, res);
  }
);

// Now regular parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.SESSION_SECRET)); // signed cookies for admin auth

// Request log (API-only), trimmed to avoid noisy logs
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json.bind(res);
  (res as any).json = (bodyJson: any, ...args: any[]) => {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson, ...args);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

(async () => {
  // Bootstrap route (only if BOOTSTRAP_TOKEN is set)
  registerBootstrapRoute(app);

  // Sanitize incoming JSON before hitting any routes
  const { sanitizeBody } = await import("./middleware/sanitize");
  app.use(sanitizeBody);

  // Multi-school auth + super admin routes
  registerAuthMultiRoutes(app);
  registerSuperAdminRoutes(app);

  // Register the rest of your app routes (some setups return an HTTP server)
  const routesServer = await registerRoutes(app);

  // Centralized error handling
  const { errorHandler } = await import("./middleware/errorHandler");
  app.use(errorHandler);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    // (do not rethrow here; that would crash the process)
  });

  // Dev vs Production static handling
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1";
  log(
    `Environment check - NODE_ENV: ${process.env.NODE_ENV}, REPLIT_DEPLOYMENT: ${process.env.REPLIT_DEPLOYMENT}, isProduction: ${isProduction}`
  );

  if (!isProduction) {
    log("Setting up Vite development server");
    // If your setupVite accepts only (app), the extra arg is ignored at runtime
    await setupVite(app as any, routesServer as any);
  } else {
    log("Setting up production static file serving");

    // Prevent index.html from being cached too aggressively
    app.use((req, res, next) => {
      if (req.path === "/" || req.path.endsWith("/index.html")) {
        res.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
        log(`No-cache headers set for: ${req.path}`);
      }
      next();
    });

    // Don't crash if the client build folder is missing
    try {
      serveStatic(app);
    } catch (e) {
      console.warn("[static] skipping client serve:", (e as Error).message);
    }
  }

  // IMPORTANT: listen on Railway's provided port and bind to 0.0.0.0
  const port = Number(process.env.PORT ?? 5000);
  const httpServer = app.listen(port, "0.0.0.0", () =>
    log(`[express] listening on ${port} (NODE_ENV=${process.env.NODE_ENV})`)
  );

  // If something else needs the server instance, it’s available as `httpServer`
})();
