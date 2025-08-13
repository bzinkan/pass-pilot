import { type Student, type InsertStudent, type HallPass, type InsertHallPass, type HallPassWithStudent } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Students
  getStudent(id: string): Promise<Student | undefined>;
  getStudentByName(name: string): Promise<Student | undefined>;
  searchStudents(query: string): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  getAllStudents(): Promise<Student[]>;

  // Hall Passes
  getHallPass(id: string): Promise<HallPass | undefined>;
  getHallPassWithStudent(id: string): Promise<HallPassWithStudent | undefined>;
  createHallPass(hallPass: InsertHallPass): Promise<HallPass>;
  updateHallPass(id: string, updates: Partial<HallPass>): Promise<HallPass | undefined>;
  getActiveHallPasses(): Promise<HallPassWithStudent[]>;
  getAllHallPasses(): Promise<HallPassWithStudent[]>;
  getHallPassesByDate(date: string): Promise<HallPassWithStudent[]>;
  checkInStudent(passId: string): Promise<HallPass | undefined>;
}

export class MemStorage implements IStorage {
  private students: Map<string, Student>;
  private hallPasses: Map<string, HallPass>;

  constructor() {
    this.students = new Map();
    this.hallPasses = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed some students
    const sampleStudents: InsertStudent[] = [
      { name: "John Smith", grade: "Grade 10", room: "Room 204", initials: "JS" },
      { name: "Emma Johnson", grade: "Grade 9", room: "Room 156", initials: "EJ" },
      { name: "Michael Brown", grade: "Grade 11", room: "Room 301", initials: "MB" },
      { name: "Sarah Davis", grade: "Grade 10", room: "Room 205", initials: "SD" },
      { name: "Alex Wilson", grade: "Grade 12", room: "Room 401", initials: "AW" },
      { name: "Lisa Garcia", grade: "Grade 9", room: "Room 157", initials: "LG" },
      { name: "David Miller", grade: "Grade 11", room: "Room 302", initials: "DM" },
      { name: "Jessica Taylor", grade: "Grade 10", room: "Room 206", initials: "JT" },
    ];

    sampleStudents.forEach(student => {
      const id = randomUUID();
      this.students.set(id, { ...student, id });
    });
  }

  async getStudent(id: string): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getStudentByName(name: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(
      (student) => student.name.toLowerCase() === name.toLowerCase(),
    );
  }

  async searchStudents(query: string): Promise<Student[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.students.values()).filter(
      (student) => 
        student.name.toLowerCase().includes(searchTerm) ||
        student.grade.toLowerCase().includes(searchTerm) ||
        student.room.toLowerCase().includes(searchTerm)
    );
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const id = randomUUID();
    const student: Student = { ...insertStudent, id };
    this.students.set(id, student);
    return student;
  }

  async getAllStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  async getHallPass(id: string): Promise<HallPass | undefined> {
    return this.hallPasses.get(id);
  }

  async getHallPassWithStudent(id: string): Promise<HallPassWithStudent | undefined> {
    const hallPass = this.hallPasses.get(id);
    if (!hallPass) return undefined;

    const student = await this.getStudent(hallPass.studentId);
    if (!student) return undefined;

    return { ...hallPass, student };
  }

  async createHallPass(insertHallPass: InsertHallPass): Promise<HallPass> {
    const id = randomUUID();
    const now = new Date();
    const hallPass: HallPass = {
      ...insertHallPass,
      id,
      timeOut: insertHallPass.timeOut ? new Date(insertHallPass.timeOut) : now,
      timeIn: insertHallPass.timeIn ? new Date(insertHallPass.timeIn) : null,
      status: "active",
      createdAt: now,
    };
    this.hallPasses.set(id, hallPass);
    return hallPass;
  }

  async updateHallPass(id: string, updates: Partial<HallPass>): Promise<HallPass | undefined> {
    const existing = this.hallPasses.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.hallPasses.set(id, updated);
    return updated;
  }

  async getActiveHallPasses(): Promise<HallPassWithStudent[]> {
    const activePasses = Array.from(this.hallPasses.values()).filter(
      (pass) => pass.status === "active" || pass.status === "overdue"
    );

    const passesWithStudents: HallPassWithStudent[] = [];
    for (const pass of activePasses) {
      const student = await this.getStudent(pass.studentId);
      if (student) {
        // Update status based on time elapsed
        const now = new Date();
        const timeOut = new Date(pass.timeOut);
        const minutesElapsed = Math.floor((now.getTime() - timeOut.getTime()) / (1000 * 60));
        const status = minutesElapsed > pass.duration ? "overdue" : "active";
        
        if (status !== pass.status) {
          await this.updateHallPass(pass.id, { status });
          pass.status = status;
        }

        passesWithStudents.push({ ...pass, student });
      }
    }

    return passesWithStudents;
  }

  async getAllHallPasses(): Promise<HallPassWithStudent[]> {
    const allPasses = Array.from(this.hallPasses.values());
    const passesWithStudents: HallPassWithStudent[] = [];

    for (const pass of allPasses) {
      const student = await this.getStudent(pass.studentId);
      if (student) {
        passesWithStudents.push({ ...pass, student });
      }
    }

    return passesWithStudents.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getHallPassesByDate(date: string): Promise<HallPassWithStudent[]> {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const dayPasses = Array.from(this.hallPasses.values()).filter((pass) => {
      const passDate = new Date(pass.createdAt!);
      return passDate >= startOfDay && passDate <= endOfDay;
    });

    const passesWithStudents: HallPassWithStudent[] = [];
    for (const pass of dayPasses) {
      const student = await this.getStudent(pass.studentId);
      if (student) {
        passesWithStudents.push({ ...pass, student });
      }
    }

    return passesWithStudents;
  }

  async checkInStudent(passId: string): Promise<HallPass | undefined> {
    const pass = this.hallPasses.get(passId);
    if (!pass) return undefined;

    const updated = await this.updateHallPass(passId, {
      timeIn: new Date(),
      status: "returned",
    });

    return updated;
  }
}

export const storage = new MemStorage();
