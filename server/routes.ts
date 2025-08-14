import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertSchoolSchema, insertGradeSchema, insertStudentSchema, insertPassSchema, registerSchoolSchema } from "@shared/schema";
import { z } from "zod";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { ENV } from "./env";
import { validate } from "./validate";
import { invariant, unwrap } from "./safe";

// Authentication utilities
const auth = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  },
  
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },
  
  generateSessionToken(): string {
    return randomUUID();
  }
};

// In-memory session store
const sessions = new Map<string, { userId: string; schoolId: string; expires: Date }>();

// Auth middleware
interface AuthenticatedRequest extends Request {
  user: { id: string; schoolId: string };
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies.session;
  
  if (!authToken) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const session = sessions.get(authToken);
  if (!session || session.expires < new Date()) {
    sessions.delete(authToken);
    return res.status(401).json({ message: 'Session expired' });
  }
  
  (req as AuthenticatedRequest).user = { id: session.userId, schoolId: session.schoolId };
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoints
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

  // Example route demonstrating the validator pattern
  const RegisterBody = z.object({
    schoolName: z.string().min(2),
    adminEmail: z.string().email(),
    plan: z.enum(["TRIAL","BASIC","SMALL","MEDIUM","LARGE","UNLIMITED"]),
  });

  app.post("/api/register-simple", validate({ body: RegisterBody }), async (req, res) => {
    const { schoolName, adminEmail, plan } = (req as any).valid.body;
    // This demonstrates the exact pattern you requested
    console.log('Validated data:', { schoolName, adminEmail, plan });
    res.json({ ok: true, received: { schoolName, adminEmail, plan } });
  });

