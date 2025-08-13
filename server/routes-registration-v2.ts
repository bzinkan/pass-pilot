// server/routes-registration-v2.ts
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import { setUserSession } from "./auth/session";

const FREE_SCHOOL_NAME = (process.env.FREE_SCHOOL_NAME || "").trim().toLowerCase();

const normName = (s: string) => s.trim().replace(/\s+/g, " ");

export function registerRegistrationV2(app: Express) {
  /**
   * POST /api/registration/v2/register
   * Body: { schoolName, adminName?, email, password }
   * - No domain/format restriction on email (only non-empty).
   * - Case-insensitive school uniqueness.
   * - First user in a school becomes ADMIN.
   * - If FREE_SCHOOL_NAME matches (CI), marks school as FREE when columns exist.
   */
  app.post("/api/registration/v2/register", async (req: Request, res: Response) => {
    try {
      const schoolNameRaw = String(req.body?.schoolName ?? "");
      const adminName = String(req.body?.adminName ?? "").trim();
      const email = String(req.body?.email ?? "").trim().toLowerCase(); // allow ANY email string (no regex/allowlist)
      const password = String(req.body?.password ?? "");

      if (!schoolNameRaw || !email || !password) {
        return res.status(400).json({ error: "MISSING_FIELDS" });
      }

      const schoolName = normName(schoolNameRaw);
      const isDesignatedFree = FREE_SCHOOL_NAME && schoolName.toLowerCase() === FREE_SCHOOL_NAME;

      // Check if school already exists (case-insensitive)
      const existingSchools = await storage.getAllSchools();
      const existingSchool = existingSchools.find(s => s.name.toLowerCase() === schoolName.toLowerCase());
      
      if (existingSchool) {
        return res.status(409).json({ error: "SCHOOL_TAKEN", school: existingSchool });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: "EMAIL_TAKEN", detail: "Email already registered" });
      }

      // Create school
      const schoolId = `school_${nanoid(8)}`;
      const schoolData = {
        id: schoolId,
        schoolId: schoolId,
        name: schoolName,
        adminEmail: email,
        plan: isDesignatedFree ? "free_trial" : "TRIAL" as const,
        maxTeachers: isDesignatedFree ? -1 : 999, // Unlimited for V2
        maxStudents: isDesignatedFree ? -1 : 999, // Unlimited for V2
        verified: true, // Auto-verify V2 registrations
        trialStartDate: isDesignatedFree ? null : new Date(),
        trialEndDate: isDesignatedFree ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        isTrialExpired: false
      };

      const school = await storage.createSchool(schoolData);

      // Create admin user (first user in school becomes admin)
      const userData = {
        id: `user_${nanoid(8)}`,
        email: email,
        password: password, // Will be hashed by storage layer
        name: adminName || email.split('@')[0],
        schoolId: school.id,
        isAdmin: true,
        assignedGrades: [],
        status: 'active' as const
      };

      const user = await storage.createUser(userData);

      // Set session for immediate login (skip if JWT_SECRET not configured)
      try {
        setUserSession(res, {
          userId: user.id,
          schoolId: school.id,
          email: user.email,
          role: 'ADMIN'
        });
      } catch (sessionError) {
        console.warn('[V2] Session creation failed, but registration succeeded:', sessionError);
      }

      console.log(`[V2] Registration successful: ${user.name} (${user.email}) - School: ${school.name}`);

      return res.status(201).json({ 
        ok: true, 
        school: {
          id: school.id,
          name: school.name,
          plan: school.plan
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          schoolId: user.schoolId,
          isAdmin: user.isAdmin,
          schoolName: school.name
        },
        token: user.id, // Simple token for demo
        autoLogin: true,
        message: 'Registration successful! Welcome to PassPilot V2.'
      });
    } catch (e: any) {
      console.error("[registration v2]", e);
      return res.status(400).json({ error: "REGISTER_FAILED", detail: e?.message });
    }
  });

  /**
   * Optional: availability check used by your UI hint ("Email is available")
   * Returns true iff no user with that (lowercased) email exists in the given school.
   * No domain rules here either.
   */
  app.get("/api/registration/v2/email-available", async (req: Request, res: Response) => {
    try {
      const schoolName = normName(String(req.query.schoolName ?? ""));
      const email = String(req.query.email ?? "").trim().toLowerCase();
      if (!schoolName || !email) return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });

      // For V2, just check if email exists globally (simplified)
      const existingUser = await storage.getUserByEmail(email);
      res.json({ ok: true, available: !existingUser });
    } catch (e: any) {
      console.error("[email availability check]", e);
      res.status(500).json({ ok: false, error: "CHECK_FAILED" });
    }
  });
}