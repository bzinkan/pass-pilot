import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Trash2, Edit, Plus, Users, MousePointer2, Eye } from "lucide-react";

interface RosterTabProps {
  user: any;
  selectedGrades?: Set<string>;
  onGradeClick?: (gradeName: string) => void;
}

export function RosterTab({ user, selectedGrades = new Set(), onGradeClick }: RosterTabProps) {
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showBulkAddStudentsModal, setShowBulkAddStudentsModal] = useState(false);
  const [showAddGradeModal, setShowAddGradeModal] = useState(false);
  const [showViewGradeModal, setShowViewGradeModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editingGrade, setEditingGrade] = useState<any>(null);
  const [viewingGrade, setViewingGrade] = useState<any>(null);
  const [bulkGrade, setBulkGrade] = useState('');
  const [studentForm, setStudentForm] = useState({
    name: '',
    grade: '',
    studentId: ''
  });
  const [gradeForm, setGradeForm] = useState({
    name: ''
  });
  const [bulkStudentNames, setBulkStudentNames] = useState('');

  const { toast } = useToast();

  const { data: students = [], isLoading: studentsLoading } = useQuery<any[]>({
    queryKey: ['/api/students'],
  });

  const { data: grades = [], isLoading: gradesLoading } = useQuery<any[]>({
    queryKey: ['/api/grades'],
  });

  const isLoading = studentsLoading || gradesLoading;

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeForm.name) {
      toast({
        title: "Missing Information",
        description: "Please enter a grade name.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await apiRequest('POST', '/api/grades', gradeForm);
      queryClient.invalidateQueries({ queryKey: ['/api/grades'] });
      setGradeForm({ name: '' });
      setShowAddGradeModal(false);
      
      toast({
        title: "Grade added",
        description: `Grade ${gradeForm.name} has been added.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditGrade = (grade: any) => {
    setEditingGrade(grade);
    setGradeForm({ name: grade.name });
  };

  const handleUpdateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeForm.name || !editingGrade) {
      toast({
        title: "Missing Information",
        description: "Please enter a grade name.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await apiRequest('PUT', `/api/grades/${editingGrade.id}`, gradeForm);
      queryClient.invalidateQueries({ queryKey: ['/api/grades'] });
      setGradeForm({ name: '' });
      setEditingGrade(null);
      
      toast({
        title: "Grade updated",
        description: `Grade has been updated to ${gradeForm.name}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteGrade = async (gradeId: string, gradeName: string) => {
    if (!confirm(`Are you sure you want to delete grade "${gradeName}"? This will also delete all students in this grade.`)) {
      return;
    }

    try {
      await apiRequest('DELETE', `/api/grades/${gradeId}`, {});
      queryClient.invalidateQueries({ queryKey: ['/api/grades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      
      toast({
        title: "Grade deleted",
        description: `Grade ${gradeName} has been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.grade) {
      toast({
        title: "Missing Information",
        description: "Please enter student name and select a grade.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Send in simple format - let backend handle the conversion
      const studentData = {
        name: studentForm.name,
        grade: studentForm.grade,
        studentId: studentForm.studentId || undefined
      };
      
      await apiRequest('POST', '/api/students', studentData);
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      setStudentForm({ name: '', grade: '', studentId: '' });
      setShowAddStudentModal(false);
      
      toast({
        title: "Student added",
        description: `${studentForm.name} has been added to grade ${studentForm.grade}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkAddStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkStudentNames.trim() || !bulkGrade) {
      toast({
        title: "Missing Information",
        description: "Please enter student names and select a grade.",
        variant: "destructive",
      });
      return;
    }
    
    const lines = bulkStudentNames
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length === 0) {
      toast({
        title: "No students to add",
        description: "Please enter at least one line of student information.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the grade ID from the grade name
      const selectedGrade = filteredGrades.find((g: any) => g.name === bulkGrade);
      if (!selectedGrade) {
        toast({
          title: "Invalid Grade",
          description: "Please select a valid grade.",
          variant: "destructive",
        });
        return;
      }

      const promises = lines.map(line => {
        // Extract name from any line format - very flexible approach
        // Remove common prefixes, numbers, special characters, etc.
        let cleanLine = line
          .replace(/^\d+\.\s*/, '') // Remove "1. " numbering
          .replace(/^\d+\)\s*/, '') // Remove "1) " numbering  
          .replace(/^\d+\s*-\s*/, '') // Remove "1 - " numbering
          .replace(/^-\s*/, '') // Remove leading dashes
          .replace(/^\*\s*/, '') // Remove leading asterisks
          .replace(/,.*$/, '') // Remove everything after first comma
          .replace(/\s*\(.*?\)\s*/g, ' ') // Remove anything in parentheses
          .replace(/\s*\[.*?\]\s*/g, ' ') // Remove anything in brackets
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        // If after cleaning we still have text, use it as name
        if (!cleanLine) {
          cleanLine = line.trim(); // Fallback to original if cleaning removed everything
        }

        // Send in simple format - let backend handle the conversion
        const studentData = {
          name: cleanLine,
          grade: bulkGrade
        };

        return apiRequest('POST', '/api/students', studentData);
      });
      
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      setBulkStudentNames('');
      setBulkGrade('');
      setShowBulkAddStudentsModal(false);
      
      toast({
        title: "Students added",
        description: `${lines.length} student${lines.length !== 1 ? 's' : ''} have been added to grade ${bulkGrade}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditStudent = (student: any) => {
    setEditingStudent(student);
    // Combine firstName and lastName back into a single name field for the form
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
    
    // Find the grade name from gradeId
    const grade = filteredGrades.find((g: any) => g.id === student.gradeId);
    const gradeName = grade ? grade.name : '';
    
    setStudentForm({
      name: fullName,
      grade: gradeName,
      studentId: student.studentId || ''
    });
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.grade || !editingStudent) {
      toast({
        title: "Missing Information",
        description: "Please enter student name and select a grade.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Send in simple format - let backend handle the conversion
      const studentData = {
        name: studentForm.name,
        grade: studentForm.grade,
        studentId: studentForm.studentId || undefined
      };

      await apiRequest('PUT', `/api/students/${editingStudent.id}`, studentData);
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      setStudentForm({ name: '', grade: '', studentId: '' });
      setEditingStudent(null);
      
      toast({
        title: "Student updated",
        description: `${studentForm.name} has been updated.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}?`)) {
      return;
    }

    try {
      await apiRequest('DELETE', `/api/students/${studentId}`, {});
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      
      toast({
        title: "Student deleted",
        description: `${studentName} has been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getInitials = (student: any) => {
    const firstName = student.firstName || '';
    const lastName = student.lastName || '';
    return (firstName[0] || '') + (lastName[0] || '').toUpperCase();
  };

  const getAvatarColor = (student: any) => {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-pink-100 text-pink-600',
      'bg-green-100 text-green-600',
      'bg-purple-100 text-purple-600',
      'bg-yellow-100 text-yellow-600',
      'bg-red-100 text-red-600'
    ];
    const fullName = (student.firstName || '') + (student.lastName || '');
    const index = fullName.length % colors.length;
    return colors[index];
  };

  // Filter grades based on teacher's assigned grades
  const teacherAssignedGrades = user?.assignedGrades || [];
  const filteredGrades = teacherAssignedGrades.length === 0 
    ? grades 
    : grades.filter(grade => teacherAssignedGrades.includes(grade.name));

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Student Roster</h2>
        <p className="text-sm text-muted-foreground">
          Manage grades and students. Click on grade cards to add them to MyClass tab. 
          <span className="text-green-600 font-medium"> Green cards are active in MyClass.</span>
        </p>
      </div>

      {/* Grades Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Grade Levels
            </CardTitle>
            <Dialog open={showAddGradeModal} onOpenChange={setShowAddGradeModal}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-grade">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Grade/Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Grade</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddGrade} className="space-y-4">
                  <div>
                    <Label htmlFor="gradeName">Grade Name</Label>
                    <Input
                      id="gradeName"
                      value={gradeForm.name}
                      onChange={(e) => setGradeForm({ name: e.target.value })}
                      placeholder="e.g. 6th, 7th, 8th"
                      data-testid="input-grade-name"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddGradeModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" data-testid="button-submit-grade">Add Grade/Class</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {filteredGrades.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              {teacherAssignedGrades.length === 0 
                ? "No grades created yet. Add a grade to get started."
                : "No assigned grades found. Contact your admin to assign grades to your account."
              }
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredGrades.map((grade: any) => {
                const gradeStudents = students.filter(student => student.gradeId === grade.id);
                const isSelected = selectedGrades.has(grade.name);
                
                return (
                  <Card 
                    key={grade.id} 
                    className={`cursor-pointer hover:shadow-md transition-all border-2 ${
                      isSelected 
                        ? 'border-green-500 bg-green-50 shadow-md' 
                        : 'hover:border-primary/20'
                    }`}
                    onClick={() => onGradeClick?.(grade.name)}
                    data-testid={`card-grade-${grade.name}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <MousePointer2 className={`w-4 h-4 ${isSelected ? 'text-green-600' : 'text-primary'}`} />
                          <h3 className={`font-semibold ${isSelected ? 'text-green-700' : ''}`}>Grade {grade.name}</h3>
                          {isSelected && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingGrade(grade);
                              setShowViewGradeModal(true);
                            }}
                            className="h-6 w-6 p-0"
                            data-testid={`button-view-grade-${grade.id}`}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditGrade(grade);
                            }}
                            className="h-6 w-6 p-0"
                            data-testid={`button-edit-grade-${grade.id}`}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGrade(grade.id, grade.name);
                            }}
                            className="h-6 w-6 p-0 hover:text-red-600"
                            data-testid={`button-delete-grade-${grade.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className={`text-sm ${isSelected ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {gradeStudents.length} student{gradeStudents.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex justify-between items-center mt-1">
                        <p className={`text-xs ${isSelected ? 'text-green-600' : 'text-primary'}`}>
                          {isSelected ? '✓ Active in MyClass' : 'Click to add to MyClass →'}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStudentForm({ name: '', grade: grade.name, studentId: '' });
                              setShowAddStudentModal(true);
                            }}
                            className="h-6 text-xs px-2"
                            data-testid={`button-add-student-${grade.name}`}
                          >
                            Add Student
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBulkGrade(grade.name);
                              setShowBulkAddStudentsModal(true);
                            }}
                            className="h-6 text-xs px-2"
                            data-testid={`button-bulk-add-${grade.name}`}
                          >
                            Bulk Add
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>



      {/* Add Student Dialog */}
      <Dialog open={showAddStudentModal} onOpenChange={setShowAddStudentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div>
              <Label htmlFor="studentName">Student Name</Label>
              <Input
                id="studentName"
                value={studentForm.name}
                onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                placeholder="Enter student name"
                data-testid="input-student-name"
              />
            </div>
            <div>
              <Label htmlFor="studentGrade">Grade</Label>
              <Select 
                value={studentForm.grade} 
                onValueChange={(value) => setStudentForm({ ...studentForm, grade: value })}
              >
                <SelectTrigger data-testid="select-student-grade">
                  <SelectValue placeholder="Select a grade" />
                </SelectTrigger>
                <SelectContent>
                  {filteredGrades.map((grade: any) => (
                    <SelectItem key={grade.id} value={grade.name}>
                      Grade {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="studentId">Student ID (Optional)</Label>
              <Input
                id="studentId"
                value={studentForm.studentId}
                onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                placeholder="Enter student ID"
                data-testid="input-student-id"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowAddStudentModal(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit-student">Add Student</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Students Dialog */}
      <Dialog open={showBulkAddStudentsModal} onOpenChange={setShowBulkAddStudentsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Add Students</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkAddStudents} className="space-y-4">
            <div>
              <Label htmlFor="bulkGrade">Grade</Label>
              <Select 
                value={bulkGrade} 
                onValueChange={setBulkGrade}
              >
                <SelectTrigger data-testid="select-bulk-grade">
                  <SelectValue placeholder="Select a grade" />
                </SelectTrigger>
                <SelectContent>
                  {filteredGrades.map((grade: any) => (
                    <SelectItem key={grade.id} value={grade.name}>
                      Grade {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bulkStudentNames">Student Information (one per line)</Label>
              <textarea
                id="bulkStudentNames"
                value={bulkStudentNames}
                onChange={(e) => setBulkStudentNames(e.target.value)}
                placeholder="Paste any student information, one per line:&#10;John Smith&#10;1. Jane Doe (Student ID: 12345)&#10;Alex Johnson, Grade 6&#10;- Sarah Wilson&#10;* Mike Davis"
                className="w-full h-32 p-3 border rounded-md resize-none"
                data-testid="textarea-bulk-student-names"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Paste any student information - I'll extract the names automatically. Works with lists, numbers, commas, etc.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowBulkAddStudentsModal(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="button-submit-bulk-students">Add Students</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Grade Dialog */}
      {editingGrade && (
        <Dialog open={!!editingGrade} onOpenChange={() => setEditingGrade(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Grade</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateGrade} className="space-y-4">
              <div>
                <Label htmlFor="editGradeName">Grade Name</Label>
                <Input
                  id="editGradeName"
                  value={gradeForm.name}
                  onChange={(e) => setGradeForm({ name: e.target.value })}
                  placeholder="e.g. 6th, 7th, 8th"
                  data-testid="input-edit-grade-name"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingGrade(null)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-update-grade">Update Grade</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Student Dialog */}
      {editingStudent && (
        <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div>
                <Label htmlFor="editStudentName">Student Name</Label>
                <Input
                  id="editStudentName"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  placeholder="Enter student name"
                  data-testid="input-edit-student-name"
                />
              </div>
              <div>
                <Label htmlFor="editStudentGrade">Grade</Label>
                <Select 
                  value={studentForm.grade} 
                  onValueChange={(value) => setStudentForm({ ...studentForm, grade: value })}
                >
                  <SelectTrigger data-testid="select-edit-student-grade">
                    <SelectValue placeholder="Select a grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredGrades.map((grade: any) => (
                      <SelectItem key={grade.id} value={grade.name}>
                        Grade {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editStudentId">Student ID (Optional)</Label>
                <Input
                  id="editStudentId"
                  value={studentForm.studentId}
                  onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                  placeholder="Enter student ID"
                  data-testid="input-edit-student-id"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingStudent(null)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-update-student">Update Student</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* View Grade Roster Dialog */}
      {viewingGrade && (
        <Dialog open={showViewGradeModal} onOpenChange={setShowViewGradeModal}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Grade {viewingGrade.name} - Full Roster</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {(() => {
                const gradeStudents = students.filter(student => student.gradeId === viewingGrade.id);
                
                if (gradeStudents.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No students in Grade {viewingGrade.name} yet.</p>
                      <div className="flex gap-2 justify-center mt-4">
                        <Button
                          onClick={() => {
                            setStudentForm({ name: '', grade: viewingGrade.name, studentId: '' });
                            setShowViewGradeModal(false);
                            setShowAddStudentModal(true);
                          }}
                          size="sm"
                        >
                          Add Student
                        </Button>
                        <Button
                          onClick={() => {
                            setBulkGrade(viewingGrade.name);
                            setShowViewGradeModal(false);
                            setShowBulkAddStudentsModal(true);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Bulk Add Students
                        </Button>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        {gradeStudents.length} student{gradeStudents.length !== 1 ? 's' : ''} in Grade {viewingGrade.name}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setStudentForm({ name: '', grade: viewingGrade.name, studentId: '' });
                            setShowViewGradeModal(false);
                            setShowAddStudentModal(true);
                          }}
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Student
                        </Button>
                        <Button
                          onClick={() => {
                            setBulkGrade(viewingGrade.name);
                            setShowViewGradeModal(false);
                            setShowBulkAddStudentsModal(true);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Bulk Add
                        </Button>
                      </div>
                    </div>
                    {gradeStudents.map((student: any) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${getAvatarColor(student)}`}>
                            {getInitials(student)}
                          </div>
                          <div>
                            <p className="font-medium">{student.firstName} {student.lastName}</p>
                            {student.studentId && (
                              <p className="text-sm text-muted-foreground">ID: {student.studentId}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              handleEditStudent(student);
                              setShowViewGradeModal(false);
                            }}
                            data-testid={`button-edit-student-${student.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteStudent(student.id, `${student.firstName} ${student.lastName}`)}
                            className="hover:text-red-600"
                            data-testid={`button-delete-student-${student.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}