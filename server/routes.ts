import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertSchoolSchema, insertGradeSchema, insertStudentSchema, insertPassSchema, registerSchoolSchema } from "@shared/schema";
import { z } from "zod";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { ENV } from "./env";
import { validate } from "./validate";
import { invariant, unwrap, assertValidUuid, assertNonEmpty } from "./safe";
import { ok, err, sendOk, sendErr, catchAsync, ErrorResponses } from "./api-response";

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

// Use shared session store for consistency across all routes
import { sessions } from './shared-sessions';

// Auth middleware
interface AuthenticatedRequest extends Request {
  user: { id: string; schoolId: string };
}

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies.pp_session;
  
  if (!authToken) {
    console.log('❌ No auth token found in request');
    res.status(401).json(ErrorResponses.unauthorized());
    return;
  }
  
  const session = sessions.get(authToken);
  if (!session) {
    console.log(`❌ No session found for token: ${authToken.substring(0, 8)}..., active sessions: ${sessions.size}`);
    res.status(401).json(ErrorResponses.unauthorized('Session not found'));
    return;
  }
  
  if (session.expires < new Date()) {
    console.log(`❌ Session expired for token: ${authToken.substring(0, 8)}..., expired: ${session.expires.toISOString()}, now: ${new Date().toISOString()}`);
    sessions.delete(authToken);
    res.status(401).json(ErrorResponses.unauthorized('Session expired'));
    return;
  }
  
  // Extend session if it expires within 24 hours (refresh on activity)
  const timeUntilExpiry = session.expires.getTime() - Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  if (timeUntilExpiry < oneDayMs) {
    const oldExpiry = session.expires;
    session.expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    sessions.set(authToken, session);
    console.log(`🔄 Session renewed for token: ${authToken.substring(0, 8)}..., old expiry: ${oldExpiry.toISOString()}, new expiry: ${session.expires.toISOString()}`);
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

  app.post("/api/register-simple", validate({ body: RegisterBody }), catchAsync(async (req, res) => {
    const { schoolName, adminEmail, plan } = (req as any).valid.body;
    console.log('Validated data:', { schoolName, adminEmail, plan });
    return sendOk(res, { received: { schoolName, adminEmail, plan } });
  }));

  // Auth endpoints
  app.post('/api/auth/register', validate({ body: registerSchoolSchema }), async (req: any, res) => {
    try {
      const { schoolName, adminEmail, adminFirstName, adminLastName, adminPassword, plan } = req.valid.body;
      
      // Generate unique slug to prevent conflicts
      const { generateUniqueSlug } = await import('./utils/slugify');
      const uniqueSlug = await generateUniqueSlug(schoolName);
      
      // Create school first
      const schoolData = {
        name: schoolName,
        slug: uniqueSlug,
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
        role: 'ADMIN',
        isAdmin: true,
        status: 'active',
      };
      
      const user = await storage.createUser(userData);
      
      res.json({ ok: true, school: { id: school.id, name: school.name }, user: { id: user.id, email: user.email } });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({ message: error.message || 'Registration failed' });
    }
  });

  const loginBodySchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
    schoolId: z.string().uuid().optional(),
  });

  app.post('/api/auth/login', validate({ body: loginBodySchema }), async (req: any, res) => {
    try {
      const { email, password, schoolId } = req.valid.body;
      
      // Normalize email
      const normalizedEmail = email.trim().toLowerCase();
      
      // If schoolId provided, single-step login
      if (schoolId) {
        const user = await storage.getUserByEmailAndSchool(normalizedEmail, schoolId);
        invariant(user, 'Invalid credentials');
        
        // Check if this is a first-time login (teacher hasn't set password yet)
        if (user.isFirstLogin) {
          return res.json({ 
            ok: false, 
            isFirstLogin: true,
            email: normalizedEmail,
            schoolId: schoolId,
            message: 'First time login - please set your password'
          });
        }
        
        const isValid = await auth.comparePassword(password, user.password);
        invariant(isValid, 'Invalid credentials');
        
        // Check if this user should be promoted to admin (first login to school)
        await storage.checkAndPromoteFirstAdmin(user.schoolId, user.id);
        
        // Get updated user data in case they were promoted
        const updatedUser = await storage.getUser(user.id);
        const finalUser = updatedUser || user;
        
        // Create session
        const sessionToken = auth.generateSessionToken();
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days to match cookie
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
        
        const { password: _, ...userWithoutPassword } = finalUser;
        return res.json({ ok: true, user: userWithoutPassword, redirect: '/app' });
      }

      // Multi-school flow: get all accounts for this email
      const candidates = await storage.getUsersByEmail(normalizedEmail);
      
      if (candidates.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if any candidate is a first-time login
      const firstLoginUser = candidates.find(user => user.isFirstLogin);
      if (firstLoginUser) {
        // If single school with first login, return first-login response
        if (candidates.length === 1) {
          return res.json({ 
            ok: false, 
            isFirstLogin: true,
            email: normalizedEmail,
            schoolId: firstLoginUser.schoolId,
            message: 'First time login - please set your password'
          });
        } else {
          // Multiple schools with at least one first-time login - need school selection first
          const schools = candidates.map(user => ({
            id: user.schoolId,
            name: user.schoolId, // This should ideally be school name
            isFirstLogin: user.isFirstLogin
          }));
          return res.json({
            ok: false,
            requiresSchool: true,
            schools: schools,
            hasFirstLogin: true,
            email: normalizedEmail
          });
        }
      }

      // Verify password against first account (prevents email enumeration)
      const isValid = candidates.length > 0 && candidates[0] && await auth.comparePassword(password, candidates[0].password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Single school - auto login
      if (candidates.length === 1) {
        const user = candidates[0];
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check if this user should be promoted to admin (first login to school)
        await storage.checkAndPromoteFirstAdmin(user.schoolId, user.id);
        
        // Get updated user data in case they were promoted
        const updatedUser = await storage.getUser(user.id);
        const finalUser = updatedUser || user;
        
        const sessionToken = auth.generateSessionToken();
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days to match cookie
        sessions.set(sessionToken, {
          userId: finalUser.id,
          schoolId: finalUser.schoolId,
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
        
        const { password: _, ...userWithoutPassword } = finalUser;
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
      return sendOk(res, { user: userWithoutPassword });
    } catch (error) {
      console.error('Get user error:', error);
      return sendErr(res, 'Failed to get user', 500, 'USER_FETCH_ERROR');
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
      const schoolId = assertValidUuid(req.params.id, "Invalid school ID format");
      const school = await storage.getSchool(schoolId);
      const validSchool = unwrap(school, 'School not found or access denied');
      res.json(validSchool);
    } catch (error) {
      console.error('Get school error:', error);
      res.status(500).json({ message: 'Failed to get school' });
    }
  });

  // Grades endpoints
  app.get('/api/grades/:schoolId', requireAuth, async (req, res) => {
    try {
      const schoolId = req.params.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: 'School ID is required' });
      }
      const grades = await storage.getGradesBySchool(schoolId);
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
      const gradeId = req.params.id;
      if (!gradeId) {
        return res.status(400).json({ message: 'Grade ID is required' });
      }
      const data = req.valid.body;
      const grade = await storage.updateGrade(gradeId, data);
      res.json(grade);
    } catch (error: any) {
      console.error('Update grade error:', error);
      res.status(400).json({ message: error.message || 'Failed to update grade' });
    }
  });

  app.delete('/api/grades/:id', requireAuth, async (req, res) => {
    try {
      const gradeId = req.params.id;
      if (!gradeId) {
        return res.status(400).json({ message: 'Grade ID is required' });
      }
      await storage.deleteGrade(gradeId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete grade error:', error);
      res.status(400).json({ message: error.message || 'Failed to delete grade' });
    }
  });

  // Students endpoints
  app.get('/api/students/:schoolId', requireAuth, async (req, res) => {
    try {
      const schoolId = req.params.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: 'School ID is required' });
      }
      const students = await storage.getStudentsBySchool(schoolId);
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

  app.post('/api/students', requireAuth, async (req: any, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { schoolId } = authReq.user;
      
      // Flexible data handling - accept both old and new formats
      const requestData = req.body;
      
      // Ensure we have required fields
      if (!requestData.firstName && !requestData.name) {
        return res.status(400).json({ 
          message: 'Student name is required (firstName or name field)' 
        });
      }
      
      if (!requestData.gradeId && !requestData.grade) {
        return res.status(400).json({ 
          message: 'Grade is required (gradeId or grade field)' 
        });
      }
      
      // Handle legacy format (name field) by converting to firstName/lastName
      let firstName = requestData.firstName;
      let lastName = requestData.lastName || '';
      
      if (!firstName && requestData.name) {
        const nameParts = requestData.name.trim().split(' ');
        firstName = nameParts[0] || 'Student';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      // Handle legacy grade format by converting grade name to gradeId
      let gradeId = requestData.gradeId;
      if (!gradeId && requestData.grade) {
        // Find grade by name
        const grades = await storage.getGradesBySchool(schoolId);
        const grade = grades.find(g => g.name === requestData.grade);
        if (!grade) {
          return res.status(400).json({ 
            message: `Grade "${requestData.grade}" not found` 
          });
        }
        gradeId = grade.id;
      }
      
      const data = {
        schoolId,
        firstName,
        lastName,
        gradeId,
        studentId: requestData.studentId || null,
        email: requestData.email || null,
        status: requestData.status || 'active'
      };
      
      const student = await storage.createStudent(data);
      res.json(student);
    } catch (error: any) {
      console.error('Create student error:', error);
      res.status(400).json({ message: error.message || 'Failed to create student' });
    }
  });

  app.put('/api/students/:id', requireAuth, async (req: any, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { schoolId } = authReq.user;
      const studentId = req.params.id;
      
      if (!studentId) {
        return res.status(400).json({ message: 'Student ID is required' });
      }
      
      const requestData = req.body;
      
      // Handle legacy format (name field) by converting to firstName/lastName
      let firstName = requestData.firstName;
      let lastName = requestData.lastName || '';
      
      if (!firstName && requestData.name) {
        const nameParts = requestData.name.trim().split(' ');
        firstName = nameParts[0] || 'Student';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      // Handle legacy grade format by converting grade name to gradeId
      let gradeId = requestData.gradeId;
      if (!gradeId && requestData.grade) {
        // Find grade by name
        const grades = await storage.getGradesBySchool(schoolId);
        const grade = grades.find(g => g.name === requestData.grade);
        if (!grade) {
          return res.status(400).json({ 
            message: `Grade "${requestData.grade}" not found` 
          });
        }
        gradeId = grade.id;
      }
      
      const data = {
        firstName,
        lastName,
        gradeId,
        studentId: requestData.studentId || null,
        email: requestData.email || null,
        status: requestData.status || 'active'
      };
      
      const student = await storage.updateStudent(studentId, data);
      res.json(student);
    } catch (error: any) {
      console.error('Update student error:', error);
      res.status(400).json({ message: error.message || 'Failed to update student' });
    }
  });

  app.delete('/api/students/:id', requireAuth, async (req, res) => {
    try {
      const studentId = req.params.id;
      if (!studentId) {
        return res.status(400).json({ message: 'Student ID is required' });
      }
      await storage.deleteStudent(studentId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete student error:', error);
      res.status(400).json({ message: error.message || 'Failed to delete student' });
    }
  });

  // Passes endpoints
  app.get('/api/passes/active/:schoolId', requireAuth, async (req, res) => {
    try {
      const schoolId = req.params.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: 'School ID is required' });
      }
      const passes = await storage.getActivePassesBySchool(schoolId);
      res.json(passes);
    } catch (error) {
      console.error('Get active passes error:', error);
      res.status(500).json({ message: 'Failed to get active passes' });
    }
  });

  // Alternative endpoint for query parameter (used by kiosk)
  app.get('/api/passes/active', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { teacherId } = req.query;
      
      // Get the user to access schoolId
      const user = await storage.getUser(authReq.user.id);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      const schoolId = user.schoolId;
      
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
      
      // Get the user to access schoolId
      const user = await storage.getUser(authReq.user.id);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      const schoolId = user.schoolId;
      
      // Convert passType to destination if not provided
      let destination = req.valid.body.destination;
      if (!destination) {
        const passType = req.valid.body.passType || 'general';
        switch (passType) {
          case 'nurse':
            destination = 'Nurse\'s Office';
            break;
          case 'discipline':
            destination = 'Principal\'s Office';
            break;
          case 'restroom':
            destination = 'Restroom';
            break;
          case 'library':
            destination = 'Library';
            break;
          case 'office':
            destination = 'Main Office';
            break;
          case 'custom':
            destination = req.valid.body.customReason || 'Custom Reason';
            break;
          case 'general':
          default:
            destination = 'General Hall Pass';
        }
      }
      
      const data = {
        ...req.valid.body,
        schoolId: schoolId,  // Ensure schoolId from auth user
        teacherId: authReq.user.id,  // Ensure teacherId from auth user
        destination: destination,  // Ensure destination is provided
        duration: req.valid.body.duration || 0,  // Use 0 to indicate unlimited time tracking
        passNumber: Math.floor(Math.random() * 9000) + 1000,  // Generate 4-digit pass number
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),  // Set to 24 hours from now as default
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
      const passId = req.params.id;
      if (!passId) {
        return res.status(400).json({ message: 'Pass ID is required' });
      }
      const { status } = req.body;
      const pass = await storage.updatePass(passId, { status });
      res.json(pass);
    } catch (error) {
      console.error('Update pass error:', error);
      res.status(500).json({ message: 'Failed to update pass' });
    }
  });

  // Dedicated return endpoint for semantic clarity (used by both kiosk and MyClass)
  app.put('/api/passes/:id/return', requireAuth, async (req, res) => {
    try {
      const passId = req.params.id;
      if (!passId) {
        return res.status(400).json({ message: 'Pass ID is required' });
      }
      // Set both status and returnedAt timestamp when returning a pass
      const pass = await storage.updatePass(passId, { 
        status: 'returned',
        returnedAt: new Date()
      });
      res.json(pass);
    } catch (error) {
      console.error('Return pass error:', error);
      res.status(500).json({ message: 'Failed to return pass' });
    }
  });

  // Delete pass endpoint (for correcting mistakes)
  app.delete('/api/passes/:id', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const passId = req.params.id;
      
      if (!passId) {
        return res.status(400).json({ message: 'Pass ID is required' });
      }

      // Verify the pass exists and belongs to the user's school
      const pass = await storage.getPassById(passId);
      if (!pass) {
        return res.status(404).json({ message: 'Pass not found' });
      }

      // Verify school ownership for security
      if (pass.schoolId !== authReq.user.schoolId) {
        return res.status(403).json({ message: 'Unauthorized to delete this pass' });
      }

      // Delete the pass
      await storage.deletePass(passId);
      
      res.json({ 
        message: 'Pass deleted successfully',
        passId: passId 
      });
    } catch (error) {
      console.error('Delete pass error:', error);
      res.status(500).json({ message: 'Failed to delete pass' });
    }
  });

  // Payments endpoints
  app.get('/api/payments/:schoolId', requireAuth, async (req, res) => {
    try {
      const schoolId = req.params.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: 'School ID is required' });
      }
      const payments = await storage.getPaymentsBySchool(schoolId);
      res.json(payments);
    } catch (error) {
      console.error('Get payments error:', error);
      res.status(500).json({ message: 'Failed to get payments' });
    }
  });

  // Teacher management endpoints (temporarily available to all teachers)
  app.get('/api/admin/teachers', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, 'User not found');
      
      // Temporarily allow all teachers to view teachers list
      // if (!validUser.isAdmin) {
      //   return res.status(403).json({ message: 'Admin access required' });
      // }
      
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
      
      // Temporarily allow all teachers to add teachers
      // if (!validUser.isAdmin) {
      //   return res.status(403).json({ message: 'Admin access required' });
      // }
      
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

  // Reset teacher password (force them to set new password on next login)
  app.post('/api/admin/teachers/:teacherId/reset-password', requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.id);
      const validUser = unwrap(user, 'User not found');
      
      if (!validUser.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const { teacherId } = req.params;
      
      // Get teacher to verify they belong to same school
      const teacher = await storage.getUser(teacherId);
      if (!teacher || teacher.schoolId !== validUser.schoolId) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      // Reset password by clearing it and setting first login flag
      await storage.updateUser(teacherId, {
        password: '',
        isFirstLogin: true
      });

      res.json({ success: true, message: 'Password reset successfully. Teacher will set new password on next login.' });
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
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days to match cookie
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
      
      // Build filters object for storage layer
      const filters: any = {};
      if (dateStart) {
        filters.dateStart = new Date(dateStart as string);
      }
      if (dateEnd) {
        filters.dateEnd = new Date(dateEnd as string);
      }
      if (grade && grade !== 'all') {
        filters.grade = grade as string;
      }
      if (teacherId && teacherId !== 'all') {
        filters.teacherId = teacherId as string;
      }
      
      // Get passes with filters applied at storage layer
      const allPasses = await storage.getPassesBySchool(schoolId, filters);
      
      // Apply additional filters that aren't handled at storage layer
      let filteredPasses = allPasses;
      
      if (passType && passType !== 'all') {
        filteredPasses = filteredPasses.filter(pass => 
          (pass.destination || 'general') === passType
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
        const isCurrentPasswordValid = await auth.comparePassword(currentPassword, validUser.password);
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

  // Admin promotion endpoint - temporarily for fixing existing accounts
  app.post('/api/debug/promote-to-admin/:email', async (req, res) => {
    try {
      const { email } = req.params;
      const users = await storage.getUsersByEmail(email);
      
      if (users.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update all users with this email to admin (in case of multiple schools)
      const updatedUsers = [];
      for (const user of users) {
        const updatedUser = await storage.updateUser(user.id, {
          role: 'ADMIN',
          isAdmin: true
        });
        updatedUsers.push(updatedUser);
      }

      res.json({ 
        message: `Updated ${updatedUsers.length} user(s) to admin`, 
        users: updatedUsers.map(u => ({ id: u.id, email: u.email, role: u.role, isAdmin: u.isAdmin }))
      });
    } catch (error) {
      console.error('Promote user error:', error);
      res.status(500).json({ message: 'Failed to promote user' });
    }
  });

  const server = createServer(app);
  return server;
}