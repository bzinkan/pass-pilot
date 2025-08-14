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
  const authToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies.pp_session;
  
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
        
        res.cookie('pp_session', sessionToken, {
          httpOnly: true,
          secure: ENV.NODE_ENV === 'production',
          sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
          path: '/',
          maxAge: 7 * 24 * 3600 * 1000,
          signed: false
        });
        
        const { password: _, ...userWithoutPassword } = user;
        return res.json({ ok: true, user: userWithoutPassword, redirect: '/app' });
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
        
        res.cookie('pp_session', sessionToken, {
          httpOnly: true,
          secure: ENV.NODE_ENV === 'production',
          sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
          path: '/',
          maxAge: 7 * 24 * 3600 * 1000,
          signed: false
        });
        
        const { password: _, ...userWithoutPassword } = user;
        return res.json({ ok: true, user: userWithoutPassword, redirect: '/app' });
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
    res.set('Cache-Control', 'no-store');
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, 'User not found');
      
      const { password: _, ...userWithoutPassword } = validUser;
      res.json({ ok: true, user: userWithoutPassword });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Failed to get user' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    const authToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies.pp_session;
    if (authToken) {
      sessions.delete(authToken);
    }
    res.clearCookie('pp_session');
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

  app.post('/api/grades', requireAuth, async (req: any, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { schoolId } = authReq.user;
      
      if (!schoolId) {
        return res.status(400).json({ message: 'User must be associated with a school' });
      }
      
      const data = {
        name: req.body.name,
        displayOrder: req.body.displayOrder || 0,
        schoolId: schoolId  // Ensure schoolId from auth user
      };
      
      const grade = await storage.createGrade(data);
      res.json(grade);
    } catch (error: any) {
      console.error('Create grade error:', error);
      res.status(400).json({ message: error.message || 'Failed to create grade' });
    }
  });

  app.put('/api/grades/:id', requireAuth, validate({ body: insertGradeSchema }), async (req: any, res) => {
    try {
      const data = req.valid.body;
      const grade = await storage.updateGrade(req.params.id, data);
      res.json(grade);
    } catch (error: any) {
      console.error('Update grade error:', error);
      res.status(400).json({ message: error.message || 'Failed to update grade' });
    }
  });

  app.delete('/api/grades/:id', requireAuth, async (req, res) => {
    try {
      await storage.deleteGrade(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete grade error:', error);
      res.status(400).json({ message: error.message || 'Failed to delete grade' });
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

  // Students endpoint without schoolId parameter (uses auth user's school)
  app.get('/api/students', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { schoolId } = authReq.user;
      const { grade } = req.query;
      
      const students = await storage.getStudentsBySchool(schoolId, grade as string);
      res.json(students);
    } catch (error) {
      console.error('Get students error:', error);
      res.status(500).json({ message: 'Failed to get students' });
    }
  });

  app.post('/api/students', requireAuth, validate({ body: insertStudentSchema }), async (req: any, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { schoolId } = authReq.user;
      
      const data = {
        ...req.valid.body,
        schoolId: schoolId  // Ensure schoolId from auth user
      };
      
      const student = await storage.createStudent(data);
      res.json(student);
    } catch (error: any) {
      console.error('Create student error:', error);
      res.status(400).json({ message: error.message || 'Failed to create student' });
    }
  });

  app.put('/api/students/:id', requireAuth, validate({ body: insertStudentSchema }), async (req: any, res) => {
    try {
      const data = req.valid.body;
      const student = await storage.updateStudent(req.params.id, data);
      res.json(student);
    } catch (error: any) {
      console.error('Update student error:', error);
      res.status(400).json({ message: error.message || 'Failed to update student' });
    }
  });

  app.delete('/api/students/:id', requireAuth, async (req, res) => {
    try {
      await storage.deleteStudent(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete student error:', error);
      res.status(400).json({ message: error.message || 'Failed to delete student' });
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
        // Return all for the school (already includes student and teacher data)
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
      const authReq = req as AuthenticatedRequest;
      const { schoolId } = authReq.user;
      
      const data = {
        ...req.valid.body,
        schoolId: schoolId,  // Ensure schoolId from auth user
        teacherId: authReq.user.id  // Ensure teacherId from auth user
      };
      
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

  // Admin teacher management endpoints
  app.get('/api/admin/teachers', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, 'User not found');
      
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const teachers = await storage.getUsersBySchool(validUser.schoolId);
      const teachersWithoutPasswords = teachers.map(teacher => {
        const { password: _, ...teacherWithoutPassword } = teacher;
        return teacherWithoutPassword;
      });
      
      res.json(teachersWithoutPasswords);
    } catch (error) {
      console.error('Get teachers error:', error);
      res.status(500).json({ message: 'Failed to get teachers' });
    }
  });

  app.post('/api/admin/teachers', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, 'User not found');
      
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const { email, name } = req.body;
      const normalizedEmail = email.trim().toLowerCase();
      
      // Check if teacher already exists in this school
      const existingTeacher = await storage.getUserByEmailAndSchool(normalizedEmail, validUser.schoolId);
      if (existingTeacher) {
        return res.status(400).json({ message: 'Teacher already exists in this school' });
      }
      
      // Split name into first and last
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Create teacher with pending status (no password yet)
      const teacherData = {
        schoolId: validUser.schoolId,
        email: normalizedEmail,
        firstName,
        lastName,
        isAdmin: false,
        isFirstLogin: true, // Flag for first-time login
        password: '', // Will be set on first login
      };
      
      const newTeacher = await storage.createUser(teacherData);
      const { password: _, ...teacherWithoutPassword } = newTeacher;
      
      res.json({ 
        success: true, 
        teacher: teacherWithoutPassword,
        message: 'Teacher invited successfully. They will set their password on first login.'
      });
      
    } catch (error: any) {
      console.error('Create teacher error:', error);
      res.status(400).json({ message: error.message || 'Failed to create teacher' });
    }
  });

  app.delete('/api/admin/teachers/:teacherId', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, 'User not found');
      
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const teacherId = req.params.teacherId;
      const teacher = await storage.getUser(teacherId);
      
      if (!teacher || teacher.schoolId !== validUser.schoolId) {
        return res.status(404).json({ message: 'Teacher not found' });
      }
      
      if (teacher.isAdmin && teacher.id === validUser.id) {
        return res.status(400).json({ message: 'Cannot remove yourself' });
      }
      
      await storage.deleteUser(teacherId);
      res.json({ success: true, message: 'Teacher removed successfully' });
      
    } catch (error: any) {
      console.error('Delete teacher error:', error);
      res.status(500).json({ message: error.message || 'Failed to remove teacher' });
    }
  });

  app.patch('/api/admin/teachers/:teacherId/promote', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, 'User not found');
      
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const teacherId = req.params.teacherId;
      const teacher = await storage.getUser(teacherId);
      
      if (!teacher || teacher.schoolId !== validUser.schoolId) {
        return res.status(404).json({ message: 'Teacher not found' });
      }
      
      await storage.updateUser(teacherId, { isAdmin: true });
      res.json({ success: true, message: 'Teacher promoted to admin successfully' });
      
    } catch (error: any) {
      console.error('Promote teacher error:', error);
      res.status(500).json({ message: error.message || 'Failed to promote teacher' });
    }
  });

  app.patch('/api/admin/teachers/:teacherId/demote', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, 'User not found');
      
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const teacherId = req.params.teacherId;
      const teacher = await storage.getUser(teacherId);
      
      if (!teacher || teacher.schoolId !== validUser.schoolId) {
        return res.status(404).json({ message: 'Teacher not found' });
      }
      
      if (teacher.id === validUser.id) {
        return res.status(400).json({ message: 'Cannot demote yourself' });
      }
      
      await storage.updateUser(teacherId, { isAdmin: false });
      res.json({ success: true, message: 'Admin demoted to teacher successfully' });
      
    } catch (error: any) {
      console.error('Demote admin error:', error);
      res.status(500).json({ message: error.message || 'Failed to demote admin' });
    }
  });

  // Edit teacher information
  app.patch('/api/admin/teachers/:teacherId', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, 'User not found');
      
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const { teacherId } = req.params;
      const { firstName, lastName, email } = req.body;
      
      // Get teacher to verify they belong to same school
      const teacher = await storage.getUser(teacherId);
      if (!teacher || teacher.schoolId !== validUser.schoolId) {
        return res.status(404).json({ message: 'Teacher not found' });
      }
      
      // Update teacher information
      const updatedTeacher = await storage.updateUser(teacherId, {
        firstName: firstName || teacher.firstName,
        lastName: lastName || teacher.lastName,
        email: email || teacher.email
      });
      
      res.json({ message: 'Teacher updated successfully', teacher: updatedTeacher });
    } catch (error: any) {
      console.error('Teacher update error:', error);
      res.status(400).json({ message: error.message || 'Failed to update teacher' });
    }
  });

  // Reset teacher password
  app.post('/api/admin/teachers/:teacherId/reset-password', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, 'User not found');
      
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const { teacherId } = req.params;
      const { password } = req.body;
      
      if (!password || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      
      // Get teacher to verify they belong to same school
      const teacher = await storage.getUser(teacherId);
      if (!teacher || teacher.schoolId !== validUser.schoolId) {
        return res.status(404).json({ message: 'Teacher not found' });
      }
      
      // Hash new password and update
      const hashedPassword = await auth.hashPassword(password);
      await storage.updateUser(teacherId, {
        password: hashedPassword,
        isFirstLogin: false // Reset first login flag
      });
      
      res.json({ message: 'Password reset successfully' });
    } catch (error: any) {
      console.error('Password reset error:', error);
      res.status(400).json({ message: error.message || 'Failed to reset password' });
    }
  });

  app.get('/api/admin/school-info', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, 'User not found');
      
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const school = await storage.getSchool(validUser.schoolId);
      const validSchool = unwrap(school, 'School not found');
      
      res.json(validSchool);
    } catch (error) {
      console.error('Get school info error:', error);
      res.status(500).json({ message: 'Failed to get school information' });
    }
  });

  // First-time login endpoint for teachers
  app.post('/api/auth/first-login', async (req, res) => {
    try {
      const { email, password, schoolId } = req.body;
      const normalizedEmail = email.trim().toLowerCase();
      
      // Find user by email and school
      const user = await storage.getUserByEmailAndSchool(normalizedEmail, schoolId);
      if (!user) {
        return res.status(400).json({ message: 'Invalid email or school' });
      }
      
      // Check if this is indeed a first-time login
      if (!user.isFirstLogin) {
        return res.status(400).json({ message: 'User has already set their password' });
      }
      
      // Set password for first time
      const hashedPassword = await auth.hashPassword(password);
      await storage.updateUser(user.id, { 
        password: hashedPassword, 
        isFirstLogin: false 
      });
      
      // Create session
      const sessionToken = auth.generateSessionToken();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      sessions.set(sessionToken, {
        userId: user.id,
        schoolId: user.schoolId,
        expires
      });
      
      res.cookie('pp_session', sessionToken, {
        httpOnly: true,
        secure: ENV.NODE_ENV === 'production',
        sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: 7 * 24 * 3600 * 1000,
        signed: false
      });
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        ok: true, 
        user: { ...userWithoutPassword, isFirstLogin: false },
        redirect: '/app'
      });
      
    } catch (error: any) {
      console.error('First login error:', error);
      res.status(500).json({ message: 'Failed to set password' });
    }
  });

  // Reports endpoints needed by ReportsTab
  app.get('/api/passes', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { schoolId } = authReq.user;
      
      // Get all passes for the school with query filtering
      const { dateStart, dateEnd, grade, teacherId, passType } = req.query;
      
      // For now, get all passes - in a real app you'd filter in storage layer
      const allPasses = await storage.getPassesBySchool ? 
        await storage.getPassesBySchool(schoolId) : 
        await storage.getActivePassesBySchool(schoolId);
      
      // Apply filters (basic implementation)
      let filteredPasses = allPasses;
      
      if (dateStart) {
        const startDate = new Date(dateStart as string);
        filteredPasses = filteredPasses.filter(pass => 
          new Date(pass.checkoutTime) >= startDate
        );
      }
      
      if (dateEnd) {
        const endDate = new Date(dateEnd as string);
        filteredPasses = filteredPasses.filter(pass => 
          new Date(pass.checkoutTime) <= endDate
        );
      }
      
      if (teacherId && teacherId !== 'all') {
        filteredPasses = filteredPasses.filter(pass => pass.teacherId === teacherId);
      }
      
      if (passType && passType !== 'all') {
        filteredPasses = filteredPasses.filter(pass => 
          (pass.passType || 'general') === passType
        );
      }
      
      res.json(filteredPasses);
    } catch (error) {
      console.error('Get passes error:', error);
      res.status(500).json({ message: 'Failed to get passes' });
    }
  });

  app.get('/api/grades', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { schoolId } = authReq.user;
      const grades = await storage.getGradesBySchool(schoolId);
      res.json(grades);
    } catch (error) {
      console.error('Get grades error:', error);
      res.status(500).json({ message: 'Failed to get grades' });
    }
  });

  app.get('/api/teachers', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { schoolId } = authReq.user;
      const teachers = await storage.getUsersBySchool(schoolId);
      const teachersWithoutPasswords = teachers.map(teacher => {
        const { password: _, ...teacherData } = teacher;
        return {
          ...teacherData,
          name: `${teacher.firstName} ${teacher.lastName}`.trim()
        };
      });
      res.json(teachersWithoutPasswords);
    } catch (error) {
      console.error('Get teachers error:', error);
      res.status(500).json({ message: 'Failed to get teachers' });
    }
  });

  // Teacher self-service profile update
  app.patch('/api/profile', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, 'User not found');
      
      const { firstName, lastName, currentPassword, newPassword } = req.body;
      const updates: any = {};
      
      // Update name if provided
      if (firstName && lastName) {
        updates.firstName = firstName.trim();
        updates.lastName = lastName.trim();
      }
      
      // Update password if provided
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ message: 'Current password is required to change password' });
        }
        
        if (newPassword.length < 6) {
          return res.status(400).json({ message: 'New password must be at least 6 characters long' });
        }
        
        // Verify current password
        const isCurrentPasswordValid = await auth.verifyPassword(currentPassword, validUser.password);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({ message: 'Current password is incorrect' });
        }
        
        updates.password = await auth.hashPassword(newPassword);
      }
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No valid updates provided' });
      }
      
      await storage.updateUser(validUser.id, updates);
      
      // Return updated user without password
      const updatedUser = await storage.getUser(validUser.id);
      const { password: _, ...userWithoutPassword } = updatedUser!;
      
      res.json({ 
        success: true, 
        user: userWithoutPassword,
        message: 'Profile updated successfully' 
      });
      
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: error.message || 'Failed to update profile' });
    }
  });

  const server = createServer(app);
  return server;
}