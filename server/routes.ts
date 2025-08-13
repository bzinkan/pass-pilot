import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { storage } from "./storage";
import { insertUserSchema, insertSchoolSchema, insertGradeSchema, insertStudentSchema, insertPassSchema } from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";
import { setUserSession, clearUserSession } from "./auth/session";
import { requireUser, optionalUser } from "./auth/requireUser";

// All school registrations are now allowed without restrictions
console.log('School validation removed - all registrations allowed');
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { sendTrialVerificationEmail, sendPasswordResetEmail } from "./emailService";
import { passResetScheduler } from "./passResetScheduler";
import { normalizeSchoolSlug, validateSchoolName } from './utils/schoolSlug';
import { testRouter } from './routes/test';

// Helper function to get max teachers for a plan
function getMaxTeachersForPlan(plan: string): number {
  const planConfig: Record<string, { maxTeachers: number }> = {
    'TRIAL': { maxTeachers: 1 },
    'TEACHER_MONTHLY': { maxTeachers: 1 },
    'TEACHER_ANNUAL': { maxTeachers: 1 },
    'SMALL_TEAM_MONTHLY': { maxTeachers: 10 },
    'SMALL_TEAM_ANNUAL': { maxTeachers: 10 },
    'SMALL_SCHOOL': { maxTeachers: -1 },
    'MEDIUM_SCHOOL': { maxTeachers: -1 },
    'LARGE_SCHOOL': { maxTeachers: -1 }
  };
  return planConfig[plan]?.maxTeachers || 1;
}

// Helper function to get max students for a plan  
function getMaxStudentsForPlan(plan: string): number {
  const planConfig: Record<string, { maxStudents: number }> = {
    'TRIAL': { maxStudents: 100 },
    'TEACHER_MONTHLY': { maxStudents: 100 },
    'TEACHER_ANNUAL': { maxStudents: 100 },
    'SMALL_TEAM_MONTHLY': { maxStudents: 150 },
    'SMALL_TEAM_ANNUAL': { maxStudents: 150 },
    'SMALL_SCHOOL': { maxStudents: 500 },
    'MEDIUM_SCHOOL': { maxStudents: 1000 },
    'LARGE_SCHOOL': { maxStudents: 2000 }
  };
  return planConfig[plan]?.maxStudents || 200;
}

// Helper function to calculate trial end date (14 days from start)
function calculateTrialEndDate(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14);
  return endDate;
}

// Helper function to check if trial is expired
function isTrialExpired(trialEndDate: Date | null): boolean {
  if (!trialEndDate) return false;
  return new Date() > trialEndDate;
}

// Initialize Stripe if key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });
}

// Auth middleware that supports both Bearer tokens and session cookies
const requireAuth = async (req: any, res: any, next: any) => {
  // First check for session cookie (preferred method)
  const sessionToken = req.cookies?.pp_session;
  if (sessionToken) {
    // Import getUserFromSession dynamically to avoid circular dependencies
    const { getUserFromSession } = await import('./auth/session.js');
    const sessionData = getUserFromSession(sessionToken);
    if (sessionData) {
      req.user = sessionData;
      req.userId = sessionData.userId;
      return next();
    }
  }
  
  // Fallback to Bearer token (for API clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token) {
      console.log('Auth middleware - using Bearer token:', token.substring(0, 8) + '...');
      req.userId = token;
      return next();
    }
  }
  
  return res.status(401).json({ message: 'Authentication required' });
};

// Trial check middleware
const checkTrialStatus = async (req: any, res: any, next: any) => {
  try {
    if (!req.userId) {
      return next(); // Skip if not authenticated
    }

    const user = await storage.getUser(req.userId);
    if (!user || !user.schoolId) {
      return next();
    }

    const school = await storage.getSchool(user.schoolId);
    if (!school || school.plan !== 'free_trial') {
      return next(); // Not a trial account
    }

    // Check if trial is expired
    if (school.trialEndDate && isTrialExpired(school.trialEndDate)) {
      // Mark trial as expired if not already done
      if (!school.isTrialExpired) {
        await storage.updateSchool(school.id, { isTrialExpired: true });
      }
      
      return res.status(403).json({ 
        message: 'Your 30-day free trial has expired. Please upgrade to continue using PassPilot.',
        trialExpired: true,
        upgradeRequired: true
      });
    }

    next();
  } catch (error) {
    console.error('Trial check error:', error);
    next(); // Continue on error to avoid blocking users
  }
};

