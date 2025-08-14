// server/vite.ts
import express from "express";
import path from "path";
import fs from "fs";

export const log = (...args: unknown[]) => console.log("[vite]", ...args);

// Vite dev middleware in development (config is picked up from vite.config.ts)
export async function setupVite(app: express.Application) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  app.use(vite.middlewares);
}

// Serve the built client in production
export function serveStatic(app: express.Application) {
  const clientDir = path.resolve(process.cwd(), "dist", "client");

  if (!fs.existsSync(clientDir)) {
    console.warn(`[vite] client build not found at ${clientDir}; skipping static serve`);
    return; // don't crash—APIs can still run
  }

  // Cache immutable hashed assets aggressively; leave index.html to other middleware
  app.use(
    express.static(clientDir, {
      index: false,
      setHeaders(res, filePath) {
        // Heuristic: anything under /assets (Vite hashed files) can be long-cached
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );

  // SPA fallback for non-API, HTML GET requests
  app.get("*", (req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api") || req.path === "/healthz" || req.path === "/api/healthz") {
      return next();
    }
    const accept = req.headers.accept || "";
    if (typeof accept === "string" && accept.includes("text/html")) {
      return res.sendFile(path.join(clientDir, "index.html"));
    }
    return next();
  });
}
