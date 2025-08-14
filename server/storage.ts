import { type User, type InsertUser, type Pass, type InsertPass } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllStudents(): Promise<User[]>;

  // Pass methods
  createPass(pass: InsertPass): Promise<Pass>;
  getPass(id: string): Promise<Pass | undefined>;
  getActivePassForStudent(studentId: string): Promise<Pass | undefined>;
  getActivePasses(): Promise<Pass[]>;
  getPassHistory(limit?: number): Promise<Pass[]>;
  getStudentPassHistory(studentId: string): Promise<Pass[]>;
  updatePassStatus(id: string, status: string, returnedAt?: Date): Promise<Pass | undefined>;
  getPassStats(): Promise<{
    activePasses: number;
    todayPasses: number;
    expiringSoon: number;
    avgDuration: string;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private passes: Map<string, Pass>;
  private passCounter: number;

  constructor() {
    this.users = new Map();
    this.passes = new Map();
    this.passCounter = 1000;
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create default teacher
    const teacherId = randomUUID();
    const teacher: User = {
      id: teacherId,
      username: "teacher",
      password: "password",
      role: "teacher",
      firstName: "John",
      lastName: "Smith",
      studentId: null,
    };
    this.users.set(teacherId, teacher);

    // Create default students
    const students = [
      { username: "emily", firstName: "Emily", lastName: "Martinez", studentId: "2024789" },
      { username: "james", firstName: "James", lastName: "Davis", studentId: "2024456" },
      { username: "sarah", firstName: "Sarah", lastName: "Chen", studentId: "2024123" },
      { username: "michael", firstName: "Michael", lastName: "Johnson", studentId: "2024567" },
    ];

    students.forEach(student => {
      const id = randomUUID();
      const user: User = {
        id,
        username: student.username,
        password: "password",
        role: "student",
        firstName: student.firstName,
        lastName: student.lastName,
        studentId: student.studentId,
      };
      this.users.set(id, user);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllStudents(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === "student");
  }

  async createPass(insertPass: InsertPass): Promise<Pass> {
    const id = randomUUID();
    const passNumber = this.passCounter++;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + insertPass.duration * 60 * 1000);
    
    const pass: Pass = {
      ...insertPass,
      id,
      passNumber,
      status: "active",
      issuedAt: now,
      expiresAt,
      returnedAt: null,
    };
    
    this.passes.set(id, pass);
    return pass;
  }

  async getPass(id: string): Promise<Pass | undefined> {
    return this.passes.get(id);
  }

  async getActivePassForStudent(studentId: string): Promise<Pass | undefined> {
    return Array.from(this.passes.values()).find(
      pass => pass.studentId === studentId && pass.status === "active"
    );
  }

  async getActivePasses(): Promise<Pass[]> {
    const now = new Date();
    const activePasses = Array.from(this.passes.values())
      .filter(pass => pass.status === "active")
      .map(pass => {
        // Auto-expire passes that have exceeded their duration
        if (pass.expiresAt <= now && pass.status === "active") {
          pass.status = "expired";
        }
        return pass;
      })
      .filter(pass => pass.status === "active");

    return activePasses.sort((a, b) => a.issuedAt.getTime() - b.issuedAt.getTime());
  }

  async getPassHistory(limit = 50): Promise<Pass[]> {
    return Array.from(this.passes.values())
      .filter(pass => pass.status !== "active")
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())
      .slice(0, limit);
  }

  async getStudentPassHistory(studentId: string): Promise<Pass[]> {
    return Array.from(this.passes.values())
      .filter(pass => pass.studentId === studentId && pass.status !== "active")
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
  }

  async updatePassStatus(id: string, status: string, returnedAt?: Date): Promise<Pass | undefined> {
    const pass = this.passes.get(id);
    if (!pass) return undefined;

    pass.status = status;
    if (returnedAt) {
      pass.returnedAt = returnedAt;
    }

    return pass;
  }

  async getPassStats(): Promise<{
    activePasses: number;
    todayPasses: number;
    expiringSoon: number;
    avgDuration: string;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const allPasses = Array.from(this.passes.values());
    
    const activePasses = allPasses.filter(pass => pass.status === "active").length;
    const todayPasses = allPasses.filter(pass => pass.issuedAt >= todayStart).length;
    const expiringSoon = allPasses.filter(pass => 
      pass.status === "active" && 
      pass.expiresAt.getTime() - now.getTime() <= 5 * 60 * 1000 // 5 minutes
    ).length;

    const completedPasses = allPasses.filter(pass => pass.returnedAt);
    const avgDurationMs = completedPasses.length > 0 
      ? completedPasses.reduce((sum, pass) => 
          sum + (pass.returnedAt!.getTime() - pass.issuedAt.getTime()), 0
        ) / completedPasses.length
      : 0;
    
    const avgDuration = `${Math.round(avgDurationMs / (1000 * 60))}m`;

    return {
      activePasses,
      todayPasses,
      expiringSoon,
      avgDuration,
    };
  }
}

export const storage = new MemStorage();
