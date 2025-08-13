import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Users, 
  School, 
  Activity, 
  Trash2, 
  Edit, 
  BarChart3, 
  Building, 
  UserCheck,
  LogOut,
  Plus,
  Crown
} from "lucide-react";

export default function SuperAdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Check authentication
  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: ['/api/super-admin/me'],
    retry: false,
  });

  // Fetch platform stats
  const { data: stats } = useQuery({
    queryKey: ['/api/super-admin/dashboard/stats'],
    enabled: !!authData?.authenticated,
  });

  // Fetch schools with stats
  const { data: schoolsData, isLoading: schoolsLoading } = useQuery({
    queryKey: ['/api/super-admin/dashboard/schools'],
    enabled: !!authData?.authenticated,
  });



  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/super-admin/logout', {}),
    onSuccess: () => {
      queryClient.clear();
      setLocation('/super-admin/login');
      toast({
        title: "Logged Out",
        description: "Successfully logged out of super admin panel.",
      });
    },
  });

  // Update school mutation
  const updateSchoolMutation = useMutation({
    mutationFn: (data: { schoolId: string; updates: any }) =>
      apiRequest('PATCH', `/api/super-admin/dashboard/schools/${data.schoolId}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard/schools'] });
      setShowEditDialog(false);
      setSelectedSchool(null);
      toast({
        title: "School Updated",
        description: "School information updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update school information.",
        variant: "destructive"
      });
    },
  });

  // Delete school mutation
  const deleteSchoolMutation = useMutation({
    mutationFn: (schoolId: string) =>
      apiRequest('DELETE', `/api/super-admin/dashboard/schools/${schoolId}`, { confirmDelete: true }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/dashboard/stats'] });
      setShowDeleteDialog(false);
      setSelectedSchool(null);
      setDeleteConfirmation("");
      toast({
        title: "School Deleted",
        description: `School and all related data deleted successfully. Removed: ${data.deletedCounts.users} users, ${data.deletedCounts.students} students, ${data.deletedCounts.passes} passes.`,
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete school.",
        variant: "destructive"
      });
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && (!authData?.authenticated || authError)) {
      console.log('Super Admin Dashboard: Authentication failed', { authData, authError });
      setLocation('/super-admin/login');
    }
  }, [authData, authLoading, authError, setLocation]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">Loading super admin panel...</p>
        </div>
      </div>
    );
  }

  if (!authData?.authenticated) {
    return null; // Will redirect via useEffect
  }

  const schools = schoolsData?.schools || [];

  const handleEditSchool = (school: any) => {
    setSelectedSchool(school);
    setShowEditDialog(true);
  };

  const handleDeleteSchool = (school: any) => {
    setSelectedSchool(school);
    setShowDeleteDialog(true);
  };

  const handleUpdateSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const updates = {
      name: formData.get('name'),
      plan: formData.get('plan'),
      maxTeachers: parseInt(formData.get('maxTeachers') as string),
      maxStudents: parseInt(formData.get('maxStudents') as string),
      verified: formData.get('verified') === 'true',
    };

    updateSchoolMutation.mutate({ schoolId: selectedSchool.id, updates });
  };

  const handleConfirmDelete = () => {
    if (!selectedSchool || deleteConfirmation !== 'DELETE') return;
    deleteSchoolMutation.mutate(selectedSchool.id);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Crown className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  PassPilot Super Admin
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Platform Management Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {authData.admin.name} ({authData.admin.email})
              </span>
              <Button
                onClick={() => logoutMutation.mutate()}
                variant="outline"
                size="sm"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSchools || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Accounts</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.trialAccounts || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Plans</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.paidPlans || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Schools List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Schools Management</span>
                  <Badge variant="secondary">{schools.length} schools</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {schoolsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                    <p>Loading schools...</p>
                  </div>
                ) : schools.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No schools found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {schools.map((school: any) => (
                      <div key={school.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{school.name}</h3>
                              <Badge variant={school.verified ? "default" : "secondary"}>
                                {school.verified ? "Verified" : "Unverified"}
                              </Badge>
                              <Badge variant="outline">{school.plan}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{school.adminEmail}</p>
                            <div className="flex space-x-4 text-xs text-gray-500 mt-2">
                              <span>{school.userCount} users</span>
                              <span>{school.studentCount} students</span>
                              <span>{school.activePassCount} active passes</span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleEditSchool(school)}
                              variant="outline"
                              size="sm"
                              data-testid={`button-edit-${school.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteSchool(school)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-delete-${school.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Money Tracker and Subscription Tracker */}
          <div className="space-y-6">
            {/* Money Tracker */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-green-600">Money Tracker</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Monthly Revenue</span>
                    <span className="text-lg font-bold text-green-600">
                      ${stats?.monthlyRevenue || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Annual Revenue</span>
                    <span className="text-lg font-bold text-green-600">
                      ${stats?.annualRevenue || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Revenue</span>
                    <span className="text-xl font-bold text-green-700">
                      ${stats?.totalRevenue || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Tracker */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-blue-600">Subscription Tracker</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">New Subscriptions (30d)</span>
                    <span className="text-lg font-bold text-green-600">
                      +{stats?.newSubscriptions || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Canceled Subscriptions (30d)</span>
                    <span className="text-lg font-bold text-red-600">
                      -{stats?.canceledSubscriptions || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Active Subscriptions</span>
                    <span className="text-xl font-bold text-blue-700">
                      {stats?.activeSubscriptions || 0}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 pt-2">
                    Net Growth: {((stats?.newSubscriptions || 0) - (stats?.canceledSubscriptions || 0)) > 0 ? '+' : ''}{(stats?.newSubscriptions || 0) - (stats?.canceledSubscriptions || 0)} this month
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit School Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit School</DialogTitle>
          </DialogHeader>
          {selectedSchool && (
            <form onSubmit={handleUpdateSchool} className="space-y-4">
              <div>
                <Label htmlFor="name">School Name</Label>
                <Input id="name" name="name" defaultValue={selectedSchool.name} required />
              </div>
              
              <div>
                <Label htmlFor="plan">Plan</Label>
                <Select name="plan" defaultValue={selectedSchool.plan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free_trial">Free Trial</SelectItem>
                    <SelectItem value="basic_10">Basic (10 users)</SelectItem>
                    <SelectItem value="standard_50">Standard (50 users)</SelectItem>
                    <SelectItem value="premium_unlimited">Premium (Unlimited)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="maxTeachers">Max Teachers</Label>
                <Input 
                  id="maxTeachers" 
                  name="maxTeachers" 
                  type="number" 
                  defaultValue={selectedSchool.maxTeachers} 
                  required 
                />
              </div>

              <div>
                <Label htmlFor="maxStudents">Max Students</Label>
                <Input 
                  id="maxStudents" 
                  name="maxStudents" 
                  type="number" 
                  defaultValue={selectedSchool.maxStudents} 
                  required 
                />
              </div>

              <div>
                <Label htmlFor="verified">Verification Status</Label>
                <Select name="verified" defaultValue={selectedSchool.verified.toString()}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Verified</SelectItem>
                    <SelectItem value="false">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateSchoolMutation.isPending}>
                  {updateSchoolMutation.isPending ? 'Updating...' : 'Update School'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete School Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete School</DialogTitle>
          </DialogHeader>
          {selectedSchool && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <p className="text-red-800 font-medium">⚠️ WARNING: This action cannot be undone!</p>
                <p className="text-red-700 text-sm mt-1">
                  This will permanently delete "{selectedSchool.name}" and ALL associated data including:
                  {selectedSchool.userCount} users, {selectedSchool.studentCount} students, 
                  {selectedSchool.activePassCount} active passes, and all historical data.
                </p>
              </div>
              
              <div>
                <Label htmlFor="deleteConfirmation">
                  Type "DELETE" to confirm:
                </Label>
                <Input
                  id="deleteConfirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Type DELETE to confirm"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeleteConfirmation("");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmDelete}
                  disabled={deleteConfirmation !== 'DELETE' || deleteSchoolMutation.isPending}
                  variant="destructive"
                >
                  {deleteSchoolMutation.isPending ? 'Deleting...' : 'Delete School'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}