  // Auth endpoints
  app.post('/api/auth/register', validate({ body: registerSchoolSchema }), async (req: any, res) => {
    try {
      const { schoolName, adminEmail, adminFirstName, adminLastName, adminPassword, plan } = req.valid.body;
      
      // Create school first
      const schoolData = {
        name: schoolName,
        slug: schoolName.toLowerCase().replace(/\s+/g, '-'),
        status: 'active',
        plan: plan.toLowerCase(),
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      };
      
      const school = await storage.createSchool(schoolData);
      
      // Create admin user
      const hashedPassword = await auth.hashPassword(adminPassword);
      const userData = {
        schoolId: school.id,
        email: adminEmail,
        password: hashedPassword,
        firstName: adminFirstName,
        lastName: adminLastName,
        isAdmin: true,
      };
      
      const user = await storage.createUser(userData);
      
      res.json({ ok: true, school: { id: school.id, name: school.name }, user: { id: user.id, email: user.email } });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({ message: error.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password, schoolId } = req.body;
      
      // Normalize email
      const normalizedEmail = email.trim().toLowerCase();
      
      // If schoolId provided, single-step login
      if (schoolId) {
        const user = await storage.getUserByEmailAndSchool(normalizedEmail, schoolId);
        invariant(user, 'Invalid credentials');
        
        const isValid = await auth.comparePassword(password, user.password);
        invariant(isValid, 'Invalid credentials');
        
        // Create session
        const sessionToken = auth.generateSessionToken();
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        sessions.set(sessionToken, {
          userId: user.id,
          schoolId: user.schoolId,
          expires
        });
        
        res.cookie('session', sessionToken, { 
          httpOnly: true, 
          secure: ENV.NODE_ENV === 'production',
          expires 
        });
        
        const { password: _, ...userWithoutPassword } = user;
        return res.json({ success: true, user: userWithoutPassword, token: sessionToken });
      }

      // Multi-school flow: get all accounts for this email
      const candidates = await storage.getUsersByEmail(normalizedEmail);
      
      if (candidates.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password against first account (prevents email enumeration)
      const isValid = await auth.comparePassword(password, candidates[0].password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Single school - auto login
      if (candidates.length === 1) {
        const user = candidates[0];
        const sessionToken = auth.generateSessionToken();
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        sessions.set(sessionToken, {
          userId: user.id,
          schoolId: user.schoolId,
          expires
        });
        
        res.cookie('session', sessionToken, { 
          httpOnly: true, 
          secure: ENV.NODE_ENV === 'production',
          expires 
        });
        
        const { password: _, ...userWithoutPassword } = user;
        return res.json({ success: true, user: userWithoutPassword, token: sessionToken });
      }

      // Multiple schools - return school picker data
      const schoolIds = candidates.map(c => c.schoolId);
      const schools = await storage.getSchoolsByIds(schoolIds);
      
      return res.json({ 
        success: false, 
        requiresSchool: true, 
        schools: schools.map(s => ({ id: s.id, name: s.name }))
      });

    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, 'User not found');
      
      const { password: _, ...userWithoutPassword } = validUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Failed to get user' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    const authToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies.session;
    if (authToken) {
      sessions.delete(authToken);
    }
    res.clearCookie('session');
    res.json({ success: true });
  });

  // School endpoints
  app.get('/api/school/:id', requireAuth, async (req, res) => {
    try {
      const school = await storage.getSchool(req.params.id);
      const validSchool = unwrap(school, 'School not found');
      res.json(validSchool);
    } catch (error) {
      console.error('Get school error:', error);
      res.status(500).json({ message: 'Failed to get school' });
    }
  });

  // Grades endpoints
  app.get('/api/grades/:schoolId', requireAuth, async (req, res) => {
    try {
      const grades = await storage.getGradesBySchool(req.params.schoolId);
      res.json(grades);
    } catch (error) {
      console.error('Get grades error:', error);
      res.status(500).json({ message: 'Failed to get grades' });
    }
  });

  app.post('/api/grades', requireAuth, validate({ body: insertGradeSchema }), async (req: any, res) => {
    try {
      const data = req.valid.body;
      const grade = await storage.createGrade(data);
      res.json(grade);
    } catch (error: any) {
      console.error('Create grade error:', error);
      res.status(400).json({ message: error.message || 'Failed to create grade' });
    }
  });

  // Students endpoints
  app.get('/api/students/:schoolId', requireAuth, async (req, res) => {
    try {
      const students = await storage.getStudentsBySchool(req.params.schoolId);
      res.json(students);
    } catch (error) {
      console.error('Get students error:', error);
      res.status(500).json({ message: 'Failed to get students' });
    }
  });

  app.post('/api/students', requireAuth, validate({ body: insertStudentSchema }), async (req: any, res) => {
    try {
      const data = req.valid.body;
      const student = await storage.createStudent(data);
      res.json(student);
    } catch (error: any) {
      console.error('Create student error:', error);
      res.status(400).json({ message: error.message || 'Failed to create student' });
    }
  });

  // Passes endpoints
  app.get('/api/passes/active/:schoolId', requireAuth, async (req, res) => {
    try {
      const passes = await storage.getActivePassesBySchool(req.params.schoolId);
      res.json(passes);
    } catch (error) {
      console.error('Get active passes error:', error);
      res.status(500).json({ message: 'Failed to get active passes' });
    }
  });

  // Alternative endpoint for query parameter (used by kiosk)
  app.get('/api/passes/active', requireAuth, async (req, res) => {
    try {
      const { teacherId } = req.query;
      const { schoolId } = (req as AuthenticatedRequest).user;
      
      if (teacherId) {
        // Filter by teacher
        const allPasses = await storage.getActivePassesBySchool(schoolId);
        const teacherPasses = allPasses.filter(pass => pass.teacherId === teacherId);
        res.json(teacherPasses);
      } else {
        // Return all for the school
        const passes = await storage.getActivePassesBySchool(schoolId);
        res.json(passes);
      }
    } catch (error) {
      console.error('Get active passes error:', error);
      res.status(500).json({ message: 'Failed to get active passes' });
    }
  });

  app.post('/api/passes', requireAuth, validate({ body: insertPassSchema }), async (req: any, res) => {
    try {
      const data = req.valid.body;
      const pass = await storage.createPass(data);
      res.json(pass);
    } catch (error: any) {
      console.error('Create pass error:', error);
      res.status(400).json({ message: error.message || 'Failed to create pass' });
    }
  });

  app.patch('/api/passes/:id/status', requireAuth, async (req, res) => {
    try {
      const { status } = req.body;
      const pass = await storage.updatePass(req.params.id, { status });
      res.json(pass);
    } catch (error) {
      console.error('Update pass error:', error);
      res.status(500).json({ message: 'Failed to update pass' });
    }
  });

  // Dedicated return endpoint for semantic clarity (used by both kiosk and MyClass)
  app.put('/api/passes/:id/return', requireAuth, async (req, res) => {
    try {
      const pass = await storage.updatePass(req.params.id, { status: 'returned' });
      res.json(pass);
    } catch (error) {
      console.error('Return pass error:', error);
      res.status(500).json({ message: 'Failed to return pass' });
    }
  });

  // Payments endpoints
  app.get('/api/payments/:schoolId', requireAuth, async (req, res) => {
    try {
      const payments = await storage.getPaymentsBySchool(req.params.schoolId);
      res.json(payments);
    } catch (error) {
      console.error('Get payments error:', error);
      res.status(500).json({ message: 'Failed to get payments' });
    }
  });

  const server = createServer(app);
  return server;
}