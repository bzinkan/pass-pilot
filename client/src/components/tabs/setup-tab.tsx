import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, UserMinus, Users, Mail, Crown, AlertTriangle, Lock, Key, CreditCard, ArrowUpRight, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { FirebaseStatus } from "@/components/firebase-status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SetupTabProps {
  user: any;
}

export function SetupTab({ user }: SetupTabProps) {
  const [settings, setSettings] = useState({
    schoolName: user.schoolName || '',
    enableNotifications: true,
    autoReturn: false,
    passTimeout: 30,
  });
  const [assignedGrades, setAssignedGrades] = useState<string[]>(user.assignedGrades || []);
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [resetPasswordTeacher, setResetPasswordTeacher] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();

  const { data: grades = [] } = useQuery<any[]>({
    queryKey: ['/api/grades'],
  });

  const { data: teachers = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/teachers'],
    enabled: user.isAdmin,
  });

  const { data: schoolInfo } = useQuery<any>({
    queryKey: ['/api/admin/school-info'],
    enabled: user.isAdmin,
  });

  const handleSaveSettings = async () => {
    try {
      await apiRequest('PUT', '/api/users/settings', {
        ...settings,
        assignedGrades,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGradeAssignment = (gradeName: string, checked: boolean) => {
    if (checked) {
      setAssignedGrades([...assignedGrades, gradeName]);
    } else {
      setAssignedGrades(assignedGrades.filter(g => g !== gradeName));
    }
  };

  const addTeacherMutation = useMutation({
    mutationFn: async (teacherData: { email: string; name: string }) => {
      const response = await apiRequest('POST', '/api/admin/teachers', teacherData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teachers'] });
      setNewTeacherEmail('');
      setNewTeacherName('');
      setIsAddingTeacher(false);
      toast({
        title: "Teacher Added",
        description: "Teacher invitation sent. They'll set their password on first login.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add teacher",
        variant: "destructive",
      });
    },
  });

  const removeTeacherMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      await apiRequest('DELETE', `/api/admin/teachers/${teacherId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teachers'] });
      toast({
        title: "Teacher Removed",
        description: "Teacher has been removed from your school.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove teacher",
        variant: "destructive",
      });
    },
  });

  const promoteTeacherMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      const response = await apiRequest('PATCH', `/api/admin/teachers/${teacherId}/promote`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teachers'] });
      toast({
        title: "Teacher Promoted",
        description: data.message || "Teacher has been promoted to admin.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to promote teacher",
        variant: "destructive",
      });
    },
  });

  const demoteAdminMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      const response = await apiRequest('PATCH', `/api/admin/teachers/${teacherId}/demote`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teachers'] });
      toast({
        title: "Admin Demoted",
        description: data.message || "Admin has been demoted to teacher.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to demote admin",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ teacherId, newPassword }: { teacherId: string; newPassword: string }) => {
      const response = await apiRequest('POST', '/api/admin/reset-teacher-password', {
        teacherId,
        newPassword,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Password Reset",
        description: data.message || "Teacher password has been reset successfully.",
      });
      setResetPasswordTeacher(null);
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const handleAddTeacher = () => {
    if (!newTeacherEmail || !newTeacherName) {
      toast({
        title: "Error",
        description: "Please enter email and name",
        variant: "destructive",
      });
      return;
    }

    const maxTeachers = schoolInfo?.maxTeachers || 1;
    if (teachers.length >= maxTeachers) {
      toast({
        title: "User Limit Reached",
        description: `Your ${schoolInfo?.plan || 'current'} plan allows ${maxTeachers} teacher${maxTeachers === 1 ? '' : 's'}. Upgrade to add more teachers.`,
        variant: "destructive",
      });
      return;
    }

    addTeacherMutation.mutate({ 
      email: newTeacherEmail, 
      name: newTeacherName
    });
  };

  const handleResetPassword = () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please enter and confirm the new password",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate({
      teacherId: resetPasswordTeacher.id,
      newPassword: newPassword,
    });
  };

  const getMaxTeachersForPlan = (plan: string) => {
    switch (plan) {
      case 'free': return 10;
      case 'basic_10': return 10;
      case 'standard_25': return 25;
      case 'premium_50': return 50;
      case 'enterprise_unlimited': return 'Unlimited';
      default: return 10;
    }
  };

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Admin Panel</h2>
        <p className="text-sm text-muted-foreground">Configure school settings and system administration</p>
      </div>

      <div className="space-y-6">
        {/* Firebase Integration Status */}
        <FirebaseStatus />

        {/* Teacher Management - Admin Only */}
        {user.isAdmin && (
          <>
            {/* School Plan & User Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  School Plan & Limits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Current Plan</Label>
                    <Badge variant="outline" className="mt-1">
                      {schoolInfo?.plan?.replace('_', ' ').toUpperCase() || 'FREE'}
                    </Badge>
                  </div>
                  <div>
                    <Label>Teachers</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {teachers.length} / {getMaxTeachersForPlan(schoolInfo?.plan || 'free')}
                    </p>
                  </div>
                  <div>
                    <Label>School ID</Label>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {schoolInfo?.schoolId || 'Loading...'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Subscription & Billing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SubscriptionContent user={user} />
              </CardContent>
            </Card>

            {/* Add Teacher */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Add New Teacher
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!isAddingTeacher ? (
                    <Button 
                      onClick={() => setIsAddingTeacher(true)}
                      className="w-full"
                      data-testid="button-add-teacher"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Teacher
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="teacher-email">Teacher Email</Label>
                        <Input
                          id="teacher-email"
                          type="email"
                          value={newTeacherEmail}
                          onChange={(e) => setNewTeacherEmail(e.target.value)}
                          placeholder="teacher@school.edu"
                          data-testid="input-teacher-email"
                        />
                      </div>
                      <div>
                        <Label htmlFor="teacher-name">Teacher Name</Label>
                        <Input
                          id="teacher-name"
                          value={newTeacherName}
                          onChange={(e) => setNewTeacherName(e.target.value)}
                          placeholder="Teacher Name"
                          data-testid="input-teacher-name"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          onClick={handleAddTeacher}
                          disabled={addTeacherMutation.isPending}
                          data-testid="button-confirm-add-teacher"
                        >
                          {addTeacherMutation.isPending ? 'Adding...' : 'Add Teacher'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsAddingTeacher(false)}
                          data-testid="button-cancel-add-teacher"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {schoolInfo?.maxTeachers && teachers.length >= schoolInfo.maxTeachers && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        You've reached your plan limit of {schoolInfo.maxTeachers} teacher{schoolInfo.maxTeachers === 1 ? '' : 's'}. 
                        Upgrade your plan to add more teachers.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Current Teachers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Current Teachers ({teachers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teachers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No teachers added yet. Add your first teacher above.
                    </p>
                  ) : (
                    teachers.map((teacher: any) => (
                      <div 
                        key={teacher.id} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                        data-testid={`teacher-item-${teacher.email}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Mail className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{teacher.name}</p>
                            <p className="text-sm text-muted-foreground">{teacher.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={teacher.status === 'active' ? 'default' : 'secondary'}>
                            {teacher.status}
                          </Badge>
                          <Badge variant={teacher.isAdmin ? 'default' : 'outline'}>
                            {teacher.isAdmin ? 'Admin' : 'Teacher'}
                          </Badge>
                          
                          {/* Admin Management Actions - Allow management of all users except yourself when you're the only admin */}
                          {(teacher.id !== user?.id || teachers.filter((t: any) => t.isAdmin).length > 1) && (
                            <>
                              {teacher.isAdmin ? (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="text-orange-600 hover:text-orange-700"
                                      data-testid={`button-demote-admin-${teacher.email}`}
                                    >
                                      <UserMinus className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Demote Admin</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to demote {teacher.name} ({teacher.email}) from admin to teacher? 
                                        They will lose admin privileges and cannot access admin functions.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => demoteAdminMutation.mutate(teacher.id)}
                                        className="bg-orange-600 text-white hover:bg-orange-700"
                                      >
                                        Demote to Teacher
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="text-green-600 hover:text-green-700"
                                      data-testid={`button-promote-teacher-${teacher.email}`}
                                    >
                                      <UserPlus className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Promote to Admin</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to promote {teacher.name} ({teacher.email}) to admin? 
                                        They will gain full administrative privileges including the ability to manage other teachers and school settings.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => promoteTeacherMutation.mutate(teacher.id)}
                                        className="bg-green-600 text-white hover:bg-green-700"
                                      >
                                        Promote to Admin
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              
                              {/* Reset Password Button */}
                              <Dialog open={resetPasswordTeacher?.id === teacher.id} onOpenChange={(open) => !open && setResetPasswordTeacher(null)}>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-700"
                                    onClick={() => {
                                      setResetPasswordTeacher(teacher);
                                      setNewPassword('');
                                      setConfirmPassword('');
                                    }}
                                    data-testid={`button-reset-password-${teacher.email}`}
                                  >
                                    <Key className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Reset Password for {teacher.name}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="newPassword">New Password</Label>
                                      <Input
                                        id="newPassword"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password (min 6 characters)"
                                        data-testid="input-new-password"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                                      <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        data-testid="input-confirm-password"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button 
                                        onClick={handleResetPassword}
                                        disabled={resetPasswordMutation.isPending}
                                        data-testid="button-confirm-reset-password"
                                      >
                                        {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        onClick={() => setResetPasswordTeacher(null)}
                                        data-testid="button-cancel-reset-password"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
                              {/* Remove Teacher/Admin - Allow removal if not the last admin */}
                              {(!teacher.isAdmin || teachers.filter((t: any) => t.isAdmin).length > 1) && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      data-testid={`button-remove-teacher-${teacher.email}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove {teacher.isAdmin ? 'Admin' : 'Teacher'}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to remove {teacher.name} ({teacher.email}) from your school? 
                                        This action cannot be undone and will revoke their access to all school data.
                                        {teacher.isAdmin && ' They will lose all administrative privileges.'}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => removeTeacherMutation.mutate(teacher.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Remove {teacher.isAdmin ? 'Admin' : 'Teacher'}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>School Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  id="schoolName"
                  value={settings.schoolName}
                  onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                  data-testid="input-school-name"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teacher Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Teacher Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="teacherName">Name</Label>
                  <Input
                    id="teacherName"
                    value={user.name || ''}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-800"
                    data-testid="input-teacher-name"
                  />
                </div>
                <div>
                  <Label htmlFor="teacherEmail">Email</Label>
                  <Input
                    id="teacherEmail"
                    value={user.email || ''}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-800"
                    data-testid="input-teacher-email"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="schoolName">School</Label>
                <Input
                  id="schoolName"
                  value={user.schoolName || ''}
                  readOnly
                  className="bg-gray-50 dark:bg-gray-800"
                  data-testid="input-school-name-readonly"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grade Assignment for Teachers */}
        {!user.isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Grade Level Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select which grade levels you want access to. You can manage students and passes for these grades.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {grades.map((grade: any) => (
                    <div key={grade.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Checkbox
                        id={`grade-${grade.id}`}
                        checked={assignedGrades.includes(grade.name)}
                        onCheckedChange={(checked) => handleGradeAssignment(grade.name, !!checked)}
                        data-testid={`checkbox-grade-${grade.name}`}
                      />
                      <Label htmlFor={`grade-${grade.id}`} className="text-sm font-medium cursor-pointer">
                        Grade {grade.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {grades.length === 0 && (
                  <p className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 p-3 rounded">
                    No grades available yet. Add grades in the Roster tab first.
                  </p>
                )}
                {assignedGrades.length === 0 && grades.length > 0 && (
                  <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded">
                    Please select at least one grade to access student management features.
                  </p>
                )}
                {assignedGrades.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded">
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                      You have access to {assignedGrades.length} grade level{assignedGrades.length !== 1 ? 's' : ''}: {assignedGrades.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Button 
          onClick={handleSaveSettings}
          className="w-full"
          data-testid="button-save-settings"
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
}

// Subscription Content Component
function SubscriptionContent({ user }: { user: any }) {
  const { toast } = useToast();
  
  // Fetch subscription status
  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ['/api/subscription-status'],
    enabled: !!user
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/subscription/cancel"),
    onSuccess: (data: any) => {
      toast({
        title: "Subscription Cancelled",
        description: data?.message || "Subscription cancelled successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed", 
        description: error.message || "Failed to cancel subscription",
        variant: "destructive"
      });
    }
  });

  // Reactivate subscription mutation
  const reactivateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/subscription/reactivate"),
    onSuccess: (data: any) => {
      toast({
        title: "Subscription Reactivated",
        description: data?.message || "Subscription reactivated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Reactivation Failed",
        description: error.message || "Failed to reactivate subscription", 
        variant: "destructive"
      });
    }
  });

  // Customer portal mutation
  const portalMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/subscription/portal"),
    onSuccess: (data: any) => {
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Portal Access Failed",
        description: error.message || "Failed to open customer portal",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded mb-6"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const subscription = subscriptionData as any;
  const hasActiveSubscription = subscription?.status === 'active';
  const isCancelled = subscription?.status === 'canceled' || subscription?.cancel_at_period_end;
  const isTrialUser = !subscription?.subscriptionId || subscription?.status === 'trialing';

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
        <div>
          <p className="font-medium">Current Status</p>
          <p className="text-sm text-muted-foreground">
            {hasActiveSubscription ? 'Active Subscription' : 
             isCancelled ? 'Cancelled (Active until period end)' : 
             'Trial Account'}
          </p>
        </div>
        <Badge variant={hasActiveSubscription ? "default" : isCancelled ? "secondary" : "outline"}>
          {hasActiveSubscription ? 'Active' : isCancelled ? 'Cancelled' : 'Trial'}
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {hasActiveSubscription && !isCancelled && (
          <>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Manage Subscription
            </Button>
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              Cancel Subscription
            </Button>
          </>
        )}

        {isCancelled && (
          <Button 
            className="w-full"
            onClick={() => reactivateMutation.mutate()}
            disabled={reactivateMutation.isPending}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reactivate Subscription
          </Button>
        )}

        {isTrialUser && (
          <Button 
            className="w-full"
            onClick={() => window.open('/pricing', '_blank')}
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            View Pricing Plans & Upgrade
          </Button>
        )}
      </div>

      {/* Subscription Details */}
      {subscription && (
        <div className="text-xs text-muted-foreground space-y-1 mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
          {subscription.plan && (
            <div>Plan: {subscription.plan}</div>
          )}
          {subscription.current_period_end && (
            <div>
              {isCancelled ? 'Ends' : 'Renews'}: {new Date(subscription.current_period_end).toLocaleDateString()}
            </div>
          )}
          {subscription.amount && (
            <div>Amount: ${(subscription.amount / 100).toFixed(2)}</div>
          )}
        </div>
      )}

      {/* Simple Cancellation Link */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <a 
          href="/cancel-subscription" 
          target="_blank"
          className="text-sm text-red-600 hover:text-red-700 hover:underline"
          data-testid="link-cancel-subscription-admin"
        >
          Cancel Subscription →
        </a>
      </div>
    </div>
  );
}