import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { AlertTriangle, Users, CreditCard, Activity, Edit, Save, X } from 'lucide-react';

interface School {
  id: string;
  name: string;
  adminEmail: string;
  plan: string;
  status: string;
  maxTeachers: number;
  maxStudents: number;
  createdAt: string;
  trialEndDate?: string;
}

interface Payment {
  id: string;
  amountCents: number;
  currency: string;
  plan: string;
  status: string;
  createdAt: string;
}

interface SubscriptionEvent {
  id: string;
  event: string;
  previousPlan?: string;
  newPlan?: string;
  createdAt: string;
  schoolId: string;
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiRequest('POST', '/api/admin/login', { email, password });
      
      if (response.ok) {
        toast({
          title: "Login Successful",
          description: "Welcome to PassPilot Usage Tracker",
        });
        onSuccess();
      } else {
        const errorText = await response.text();
        setError('Invalid email or password');
      }
    } catch (err: any) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">PassPilot Admin Access</CardTitle>
          <p className="text-center text-gray-600">Usage Tracker Dashboard</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@passpilot.com"
                required
                data-testid="input-admin-email"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                data-testid="input-admin-password"
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm" data-testid="text-error">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              data-testid="button-admin-login"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminBootstrap({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('passpilotapp@gmail.com'); // Pre-filled for user
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest('POST', '/api/admin/bootstrap', { 
        email, 
        password 
      });
      
      if (response.ok) {
        toast({
          title: "Admin Account Created",
          description: "Your platform owner account is now active!",
        });
        onSuccess();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setError(errorData.error === 'bootstrap-closed' 
          ? 'Admin account already exists. Please use login instead.'
          : 'Failed to create admin account. Please try again.'
        );
      }
    } catch (err: any) {
      setError('Bootstrap failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Create Platform Owner Account</CardTitle>
          <p className="text-center text-gray-600">One-time setup for Usage Tracker</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Owner Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="passpilotapp@gmail.com"
                required
                data-testid="input-bootstrap-email"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                required
                data-testid="input-bootstrap-password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                data-testid="input-bootstrap-confirm"
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm" data-testid="text-bootstrap-error">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              data-testid="button-bootstrap-create"
            >
              {loading ? 'Creating Account...' : 'Create Admin Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function SchoolEditModal({ school, onSave, onCancel }: { 
  school: School; 
  onSave: (updates: Partial<School>) => void; 
  onCancel: () => void; 
}) {
  const [plan, setPlan] = useState(school.plan);
  const [status, setStatus] = useState(school.status);
  const [maxTeachers, setMaxTeachers] = useState(school.maxTeachers);
  const [maxStudents, setMaxStudents] = useState(school.maxStudents);

  const handleSave = () => {
    onSave({ plan, status, maxTeachers, maxStudents });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Edit School: {school.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="plan">Plan</Label>
            <select 
              id="plan"
              value={plan} 
              onChange={(e) => setPlan(e.target.value)}
              className="w-full p-2 border rounded"
              data-testid="select-edit-plan"
            >
              <option value="TRIAL">Trial</option>
              <option value="TEACHER_MONTHLY">Teacher Monthly</option>
              <option value="TEACHER_ANNUAL">Teacher Annual</option>
              <option value="SMALL_TEAM_MONTHLY">Small Team Monthly</option>
              <option value="SMALL_TEAM_ANNUAL">Small Team Annual</option>
              <option value="SMALL_SCHOOL">Small School</option>
              <option value="MEDIUM_SCHOOL">Medium School</option>
              <option value="LARGE_SCHOOL">Large School</option>
            </select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select 
              id="status"
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2 border rounded"
              data-testid="select-edit-status"
            >
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
          <div>
            <Label htmlFor="maxTeachers">Max Teachers</Label>
            <Input
              id="maxTeachers"
              type="number"
              value={maxTeachers}
              onChange={(e) => setMaxTeachers(Number(e.target.value))}
              data-testid="input-edit-teachers"
            />
          </div>
          <div>
            <Label htmlFor="maxStudents">Max Students</Label>
            <Input
              id="maxStudents"
              type="number"
              value={maxStudents}
              onChange={(e) => setMaxStudents(Number(e.target.value))}
              data-testid="input-edit-students"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} data-testid="button-save-edits">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" onClick={onCancel} data-testid="button-cancel-edits">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  const [schools, setSchools] = useState<School[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [authNeeded, setAuthNeeded] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const { toast } = useToast();

  const checkAdminStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/admin/status');
      if (response.ok) {
        const data = await response.json();
        setNeedsBootstrap(!data.hasAdmins);
      }
    } catch (error) {
      setNeedsBootstrap(true);
    }
  };

  const loadData = async () => {
    try {
      const [schoolsRes, paymentsRes, eventsRes] = await Promise.all([
        apiRequest('GET', '/api/admin/schools'),
        apiRequest('GET', '/api/admin/payments'),
        apiRequest('GET', '/api/admin/events'),
      ]);

      if ([schoolsRes, paymentsRes, eventsRes].some(r => r.status === 401)) {
        setAuthNeeded(true);
        return;
      }

      setSchools(await schoolsRes.json());
      setPayments(await paymentsRes.json());
      setEvents(await eventsRes.json());
      setAuthNeeded(false);
    } catch (error) {
      setAuthNeeded(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolEdit = async (schoolId: string, updates: Partial<School>) => {
    try {
      const response = await apiRequest('PATCH', `/api/admin/schools/${schoolId}`, updates);
      
      if (response.ok) {
        toast({
          title: "School Updated",
          description: "School details have been updated successfully.",
        });
        loadData();
        setEditingSchool(null);
      } else {
        toast({
          title: "Update Failed", 
          description: "Failed to update school details.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Update Error",
        description: "An error occurred while updating the school.",
        variant: "destructive"
      });
    }
  };

  const handleSchoolDelete = async (school: School) => {
    // Enhanced double confirmation as per security spec v3
    const confirmation = prompt(`⚠️ PERMANENT DELETE WARNING ⚠️\n\nThis will PERMANENTLY delete "${school.name}" and ALL associated data including:\n• All teachers and users (${school.maxTeachers} max)\n• All students and passes (${school.maxStudents} max)\n• All payment records and subscription history\n• All database entries (CASCADE DELETE)\n\nStripe subscription will be cancelled automatically.\n\nType the school name EXACTLY to confirm: "${school.name}"`);
    
    if (confirmation !== school.name) {
      toast({
        title: "Delete Cancelled",
        description: "School name confirmation did not match. No changes made.",
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/schools/${school.id}`, {
        method: 'DELETE',
        credentials: 'include', // Use secure session cookies
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "School Permanently Deleted",
          description: `${school.name} and all associated data have been permanently removed.`,
        });
        // Optimistically remove from UI
        setSchools(prev => prev.filter(s => s.id !== school.id));
        console.log(`✅ School deletion completed: ${result.id}`);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        toast({
          title: "Delete Failed",
          description: errorData.error === 'not_found' 
            ? 'School not found.' 
            : errorData.error === 'bad_id'
            ? 'Invalid school ID format.'
            : `Failed to delete school: ${errorData.detail || errorData.error}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Delete Error",
        description: "Network error occurred while deleting the school.",
        variant: "destructive"
      });
    }
  };

  const daysLeft = (dateStr?: string) => {
    if (!dateStr) return '';
    const ms = new Date(dateStr).getTime() - Date.now();
    return ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;
  };

  useEffect(() => {
    if (needsBootstrap) return;
    loadData();
  }, [needsBootstrap]);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (needsBootstrap) {
    return <AdminBootstrap onSuccess={() => { setNeedsBootstrap(false); loadData(); }} />;
  }

  if (authNeeded) {
    return <AdminLogin onSuccess={loadData} />;
  }

  // Calculate metrics
  const totalRevenue = payments.reduce((sum, p) => sum + p.amountCents, 0) / 100;
  const activeSchools = schools.filter(s => s.status === 'ACTIVE').length;
  const trialSchools = schools.filter(s => s.plan === 'TRIAL').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">PassPilot Usage Tracker</h1>
          <Button 
            variant="outline" 
            onClick={() => apiRequest('POST', '/api/admin/logout').then(() => setAuthNeeded(true))}
            data-testid="button-logout"
          >
            Logout
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-total-schools">{schools.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Schools</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="metric-active-schools">{activeSchools}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Schools</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="metric-trial-schools">{trialSchools}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="metric-total-revenue">
                ${totalRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schools Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Schools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">School</th>
                    <th className="text-left p-2">Admin Email</th>
                    <th className="text-left p-2">Plan</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Teachers</th>
                    <th className="text-left p-2">Students</th>
                    <th className="text-left p-2">Created</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school) => (
                    <tr key={school.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium" data-testid={`school-name-${school.id}`}>
                        {school.name}
                      </td>
                      <td className="p-2" data-testid={`school-email-${school.id}`}>
                        {school.adminEmail}
                      </td>
                      <td className="p-2" data-testid={`school-plan-${school.id}`}>
                        <span className={`px-2 py-1 rounded text-xs ${
                          school.plan === 'TRIAL' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {school.plan}
                        </span>
                      </td>
                      <td className="p-2" data-testid={`school-status-${school.id}`}>
                        <span className={`px-2 py-1 rounded text-xs ${
                          school.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          school.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {school.status}
                        </span>
                      </td>
                      <td className="p-2" data-testid={`school-teachers-${school.id}`}>{school.maxTeachers}</td>
                      <td className="p-2" data-testid={`school-students-${school.id}`}>{school.maxStudents}</td>
                      <td className="p-2" data-testid={`school-created-${school.id}`}>
                        {new Date(school.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingSchool(school)}
                            data-testid={`button-edit-${school.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSchoolDelete(school)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-delete-${school.id}`}
                          >
                            🗑️
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Amount</th>
                    <th className="text-left p-2">Plan</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 10).map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="p-2" data-testid={`payment-date-${payment.id}`}>
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-2 font-medium" data-testid={`payment-amount-${payment.id}`}>
                        ${(payment.amountCents / 100).toFixed(2)} {payment.currency.toUpperCase()}
                      </td>
                      <td className="p-2" data-testid={`payment-plan-${payment.id}`}>{payment.plan}</td>
                      <td className="p-2" data-testid={`payment-status-${payment.id}`}>
                        <span className={`px-2 py-1 rounded text-xs ${
                          payment.status === 'succeeded' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Edit School Modal */}
        {editingSchool && (
          <SchoolEditModal
            school={editingSchool}
            onSave={(updates) => handleSchoolEdit(editingSchool.id, updates)}
            onCancel={() => setEditingSchool(null)}
          />
        )}
      </div>
    </div>
  );
}