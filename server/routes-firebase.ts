import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertSchoolSchema, insertGradeSchema, insertStudentSchema, insertPassSchema } from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";
// Firebase server-side routes for PassPilot

// Helper function to get max teachers for a plan
function getMaxTeachersForPlan(plan: string): number {
  switch (plan) {
    case 'free': return 10;
    case 'basic_10': return 10;
    case 'standard_25': return 25;
    case 'premium_50': return 50;
    case 'enterprise_unlimited': return 999999;
    default: return 10;
  }
}

// Firebase Auth middleware for server-side routes
const requireFirebaseAuth = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // For Firebase, token is the user ID after client-side auth
    req.userId = token;
    
    // Get user from Firebase storage
    const user = await storage.getUser(token);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'User not found or inactive' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

export async function registerFirebaseRoutes(app: Express): Promise<Server> {
  // School registration (for admin setup)
  app.post("/api/auth/register-school", async (req, res) => {
    try {
      const { schoolName, adminName, adminEmail, password } = req.body;
      
      // Generate unique school ID
      const schoolId = `school_${nanoid(10)}`;
      
      // This route is handled by frontend Firebase Auth
      // Server just validates the data structure
      const schoolData = {
        schoolId: `school_${Date.now()}`,
        name: schoolName,
        plan: "free",
        maxTeachers: 10,
        adminEmail,
      };

      const userData = {
        name: adminName,
        email: adminEmail,
        schoolId,
        isAdmin: true,
        assignedGrades: [],
        status: 'pending', // Will be activated by Firebase Auth
        firebaseUid: null,
        password: null,
        invitedBy: null,
      };

      // Create school first
      const school = await storage.createSchool(schoolData);
      
      res.json({ 
        message: 'School registered. Please complete setup in Firebase.',
        schoolId,
        schoolName 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get current user profile
  app.get("/api/users/me", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      const school = await storage.getSchool(user.schoolId);
      
      res.json({
        ...user,
        schoolName: school?.name || 'Unknown School'
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update user profile
  app.put("/api/users/me", requireFirebaseAuth, async (req, res) => {
    try {
      const { name } = req.body;
      const updatedUser = await storage.updateUser(req.userId, { name });
      
      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add teacher (admin only)
  app.post("/api/users/teachers", requireFirebaseAuth, async (req, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { email, name, assignedGrades } = req.body;
      
      // Check teacher limits
      const school = await storage.getSchool(req.user.schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      const existingTeachers = await storage.getUsersBySchool(req.user.schoolId);
      const currentTeacherCount = existingTeachers.filter(u => !u.isAdmin).length;
      
      if (currentTeacherCount >= school.maxTeachers) {
        return res.status(400).json({ 
          message: `Teacher limit reached. Your ${school.plan} plan allows ${school.maxTeachers} teachers.` 
        });
      }

      // Check if teacher already exists in THIS school (case-insensitive)
      const emailNorm = email.trim().toLowerCase();
      const existingUser = await storage.getUserByEmailAndSchool(emailNorm, req.user.schoolId);
      if (existingUser) {
        return res.status(409).json({ error: 'That teacher already exists for this school.' });
      }

      // Create pending teacher invitation with normalized email
      const teacherData = {
        email: emailNorm,
        name,
        schoolId: req.user.schoolId,
        isAdmin: false,
        assignedGrades: assignedGrades || [],
        invitedBy: req.userId,
        status: 'pending',
        firebaseUid: null,
        password: null,
      };

      const teacher = await storage.createUser(teacherData);
      
      res.json({ 
        message: 'Teacher invitation created. They can now register with this email.',
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          status: teacher.status,
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get teachers (admin only)
  app.get("/api/users/teachers", requireFirebaseAuth, async (req, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const teachers = await storage.getUsersBySchool(req.user.schoolId);
      const teacherList = teachers
        .filter(user => !user.isAdmin)
        .map(teacher => ({
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          assignedGrades: teacher.assignedGrades,
          status: teacher.status,
          createdAt: teacher.createdAt,
        }));

      res.json(teacherList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get grades for school
  app.get("/api/grades", requireFirebaseAuth, async (req, res) => {
    try {
      const grades = await storage.getGradesBySchool(req.user.schoolId);
      res.json(grades);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create grade
  app.post("/api/grades", requireFirebaseAuth, async (req, res) => {
    try {
      const gradeData = {
        ...req.body,
        schoolId: req.user.schoolId,
      };
      
      const result = insertGradeSchema.safeParse(gradeData);
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid grade data', errors: result.error.errors });
      }

      const grade = await storage.createGrade(result.data);
      res.json(grade);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get students for school/grade
  app.get("/api/students", requireFirebaseAuth, async (req, res) => {
    try {
      const { grade } = req.query;
      let students;

      if (req.user.isAdmin) {
        // Admins can see all students
        students = await storage.getStudentsBySchool(req.user.schoolId, grade as string);
      } else {
        // Teachers can only see students in their assigned grades
        if (grade && req.user.assignedGrades.includes(grade as string)) {
          students = await storage.getStudentsBySchool(req.user.schoolId, grade as string);
        } else if (!grade) {
          // Get students from all assigned grades
          const allStudents = await storage.getStudentsBySchool(req.user.schoolId);
          students = allStudents.filter(student => 
            req.user.assignedGrades.includes(student.grade)
          );
        } else {
          students = []; // No access to this grade
        }
      }

      res.json(students);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create student
  app.post("/api/students", requireFirebaseAuth, async (req, res) => {
    try {
      const studentData = {
        ...req.body,
        schoolId: req.user.schoolId,
      };
      
      const result = insertStudentSchema.safeParse(studentData);
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid student data', errors: result.error.errors });
      }

      // Check if teacher has access to this grade
      if (!req.user.isAdmin && !req.user.assignedGrades.includes(result.data.grade)) {
        return res.status(403).json({ message: 'No access to this grade' });
      }

      const student = await storage.createStudent(result.data);
      res.json(student);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get active passes
  app.get("/api/passes/active", requireFirebaseAuth, async (req, res) => {
    try {
      const activePasses = await storage.getActivePassesBySchool(req.user.schoolId);
      
      // Filter by assigned grades for teachers
      let filteredPasses = activePasses;
      if (!req.user.isAdmin) {
        filteredPasses = activePasses.filter(pass => 
          req.user.assignedGrades.includes(pass.student.grade)
        );
      }

      res.json(filteredPasses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get passes with filters (for Reports)
  app.get("/api/passes", requireFirebaseAuth, async (req, res) => {
    try {
      const { dateStart, dateEnd, grade, timeframe } = req.query;
      
      // Handle timeframe shortcuts
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (timeframe === 'today') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
      } else if (timeframe === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date();
      } else if (timeframe === 'month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        endDate = new Date();
      } else {
        if (dateStart) startDate = new Date(dateStart as string);
        if (dateEnd) endDate = new Date(dateEnd as string);
      }

      const filters: any = {};
      if (startDate) filters.dateStart = startDate;
      if (endDate) filters.dateEnd = endDate;
      if (grade) filters.grade = grade as string;
      if (!req.user.isAdmin) filters.teacherId = req.userId;

      const passes = await storage.getPassesBySchool(req.user.schoolId, filters);
      
      // Additional filtering for teachers by assigned grades
      let filteredPasses = passes;
      if (!req.user.isAdmin) {
        filteredPasses = passes.filter(pass => 
          req.user.assignedGrades.includes(pass.student.grade)
        );
      }

      res.json(filteredPasses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create pass
  app.post("/api/passes", requireFirebaseAuth, async (req, res) => {
    try {
      const passData = {
        ...req.body,
        teacherId: req.userId,
        schoolId: req.user.schoolId,
      };
      
      const result = insertPassSchema.safeParse(passData);
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid pass data', errors: result.error.errors });
      }

      // Verify student exists and teacher has access
      const student = await storage.getStudent(result.data.studentId);
      if (!student || student.schoolId !== req.user.schoolId) {
        return res.status(404).json({ message: 'Student not found' });
      }

      if (!req.user.isAdmin && !req.user.assignedGrades.includes(student.grade)) {
        return res.status(403).json({ message: 'No access to this student' });
      }

      const pass = await storage.createPass(result.data);
      res.json(pass);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update pass (return student)
  app.put("/api/passes/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const pass = await storage.updatePass(id, updates);
      res.json(pass);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Middleware to check platform owner access
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

  // Super Admin Routes (Platform Owner Only)
  app.get("/api/super-admin/schools", requirePlatformOwner, async (req, res) => {
    try {
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
      
      res.json(schoolsWithStats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/super-admin/stats", requirePlatformOwner, async (req, res) => {
    try {
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
      
      res.json({
        totalSchools: allSchools.length,
        totalTeachers,
        estimatedMRR,
        activeTrials: allSchools.filter(s => s.plan === 'free_trial' && !s.isTrialExpired).length,
        paidSchools: allSchools.filter(s => s.plan !== 'free_trial').length
      });
    } catch (error: any) {
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

  const httpServer = createServer(app);
  return httpServer;
}