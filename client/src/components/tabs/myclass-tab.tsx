import { useState, useEffect } from "react";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Users, Clock, UserCheck, Timer, Heart, AlertTriangle, ChevronDown, Edit3, X } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MyClassTabProps {
  user: any;
  selectedGrades?: Set<string>;
  currentGrade?: string | null;
  onRemoveGrade?: (gradeName: string) => void;
  onGradeChange?: (gradeName: string) => void;
}

export function MyClassTab({ user, selectedGrades = new Set(), currentGrade, onRemoveGrade, onGradeChange }: MyClassTabProps) {
  const [activeGrade, setActiveGrade] = useState(currentGrade || '');
  const [customReason, setCustomReason] = useState('');
  const [selectedStudentForCustom, setSelectedStudentForCustom] = useState<any>(null);
  const [isCustomReasonDialogOpen, setIsCustomReasonDialogOpen] = useState(false);
  
  // Update active grade when prop changes
  React.useEffect(() => {
    if (currentGrade !== undefined && currentGrade !== activeGrade) {
      setActiveGrade(currentGrade || '');
    }
  }, [currentGrade]);
  
  // If no activeGrade is set but we have selected grades, default to the first one
  React.useEffect(() => {
    if (!activeGrade && selectedGrades.size > 0) {
      const firstGrade = Array.from(selectedGrades)[0];
      setActiveGrade(firstGrade || '');
    }
  }, [selectedGrades, activeGrade]);
  
  const { toast } = useToast();

  const { data: students = [], isLoading: studentsLoading } = useQuery<any[]>({
    queryKey: ['/api/students'],
  });

  const { data: passes = [], isLoading: passesLoading } = useQuery<any[]>({
    queryKey: ['/api/passes/active'],
    refetchInterval: 3000, // Refresh every 3 seconds for real-time duration updates
  });

  const { data: grades = [] } = useQuery<any[]>({
    queryKey: ['/api/grades'],
  });

  const isLoading = studentsLoading || passesLoading;

  // Filter grades based on teacher's assigned grades and selected grades
  const teacherAssignedGrades = user?.assignedGrades || [];
  const availableGrades = grades.filter(grade => 
    selectedGrades.has(grade.name) && 
    (teacherAssignedGrades.length === 0 || teacherAssignedGrades.includes(grade.name))
  );

  const handleMarkOut = async (studentId: string, studentName: string, passType: string = 'general', customReason: string = '') => {
    try {
      const requestBody = { 
        studentId, 
        passType,
        customReason: customReason || undefined,
      };
      
      const response = await apiRequest('POST', '/api/passes', requestBody);
      
      queryClient.invalidateQueries({ queryKey: ['/api/passes/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/passes'] });
      
      const reasonText = customReason ? customReason : (
        passType === 'nurse' ? 'Nurse' : 
        passType === 'office' ? 'Main Office' : 
        passType === 'restroom' ? 'Restroom' : 
        'General'
      );
      toast({
        title: "Pass created",
        description: `${studentName} has been marked out for ${reasonText}.`,
      });
    } catch (error: any) {
      console.error('handleMarkOut error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCustomReasonSubmit = () => {
    if (selectedStudentForCustom && customReason.trim()) {
      handleMarkOut(selectedStudentForCustom.id, `${selectedStudentForCustom.firstName} ${selectedStudentForCustom.lastName}`, 'custom', customReason.trim());
      setCustomReason('');
      setSelectedStudentForCustom(null);
      setIsCustomReasonDialogOpen(false);
    }
  };

  const openCustomReasonDialog = (student: any) => {
    setSelectedStudentForCustom(student);
    setCustomReason('');
    setIsCustomReasonDialogOpen(true);
  };

  const handleMarkReturned = async (passId: string, studentName: string) => {
    try {
      await apiRequest('PUT', `/api/passes/${passId}/return`, {});
      queryClient.invalidateQueries({ queryKey: ['/api/passes/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/passes'] });
      
      toast({
        title: "Student returned",
        description: `${studentName} has been marked as returned.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'S';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-pink-100 text-pink-600',
      'bg-green-100 text-green-600',
      'bg-purple-100 text-purple-600',
      'bg-yellow-100 text-yellow-600',
      'bg-red-100 text-red-600'
    ];
    if (!name || typeof name !== 'string') return colors[0];
    const index = name.length % colors.length;
    return colors[index];
  };

  const getPassTypeIcon = (passType: string) => {
    switch (passType) {
      case 'nurse':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'discipline':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPassTypeLabel = (passType: string) => {
    switch (passType) {
      case 'nurse':
        return 'Nurse';
      case 'discipline':
        return 'Discipline';
      default:
        return 'General';
    }
  };

  const getPassTypeBadgeColor = (passType: string) => {
    switch (passType) {
      case 'nurse':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'discipline':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  // Use state to force re-render every few seconds for real-time updates
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every 3 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (issuedAt: string) => {
    if (!issuedAt) return '0 min';
    const issued = new Date(issuedAt);
    if (isNaN(issued.getTime())) return '0 min';
    const diffMs = currentTime.getTime() - issued.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    // Show at least 1 minute if they've been out for any time
    return `${Math.max(1, diffMinutes)} min`;
  };

  if (availableGrades.length === 0) {
    return (
      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">My Class</h2>
          <p className="text-sm text-muted-foreground">Manage student passes and track who's out of class</p>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Grades Selected</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click on grade cards in the Roster tab to add them to MyClass. Green cards in Roster are active here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  // Get current active grade data
  const currentActiveGrade = availableGrades.find(g => g.name === activeGrade);
  const gradeStudents = currentActiveGrade ? students.filter((student: any) => student.gradeId === currentActiveGrade.id) : [];
  const gradeOutPasses = currentActiveGrade ? passes.filter((pass: any) => {
    const student = students.find((s: any) => s.id === pass.studentId);
    return student && student.gradeId === currentActiveGrade.id;
  }) : [];
  
  // Sort students alphabetically by last name (create new array to avoid mutations)
  const sortStudentsByLastName = (students: any[]) => {
    return [...students].sort((a, b) => {
      const lastNameA = (a.lastName || '').toLowerCase();
      const lastNameB = (b.lastName || '').toLowerCase();
      return lastNameA.localeCompare(lastNameB);
    });
  };
  
  const availableStudents = sortStudentsByLastName(
    gradeStudents.filter(student => 
      !passes.some(pass => pass.studentId === student.id)
    )
  );
  
  // Sort passes by student last name (create new array to avoid mutations)
  const sortedGradeOutPasses = [...gradeOutPasses].sort((a, b) => {
    const studentA = students.find((s: any) => s.id === a.studentId);
    const studentB = students.find((s: any) => s.id === b.studentId);
    const lastNameA = (studentA?.lastName || '').toLowerCase();
    const lastNameB = (studentB?.lastName || '').toLowerCase();
    return lastNameA.localeCompare(lastNameB);
  });

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">My Class</h2>
        <p className="text-sm text-muted-foreground">Manage student passes and track who's out of class</p>
      </div>

      {/* Small Grade Tabs for Quick Switching */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {availableGrades.map((grade: any) => {
            const gradeStudents = students.filter(s => s.gradeId === grade.id);
            const gradeOutCount = passes.filter(p => {
              const student = students.find(s => s.id === p.studentId);
              return student && student.gradeId === grade.id;
            }).length;
            
            const isActive = activeGrade === grade.name;
            
            return (
              <div key={grade.id} className="flex items-center gap-1">
                <Button
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setActiveGrade(grade.name);
                    onGradeChange?.(grade.name);
                  }}
                  data-testid={`tab-grade-${grade.name}`}
                  className={`flex items-center gap-2 ${isActive ? 'ring-2 ring-primary' : ''}`}
                >
                  <Users className="w-4 h-4" />
                  Grade {grade.name}
                  {gradeOutCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                      {gradeOutCount}
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveGrade?.(grade.name);
                  }}
                  data-testid={`button-remove-grade-${grade.name}`}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-red-100 dark:hover:bg-red-900/20"
                  title={`Remove Grade ${grade.name} from My Class`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Show active grade content */}
      {currentActiveGrade && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                    <p className="text-lg font-bold">{gradeStudents.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Timer className="h-5 w-5 text-red-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Currently Out</p>
                    <p className="text-lg font-bold text-red-600">{sortedGradeOutPasses.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <UserCheck className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Available</p>
                    <p className="text-lg font-bold text-green-600">{availableStudents.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Currently Out Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" />
                Currently Out - Grade {currentActiveGrade.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedGradeOutPasses.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No students are currently out of class
                </p>
              ) : (
                <div className="space-y-3">
                  {sortedGradeOutPasses.map((pass: any) => {
                    const student = students.find((s: any) => s.id === pass.studentId);
                    if (!student) return null;
                    
                    return (
                      <div key={pass.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${getAvatarColor(`${student.firstName} ${student.lastName}`)}`}>
                            {getInitials(`${student.firstName} ${student.lastName}`)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{student.firstName} {student.lastName}</p>
                              <span className={`px-2 py-1 text-xs rounded-full border flex items-center gap-1 ${getPassTypeBadgeColor(pass.passType || 'general')}`}>
                                {getPassTypeIcon(pass.passType || 'general')}
                                {pass.destination || getPassTypeLabel(pass.passType || 'general')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {pass.customReason || `Out for ${formatDuration(pass.issuedAt)}`} • Since {pass.issuedAt ? new Date(pass.issuedAt).toLocaleTimeString() : 'Unknown time'}
                            </p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleMarkReturned(pass.id, `${student.firstName} ${student.lastName}`)}
                          size="sm"
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

          {/* Available Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-600" />
                Available Students - Grade {currentActiveGrade.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableStudents.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {gradeStudents.length === 0 
                    ? `No students in Grade ${currentActiveGrade.name}. Add students in the Roster tab.`
                    : "All students are currently out of class"
                  }
                </p>
              ) : (
                <div className="grid gap-3">
                  {availableStudents.map((student: any) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${getAvatarColor(`${student.firstName} ${student.lastName}`)}`}>
                          {getInitials(`${student.firstName} ${student.lastName}`)}
                        </div>
                        <div>
                          <p className="font-medium">{student.firstName} {student.lastName}</p>
                          {student.studentId && (
                            <p className="text-sm text-muted-foreground">ID: {student.studentId}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={() => handleMarkOut(student.id, `${student.firstName} ${student.lastName}`, 'general', '')}
                          size="sm"
                          variant="outline"
                          data-testid={`button-checkout-${student.id}`}
                        >
                          Mark Out
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              size="sm"
                              variant="outline"
                              data-testid={`button-special-checkout-${student.id}`}
                              className="px-2"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleMarkOut(student.id, `${student.firstName} ${student.lastName}`, 'restroom')}
                              className="flex items-center gap-2"
                            >
                              <Users className="w-4 h-4 text-blue-500" />
                              Restroom
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleMarkOut(student.id, `${student.firstName} ${student.lastName}`, 'nurse')}
                              className="flex items-center gap-2"
                            >
                              <Heart className="w-4 h-4 text-red-500" />
                              Nurse
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleMarkOut(student.id, `${student.firstName} ${student.lastName}`, 'office')}
                              className="flex items-center gap-2"
                            >
                              <AlertTriangle className="w-4 h-4 text-orange-500" />
                              Office
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openCustomReasonDialog(student)}
                              className="flex items-center gap-2"
                            >
                              <Edit3 className="w-4 h-4 text-blue-500" />
                              Custom Reason
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* No active grade selected */}
      {!currentActiveGrade && availableGrades.length > 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Select a Grade</h3>
            <p className="text-sm text-muted-foreground">
              Click on one of the grade tabs above to view and manage students.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Custom Reason Dialog */}
      <Dialog open={isCustomReasonDialogOpen} onOpenChange={setIsCustomReasonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom Reason for {selectedStudentForCustom?.firstName} {selectedStudentForCustom?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="customReason">Reason for leaving class</Label>
              <Input
                id="customReason"
                placeholder="e.g., Library research, Guidance counselor, Office errand..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomReasonSubmit();
                  }
                }}
                data-testid="input-custom-reason"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsCustomReasonDialogOpen(false)}
                data-testid="button-cancel-custom-reason"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCustomReasonSubmit}
                disabled={!customReason.trim()}
                data-testid="button-submit-custom-reason"
              >
                Mark Out
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}