import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Clock, User, CheckCircle2, Users, LogOut, Settings, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface KioskSession {
  teacherId: string;
  teacherName: string;
  locationLabel?: string;
  schoolId: string;
  currentGrade?: string | null;
  token?: string;
}

interface Student {
  id: string;
  name: string;
  grade: string;
  studentId?: string;
}

interface Pass {
  id: string;
  studentId: string;
  studentName: string;
  checkoutTime: string;
  passType: "general" | "nurse" | "discipline";
  customReason?: string;
  status: "out" | "returned";
}

export default function Kiosk() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [session, setSession] = useState<KioskSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [activePasses, setActivePasses] = useState<Pass[]>([]);
  const [passType, setPassType] = useState<"general" | "nurse" | "discipline">("general");
  const [customReason, setCustomReason] = useState("");
  const [exitPin, setExitPin] = useState("");
  const [showExitForm, setShowExitForm] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [currentGrade, setCurrentGrade] = useState<string | null>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [showPassDialog, setShowPassDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    // Check for kiosk session in sessionStorage
    const savedSession = sessionStorage.getItem('kioskSession');
    if (savedSession) {
      const sessionData = JSON.parse(savedSession);
      console.log('Kiosk session loaded:', sessionData);
      console.log('Token available:', !!sessionData.token);
      console.log('LocalStorage token:', !!localStorage.getItem('token'));
      console.log('LocalStorage token value:', localStorage.getItem('token'));
      setSession(sessionData);
      // Set initial grade from session if available
      setCurrentGrade(sessionData.currentGrade || null);
      loadStudents(sessionData.schoolId);
      loadActivePasses(sessionData.teacherId);
      loadGrades();
    } else {
      // No kiosk session, redirect to login
      console.log('No kiosk session found, redirecting to login');
      console.log('Current path should be /kiosk but redirecting to /login');
      setLocation('/login');
    }
  }, [setLocation]);

  // Update current time every 10 seconds for live duration calculation
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000); // Update every 10 seconds for responsive timestamps
    
    return () => clearInterval(timeInterval);
  }, []);

  // Add polling for real-time sync with MyClass tab
  useEffect(() => {
    if (session?.teacherId) {
      const pollInterval = setInterval(() => {
        loadActivePasses(session.teacherId);
      }, 3000); // Poll every 3 seconds like MyClass tab
      
      return () => clearInterval(pollInterval);
    }
    return; // Fix TypeScript "not all code paths return" error
  }, [session?.teacherId]);

  const loadStudents = async (schoolId: string) => {
    try {
      // Use apiRequest for consistent authentication
      const response = await apiRequest('GET', `/api/students?schoolId=${schoolId}`, undefined);
      const data = await response.json();
      console.log('Loaded students in kiosk:', data);
      setStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadActivePasses = async (teacherId: string) => {
    try {
      // Use apiRequest for consistent authentication
      const response = await apiRequest('GET', `/api/passes/active?teacherId=${teacherId}`, undefined);
      const data = await response.json();
      setActivePasses(data);
    } catch (error) {
      console.error('Failed to load active passes:', error);
    }
  };

  const loadGrades = async () => {
    try {
      // Use apiRequest for consistent authentication
      const response = await apiRequest('GET', '/api/grades', undefined);
      if (!response.ok) {
        throw new Error(`Grades API failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Get teacher's profile to filter grades like MyClass tab
      const userResponse = await apiRequest('GET', '/api/users/me', undefined);
      if (!userResponse.ok) {
        throw new Error(`User API failed with status ${userResponse.status}`);
      }
      
      const userData = await userResponse.json();
      const teacherAssignedGrades = userData?.assignedGrades || [];
      
      // Get teacher's selected grades from localStorage (same as MainApp does)
      // This matches exactly what Roster tab and MyClass tab use
      let selectedGrades;
      try {
        const saved = localStorage.getItem(`selectedGrades_${userData.id}`);
        selectedGrades = saved ? new Set(JSON.parse(saved)) : new Set();
      } catch {
        selectedGrades = new Set();
      }
      
      // Filter grades to match MyClass logic: selectedGrades AND assignedGrades
      // If no selectedGrades, show all assignedGrades (fallback behavior)
      let filteredGrades;
      if (selectedGrades.size === 0) {
        filteredGrades = data.filter((grade: any) => 
          teacherAssignedGrades.length === 0 || teacherAssignedGrades.includes(grade.name)
        );
      } else {
        filteredGrades = data.filter((grade: any) => 
          selectedGrades.has(grade.name) && 
          (teacherAssignedGrades.length === 0 || teacherAssignedGrades.includes(grade.name))
        );
      }
      
      setGrades(filteredGrades);
    } catch (error) {
      console.error('Failed to load grades:', error);
    }
  };

  // Handle student click for pass dialog
  const handleStudentClick = (student: Student) => {
    if (!session) return;
    
    const existingPass = activePasses.find(pass => pass.studentId === student.id && pass.status === 'out');
    
    if (existingPass) {
      // Student is out - mark as returned directly
      returnStudent(existingPass.id);
    } else {
      // Student is in - show pass type dialog
      setSelectedStudent(student);
      setShowPassDialog(true);
      setPassType("general");
      setCustomReason("");
    }
  };

  // Create pass with selected type and reason
  const createPassForStudent = async () => {
    if (!selectedStudent || !session) return;
    
    try {
      console.log('Creating pass for student:', selectedStudent.name);
      
      // Determine the reason based on pass type
      let reason = customReason;
      if (passType === "general" && !customReason) {
        reason = "Bathroom";
      } else if (passType === "nurse" && !customReason) {
        reason = "Nurse visit";
      } else if (passType === "discipline" && !customReason) {
        reason = "Discipline";
      }
      
      // Use the same apiRequest method as MyClass tab for consistency
      await apiRequest('POST', '/api/passes', {
        studentId: selectedStudent.id,
        passType: passType,
        customReason: reason
      });

      // Invalidate queries to trigger refresh (same as MyClass)
      queryClient.invalidateQueries({ queryKey: ['/api/passes/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/passes'] });

      // Also reload to ensure consistency
      await loadActivePasses(session.teacherId);
      
      toast({
        title: "Pass created",
        description: `${selectedStudent.name} has been marked as out for ${reason}.`,
      });

      // Close dialog and reset
      setShowPassDialog(false);
      setSelectedStudent(null);
      setPassType("general");
      setCustomReason("");
      
    } catch (error: any) {
      console.error('Error creating pass:', error);
      toast({
        title: "Error",
        description: `Failed to create pass: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const returnStudent = async (passId: string) => {
    try {
      const pass = activePasses.find(p => p.id === passId);
      const studentName = pass?.studentName || 'Student';

      // Use apiRequest for consistency with MyClass tab
      await apiRequest('PUT', `/api/passes/${passId}/return`, {});
      
      // Invalidate queries to trigger refresh in both kiosk and MyClass
      queryClient.invalidateQueries({ queryKey: ['/api/passes/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/passes'] });

      toast({
        title: "Student Returned",
        description: `${studentName} has been marked as returned.`,
      });

      // Reload to ensure local state consistency
      await loadActivePasses(session!.teacherId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to return student. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExitKiosk = async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/auth/verify-kiosk-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: session.teacherId,
          pin: exitPin,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          sessionStorage.removeItem('kioskSession');
          setLocation('/');
        } else {
          toast({
            title: "Invalid PIN",
            description: "Please enter the correct PIN to exit kiosk mode.",
            variant: "destructive",
          });
          setExitPin("");
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify PIN. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCornerLongPress = () => {
    const timer = setTimeout(() => {
      setShowExitForm(true);
    }, 3000); // 3 second long press
    
    setLongPressTimer(timer);
  };

  const handleCornerRelease = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Filter students by current grade only (no search in kiosk mode)
  const filteredStudents = students.filter(student => {
    return !currentGrade || student.grade === currentGrade;
  });

  // Set initial grade if none selected and grades available
  useEffect(() => {
    if (!currentGrade && grades.length > 0) {
      setCurrentGrade(grades[0].name);
    }
  }, [grades, currentGrade]);

  // Simple approach: Show all grades the teacher has access to
  // This is more practical for kiosk mode where teachers need quick access to all students

  if (!session) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (showExitForm) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Exit Kiosk Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Enter Teacher PIN:</label>
              <Input
                type="password"
                value={exitPin}
                onChange={(e) => setExitPin(e.target.value)}
                placeholder="4-digit PIN"
                maxLength={4}
                className="text-center text-lg"
                data-testid="input-exit-pin"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExitKiosk}
                className="flex-1"
                data-testid="button-confirm-exit"
              >
                Exit Kiosk
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowExitForm(false);
                  setExitPin("");
                }}
                className="flex-1"
                data-testid="button-cancel-exit"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                PassPilot Kiosk
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {session.teacherName}
                {session.locationLabel && ` • ${session.locationLabel}`}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setShowExitForm(true)}
                className="flex items-center space-x-2"
                data-testid="button-exit-kiosk"
              >
                <LogOut className="h-4 w-4" />
                <span>Exit Kiosk</span>
              </Button>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Grade Filter Tabs - Show for both versions */}
        <div className="flex flex-wrap gap-2 mb-6">
          {grades.length === 0 ? (
            <div className="text-gray-500 text-sm">
              Loading grades... (Debug: grades array is empty - length: {grades.length})
            </div>
          ) : (
            grades.map((grade) => (
                <Button
                  key={grade.id}
                  variant={currentGrade === grade.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentGrade(grade.name)}
                  className={`${
                    currentGrade === grade.name 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'hover:bg-blue-50'
                  }`}
                  data-testid={`button-grade-${grade.name}`}
                >
                  {grade.name}
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-black/10">
                    {students.filter(s => s.grade === grade.name).length}
                  </span>
                </Button>
            ))
          )}
        </div>

        {/* MyClass Style View */}
            {/* Stats Cards - MyClass Style */}
            <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold">{filteredStudents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Clock className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Currently Out</p>
                  <p className="text-2xl font-bold text-red-600">{activePasses.filter(pass => pass.status === 'out' && filteredStudents.some(s => s.id === pass.studentId)).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Available</p>
                  <p className="text-2xl font-bold text-green-600">
                    {filteredStudents.length - activePasses.filter(pass => pass.status === 'out' && filteredStudents.some(s => s.id === pass.studentId)).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Currently Out Students - MyClass Style */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Clock className="h-5 w-5" />
              Currently Out - {currentGrade || 'All Grades'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activePasses.filter(pass => pass.status === 'out' && filteredStudents.some(s => s.id === pass.studentId)).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No students are currently out of class
              </div>
            ) : (
              <div className="space-y-3">
                {activePasses
                  .filter(pass => pass.status === 'out' && filteredStudents.some(s => s.id === pass.studentId))
                  .map((pass) => {
                    const student = filteredStudents.find(s => s.id === pass.studentId);
                    if (!student) return null;
                    
                    return (
                      <div
                        key={pass.id}
                        className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-red-600">
                              {student.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-600">
                              {pass.passType === "general" ? "General" : 
                               pass.passType === "nurse" ? "Nurse" : "Discipline"}
                              {pass.customReason && ` • ${pass.customReason}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              Out for {Math.floor((currentTime - new Date(pass.checkoutTime).getTime()) / 60000)} min • Since {new Date(pass.checkoutTime).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => returnStudent(pass.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                          data-testid={`button-return-${pass.id}`}
                        >
                          Mark Returned
                        </Button>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Students - MyClass Style */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Available Students - {currentGrade || 'All Grades'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredStudents.filter(student => !activePasses.some(pass => pass.studentId === student.id && pass.status === 'out')).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                All students are currently out of class
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStudents
                  .filter(student => !activePasses.some(pass => pass.studentId === student.id && pass.status === 'out'))
                  .map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                      data-testid={`student-card-${student.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-green-600">
                            {student.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.grade} • {student.studentId}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => handleStudentClick(student)}
                          data-testid={`button-mark-out-${student.id}`}
                        >
                          Mark Out
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pass Type Selection Dialog */}
      <Dialog open={showPassDialog} onOpenChange={setShowPassDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Student Out</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedStudent && (
              <div className="text-sm text-gray-600">
                Creating pass for: <span className="font-medium">{selectedStudent.name}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="pass-type">Pass Type</Label>
              <Select value={passType} onValueChange={(value: "general" | "nurse" | "discipline") => setPassType(value)}>
                <SelectTrigger id="pass-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General (Bathroom, Water, etc.)</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="discipline">Discipline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-reason">Custom Reason (Optional)</Label>
              <Input
                id="custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={
                  passType === "general" ? "Bathroom, Water fountain, etc." :
                  passType === "nurse" ? "Nurse visit" :
                  "Discipline office"
                }
                data-testid="input-custom-reason"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={createPassForStudent}
                className="flex-1"
                data-testid="button-create-pass"
              >
                Create Pass
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPassDialog(false);
                  setSelectedStudent(null);
                  setPassType("general");
                  setCustomReason("");
                }}
                className="flex-1"
                data-testid="button-cancel-pass"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden exit trigger */}
      <div
        className="fixed top-0 left-0 w-16 h-16 opacity-0 cursor-pointer"
        onMouseDown={handleCornerLongPress}
        onMouseUp={handleCornerRelease}
        onMouseLeave={handleCornerRelease}
        onTouchStart={handleCornerLongPress}
        onTouchEnd={handleCornerRelease}
        data-testid="corner-exit-trigger"
      />
    </div>
  );
}