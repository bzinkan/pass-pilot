import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertHallPassSchema, insertStudentSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Students routes
  app.get("/api/students", async (req, res) => {
    try {
      const students = await storage.getAllStudents();
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get("/api/students/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      const students = await storage.searchStudents(query);
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to search students" });
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      const validatedData = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(validatedData);
      res.status(201).json(student);
    } catch (error) {
      res.status(400).json({ message: "Invalid student data" });
    }
  });

  // Hall passes routes
  app.get("/api/hall-passes", async (req, res) => {
    try {
      const passes = await storage.getAllHallPasses();
      res.json(passes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch hall passes" });
    }
  });

  app.get("/api/hall-passes/active", async (req, res) => {
    try {
      const activePasses = await storage.getActiveHallPasses();
      res.json(activePasses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active passes" });
    }
  });

  app.get("/api/hall-passes/date/:date", async (req, res) => {
    try {
      const date = req.params.date;
      const passes = await storage.getHallPassesByDate(date);
      res.json(passes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch passes for date" });
    }
  });

  app.get("/api/hall-passes/:id", async (req, res) => {
    try {
      const pass = await storage.getHallPassWithStudent(req.params.id);
      if (!pass) {
        return res.status(404).json({ message: "Hall pass not found" });
      }
      res.json(pass);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch hall pass" });
    }
  });

  app.post("/api/hall-passes", async (req, res) => {
    try {
      const validatedData = insertHallPassSchema.parse(req.body);
      const hallPass = await storage.createHallPass(validatedData);
      res.status(201).json(hallPass);
    } catch (error) {
      res.status(400).json({ message: "Invalid hall pass data" });
    }
  });

  app.post("/api/hall-passes/:id/check-in", async (req, res) => {
    try {
      const pass = await storage.checkInStudent(req.params.id);
      if (!pass) {
        return res.status(404).json({ message: "Hall pass not found" });
      }
      res.json(pass);
    } catch (error) {
      res.status(500).json({ message: "Failed to check in student" });
    }
  });

  // Stats routes
  app.get("/api/stats", async (req, res) => {
    try {
      const activePasses = await storage.getActiveHallPasses();
      const today = new Date().toISOString().split('T')[0];
      const todayPasses = await storage.getHallPassesByDate(today);
      
      const overduePasses = activePasses.filter(pass => pass.status === "overdue");
      
      // Calculate average duration for completed passes
      const allPasses = await storage.getAllHallPasses();
      const completedPasses = allPasses.filter(pass => pass.timeIn);
      const totalDuration = completedPasses.reduce((sum, pass) => {
        if (pass.timeIn && pass.timeOut) {
          const duration = Math.floor((new Date(pass.timeIn).getTime() - new Date(pass.timeOut).getTime()) / (1000 * 60));
          return sum + duration;
        }
        return sum;
      }, 0);
      const averageDuration = completedPasses.length > 0 ? Math.round(totalDuration / completedPasses.length) : 0;

      const stats = {
        activePasses: activePasses.filter(pass => pass.status === "active").length,
        todayPasses: todayPasses.length,
        overduePasses: overduePasses.length,
        averageDuration: `${averageDuration}m`,
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
