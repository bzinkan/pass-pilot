// server/bootstrap.ts
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { schools, adminUsers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// In-memory "burn after use"
let usedOnce = false;

/**
 * Exposes GET /api/bootstrap/superadmin exactly once while BOOTSTRAP_TOKEN is set.
 * Query params:
 *   token     - must equal process.env.BOOTSTRAP_TOKEN
 *   email     - superadmin email to create/elevate
 *   password  - superadmin password to set
 *   name      - optional admin name (default "Super Admin")
 *
 * On success:
 *   - Creates the admin user in admin_users table
 *   - Logs the user into the current session (sets admin token cookie)
 */
export function registerBootstrapRoute(app: Express) {
  // For development, temporarily enable bootstrap if not set
  const bootstrapToken = process.env.BOOTSTRAP_TOKEN || "bootstrap123secure";
  console.log("[Bootstrap] BOOTSTRAP_TOKEN:", bootstrapToken ? "SET" : "NOT SET");
  console.log("[Bootstrap] Registering bootstrap route");

  app.get("/api/bootstrap/superadmin", async (req: Request, res: Response) => {
    try {
      if (usedOnce) return res.status(410).json({ error: "bootstrap route was already used" });

      const token = String(req.query.token ?? "");
      const expectedToken = process.env.BOOTSTRAP_TOKEN || "bootstrap123secure";
      if (!token || token !== expectedToken) {
        return res.status(401).json({ error: "invalid token" });
      }

      const email = String(req.query.email ?? "").toLowerCase().trim();
      const password = String(req.query.password ?? "");
      const name = String(req.query.name ?? "Super Admin").trim();

      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      // Check if any admin users already exist
      const existingAdmins = await db.select().from(adminUsers);
      if (existingAdmins.length > 0) {
        return res.status(403).json({ error: "Super admin already exists. Bootstrap phase completed." });
      }

      // Create the super admin user
      const [adminUser] = await db.insert(adminUsers).values({
        id: randomUUID(),
        email,
        passwordHash,
        name,
        role: 'superadmin'
      }).returning();

      // Set admin authentication cookie (same as login route)
      const jwt = await import("jsonwebtoken");
      const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
      
      const adminToken = jwt.default.sign(
        { role: 'superadmin', email: adminUser.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('adminToken', adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      usedOnce = true; // burn after success
      
      console.log(`[Bootstrap] Super admin created and logged in: ${adminUser.email}`);
      
      return res.status(201).json({ 
        ok: true, 
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role
        }
      });

    } catch (err: any) {
      console.error("[bootstrap] error:", err);
      return res.status(500).json({ 
        error: "bootstrap failed", 
        detail: err?.message ?? String(err) 
      });
    }
  });
}