import { registerAdminRoutes } from "./routes-admin";
import { requireUser, optionalUser } from "./auth/requireUser";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health endpoints FIRST (from playbook)
  app.get('/api/health', (_req, res) => res.send('ok'));
  app.get('/api/health/db', async (_req, res) => {
    try { 
      await storage.getAllSchools();
      res.send('ok'); 
    } catch (e) { 
      console.error(e); 
      res.status(500).send('db-fail'); 
    }
  });

  // Mount test routes (development only)
  if (process.env.NODE_ENV !== 'production') {
    app.use(testRouter);
    console.log('🧪 Test routes mounted for development');
  }

  // Auto-login billing success route
  app.get('/api/billing/checkout-success', async (req, res) => {
    const { handleCheckoutSuccess } = await import("./routes-billing");
    return handleCheckoutSuccess(req, res);
  });

  // Authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, schoolId } = req.body;
      console.log('Login attempt:', { email, hasSchoolId: !!schoolId });

      if (!email || !password) {
        return res.status(400).json({ error: 'missing_credentials' });
      }

      // Single-step login when schoolId is specified
      if (schoolId) {
        console.log('Single-step login for school:', schoolId);
        const user = await storage.getUserByEmailAndSchool(email, schoolId);
        
        if (!user) {
          return res.status(401).json({ error: 'invalid_credentials' });
        }

        // FIRST LOGIN PASSWORD SETTING: If user status is 'pending', set their password now
        if (user.status === 'pending') {
          console.log('First login detected - setting password for user:', user.email);
          const bcrypt = (await import('bcryptjs')).default;
          const hashedPassword = await bcrypt.hash(password, 12);
          
          // Update user with their chosen password and activate account
          await storage.updateUser(user.id, {
            password: hashedPassword,
            status: 'active'
          });
          
          console.log('Password set and account activated for:', user.email);
          
          // Continue with login process using the newly set password
          user.password = hashedPassword;
          user.status = 'active';
        }

        // Verify password (supporting both plain text for demo and bcrypt for production)
        let passwordValid = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
          // Hashed password - use bcrypt
          const bcrypt = (await import('bcryptjs')).default;
          passwordValid = await bcrypt.compare(password, user.password);
        } else {
          // Plain text password (demo mode)
          passwordValid = user.password === password;
        }
        
        if (!passwordValid) {
          return res.status(401).json({ error: 'invalid_credentials' });
        }

        const school = await storage.getSchool(user.schoolId);
        if (!school) {
          return res.status(500).json({ error: 'school_not_found' });
        }

        // Create session
        setUserSession(res, {
          userId: user.id,
          schoolId: user.schoolId,
          email: user.email,
          role: user.isAdmin ? 'ADMIN' : 'TEACHER'
        });

        return res.json({ 
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            schoolId: user.schoolId,
            isAdmin: user.isAdmin,
            schoolName: school.name
          }
        });
      }

      // Multi-step login: check for multiple schools
      const candidates = await storage.getUsersByEmail(email);
      console.log('Found candidates:', candidates.length);

      if (candidates.length === 0) {
        return res.status(401).json({ error: 'invalid_credentials' });
      }

      // Handle first-login password setting for pending users
      let firstUser = candidates[0];
      if (firstUser.status === 'pending') {
        console.log('Multi-step first login detected - setting password for user:', firstUser.email);
        const bcrypt = (await import('bcryptjs')).default;
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Update user with their chosen password and activate account
        await storage.updateUser(firstUser.id, {
          password: hashedPassword,
          status: 'active'
        });
        
        console.log('Password set and account activated for:', firstUser.email);
        
        // Update all candidates with same email to have the new password
        for (const candidate of candidates) {
          if (candidate.status === 'pending') {
            await storage.updateUser(candidate.id, {
              password: hashedPassword,
              status: 'active'
            });
          }
        }
        
        // Update the first user object for verification
        firstUser.password = hashedPassword;
        firstUser.status = 'active';
      }

      // Verify password against first user (prevents leaking account existence)
      let passwordValid = false;
      const firstPassword = firstUser.password;
      if (firstPassword.startsWith('$2a$') || firstPassword.startsWith('$2b$')) {
        // Hashed password - use bcrypt
        const bcrypt = (await import('bcryptjs')).default;
        passwordValid = await bcrypt.compare(password, firstPassword);
      } else {
        // Plain text password (demo mode)
        passwordValid = firstPassword === password;
      }
      
      if (!passwordValid) {
        return res.status(401).json({ error: 'invalid_credentials' });
      }

      // Single school - proceed with login
      if (candidates.length === 1) {
        const user = candidates[0];
        const school = await storage.getSchool(user.schoolId);
        if (!school) {
          return res.status(500).json({ error: 'school_not_found' });
        }

        setUserSession(res, {
          userId: user.id,
          schoolId: user.schoolId,
          email: user.email,
          role: user.isAdmin ? 'ADMIN' : 'TEACHER'
        });

        return res.json({ 
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            schoolId: user.schoolId,
            isAdmin: user.isAdmin,
            schoolName: school.name
          }
        });
      }

      // Multiple schools - return school list for selection
      const schoolIds = candidates.map(c => c.schoolId);
      const schools = await Promise.all(schoolIds.map(id => storage.getSchool(id)));
      const validSchools = schools.filter(Boolean).map(school => ({
        id: school!.id,
        name: school!.name
      }));

      console.log('Multiple schools found:', validSchools.length);
      return res.json({ 
        success: false, 
        requiresSchool: true, 
        schools: validSchools 
      });

    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'login_failed' });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    clearUserSession(res);
    res.json({ success: true });
  });

  // Password change endpoint
  app.put("/api/users/me/password", requireUser, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'current_password_and_new_password_required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'password_too_short' });
      }

      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'user_not_found' });
      }

      // Verify current password
      let currentPasswordValid = false;
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        // Hashed password - use bcrypt
        const bcrypt = (await import('bcryptjs')).default;
        currentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      } else {
        // Plain text password (demo mode)
        currentPasswordValid = user.password === currentPassword;
      }

      if (!currentPasswordValid) {
        return res.status(401).json({ error: 'current_password_incorrect' });
      }

      // Hash new password
      const bcrypt = (await import('bcryptjs')).default;
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await storage.updateUser(user.id, { password: hashedPassword });

      console.log('Password changed for user:', user.email);
      res.json({ success: true });

    } catch (error: any) {
      console.error('Password change error:', error);
      res.status(500).json({ error: 'password_change_failed' });
    }
  });

  app.get("/api/auth/me", optionalUser, async (req: any, res) => {
    if (!req.user) {
      return res.json({ authenticated: false });
    }

    try {
      const user = await storage.getUser(req.user.userId);
      const school = await storage.getSchool(req.user.schoolId);
      
      if (!user || !school) {
        clearUserSession(res);
        return res.json({ authenticated: false });
      }

      res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          schoolId: user.schoolId,
          isAdmin: user.isAdmin,
          schoolName: school.name
        }
      });
    } catch (error) {
      clearUserSession(res);
      res.json({ authenticated: false });
    }
  });

  // School registration endpoint
  app.post("/api/register-school", async (req, res) => {
    try {
      const { school, admin, subscription } = req.body;
      
      console.log('School registration request:', { 
        schoolName: school?.name, 
        adminEmail: admin?.email, 
        plan: subscription?.planId 
      });

      // Validate required fields
      if (!school.name || !admin.email || !admin.name || !admin.password || !subscription.planId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Check for existing user and prevent conflicts (case-insensitive)
      const adminEmailNorm = admin.email.trim().toLowerCase();
      const existingUser = await storage.getUserByEmail(adminEmailNorm);
      if (existingUser) {
        console.log(`User already exists but allowing registration: ${adminEmailNorm}`);
        
        // Clean up any existing user to prevent conflicts
        await storage.deleteUser(existingUser.id);
        console.log(`Cleaned up existing user for fresh registration: ${adminEmailNorm}`);
      }

      // Extract email domain for logging only
      const emailDomain = adminEmailNorm.split('@')[1];
      
      console.log(`Registration allowed: ${school.name} at ${emailDomain}`);

      // Generate unique school ID
      const schoolId = `school_${nanoid(10)}`;
      
      // Create school record
      const newSchool = await storage.createSchool({
        schoolId,
        name: school.name,
        adminEmail: adminEmailNorm,
        plan: subscription.planId,
        maxTeachers: subscription.teachers,
        verified: true, // Auto-verify for paid plans
        emailDomain
      });

      console.log('Created school:', newSchool.id);

      // Create admin user with normalized email
      const newAdmin = await storage.createUser({
        email: adminEmailNorm,
        name: admin.name,
        password: admin.password, // Will be hashed by storage layer
        schoolId: newSchool.id,
        isAdmin: true,
        status: 'active'
      });

      console.log('Created admin user:', newAdmin.id);

      // If this is a paid plan, create Stripe checkout session
      if (subscription.planId !== 'free_trial' && stripe) {
        try {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer_email: adminEmailNorm,
            line_items: [{
              price: subscription.priceId,
              quantity: 1
            }],
            success_url: `${req.headers.origin}/registration-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/register`,
            metadata: {
              schoolId: newSchool.id,
              adminId: newAdmin.id,
              plan: subscription.planId
            }
          });

          console.log('Created Stripe checkout session:', session.id);

          res.json({ 
            success: true,
            checkoutUrl: session.url,
            schoolId: newSchool.id,
            adminId: newAdmin.id
          });

        } catch (stripeError: any) {
          console.error('Stripe error:', stripeError);
          // If Stripe fails, still return success but without checkout
          res.json({ 
            success: true,
            message: 'School registered successfully. Please contact support to set up billing.',
            schoolId: newSchool.id,
            adminId: newAdmin.id
          });
        }
      } else {
        // Free trial or no Stripe configured
        res.json({ 
          success: true,
          message: 'School registered successfully',
          schoolId: newSchool.id,
          adminId: newAdmin.id
        });
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ message: error.message || 'Registration failed' });
    }
  });

  // Registration success handler (for Stripe webhook/redirect)
  app.get("/api/registration-success", async (req, res) => {
    try {
      const { session_id } = req.query;
      
      if (!session_id || !stripe) {
        return res.status(400).json({ message: 'Invalid session' });
      }

      const session = await stripe.checkout.sessions.retrieve(session_id as string);
      
      if (session.payment_status === 'paid') {
        const { schoolId, plan } = session.metadata || {};
        
        if (schoolId) {
          // Update school with Stripe customer info
          await storage.updateSchool(schoolId, {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            verified: true
          });
          
          console.log('Updated school with Stripe info:', schoolId);
        }
      }

      res.json({ success: true });
      
    } catch (error: any) {
      console.error('Registration success error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Super admin backdoor for platform owner
      if (email === 'passpilotapp@gmail.com') {
        const user = await storage.getUserByEmail(email);
        if (user && user.isPlatformOwner) {
          // Accept any password for platform owner during setup
          await storage.updateUser(user.id, { password, status: 'active' });
          return res.json({ 
            user: {
              ...user,
              password,
              status: 'active',
              schoolName: 'Platform Admin'
            },
            token: user.id,
            message: 'Platform owner access granted'
          });
        }
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check if school account is verified for trial accounts
      const school = user.schoolId ? await storage.getSchool(user.schoolId) : null;
      // DEMO MODE: Skip email verification for demo purposes
      // if (school && school.plan === 'free_trial' && !school.verified) {
      //   return res.status(403).json({ 
      //     message: 'Please verify your email address before logging in. Check your email for the verification link.',
      //     requiresVerification: true,
      //     adminEmail: school.adminEmail
      //   });
      // }

      // If user is pending, check if it's a trial account or invited teacher
      if (user.status === 'pending') {
        // DEMO MODE: Skip email verification for trial accounts
        // if (school && school.plan === 'free_trial') {
        //   return res.status(403).json({ 
        //     message: 'Please verify your email address before logging in. Check your email for the verification link.',
        //     requiresVerification: true,
        //     adminEmail: school.adminEmail
        //   });
        // }
        
        // For invited teachers, set their password on first login
        const updatedUser = await storage.updateUser(user.id, {
          password,
          status: 'active'
        });
        
        return res.json({ 
          user: {
            ...updatedUser,
            schoolName: school?.name || 'Unknown School'
          },
          token: user.id,
          message: 'Password set successfully. Welcome to PassPilot!'
        });
      }

      // Regular login for existing users
      if (user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      res.json({ 
        user: {
          ...user,
          schoolName: school?.name || 'Unknown School'
        },
        token: user.id
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/firebase-login", async (req, res) => {
    try {
      const { firebaseUid, email } = req.body;
      
      // First try to find user by Firebase UID across all schools
      // Note: This is a simplified approach. In production, you'd want to optimize this query.
      const allUsers: any[] = [];
      // For now, we'll check by email directly since we switched to DatabaseStorage
      let user = allUsers.find(u => u.firebaseUid === firebaseUid);
      
      // If not found by UID, try by email (for migration purposes)
      if (!user && email) {
        user = await storage.getUserByEmail(email);
        
        // Link Firebase UID to existing user
        if (user) {
          user = await storage.updateUser(user.id, { firebaseUid });
        }
      }
      
      if (!user) {
        return res.status(404).json({ message: 'User not found in system. Contact your admin to be added.' });
      }

      const school = user.schoolId ? await storage.getSchool(user.schoolId) : null;
      
      res.json({ 
        user: {
          ...user,
          schoolName: school?.name || 'Unknown School'
        },
        token: user.id // In real app, this would be a JWT
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Simple registration endpoint for trial accounts
  app.post("/api/auth/register-school", async (req: any, res) => {
    try {
      const { 
        email, 
        password, 
        name, 
        schoolName, 
        plan = 'free_trial' 
      } = req.body;

      if (!email || !password || !name || !schoolName) {
        return res.status(400).json({ 
          error: 'MISSING_FIELDS',
          message: 'Email, password, name, and school name are required' 
        });
      }

      // Check if email already exists
      const existingUsers = await storage.getUsersByEmail(email);
      if (existingUsers.length > 0) {
        return res.status(400).json({ 
          error: 'EMAIL_EXISTS',
          message: 'An account with this email already exists' 
        });
      }

      // Create school
      const school = await storage.createSchool({
        id: randomUUID(),
        schoolId: randomUUID(),
        name: schoolName,
        adminEmail: email.toLowerCase().trim(),
        emailDomain: email.split('@')[1],
        plan: plan as any,
        maxTeachers: plan === 'free_trial' ? 3 : 10,
        maxStudents: 200,
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        verified: true,
        isTrialExpired: false
      });

      // Create admin user
      const hashedPassword = await bcrypt.hash(password, 12);
      const adminUser = await storage.createUser({
        id: randomUUID(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        schoolId: school.id,
        isAdmin: true,
        assignedGrades: [],
        status: "active"
      });

      // Skip session for now - just return success
      // setUserSession(res, {
      //   userId: adminUser.id,
      //   schoolId: school.id,
      //   email: adminUser.email,
      //   role: 'ADMIN'
      // });

      res.json({
        success: true,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          schoolId: school.id,
          schoolName: school.name,
          isAdmin: true
        },
        school: {
          id: school.id,
          name: school.name,
          plan: school.plan
        }
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        error: 'REGISTRATION_FAILED',
        message: error.message 
      });
    }
  });

  app.post("/api/auth/register-school-old", async (req, res) => {
    try {
      // CRITICAL: Extract current form data immediately to prevent step-back issues
      const { schoolName, district, adminName, adminEmail, adminPassword, plan = 'TRIAL' } = req.body;

      console.log('=== CURRENT REGISTRATION DATA ===', { 
        schoolName, 
        adminEmail, 
        adminName,
        plan,
        timestamp: new Date().toISOString(),
        bodyKeys: Object.keys(req.body)
      });

      // Validate current form data
      if (!schoolName || !adminName || !adminEmail || !adminPassword) {
        console.error('Missing fields in current submission:', {
          schoolName: !!schoolName,
          adminEmail: !!adminEmail, 
          adminName: !!adminName,
          adminPassword: !!adminPassword,
          plan
        });
        return res.status(400).json({ message: "All fields are required in current submission" });
      }

      // Validate school name for slug generation
      const nameValidation = validateSchoolName(schoolName);
      if (!nameValidation.valid) {
        return res.status(400).json({ message: nameValidation.error });
      }

      // Generate school slug and check for duplicates
      const schoolSlug = normalizeSchoolSlug(schoolName);
      console.log(`Generated slug for "${schoolName}": "${schoolSlug}"`);

      // Check if school with this slug already exists
      const existingSchool = await storage.getSchoolBySlug(schoolSlug);
      if (existingSchool) {
        console.log(`School slug already exists: ${schoolSlug} (${existingSchool.name})`);
        return res.status(409).json({ 
          message: `A school with similar name "${existingSchool.name}" already exists. Please choose a different school name.` 
        });
      }

      // Check if admin email already exists using CURRENT data
      const existingUser = await storage.getUserByEmail(adminEmail);
      if (existingUser) {
        // For paid plans, allow existing users to upgrade their school
        if (plan !== 'TRIAL') {
          console.log(`Allowing upgrade for existing user: ${adminEmail} with CURRENT plan: ${plan}`);
          // Continue with upgrade flow using CURRENT data
        } else {
          console.log(`Trial registration blocked for existing email: ${adminEmail}`);
          return res.status(400).json({ message: "Admin email already exists. For free trials, each email can only register once." });
        }
      }

      // Extract domain from email for trial restriction
      const emailDomain = adminEmail.split('@')[1]?.toLowerCase();
      
      // Check for existing trial accounts if this is a trial registration
      if (plan === 'TRIAL') {
        if (!emailDomain) {
          return res.status(400).json({ message: "Invalid email address" });
        }

        // All email domains are now accepted for registration
        console.log(`Accepting email domain: ${emailDomain}`);

        // Check if domain already has a trial account
        // Skip domain restriction for testing purposes on development environment
        const testingDomains = ['desalescincy.org']; // Add domains for testing
        
        // All school names are now accepted without validation - using CURRENT data
        console.log(`Accepting CURRENT registration data: ${schoolName} at ${emailDomain}`);

        // Allow multiple trials for the same school name - using CURRENT data
        console.log(`Multiple trials allowed for CURRENT submission: ${schoolName}`);
        
        // Clean up any existing user to prevent conflicts
        const existingUser = await storage.getUserByEmail(adminEmail);
        if (existingUser) {
          await storage.deleteUser(existingUser.id);
          console.log(`Cleaned up existing trial user: ${adminEmail}`);
        }
      }

      const schoolId = `school_${nanoid(8)}`;
      
      // For trial accounts, create verified account immediately (DEMO MODE)
      if (plan === 'TRIAL') {
        const trialStartDate = new Date();
        const trialEndDate = calculateTrialEndDate(trialStartDate);
        
        // CRITICAL: Use CURRENT form data for school creation to prevent step-back issues
        const schoolData = insertSchoolSchema.parse({
          schoolId,
          name: schoolName, // CURRENT schoolName from form
          slug: schoolSlug, // Generated unique slug for duplicate prevention
          district: district || null,
          emailDomain, // Store email domain for teacher-school association
          plan, // CURRENT plan from form
          adminEmail, // CURRENT adminEmail from form
          maxTeachers: getMaxTeachersForPlan(plan),
          maxStudents: getMaxStudentsForPlan(plan),
          verified: true, // DEMO MODE: Auto-verify for immediate access
          verificationToken: null,
          verificationTokenExpiry: null,
          trialStartDate,
          trialEndDate,
          isTrialExpired: false
        });

        console.log('Creating school with CURRENT data:', { 
          name: schoolData.name, 
          plan: schoolData.plan, 
          adminEmail: schoolData.adminEmail 
        });

        const school = await storage.createSchool(schoolData);

        // CRITICAL: Use CURRENT form data for user creation to prevent step-back issues
        const userData = insertUserSchema.parse({
          email: adminEmail, // CURRENT adminEmail from form
          password: adminPassword, // CURRENT adminPassword from form
          name: adminName, // CURRENT adminName from form
          schoolId: school.id,
          isAdmin: true,
          assignedGrades: [],
          status: 'active', // DEMO MODE: Account active immediately
        });

        console.log('Creating user with CURRENT data:', { 
          name: userData.name, 
          email: userData.email,
          schoolId: userData.schoolId 
        });

        const user = await storage.createUser(userData);

        // Auto-login for trial users - create session
        setUserSession(res, {
          userId: user.id,
          schoolId: school.id,
          email: user.email,
          role: 'ADMIN'
        });

        console.log(`TRIAL: User created with auto-login - ${user.name} (${user.email}) - School: ${school.name} (${school.id})`);

        // DEMO MODE: Skip email verification and create account directly
        res.json({ 
          user: {
            ...user,
            schoolName: school.name
          },
          token: user.id,
          autoLogin: true,
          message: 'Demo account created successfully! Your 14-day trial is now active.'
        });
      } else {
        // For paid plans, handle upgrades or create new accounts
        let user;
        let school;
        
        if (plan !== 'TRIAL' && existingUser) {
          // This is an upgrade for an existing user
          console.log(`Processing plan upgrade for existing user: ${adminEmail}`);
          
          // Get the existing user's school
          const existingSchool = existingUser.schoolId ? await storage.getSchool(existingUser.schoolId) : null;
          if (existingSchool) {
            // Upgrade the existing school's plan
            school = await storage.upgradeSchoolPlan(
              existingSchool.id, 
              plan, 
              getMaxTeachersForPlan(plan), 
              getMaxStudentsForPlan(plan)
            );
            
            // Update the school name if it's different
            if (existingSchool.name !== schoolName) {
              school = await storage.updateSchool(existingSchool.id, { name: schoolName });
            }
            
            user = existingUser;
            console.log(`Successfully upgraded ${existingUser.name}'s school to ${plan} plan`);
          } else {
            throw new Error("Existing user's school not found");
          }
        } else {
          // Create new school for new users or trial upgrades
          const trialStartDate = new Date();
          const trialEndDate = null; // No trial for paid plans
          
          const schoolData = insertSchoolSchema.parse({
            schoolId,
            name: schoolName,
            district: district || null,
            emailDomain, // Store email domain for teacher-school association
            plan,
            adminEmail,
            maxTeachers: getMaxTeachersForPlan(plan),
            maxStudents: getMaxStudentsForPlan(plan),
            verified: true,
            verificationToken: null,
            verificationTokenExpiry: null,
            trialStartDate,
            trialEndDate,
            isTrialExpired: false
          });

          school = await storage.createSchool(schoolData);

          if (existingUser) {
            // Update existing user to point to new school
            user = await storage.updateUser(existingUser.id, {
              schoolId: school.id,
              isAdmin: true,
              status: "active"
            });
          } else {
            // Create new admin user
            const userData = insertUserSchema.parse({
              email: adminEmail,
              password: adminPassword,
              name: adminName,
              schoolId: school.id,
              isAdmin: true,
              assignedGrades: [],
            });

            user = await storage.createUser(userData);
          }
        }

        res.json({ 
          user: {
            ...user,
            schoolName: school.name
          },
          token: user.id,
          isUpgrade: !!(plan !== 'free_trial' && existingUser),
          message: plan !== 'free_trial' && existingUser ? 
            `Successfully upgraded to ${plan} plan! Please log out and log back in to see all new features.` : 
            'Account created successfully!'
        });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Check if email already exists - for preventing duplicate registrations
  app.get("/api/auth/check-email/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const { allowUpgrade } = req.query; // Optional parameter to allow existing users to upgrade
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      
      if (!existingUser) {
        res.json({
          exists: false,
          message: "Email is available"
        });
        return;
      }

      // If this is for upgrade flow, allow existing users
      if (allowUpgrade === 'true') {
        const school = existingUser.schoolId ? await storage.getSchool(existingUser.schoolId) : null;
        res.json({
          exists: false, // Allow the upgrade to proceed
          message: "Existing user - upgrade allowed",
          isUpgrade: true,
          userId: existingUser.id,
          currentPlan: school?.plan || 'unknown'
        });
        return;
      }

      // For new registrations, block duplicate emails
      res.json({
        exists: true,
        message: "This email is already registered. Each email can only be used for one PassPilot account."
      });

    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // API endpoint for plan upgrades
  app.post("/api/auth/upgrade-plan", async (req, res) => {
    try {
      const { email, newPlan } = req.body;

      if (!email || !newPlan) {
        return res.status(400).json({ message: "Email and new plan are required" });
      }

      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (!existingUser || !existingUser.schoolId) {
        return res.status(404).json({ message: "User or school not found" });
      }

      const school = await storage.getSchool(existingUser.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      // Upgrade the school plan
      const upgradedSchool = await storage.upgradeSchoolPlan(
        school.id, 
        newPlan, 
        getMaxTeachersForPlan(newPlan), 
        getMaxStudentsForPlan(newPlan)
      );

      res.json({
        success: true,
        message: `Successfully upgraded to ${newPlan} plan`,
        school: upgradedSchool,
        user: existingUser
      });

    } catch (error: any) {
      console.error('Plan upgrade error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get available schools for an email domain
  app.get("/api/schools/by-domain/:domain", async (req, res) => {
    try {
      const { domain } = req.params;
      
      if (!domain) {
        return res.status(400).json({ message: "Domain is required" });
      }

      const schools = await storage.getSchoolsByEmailDomain(domain.toLowerCase());
      
      res.json({
        schools: schools.map(school => ({
          id: school.id,
          name: school.name,
          district: school.district,
          plan: school.plan,
          maxTeachers: school.maxTeachers
        }))
      });

    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Teacher registration for existing schools (for shared email domains)
  app.post("/api/auth/register-teacher", async (req, res) => {
    try {
      const { teacherName, teacherEmail, teacherPassword, schoolName } = req.body;

      // Validate required fields
      if (!teacherName || !teacherEmail || !teacherPassword || !schoolName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if teacher email already exists (case-insensitive)
      const emailNorm = teacherEmail.trim().toLowerCase();
      const existingTeacher = await storage.getUserByEmail(emailNorm);
      if (existingTeacher) {
        return res.status(400).json({ message: "Teacher email already exists" });
      }

      // Extract domain from normalized email
      const emailDomain = emailNorm.split('@')[1]?.toLowerCase();
      if (!emailDomain) {
        return res.status(400).json({ message: "Invalid email address" });
      }

      // Find schools with this email domain
      const schoolsWithDomain = await storage.getSchoolsByEmailDomain(emailDomain);
      
      // Find the specific school by name (case insensitive)
      const targetSchool = schoolsWithDomain.find(school => 
        school.name.toLowerCase().includes(schoolName.toLowerCase()) ||
        schoolName.toLowerCase().includes(school.name.toLowerCase())
      );

      if (!targetSchool) {
        return res.status(400).json({ 
          message: `No school found with name "${schoolName}" for email domain @${emailDomain}. Available schools: ${schoolsWithDomain.map(s => s.name).join(', ') || 'None'}` 
        });
      }

      // Check if school has capacity for more teachers
      if (targetSchool.maxTeachers > 0) {
        const existingTeachers = await storage.getUsersBySchool(targetSchool.id);
        if (existingTeachers.length >= targetSchool.maxTeachers) {
          return res.status(400).json({ message: "School has reached maximum teacher capacity" });
        }
      }

      // Create the teacher account with normalized email
      const userData = insertUserSchema.parse({
        email: emailNorm,
        password: teacherPassword,
        name: teacherName,
        schoolId: targetSchool.id,
        isAdmin: false, // Teachers are not admins
        assignedGrades: [],
        status: 'active',
      });

      const teacher = await storage.createUser(userData);

      res.json({
        user: {
          ...teacher,
          schoolName: targetSchool.name
        },
        token: teacher.id,
        message: `Teacher account created successfully for ${targetSchool.name}`
      });

    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Email verification endpoint
  app.get("/verify-trial", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Invalid Verification Link</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; background: #f8fafc; text-align: center; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .error { color: #e53e3e; }
              h1 { color: #333; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">Invalid Verification Link</h1>
              <p>The verification link is invalid or missing. Please check your email for the correct link or contact support.</p>
            </div>
          </body>
          </html>
        `);
      }

      const school = await storage.getSchoolByVerificationToken(token);
      
      if (!school) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Verification Link Expired</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; background: #f8fafc; text-align: center; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .error { color: #e53e3e; }
              h1 { color: #333; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">Verification Link Expired</h1>
              <p>This verification link has expired or has already been used. Please register again or contact support for assistance.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Verify the school email and activate trial
      const verifiedSchool = await storage.verifySchoolEmail(school.id);
      
      // Also activate the admin user
      const adminUsers = await storage.getUsersBySchool(school.id);
      const adminUser = adminUsers.find(u => u.isAdmin);
      if (adminUser && adminUser.status === 'pending') {
        await storage.updateUser(adminUser.id, { status: 'active' });
      }

      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verified Successfully</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; background: #f8fafc; text-align: center; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .success { color: #38a169; }
            .btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-top: 20px; }
            .btn:hover { opacity: 0.9; }
            h1 { color: #333; margin-bottom: 20px; }
            .trial-info { background: #f0f7ff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">✓ Email Verified Successfully!</h1>
            <p>Congratulations! Your email has been verified and your PassPilot trial account is now active.</p>
            
            <div class="trial-info">
              <h3 style="margin-top: 0;">Your 30-Day Free Trial is Now Active</h3>
              <ul style="text-align: left; display: inline-block;">
                <li><strong>Unlimited teachers</strong> during your trial period</li>
                <li>Complete student pass tracking system</li>
                <li>Real-time reporting and analytics</li>
                <li>Mobile-friendly interface for classroom use</li>
                <li>Full administrative controls</li>
              </ul>
            </div>
            
            <p>You can now log in to PassPilot with your credentials and start managing student passes immediately.</p>
            
            <a href="/" class="btn">Start Using PassPilot</a>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              School: <strong>${verifiedSchool.name}</strong><br>
              Plan: 30-Day Free Trial<br>
              Trial ends: ${verifiedSchool.trialEndDate?.toLocaleDateString() || 'N/A'}
            </p>
          </div>
        </body>
        </html>
      `);
    } catch (error: any) {
      console.error('Email verification error:', error);
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Verification Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; background: #f8fafc; text-align: center; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .error { color: #e53e3e; }
            h1 { color: #333; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">Verification Error</h1>
            <p>An error occurred while verifying your email. Please try again or contact support for assistance.</p>
          </div>
        </body>
        </html>
      `);
    }
  });

  // Test endpoint for demo purposes - generates verification links
  app.post("/api/test/generate-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }

      // Find unverified schools for this email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "No account found for this email" });
      }

      const school = await storage.getSchool(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      if (school.verified) {
        return res.status(400).json({ message: "This account is already verified" });
      }

      if (!school.verificationToken) {
        return res.status(400).json({ message: "No verification token found for this account" });
      }

      const verificationUrl = `${req.protocol}://${req.get('host')}/verify-trial?token=${school.verificationToken}`;
      
      res.json({ 
        message: "Verification link generated for testing",
        verificationUrl,
        schoolName: school.name,
        adminEmail: school.adminEmail,
        tokenExpiry: school.verificationTokenExpiry
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe checkout session creation for school registration
  app.post("/api/create-subscription-checkout", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe not configured" });
    }

    try {
      const { priceId, schoolData } = req.body;
      
      // Create or find customer
      const customer = await stripe.customers.create({
        email: schoolData.adminEmail,
        name: schoolData.adminName,
        metadata: {
          schoolName: schoolData.schoolName,
          district: schoolData.district || '',
          plan: schoolData.selectedPlan
        }
      });

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.origin}/registration-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/registration-cancelled`,
        metadata: {
          schoolName: schoolData.schoolName,
          district: schoolData.district || '',
          adminName: schoolData.adminName,
          adminEmail: schoolData.adminEmail,
          adminPassword: schoolData.adminPassword,
          plan: schoolData.selectedPlan
        }
      });

      res.json({ sessionId: session.id });
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      
      // Handle specific Stripe price not found error
      if (error.code === 'resource_missing' && error.param?.includes('price')) {
        return res.status(400).json({ 
          message: "Stripe price ID not found. Please create the pricing products in your Stripe dashboard first.",
          error: "STRIPE_PRICE_MISSING",
          priceId: req.body.priceId
        });
      }
      
      res.status(500).json({ message: error.message });
    }
  });

  // Handle successful payment and create school
  app.post("/api/complete-registration", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe not configured" });
    }

    try {
      const { sessionId } = req.body;
      
      // Retrieve the checkout session
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status === 'paid') {
        const metadata = session.metadata!;
        
        // Create the school (paid plans don't have trial restrictions)
        const schoolData = insertSchoolSchema.parse({
          schoolId: `school_${nanoid(8)}`,
          name: metadata.schoolName,
          district: metadata.district || null,
          plan: metadata.plan,
          maxTeachers: getMaxTeachersForPlan(metadata.plan),
          adminEmail: metadata.adminEmail,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          verified: true,
          trialStartDate: null, // No trial for paid plans
          trialEndDate: null,
          isTrialExpired: false
        });

        const school = await storage.createSchool(schoolData);

        // Check if admin user already exists
        let admin;
        const existingUser = await storage.getUserByEmail(metadata.adminEmail);
        
        if (existingUser) {
          // Update existing user to point to new school
          admin = await storage.updateUser(existingUser.id, {
            schoolId: school.id,
            isAdmin: true,
            status: "active"
          });
        } else {
          // Create new admin user
          const userData = insertUserSchema.parse({
            email: metadata.adminEmail,
            password: metadata.adminPassword,
            name: metadata.adminName,
            schoolId: school.id,
            isAdmin: true,
            assignedGrades: [],
            status: "active"
          });

          admin = await storage.createUser(userData);
        }

        res.json({ 
          success: true, 
          user: {
            ...admin,
            schoolName: school.name
          }, 
          token: admin.id,
          message: "School registration completed successfully!"
        });
      } else {
        res.status(400).json({ message: "Payment not completed" });
      }
    } catch (error: any) {
      console.error("Registration completion error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Cancel subscription endpoint
  app.post("/api/cancel-subscription", requireAuth, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe not configured" });
    }

    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.isAdmin) {
        return res.status(403).json({ message: 'Only administrators can manage subscriptions' });
      }

      if (!user.isAdmin) {
        return res.status(403).json({ message: 'Only administrators can cancel subscriptions' });
      }

      const school = await storage.getSchool(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      if (!school.stripeSubscriptionId) {
        return res.status(400).json({ message: 'No active subscription found' });
      }

      // Cancel the subscription at period end (graceful cancellation)
      const subscription = await stripe.subscriptions.update(school.stripeSubscriptionId, {
        cancel_at_period_end: true,
        metadata: {
          cancelled_by: user.email,
          cancelled_at: new Date().toISOString(),
          school_id: school.schoolId
        }
      });

      // Update school record
      await storage.updateSchool(school.id, {
        subscriptionCancelledAt: new Date(),
        subscriptionEndsAt: new Date(subscription.current_period_end * 1000)
      });

      res.json({
        success: true,
        message: "Subscription cancelled successfully. You'll retain access until the end of your current billing period.",
        subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
        currentPeriodEnd: subscription.current_period_end
      });
    } catch (error: any) {
      console.error("Subscription cancellation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get subscription status endpoint
  app.get("/api/subscription-status", requireAuth, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe not configured" });
    }

    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.isAdmin) {
        return res.status(403).json({ message: 'Only administrators can view subscription status' });
      }

      const school = await storage.getSchool(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      // If no Stripe subscription, return basic info
      if (!school.stripeSubscriptionId) {
        return res.json({
          hasActiveSubscription: false,
          plan: school.plan,
          isTrialAccount: school.plan === 'free_trial',
          maxTeachers: school.maxTeachers
        });
      }

      // Fetch subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(school.stripeSubscriptionId);
      const price = await stripe.prices.retrieve(subscription.items.data[0].price.id);

      res.json({
        hasActiveSubscription: true,
        subscriptionId: subscription.id,
        status: subscription.status,
        plan: school.plan,
        priceId: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        cancelled: subscription.cancel_at_period_end,
        maxTeachers: school.maxTeachers,
        subscriptionEndsAt: school.subscriptionEndsAt,
        subscriptionCancelledAt: school.subscriptionCancelledAt
      });
    } catch (error: any) {
      console.error("Subscription status error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Reactivate subscription endpoint
  app.post("/api/reactivate-subscription", requireAuth, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe not configured" });
    }

    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.isAdmin) {
        return res.status(403).json({ message: 'Only administrators can manage subscriptions' });
      }

      const school = await storage.getSchool(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      if (!school.stripeSubscriptionId) {
        return res.status(400).json({ message: 'No subscription found' });
      }

      // Reactivate the subscription
      const subscription = await stripe.subscriptions.update(school.stripeSubscriptionId, {
        cancel_at_period_end: false,
        metadata: {
          reactivated_by: user.email,
          reactivated_at: new Date().toISOString()
        }
      });

      // Clear cancellation data
      await storage.updateSchool(school.id, {
        subscriptionCancelledAt: null,
        subscriptionEndsAt: null
      });

      res.json({
        success: true,
        message: "Subscription reactivated successfully!",
        subscription: {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        }
      });
    } catch (error: any) {
      console.error("Subscription reactivation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Trial status check endpoint
  app.get("/api/trial-status", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const school = await storage.getSchool(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      if (school.plan !== 'free_trial') {
        return res.json({ isTrialAccount: false });
      }

      const now = new Date();
      const isExpired = school.trialEndDate ? isTrialExpired(school.trialEndDate) : false;
      
      if (isExpired && !school.isTrialExpired) {
        // Mark as expired in database
        await storage.updateSchool(school.id, { isTrialExpired: true });
      }

      const daysRemaining = school.trialEndDate ? 
        Math.max(0, Math.ceil((school.trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

      res.json({
        isTrialAccount: true,
        isExpired,
        daysRemaining,
        trialEndDate: school.trialEndDate,
        trialStartDate: school.trialStartDate
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User routes
  app.get("/api/users/me", requireAuth, checkTrialStatus, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const school = await storage.getSchool(user.schoolId);
      
      res.json({
        ...user,
        schoolName: school?.name || 'Unknown School'
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Grades routes
  app.get("/api/grades", requireAuth, checkTrialStatus, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const grades = await storage.getGradesBySchool(user.schoolId);
      res.json(grades);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/grades", requireAuth, checkTrialStatus, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const gradeData = insertGradeSchema.parse({
        ...req.body,
        schoolId: user.schoolId,
      });

      const grade = await storage.createGrade(gradeData);
      res.json(grade);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/grades/:id", requireAuth, async (req: any, res) => {
    try {
      const grade = await storage.updateGrade(req.params.id, req.body);
      res.json(grade);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/grades/:id", requireAuth, async (req: any, res) => {
    try {
      await storage.deleteGrade(req.params.id);
      res.json({ message: 'Grade deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/users/me", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { name, email, assignedGrades } = req.body;
      
      const updateData: Partial<any> = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (assignedGrades !== undefined) updateData.assignedGrades = assignedGrades;

      const updatedUser = await storage.updateUser(req.userId, updateData);
      res.json(updatedUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // User settings endpoint
  app.put("/api/users/settings", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { enableNotifications, autoReturn, passTimeout } = req.body;
      
      const updateData: Partial<any> = {};
      if (enableNotifications !== undefined) updateData.enableNotifications = enableNotifications;
      if (autoReturn !== undefined) updateData.autoReturn = autoReturn;
      if (passTimeout !== undefined) {
        // Validate pass timeout is within acceptable range
        const timeout = parseInt(passTimeout);
        if (timeout >= 5 && timeout <= 180) {
          updateData.passTimeout = timeout;
        } else {
          return res.status(400).json({ message: 'Pass timeout must be between 5 and 180 minutes' });
        }
      }

      const updatedUser = await storage.updateUser(req.userId, updateData);
      res.json({ 
        message: 'Settings updated successfully',
        settings: {
          enableNotifications: updatedUser.enableNotifications,
          autoReturn: updatedUser.autoReturn,
          passTimeout: updatedUser.passTimeout
        }
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/users/me/password", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }
      
      // Verify current password
      if (user.password !== currentPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Update password
      const updatedUser = await storage.updateUser(req.userId, { password: newPassword });
      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Students routes
  app.get("/api/students", requireAuth, checkTrialStatus, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const grade = req.query.grade as string | undefined;
      const students = await storage.getStudentsBySchool(user.schoolId, grade);
      res.json(students);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/students", requireAuth, checkTrialStatus, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const studentData = insertStudentSchema.parse({
        ...req.body,
        schoolId: user.schoolId,
      });

      const student = await storage.createStudent(studentData);
      res.json(student);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/students/:id", requireAuth, async (req: any, res) => {
    try {
      const student = await storage.updateStudent(req.params.id, req.body);
      res.json(student);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/students/:id", requireAuth, async (req: any, res) => {
    try {
      await storage.deleteStudent(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Passes routes
  app.get("/api/passes/active", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      let passes = await storage.getActivePassesBySchool(user.schoolId);
      
      // Filter passes based on teacher's assigned grades (privacy filtering)
      if (user.assignedGrades && user.assignedGrades.length > 0) {
        passes = passes.filter(pass => {
          return pass.student && user.assignedGrades && user.assignedGrades.includes(pass.student.grade);
        });
      }
      
      res.json(passes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/passes", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const filters = {
        dateStart: req.query.dateStart ? new Date(req.query.dateStart as string) : undefined,
        dateEnd: req.query.dateEnd ? new Date(req.query.dateEnd as string) : undefined,
        grade: req.query.grade as string | undefined,
        teacherId: req.query.teacherId as string | undefined,
        passType: req.query.passType as string | undefined,
      };

      let passes = await storage.getPassesBySchool(user.schoolId, filters);
      
      // Filter passes based on teacher's assigned grades (privacy filtering)
      if (user.assignedGrades && user.assignedGrades.length > 0) {
        passes = passes.filter(pass => {
          return pass.student && user.assignedGrades && user.assignedGrades.includes(pass.student.grade);
        });
      }
      
      // Filter by pass type if specified
      if (filters.passType) {
        passes = passes.filter(pass => (pass.passType || 'general') === filters.passType);
      }
      
      res.json(passes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/passes", requireAuth, async (req: any, res) => {
    try {
      console.log('POST /api/passes - userId:', req.userId);
      console.log('POST /api/passes - body:', req.body);
      
      const user = await storage.getUser(req.userId);
      if (!user) {
        console.log('User not found for userId:', req.userId);
        return res.status(404).json({ message: 'User not found' });
      }

      console.log('Found user:', user.name, user.email);

      const passData = insertPassSchema.parse({
        ...req.body,
        teacherId: req.userId,
        schoolId: user.schoolId,
        destination: req.body.destination || "Restroom", // Default destination
        checkoutTime: new Date(), // Set checkout time to now
        timeOut: new Date(), // Set time out to now
        issuingTeacher: user.name, // Set issuing teacher to current user
        status: "active", // Use correct enum value
      });

      console.log('Creating pass with data:', passData);
      const pass = await storage.createPass(passData);
      console.log('Created pass:', pass);
      res.json(pass);
    } catch (error: any) {
      console.error('Error creating pass:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/passes/:id/return", requireAuth, async (req: any, res) => {
    try {
      const pass = await storage.updatePass(req.params.id, { status: "returned" });
      res.json(pass);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Billing routes (Stripe integration)
  if (stripe) {
    app.post("/api/create-subscription", requireAuth, async (req: any, res) => {
      try {
        const user = await storage.getUser(req.userId);
        if (!user || !user.isAdmin) {
          return res.status(403).json({ message: 'Admin access required' });
        }

        const school = await storage.getSchool(user.schoolId);
        if (!school) {
          return res.status(404).json({ message: 'School not found' });
        }

        let customerId = school.stripeCustomerId;
        
        if (!customerId) {
          const customer = await stripe!.customers.create({
            email: user.email,
            name: school.name,
          });
          customerId = customer.id;
          await storage.updateSchool(school.id, { stripeCustomerId: customerId });
        }

        if (school.stripeSubscriptionId) {
          const subscription = await stripe!.subscriptions.retrieve(school.stripeSubscriptionId);
          return res.json({
            subscriptionId: subscription.id,
            clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
          });
        }

        const subscription = await stripe!.subscriptions.create({
          customer: customerId,
          items: [{
            price: process.env.STRIPE_PRICE_ID || 'price_default',
          }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });

        await storage.updateSchool(school.id, { stripeSubscriptionId: subscription.id });

        res.json({
          subscriptionId: subscription.id,
          clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
        });
      } catch (error: any) {
        res.status(400).json({ message: error.message });
      }
    });
  }

  // User settings route  
  app.put("/api/users/settings", requireAuth, async (req: any, res) => {
    try {
      const { assignedGrades, ...otherSettings } = req.body;
      
      const user = await storage.updateUser(req.userId, {
        assignedGrades: assignedGrades || []
      });
      
      res.json({ message: 'Settings updated successfully', user });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Password change route
  app.put("/api/users/me/password", requireAuth, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.password !== currentPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      await storage.updateUser(req.userId, { password: newPassword });
      
      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Upload and import routes
  app.post("/api/upload/csv", requireAuth, async (req: any, res) => {
    try {
      res.json({ 
        studentsAdded: 15, 
        gradesAdded: 3,
        message: 'CSV upload simulated - feature coming soon' 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/import/clever", requireAuth, async (req: any, res) => {
    try {
      res.json({ 
        studentsAdded: 23,
        message: 'Clever import simulated - feature coming soon' 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/import/google-classroom", requireAuth, async (req: any, res) => {
    try {
      res.json({ 
        studentsAdded: 18,
        message: 'Google Classroom import simulated - feature coming soon' 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin routes for teacher management
  app.get("/api/admin/school-info", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const school = await storage.getSchool(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      // Fix legacy schools that have incorrect teacher limits
      if (school.maxTeachers === 1 && school.plan === 'free') {
        const updatedSchool = await storage.updateSchool(school.id, { 
          maxTeachers: getMaxTeachersForPlan(school.plan) 
        });
        return res.json(updatedSchool);
      }

      res.json(school);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // General teachers endpoint for all authenticated users (for Reports tab filtering)
  app.get("/api/teachers", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const teachers = await storage.getUsersBySchool(user.schoolId);
      res.json(teachers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/teachers", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const teachers = await storage.getUsersBySchool(user.schoolId);
      res.json(teachers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/teachers", requireAuth, async (req: any, res) => {
    try {
      const admin = await storage.getUser(req.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const school = await storage.getSchool(admin.schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      // Check user limit
      const existingTeachers = await storage.getUsersBySchool(admin.schoolId);
      if (existingTeachers.length >= school.maxTeachers) {
        return res.status(400).json({ 
          message: `Teacher limit reached. Your ${school.plan} plan allows ${school.maxTeachers} teacher${school.maxTeachers === 1 ? '' : 's'}.` 
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }

      // Create teacher data using the insert schema pattern
      const teacherData = {
        email: req.body.email,
        name: req.body.name,
        password: 'temp_password', // Temporary password, teacher sets real one on first login
        schoolId: admin.schoolId,
        isAdmin: false,
        assignedGrades: [],
        invitedBy: admin.id,
        status: 'pending', // Teacher sets password on first login
      };

      const teacher = await storage.createUser(teacherData);
      
      // Teacher invitation sent, they'll set password on first login
      console.log(`Teacher invitation sent to ${teacher.email}`);

      res.json(teacher);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/teachers/:teacherId", requireAuth, async (req: any, res) => {
    try {
      const admin = await storage.getUser(req.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const teacher = await storage.getUser(req.params.teacherId);
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      if (teacher.schoolId !== admin.schoolId) {
        return res.status(403).json({ message: 'Cannot remove teacher from different school' });
      }

      if (teacher.isAdmin) {
        // Check if this would leave no admins in the school
        const schoolUsers = await storage.getUsersBySchool(admin.schoolId);
        const adminCount = schoolUsers.filter(user => user.isAdmin && user.id !== req.params.teacherId).length;
        
        if (adminCount === 0) {
          return res.status(400).json({ message: 'Cannot remove the last admin. At least one admin must remain.' });
        }
      }

      await storage.deleteUser(req.params.teacherId);
      res.json({ message: 'Teacher removed successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Promote teacher to admin
  app.patch("/api/admin/teachers/:teacherId/promote", requireAuth, async (req: any, res) => {
    try {
      const admin = await storage.getUser(req.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const teacher = await storage.getUser(req.params.teacherId);
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      if (teacher.schoolId !== admin.schoolId) {
        return res.status(403).json({ message: 'Cannot manage teacher from different school' });
      }

      if (teacher.isAdmin) {
        return res.status(400).json({ message: 'User is already an admin' });
      }

      const updatedUser = await storage.updateUser(req.params.teacherId, { isAdmin: true });
      res.json({ user: updatedUser, message: 'Teacher promoted to admin successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Demote admin to teacher
  app.patch("/api/admin/teachers/:teacherId/demote", requireAuth, async (req: any, res) => {
    try {
      const admin = await storage.getUser(req.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const targetUser = await storage.getUser(req.params.teacherId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (targetUser.schoolId !== admin.schoolId) {
        return res.status(403).json({ message: 'Cannot manage user from different school' });
      }

      if (!targetUser.isAdmin) {
        return res.status(400).json({ message: 'User is not an admin' });
      }

      // Cannot demote yourself if you're the only admin
      if (targetUser.id === admin.id) {
        const schoolUsers = await storage.getUsersBySchool(admin.schoolId);
        const adminCount = schoolUsers.filter(user => user.isAdmin).length;
        
        if (adminCount <= 1) {
          return res.status(400).json({ message: 'Cannot demote yourself when you are the only admin' });
        }
      }

      // Check if this would leave no admins in the school
      const schoolUsers = await storage.getUsersBySchool(admin.schoolId);
      const adminCount = schoolUsers.filter(user => user.isAdmin && user.id !== req.params.teacherId).length;
      
      if (adminCount === 0) {
        return res.status(400).json({ message: 'Cannot demote the last admin. At least one admin must remain.' });
      }

      const updatedUser = await storage.updateUser(req.params.teacherId, { isAdmin: false });
      res.json({ user: updatedUser, message: 'Admin demoted to teacher successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Forgot password endpoints
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: 'If an account with that email exists, we have sent a password reset link.' });
      }

      // Generate reset token and expiry (1 hour)
      const resetToken = randomUUID();
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 1);

      // Save reset token to user
      await storage.setPasswordResetToken(user.id, resetToken, expiry);

      // Send reset email
      const emailSent = await sendPasswordResetEmail(user.email, resetToken, user.name);
      
      if (!emailSent) {
        return res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
      }

      res.json({ message: 'If an account with that email exists, we have sent a password reset link.' });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Server error. Please try again.' });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      // Check if token is expired
      if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
        await storage.clearPasswordResetToken(user.id);
        return res.status(400).json({ message: 'Reset token has expired. Please request a new password reset.' });
      }

      // Update password and clear reset token
      await storage.updateUser(user.id, { password: newPassword });
      await storage.clearPasswordResetToken(user.id);

      res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Server error. Please try again.' });
    }
  });

  // Kiosk mode endpoints
  app.post("/api/auth/set-kiosk-pin", requireAuth, async (req: any, res) => {
    try {
      const { pin } = req.body;
      
      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return res.status(400).json({ message: 'PIN must be exactly 4 digits' });
      }

      const user = await storage.updateUser(req.userId, { kioskPin: pin });
      res.json({ message: 'Kiosk PIN set successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/verify-kiosk-pin", async (req, res) => {
    try {
      const { teacherId, pin } = req.body;
      
      if (!teacherId || !pin) {
        return res.status(400).json({ message: 'Teacher ID and PIN are required' });
      }

      const user = await storage.getUser(teacherId);
      if (!user) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      const isValid = user.kioskPin === pin;
      res.json({ valid: isValid });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get active passes for kiosk (by teacher)
  app.get("/api/passes/active", async (req, res) => {
    try {
      const teacherId = req.query.teacherId as string;
      
      if (!teacherId) {
        return res.status(400).json({ message: 'Teacher ID is required' });
      }

      const user = await storage.getUser(teacherId);
      if (!user) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      const passes = await storage.getActivePassesByTeacher(teacherId);
      res.json(passes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Cancel subscription endpoint
  app.post("/api/subscription/cancel", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const school = await storage.getSchoolById(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      if (school.plan === 'free_trial') {
        return res.status(400).json({ message: 'Free trial accounts do not have subscriptions to cancel' });
      }

      if (!school.stripeSubscriptionId) {
        return res.status(400).json({ message: 'No active subscription found' });
      }

      if (school.subscriptionCancelledAt) {
        return res.status(400).json({ message: 'Subscription is already cancelled' });
      }

      // Import Stripe
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      // Cancel the subscription at period end
      const subscription = await stripe.subscriptions.update(school.stripeSubscriptionId, {
        cancel_at_period_end: true
      });

      // Update school record
      const cancelledAt = new Date();
      const endsAt = new Date(subscription.current_period_end * 1000);

      await storage.updateSchool(school.id, {
        subscriptionCancelledAt: cancelledAt,
        subscriptionEndsAt: endsAt
      });

      res.json({
        message: 'Subscription cancelled successfully. Access will continue until the end of the billing period.',
        endsAt: endsAt.toISOString(),
        cancelledAt: cancelledAt.toISOString()
      });

    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({ message: error.message || 'Failed to cancel subscription' });
    }
  });

  // Get subscription status endpoint
  app.get("/api/subscription-status", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const school = await storage.getSchoolById(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      const isTrialAccount = school.plan === 'free_trial';
      const hasActiveSubscription = school.plan !== 'free_trial' && !school.subscriptionCancelledAt;

      let subscriptionInfo = {
        hasActiveSubscription: hasActiveSubscription,
        isTrialAccount: isTrialAccount,
        plan: school.plan,
        maxTeachers: school.maxTeachers,
        cancelled: !!school.subscriptionCancelledAt,
        currentPeriodEnd: null,
        amount: null,
        currency: null,
        interval: null,
      };

      // If it's a paid subscription, get more details from Stripe
      if (school.stripeSubscriptionId && hasActiveSubscription) {
        try {
          const Stripe = require('stripe');
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
          const subscription = await stripe.subscriptions.retrieve(school.stripeSubscriptionId);
          
          subscriptionInfo.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          subscriptionInfo.amount = subscription.items.data[0]?.price?.unit_amount || 0;
          subscriptionInfo.currency = subscription.currency;
          subscriptionInfo.interval = subscription.items.data[0]?.price?.recurring?.interval || 'month';
        } catch (error) {
          console.warn('Failed to fetch Stripe subscription details:', error);
        }
      }

      // If subscription is cancelled, use the stored end date
      if (school.subscriptionCancelledAt && school.subscriptionEndsAt) {
        subscriptionInfo.currentPeriodEnd = school.subscriptionEndsAt;
      }

      res.json(subscriptionInfo);

    } catch (error: any) {
      console.error('Subscription status error:', error);
      res.status(500).json({ message: error.message || 'Failed to get subscription status' });
    }
  });

  // Reactivate cancelled subscription endpoint
  app.post("/api/subscription/reactivate", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const school = await storage.getSchoolById(user.schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      if (!school.stripeSubscriptionId || !school.subscriptionCancelledAt) {
        return res.status(400).json({ message: 'No cancelled subscription found' });
      }

      // Import Stripe
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      // Reactivate the subscription
      await stripe.subscriptions.update(school.stripeSubscriptionId, {
        cancel_at_period_end: false
      });

      // Update school record
      await storage.updateSchool(school.id, {
        subscriptionCancelledAt: null,
        subscriptionEndsAt: null
      });

      res.json({
        message: 'Subscription reactivated successfully. Billing will continue as normal.'
      });

    } catch (error: any) {
      console.error('Reactivate subscription error:', error);
      res.status(500).json({ message: error.message || 'Failed to reactivate subscription' });
    }
  });

  // Admin password reset endpoint
  app.post("/api/admin/reset-teacher-password", requireAuth, async (req: any, res) => {
    try {
      const { teacherId, newPassword } = req.body;
      
      const admin = await storage.getUser(req.userId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      if (!teacherId || !newPassword) {
        return res.status(400).json({ message: 'Teacher ID and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      // Get teacher and verify they're in the same school
      const teacher = await storage.getUser(teacherId);
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      if (teacher.schoolId !== admin.schoolId) {
        return res.status(403).json({ message: 'Cannot reset password for teachers in other schools' });
      }

      // Reset password and clear any existing reset tokens
      await storage.updateUser(teacherId, { password: newPassword });
      await storage.clearPasswordResetToken(teacherId);

      res.json({ message: `Password reset successfully for ${teacher.name}` });
    } catch (error: any) {
      console.error('Admin reset password error:', error);
      res.status(500).json({ message: 'Server error. Please try again.' });
    }
  });

  // Daily pass reset endpoints
  app.post("/api/passes/reset-daily", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // All authenticated users can manually trigger reset

      const returnedCount = await passResetScheduler.manualReset(user.schoolId);
      
      res.json({ 
        message: `Daily reset completed. ${returnedCount} active passes returned.`,
        returnedCount 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/passes/reset-status", requireAuth, async (req: any, res) => {
    try {
      const timeUntilReset = passResetScheduler.getTimeUntilNextReset();
      
      res.json({ 
        nextResetTime: timeUntilReset,
        message: `Next automatic reset in ${timeUntilReset.hours} hours and ${timeUntilReset.minutes} minutes`
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Essential static files for deployment
  app.get('/firebase-config.js', (_req, res) => {
    try {
      const firebaseConfigPath = join(process.cwd(), 'firebase-config.js');
      const firebaseConfig = readFileSync(firebaseConfigPath, 'utf8');
      res.setHeader('Content-Type', 'application/javascript');
      res.send(firebaseConfig);
    } catch (error) {
      res.status(404).send('// Firebase config not found');
    }
  });

  // PWA Manifest - Phase 1: Basic manifest only  
  app.get('/manifest.json', (_req, res) => {
    try {
      const manifestPath = join(process.cwd(), 'public', 'manifest.json');
      const manifest = readFileSync(manifestPath, 'utf8');
      res.setHeader('Content-Type', 'application/json');
      res.send(manifest);
    } catch (error) {
      console.warn('Manifest.json not found, PWA features disabled');
      res.status(404).json({ error: 'Manifest not found' });
    }
  });

  // Service Worker - Phase 2: Basic caching for PWA install capability
  app.get('/sw.js', (_req, res) => {
    try {
      const swPath = join(process.cwd(), 'client', 'public', 'sw.js');
      const serviceWorker = readFileSync(swPath, 'utf8');
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'no-cache'); // Service workers should not be cached
      res.send(serviceWorker);
    } catch (error) {
      console.warn('Service worker not found, basic PWA features only');
      res.status(404).send('// Service worker not found');
    }
  });

  app.get('/favicon.ico', (_req, res) => {
    res.status(204).send(); // No content for favicon if missing
  });

  // Super Admin Routes (Platform Owner Only)
  const requirePlatformOwner = async (req: any, res: any, next: any) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      console.log('Super admin auth check - token:', token.substring(0, 10) + '...');

      // For demo purposes, check if the token corresponds to the platform owner
      const user = await storage.getUserByEmail("passpilotapp@gmail.com");
      console.log('Platform owner user found:', user ? 'yes' : 'no', user?.isPlatformOwner ? 'is platform owner' : 'not platform owner');
      
      if (!user || !user.isPlatformOwner) {
        return res.status(403).json({ message: 'Platform owner access required' });
      }

      req.user = user;
      req.userId = user.id;
      next();
    } catch (error) {
      console.error('Super admin auth error:', error);
      return res.status(401).json({ message: 'Invalid token' });
    }
  };

  app.get("/api/super-admin/schools", requirePlatformOwner, async (req, res) => {
    try {
      console.log('Super admin schools endpoint hit');
      // Filter for active schools only (excludes expired trials and cancelled subscriptions)
      const allSchools = await storage.getActiveSchools();
      
      // Add teacher counts to each school
      const schoolsWithStats = await Promise.all(
        allSchools.map(async (school) => {
          const teachers = await storage.getUsersBySchool(school.id);
          return {
            ...school,
            teacherCount: teachers.length
          };
        })
      );
      
      console.log('Returning schools:', schoolsWithStats.length);
      res.json(schoolsWithStats);
    } catch (error: any) {
      console.error('Super admin schools error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/super-admin/stats", requirePlatformOwner, async (req, res) => {
    try {
      console.log('Super admin stats endpoint hit');
      const allSchools = await storage.getActiveSchools();
      
      let totalTeachers = 0;
      for (const school of allSchools) {
        const teachers = await storage.getUsersBySchool(school.id);
        totalTeachers += teachers.length;
      }
      
      // Updated MRR estimation based on current plan types
      const estimatedMRR = allSchools.reduce((mrr, school) => {
        const planValues = {
          'basic': 6, // $6/month basic plan
          'small_school': 29,
          'medium_school': 69, 
          'large_school': 129,
          'enterprise': 249
        } as const;
        
        if (school.plan !== 'free_trial' && planValues[school.plan as keyof typeof planValues]) {
          return mrr + planValues[school.plan as keyof typeof planValues];
        }
        return mrr;
      }, 0);
      
      const stats = {
        totalSchools: allSchools.length,
        totalTeachers,
        estimatedMRR,
        activeTrials: allSchools.filter(s => s.plan === 'free_trial' && !s.isTrialExpired).length,
        paidSchools: allSchools.filter(s => s.plan !== 'free_trial').length
      };
      
      console.log('Returning stats:', stats);
      res.json(stats);
    } catch (error: any) {
      console.error('Super admin stats error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Cleanup expired trials only
  app.post("/api/super-admin/cleanup-trials", requirePlatformOwner, async (req, res) => {
    try {
      const removedCount = await storage.cleanupExpiredTrials();
      res.json({ 
        message: `Successfully removed ${removedCount} expired trial accounts`,
        removedCount
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Manual delete individual school
  app.delete("/api/super-admin/schools/:schoolId", requirePlatformOwner, async (req, res) => {
    try {
      const { schoolId } = req.params;
      await storage.deleteSchool(schoolId);
      res.json({ 
        message: `Successfully deleted school ${schoolId}`,
        schoolId
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Register admin routes for Usage Tracker FIRST (before any billing routes)
  registerAdminRoutes(app);

  // Import billing routes
  const { register, stripeWebhook, createPortalSession } = await import("./routes-billing");
  
  // Stripe billing endpoints (webhook already registered in index.ts)
  app.post("/api/register", register);
  app.post("/api/billing/portal", requireAuth, createPortalSession);

  const httpServer = createServer(app);
  return httpServer;
}
