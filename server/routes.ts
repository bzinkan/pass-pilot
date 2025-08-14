import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertSchoolSchema, insertGradeSchema, insertStudentSchema, insertPassSchema, registerSchoolSchema } from "@shared/schema";
import { z } from "zod";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

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
const requireAuth = (req: any, res: any, next: any) => {
  const authToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies.session;
  
  if (!authToken) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const session = sessions.get(authToken);
  if (!session || session.expires < new Date()) {
    sessions.delete(authToken);
    return res.status(401).json({ message: 'Session expired' });
  }
  
  req.user = { id: session.userId, schoolId: session.schoolId };
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

  // Auth endpoints
  app.post('/api/auth/register', async (req, res) => {
    try {
      const data = registerSchoolSchema.parse(req.body);
      
      // Create school first
      const schoolData = {
        name: data.schoolName,
        slug: data.schoolName.toLowerCase().replace(/\s+/g, '-'),
        status: 'active',
        plan: 'free_trial',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      };
      
      const school = await storage.createSchool(schoolData);
      
      // Create admin user
      const hashedPassword = await auth.hashPassword(data.adminPassword);
      const userData = {
        schoolId: school.id,
        email: data.adminEmail,
        password: hashedPassword,
        firstName: data.adminFirstName,
        lastName: data.adminLastName,
        isAdmin: true,
      };
      
      const user = await storage.createUser(userData);
      
      res.json({ success: true, message: 'School and admin account created successfully' });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({ message: error.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password, schoolId } = req.body;
      
      let user;
      if (schoolId) {
        user = await storage.getUserByEmailAndSchool(email, schoolId);
      } else {
        user = await storage.getUserByEmail(email);
      }
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const isValid = await auth.comparePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
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
        secure: process.env.NODE_ENV === 'production',
        expires 
      });
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token: sessionToken });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const { password: _, ...userWithoutPassword } = user;
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
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
      res.json(school);
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

  app.post('/api/grades', requireAuth, async (req, res) => {
    try {
      const data = insertGradeSchema.parse(req.body);
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

  app.post('/api/students', requireAuth, async (req, res) => {
    try {
      const data = insertStudentSchema.parse(req.body);
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

  app.post('/api/passes', requireAuth, async (req, res) => {
    try {
      const data = insertPassSchema.parse(req.body);
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