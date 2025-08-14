import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Users, Mail, UserCheck, Edit, Trash2, Shield, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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

interface AdminTabProps {
  user: any;
}

export function AdminTab({ user }: AdminTabProps) {
  const [showAddTeacherDialog, setShowAddTeacherDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [teacherForm, setTeacherForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
  });
  const { toast } = useToast();

  // Fetch teachers for this school
  const { data: teachers = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/teachers'],
  });

  // Add teacher mutation
  const addTeacherMutation = useMutation({
    mutationFn: (data: { email: string; firstName: string; lastName: string }) => 
      apiRequest('POST', '/api/admin/teachers', { 
        email: data.email, 
        name: `${data.firstName} ${data.lastName}` 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teachers'] });
      setTeacherForm({ email: '', firstName: '', lastName: '' });
      setShowAddTeacherDialog(false);
      toast({
        title: "Teacher invited successfully",
        description: "The teacher will receive login instructions via email.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to invite teacher",
        description: error.message || "An error occurred while inviting the teacher.",
        variant: "destructive",
      });
    },
  });

  // Remove teacher mutation
  const removeTeacherMutation = useMutation({
    mutationFn: (teacherId: string) => apiRequest('DELETE', `/api/admin/teachers/${teacherId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teachers'] });
      toast({
        title: "Teacher removed",
        description: "Teacher has been removed from the school.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove teacher",
        description: error.message || "An error occurred while removing the teacher.",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation (using demote then promote to reset)
  const resetPasswordMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      // For now, we'll set first login flag - need to add this endpoint
      return apiRequest('POST', `/api/admin/teachers/${teacherId}/reset-password`, {});
    },
    onSuccess: () => {
      toast({
        title: "Password reset",
        description: "Teacher will set new password on next login.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reset password",
        description: error.message || "An error occurred while resetting password.",
        variant: "destructive",
      });
    },
  });

  // Promote/demote admin mutation
  const toggleAdminMutation = useMutation({
    mutationFn: ({ teacherId, isAdmin }: { teacherId: string; isAdmin: boolean }) => 
      apiRequest('PATCH', `/api/admin/teachers/${teacherId}/${isAdmin ? 'promote' : 'demote'}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teachers'] });
      toast({
        title: "Role updated",
        description: "Teacher role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update role",
        description: error.message || "An error occurred while updating the role.",
        variant: "destructive",
      });
    },
  });

  // Update teacher mutation
  const updateTeacherMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest('PATCH', `/api/admin/teachers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teachers'] });
      setEditingTeacher(null);
      setTeacherForm({ email: '', firstName: '', lastName: '' });
      toast({
        title: "Teacher updated successfully",
        description: "Teacher information has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update teacher",
        description: error.message || "An error occurred while updating the teacher.",
        variant: "destructive",
      });
    },
  });

  const handleAddTeacher = () => {
    if (!teacherForm.email.trim() || !teacherForm.firstName.trim() || !teacherForm.lastName.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    addTeacherMutation.mutate(teacherForm);
  };

  const handleEditTeacher = (teacher: any) => {
    setEditingTeacher(teacher);
    setTeacherForm({
      email: teacher.email,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
    });
  };

  const handleUpdateTeacher = () => {
    if (!editingTeacher || !teacherForm.firstName.trim() || !teacherForm.lastName.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    updateTeacherMutation.mutate({
      id: editingTeacher.id,
      data: {
        firstName: teacherForm.firstName,
        lastName: teacherForm.lastName,
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingTeacher(null);
    setTeacherForm({ email: '', firstName: '', lastName: '' });
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="space-y-2">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teacher Management</h1>
          <p className="text-muted-foreground">
            Add and manage teachers for your school. New teachers will receive login instructions via email.
          </p>
        </div>
      </div>

      {/* Add Teacher Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <CardTitle>School Teachers</CardTitle>
          </div>
          <Dialog open={showAddTeacherDialog} onOpenChange={setShowAddTeacherDialog}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-add-teacher"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Teacher
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New Teacher</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="teacher-email">Email Address</Label>
                  <Input
                    id="teacher-email"
                    type="email"
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="teacher@school.edu"
                    data-testid="input-teacher-email"
                  />
                </div>
                <div>
                  <Label htmlFor="teacher-first-name">First Name</Label>
                  <Input
                    id="teacher-first-name"
                    value={teacherForm.firstName}
                    onChange={(e) => setTeacherForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                    data-testid="input-teacher-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="teacher-last-name">Last Name</Label>
                  <Input
                    id="teacher-last-name"
                    value={teacherForm.lastName}
                    onChange={(e) => setTeacherForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Smith"
                    data-testid="input-teacher-last-name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddTeacherDialog(false);
                    setTeacherForm({ email: '', firstName: '', lastName: '' });
                  }}
                  data-testid="button-cancel-add"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddTeacher}
                  disabled={addTeacherMutation.isPending}
                  data-testid="button-invite-teacher"
                >
                  {addTeacherMutation.isPending ? 'Inviting...' : 'Send Invitation'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No teachers added yet. Invite teachers to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  data-testid={`teacher-card-${teacher.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{teacher.firstName} {teacher.lastName}</h3>
                        {teacher.isAdmin && (
                          <Badge className="bg-purple-100 text-purple-800 text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {teacher.isFirstLogin && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Pending Setup
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {teacher.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTeacher(teacher)}
                      data-testid={`button-edit-${teacher.id}`}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetPasswordMutation.mutate(teacher.id)}
                      data-testid={`button-reset-password-${teacher.id}`}
                    >
                      Reset Password
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAdminMutation.mutate({ 
                        teacherId: teacher.id, 
                        isAdmin: !teacher.isAdmin 
                      })}
                      data-testid={`button-toggle-admin-${teacher.id}`}
                    >
                      {teacher.isAdmin ? 'Remove Admin' : 'Make Admin'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-remove-${teacher.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Teacher</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {teacher.firstName} {teacher.lastName} from the school? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeTeacherMutation.mutate(teacher.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove Teacher
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Teacher Dialog */}
      <Dialog open={!!editingTeacher} onOpenChange={() => handleCancelEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Teacher Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={teacherForm.email}
                disabled
                className="bg-muted"
                data-testid="input-edit-email"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>
            <div>
              <Label htmlFor="edit-first-name">First Name</Label>
              <Input
                id="edit-first-name"
                value={teacherForm.firstName}
                onChange={(e) => setTeacherForm(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="John"
                data-testid="input-edit-first-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-last-name">Last Name</Label>
              <Input
                id="edit-last-name"
                value={teacherForm.lastName}
                onChange={(e) => setTeacherForm(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Smith"
                data-testid="input-edit-last-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTeacher}
              disabled={updateTeacherMutation.isPending}
              data-testid="button-save-changes"
            >
              {updateTeacherMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}