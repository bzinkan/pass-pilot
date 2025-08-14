// server/vite.ts
import express from "express";
import path from "path";
import fs from "fs";

export const log = (...args: unknown[]) => console.log("[vite]", ...args);

// Use Vite dev middleware in development
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
    throw new Error(
      `Could not find the client build directory: ${clientDir}. Run "npm run build" first.`
    );
  }

  // static assets
  app.use(express.static(clientDir));

  // SPA fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
  });
}
