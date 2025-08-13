import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { setUserSession } from "./auth/session";

// Helper: build session user payload
function sessUser(user: any, school: any) {
  return {
    id: user.id,
    email: user.email,
    role: user.isAdmin ? 'ADMIN' : 'TEACHER',
    schoolId: school.id,
    schoolName: school.name,
  } as const;
}

/**
 * STEP 1
 * POST /api/auth/login-multi/step1  { email, password }
 * - Looks up all accounts for that email across schools.
 * - Verifies password per account.
 * - 401 if none match.
 * - If one match → logs in and returns { ok, user }.
 * - If multiple → stores a short-lived pendingAuth in the session and returns { needSchoolPick, schools }.
 */
export function registerAuthMultiRoutes(app: Express) {
  app.post("/api/auth/login-multi/step1", async (req: Request, res: Response) => {
    try {
      const email = String(req.body?.email || "").toLowerCase().trim();
      const password = String(req.body?.password || "");
      
      if (!email || !password) {
        return res.status(400).json({ error: "MISSING_FIELDS" });
      }

      console.log(`[Multi-Login Step 1] Checking credentials for: ${email}`);

      // Get all user accounts with this email across schools
      const candidates = await storage.getUsersByEmail(email);
      console.log(`[Multi-Login Step 1] Found ${candidates.length} candidate(s)`);

      if (candidates.length === 0) {
        return res.status(401).json({ error: "INVALID_CREDENTIALS" });
      }

      // Verify password against each candidate
      const validMatches: any[] = [];
      
      for (const user of candidates) {
        let passwordValid = false;
        
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
          // Hashed password - use bcrypt
          passwordValid = await bcrypt.compare(password, user.password);
        } else {
          // Plain text password (demo mode)
          passwordValid = user.password === password;
        }

        if (passwordValid) {
          const school = await storage.getSchool(user.schoolId);
          if (school) {
            validMatches.push({ user, school });
          }
        }
      }

      if (validMatches.length === 0) {
        return res.status(401).json({ error: "INVALID_CREDENTIALS" });
      }

      console.log(`[Multi-Login Step 1] ${validMatches.length} valid match(es) found`);

      // Single school - log in immediately
      if (validMatches.length === 1) {
        const { user, school } = validMatches[0];
        
        setUserSession(res, {
          userId: user.id,
          schoolId: user.schoolId,
          email: user.email,
          role: user.isAdmin ? 'ADMIN' : 'TEACHER'
        });

        console.log(`[Multi-Login Step 1] Single school login: ${school.name}`);
        
        return res.json({ 
          ok: true, 
          user: sessUser(user, school)
        });
      }

      // Multiple schools - return school selection options
      // Store pending auth in session (5-min TTL)
      const sessionData = {
        email,
        validMatches: validMatches.map(m => ({
          userId: m.user.id,
          schoolId: m.school.id,
          schoolName: m.school.name,
          isAdmin: m.user.isAdmin
        })),
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      };

      // Store in session if available (fallback for demo)
      if (req.session) {
        (req.session as any).pendingAuth = sessionData;
      }

      const schools = validMatches.map(m => ({ 
        id: m.school.id, 
        name: m.school.name 
      }));

      console.log(`[Multi-Login Step 1] Multiple schools found:`, schools.map(s => s.name));

      return res.json({ 
        needSchoolPick: true, 
        schools,
        tempToken: Buffer.from(JSON.stringify(sessionData)).toString('base64') // Fallback for demo
      });

    } catch (e: any) {
      console.error("[Multi-Login Step 1] Error:", e);
      return res.status(500).json({ error: "LOGIN_FAILED" });
    }
  });

  /**
   * STEP 2
   * POST /api/auth/login-multi/step2  { schoolId, tempToken? }
   * - Requires a valid pendingAuth in the session from step1.
   * - Binds session to the chosen school and clears pending state.
   */
  app.post("/api/auth/login-multi/step2", async (req: Request, res: Response) => {
    try {
      const schoolId = String(req.body?.schoolId || "");
      const tempToken = req.body?.tempToken;

      if (!schoolId) {
        return res.status(400).json({ error: "MISSING_SCHOOL_ID" });
      }

      console.log(`[Multi-Login Step 2] School selection: ${schoolId}`);

      // Try to get pending auth from session or temp token
      let pending = req.session ? (req.session as any).pendingAuth : null;
      
      if (!pending && tempToken) {
        try {
          pending = JSON.parse(Buffer.from(tempToken, 'base64').toString());
        } catch (e) {
          console.error("[Multi-Login Step 2] Invalid temp token");
        }
      }

      if (!pending || pending.expiresAt < Date.now()) {
        return res.status(440).json({ error: "PENDING_EXPIRED" });
      }

      // Find the selected school in the valid matches
      const selectedMatch = pending.validMatches.find((m: any) => m.schoolId === schoolId);
      if (!selectedMatch) {
        return res.status(403).json({ error: "NOT_ALLOWED" });
      }

      // Get fresh user and school data
      const user = await storage.getUser(selectedMatch.userId);
      const school = await storage.getSchool(schoolId);

      if (!user || !school) {
        return res.status(403).json({ error: "NOT_ALLOWED" });
      }

      // Set session for the selected school
      setUserSession(res, {
        userId: user.id,
        schoolId: school.id,
        email: user.email,
        role: user.isAdmin ? 'ADMIN' : 'TEACHER'
      });

      // Clear pending auth from session
      if (req.session) {
        delete (req.session as any).pendingAuth;
      }

      console.log(`[Multi-Login Step 2] Successfully logged into: ${school.name}`);

      return res.json({ 
        ok: true, 
        user: sessUser(user, school)
      });

    } catch (e: any) {
      console.error("[Multi-Login Step 2] Error:", e);
      return res.status(500).json({ error: "LOGIN_FAILED" });
    }
  });
}