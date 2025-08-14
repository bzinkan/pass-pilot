import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPassSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        studentId: user.studentId,
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Student endpoints
  app.get("/api/students", async (req, res) => {
    try {
      const students = await storage.getAllStudents();
      res.json(students.map(s => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        studentId: s.studentId,
        fullName: `${s.firstName} ${s.lastName}`,
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // Pass endpoints
  app.post("/api/passes", async (req, res) => {
    try {
      const validatedData = insertPassSchema.parse(req.body);
      const pass = await storage.createPass(validatedData);
      res.json(pass);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid pass data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create pass" });
    }
  });

  app.get("/api/passes/active", async (req, res) => {
    try {
      const passes = await storage.getActivePasses();
      res.json(passes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active passes" });
    }
  });

  app.get("/api/passes/history", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const history = await storage.getPassHistory(limit);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pass history" });
    }
  });

  app.get("/api/passes/student/:studentId", async (req, res) => {
    try {
      const { studentId } = req.params;
      const activePass = await storage.getActivePassForStudent(studentId);
      res.json(activePass);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch student pass" });
    }
  });

  app.get("/api/passes/student/:studentId/history", async (req, res) => {
    try {
      const { studentId } = req.params;
      const history = await storage.getStudentPassHistory(studentId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch student pass history" });
    }
  });

  app.patch("/api/passes/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const returnedAt = status === "returned" ? new Date() : undefined;
      const updatedPass = await storage.updatePassStatus(id, status, returnedAt);
      
      if (!updatedPass) {
        return res.status(404).json({ message: "Pass not found" });
      }
      
      res.json(updatedPass);
    } catch (error) {
      res.status(500).json({ message: "Failed to update pass status" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getPassStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
