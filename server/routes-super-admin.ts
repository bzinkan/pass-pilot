import type { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Super admin authentication middleware
export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // Check both cookie names for compatibility
    const token = req.cookies?.admin || req.cookies?.adminToken;
    if (!token) {
      return res.status(401).json({ error: "No admin token provided" });
    }

    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.role !== 'superadmin') {
      return res.status(403).json({ error: "Insufficient privileges" });
    }

    // Verify admin user still exists
    const adminUser = await storage.getAdminUserByEmail(payload.email);
    if (!adminUser) {
      return res.status(401).json({ error: "Admin user not found" });
    }

    (req as any).adminUser = adminUser;
    next();
  } catch (error) {
    console.error("[Super Admin Auth] Token verification failed:", error);
    return res.status(401).json({ error: "Invalid admin token" });
  }
}

// Helper to sign admin JWT tokens
function signAdminToken(email: string): string {
  return jwt.sign(
    { role: 'superadmin', email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function registerSuperAdminRoutes(app: Express) {
  // Bootstrap first super admin
  app.post("/api/super-admin/bootstrap", async (req: Request, res: Response) => {
    try {
      const { email, password, name, bootstrapToken } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if any admin users exist
      const existingAdmins = await storage.getAllAdminUsers();
      if (existingAdmins.length > 0) {
        // If bootstrap token is required, check it
        if (process.env.ADMIN_BOOTSTRAP_TOKEN && bootstrapToken !== process.env.ADMIN_BOOTSTRAP_TOKEN) {
          return res.status(401).json({ error: "Invalid bootstrap token" });
        }
        
        // If no bootstrap token env var and admins exist, deny
        if (!process.env.ADMIN_BOOTSTRAP_TOKEN) {
          return res.status(403).json({ error: "Bootstrap phase completed" });
        }
      }

      // Hash password and create admin
      const passwordHash = await bcrypt.hash(password, 12);
      const adminUser = await storage.createAdminUser({
        email: email.toLowerCase().trim(),
        passwordHash,
        name,
        role: 'superadmin'
      });

      // Sign token and set cookie (using 'admin' to match other routes)
      const token = signAdminToken(adminUser.email);
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('admin', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });

      console.log(`[Super Admin] Bootstrap completed for: ${adminUser.email}`);
      
      return res.json({ 
        success: true, 
        admin: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role
        }
      });

    } catch (error: any) {
      console.error("[Super Admin Bootstrap] Error:", error);
      if (error.message?.includes('unique constraint')) {
        return res.status(409).json({ error: "Admin with this email already exists" });
      }
      return res.status(500).json({ error: "Bootstrap failed" });
    }
  });

  // Super admin login
  app.post("/api/super-admin/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Missing email or password" });
      }

      const adminUser = await storage.getAdminUserByEmail(email.toLowerCase().trim());
      if (!adminUser) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const passwordValid = await bcrypt.compare(password, adminUser.passwordHash);
      if (!passwordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = signAdminToken(adminUser.email);
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('admin', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });

      console.log(`[Super Admin] Login successful: ${adminUser.email}`);

      return res.json({
        success: true,
        admin: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role
        }
      });

    } catch (error) {
      console.error("[Super Admin Login] Error:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  // Super admin logout
  app.post("/api/super-admin/logout", (req: Request, res: Response) => {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('admin', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/'
    });
    
    return res.json({ success: true });
  });

  // Check super admin authentication status
  app.get("/api/super-admin/me", requireSuperAdmin, (req: Request, res: Response) => {
    const adminUser = (req as any).adminUser;
    return res.json({
      authenticated: true,
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role
      }
    });
  });

  // Debug endpoint to help diagnose auth issues
  app.get("/api/super-admin/debug", (req: Request, res: Response) => {
    return res.json({
      hasCookie: Boolean(req.headers.cookie),
      cookiesSeen: req.headers.cookie ?? null,
      adminCookie: req.cookies?.admin ?? null,
      adminTokenCookie: req.cookies?.adminToken ?? null,
      protocol: req.protocol,
      nodeEnv: process.env.NODE_ENV,
    });
  });

  // Protected routes - all require super admin auth
  app.use("/api/super-admin/dashboard", requireSuperAdmin);

  // Dashboard: Get all schools with stats
  app.get("/api/super-admin/dashboard/schools", async (req: Request, res: Response) => {
    try {
      const schools = await storage.getAllSchoolsWithStats();
      return res.json({ schools });
    } catch (error) {
      console.error("[Super Admin] Get schools error:", error);
      return res.status(500).json({ error: "Failed to fetch schools" });
    }
  });

  // Dashboard: Get platform statistics
  app.get("/api/super-admin/dashboard/stats", async (req: Request, res: Response) => {
    try {
      const stats = await storage.getPlatformStats();
      return res.json(stats);
    } catch (error) {
      console.error("[Super Admin] Get stats error:", error);
      return res.status(500).json({ error: "Failed to fetch platform stats" });
    }
  });

  // Dashboard: Update school
  app.patch("/api/super-admin/dashboard/schools/:schoolId", async (req: Request, res: Response) => {
    try {
      const { schoolId } = req.params;
      const updates = req.body;

      const updatedSchool = await storage.updateSchoolAsAdmin(schoolId, updates);
      if (!updatedSchool) {
        return res.status(404).json({ error: "School not found" });
      }

      console.log(`[Super Admin] School updated: ${schoolId}`);
      return res.json({ success: true, school: updatedSchool });
    } catch (error) {
      console.error("[Super Admin] Update school error:", error);
      return res.status(500).json({ error: "Failed to update school" });
    }
  });

  // Dashboard: Delete school (with cascade)
  app.delete("/api/super-admin/dashboard/schools/:schoolId", async (req: Request, res: Response) => {
    try {
      const { schoolId } = req.params;
      const { confirmDelete } = req.body;

      if (!confirmDelete) {
        return res.status(400).json({ error: "Confirmation required for school deletion" });
      }

      const result = await storage.deleteSchoolCompletely(schoolId);
      if (!result.success) {
        return res.status(404).json({ error: "School not found or deletion failed" });
      }

      console.log(`[Super Admin] School deleted completely: ${schoolId}`);
      return res.json({ 
        success: true, 
        message: `School and all related data deleted successfully`,
        deletedCounts: result.deletedCounts 
      });
    } catch (error) {
      console.error("[Super Admin] Delete school error:", error);
      return res.status(500).json({ error: "Failed to delete school" });
    }
  });

  // Dashboard: Get recent activity/events
  app.get("/api/super-admin/dashboard/activity", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const activity = await storage.getRecentPlatformActivity(limit);
      return res.json({ activity });
    } catch (error) {
      console.error("[Super Admin] Get activity error:", error);
      return res.status(500).json({ error: "Failed to fetch platform activity" });
    }
  });
}