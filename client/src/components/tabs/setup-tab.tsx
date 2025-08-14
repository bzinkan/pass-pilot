import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, UserMinus, Users, Mail, Crown, AlertTriangle, Edit, Key, Settings } from "lucide-react";
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
  const [profileForm, setProfileForm] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  
  // Edit teacher state
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [editTeacherForm, setEditTeacherForm] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  
  // Password reset state
  const [resettingPasswordFor, setResettingPasswordFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
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

  const editTeacherMutation = useMutation({
    mutationFn: async ({ teacherId, updates }: { teacherId: string; updates: any }) => {
      const response = await apiRequest('PATCH', `/api/admin/teachers/${teacherId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teachers'] });
      setEditingTeacher(null);
      toast({
        title: "Teacher Updated",
        description: "Teacher information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update teacher",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ teacherId, password }: { teacherId: string; password: string }) => {
      const response = await apiRequest('POST', `/api/admin/teachers/${teacherId}/reset-password`, { password });
      return response.json();
    },
    onSuccess: () => {
      setResettingPasswordFor(null);
      setNewPassword('');
      toast({
        title: "Password Reset",
        description: "Teacher's password has been reset successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const response = await apiRequest('PATCH', '/api/profile', profileData);
      return response.json();
    },
    onSuccess: (data) => {
      setProfileForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      // Update user context if available
      if (data.user) {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      }
      toast({
        title: "Profile Updated",
        description: data.message || "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
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

  const handleEditTeacher = (teacher: any) => {
    setEditingTeacher(teacher);
    setEditTeacherForm({
      firstName: teacher.firstName || '',
      lastName: teacher.lastName || '',
      email: teacher.email || ''
    });
  };

  const handleSaveTeacherEdit = () => {
    if (!editingTeacher) return;
    
    editTeacherMutation.mutate({
      teacherId: editingTeacher.id,
      updates: editTeacherForm
    });
  };

  const handleResetPassword = (teacherId: string) => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }
    
    resetPasswordMutation.mutate({ teacherId, password: newPassword });
  };

  const handleUpdateProfile = () => {
    // Validate name changes
    const nameChanged = profileForm.firstName !== user.firstName || profileForm.lastName !== user.lastName;
    const passwordChanged = profileForm.newPassword.length > 0;
    
    if (!nameChanged && !passwordChanged) {
      toast({
        title: "No Changes",
        description: "Please make changes to update your profile",
        variant: "destructive",
      });
      return;
    }

    // Validate password if changing
    if (passwordChanged) {
      if (!profileForm.currentPassword) {
        toast({
          title: "Current Password Required",
          description: "Please enter your current password to change it",
          variant: "destructive",
        });
        return;
      }
      
      if (profileForm.newPassword.length < 6) {
        toast({
          title: "Password Too Short",
          description: "New password must be at least 6 characters long",
          variant: "destructive",
        });
        return;
      }
      
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        toast({
          title: "Passwords Don't Match",
          description: "New password and confirmation must match",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate name if changing
    if (nameChanged && (!profileForm.firstName.trim() || !profileForm.lastName.trim())) {
      toast({
        title: "Name Required",
        description: "Please enter both first and last name",
        variant: "destructive",
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    
    if (nameChanged) {
      updateData.firstName = profileForm.firstName.trim();
      updateData.lastName = profileForm.lastName.trim();
    }
    
    if (passwordChanged) {
      updateData.currentPassword = profileForm.currentPassword;
      updateData.newPassword = profileForm.newPassword;
    }

    updateProfileMutation.mutate(updateData);
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
                  School Plan & Billing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Current Plan</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        {schoolInfo?.plan?.replace('_', ' ').toUpperCase() || 'FREE'}
                      </Badge>
                      {schoolInfo?.plan && schoolInfo.plan !== 'trial' && schoolInfo.plan !== 'free' && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 p-0 h-auto"
                          onClick={() => window.open('mailto:support@passpilotsystem.com?subject=Cancellation Request&body=I would like to cancel my subscription for school: ' + encodeURIComponent(schoolInfo?.schoolName || ''), '_blank')}
                          data-testid="link-cancel-subscription"
                        >
                          Cancel Subscription
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Teachers</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {teachers.length} / {getMaxTeachersForPlan(schoolInfo?.plan || 'free')}
                    </p>
                  </div>
                  <div>
                    <Label>Support</Label>
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Need help? Contact support
                      </p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-blue-600 hover:text-blue-700 p-0 h-auto text-xs"
                        onClick={() => window.open('mailto:support@passpilotsystem.com?subject=Support Request&body=School: ' + encodeURIComponent(schoolInfo?.schoolName || '') + '%0ASchool ID: ' + encodeURIComponent(schoolInfo?.schoolId || ''), '_blank')}
                        data-testid="link-contact-support"
                      >
                        support@passpilotsystem.com
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Billing Actions for Paid Plans */}
                {schoolInfo?.plan && schoolInfo.plan !== 'trial' && schoolInfo.plan !== 'free' && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                      Subscription Management
                    </h4>
                    <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                      Need to cancel your subscription? Contact our support team for assistance with plan changes or cancellations.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                        onClick={() => window.open('mailto:support@passpilotsystem.com?subject=Cancellation Request&body=School: ' + encodeURIComponent(schoolInfo?.schoolName || '') + '%0ASchool ID: ' + encodeURIComponent(schoolInfo?.schoolId || '') + '%0APlan: ' + encodeURIComponent(schoolInfo?.plan || '') + '%0A%0AI would like to cancel my subscription.', '_blank')}
                        data-testid="button-cancel-subscription"
                      >
                        Cancel Subscription
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        onClick={() => window.open('mailto:support@passpilotsystem.com?subject=Plan Change Request&body=School: ' + encodeURIComponent(schoolInfo?.schoolName || '') + '%0ASchool ID: ' + encodeURIComponent(schoolInfo?.schoolId || '') + '%0ACurrent Plan: ' + encodeURIComponent(schoolInfo?.plan || '') + '%0A%0AI would like to change my plan.', '_blank')}
                        data-testid="button-change-plan"
                      >
                        Change Plan
                      </Button>
                    </div>
                  </div>
                )}
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
                          
                          {/* Edit Teacher Button */}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditTeacher(teacher)}
                            data-testid={`button-edit-teacher-${teacher.email}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          {/* Reset Password Button */}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setResettingPasswordFor(teacher.id)}
                            data-testid={`button-reset-password-${teacher.email}`}
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                          
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
            <p className="text-sm text-muted-foreground">Update your personal information and password</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Edit Name Section */}
              <div>
                <h4 className="text-sm font-medium mb-3">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editFirstName">First Name</Label>
                    <Input
                      id="editFirstName"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter first name"
                      data-testid="input-edit-first-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editLastName">Last Name</Label>
                    <Input
                      id="editLastName"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter last name"
                      data-testid="input-edit-last-name"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="teacherEmail">Email (Read Only)</Label>
                  <Input
                    id="teacherEmail"
                    value={user.email || ''}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-800"
                    data-testid="input-teacher-email"
                  />
                </div>
              </div>

              {/* Change Password Section */}
              <div>
                <h4 className="text-sm font-medium mb-3">Change Password</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={profileForm.currentPassword}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                      data-testid="input-current-password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={profileForm.newPassword}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password (min 6 characters)"
                      data-testid="input-new-password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={profileForm.confirmPassword}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                      data-testid="input-confirm-password"
                    />
                  </div>
                </div>
              </div>

              {/* Read-only School Info */}
              <div>
                <h4 className="text-sm font-medium mb-3">School Information</h4>
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

              {/* Save Profile Button */}
              <Button 
                onClick={handleUpdateProfile}
                disabled={updateProfileMutation.isPending}
                className="w-full"
                data-testid="button-update-profile"
              >
                {updateProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
              </Button>
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

        {/* Edit Teacher Dialog */}
        {editingTeacher && (
          <Dialog open={!!editingTeacher} onOpenChange={() => setEditingTeacher(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Teacher</DialogTitle>
                <DialogDescription>
                  Update teacher information for {editingTeacher.firstName} {editingTeacher.lastName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    value={editTeacherForm.firstName}
                    onChange={(e) => setEditTeacherForm({ ...editTeacherForm, firstName: e.target.value })}
                    data-testid="input-edit-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    value={editTeacherForm.lastName}
                    onChange={(e) => setEditTeacherForm({ ...editTeacherForm, lastName: e.target.value })}
                    data-testid="input-edit-last-name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editTeacherForm.email}
                    onChange={(e) => setEditTeacherForm({ ...editTeacherForm, email: e.target.value })}
                    data-testid="input-edit-email"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingTeacher(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveTeacherEdit}
                  disabled={editTeacherMutation.isPending}
                  data-testid="button-save-teacher-edit"
                >
                  {editTeacherMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Reset Password Dialog */}
        {resettingPasswordFor && (
          <Dialog open={!!resettingPasswordFor} onOpenChange={() => setResettingPasswordFor(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Set a new password for this teacher. They will be able to use this password to log in.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    data-testid="input-new-password"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setResettingPasswordFor(null);
                  setNewPassword('');
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleResetPassword(resettingPasswordFor)}
                  disabled={resetPasswordMutation.isPending}
                  data-testid="button-confirm-reset-password"
                >
                  {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}