import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, School } from "lucide-react";

type School = {
  id: string;
  name: string;
};

export default function LoginMulti() {
  const [step, setStep] = useState<'credentials' | 'school-selection'>('credentials');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiRequest('POST', '/api/auth/login-multi/step1', credentials);
      const data = await response.json();

      if (response.ok) {
        if (data.ok) {
          // Single school - redirect immediately
          toast({
            title: "Login Successful",
            description: `Welcome to ${data.user.schoolName}!`,
          });
          setLocation('/');
        } else if (data.needSchoolPick) {
          // Multiple schools - show selection
          setSchools(data.schools);
          setTempToken(data.tempToken || '');
          setStep('school-selection');
          toast({
            title: "Multiple Schools Found",
            description: "Please select which school app to access.",
          });
        }
      } else {
        toast({
          title: "Login Failed",
          description: data.error === 'INVALID_CREDENTIALS' 
            ? "Invalid email or password" 
            : "Login failed. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    if (!selectedSchool) {
      toast({
        title: "School Required",
        description: "Please select a school to continue.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest('POST', '/api/auth/login-multi/step2', {
        schoolId: selectedSchool,
        tempToken
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        const selectedSchoolName = schools.find(s => s.id === selectedSchool)?.name;
        toast({
          title: "Login Successful",
          description: `Welcome to ${selectedSchoolName}!`,
        });
        setLocation('/');
      } else {
        toast({
          title: "Login Failed",
          description: data.error === 'PENDING_EXPIRED' 
            ? "Session expired. Please start over." 
            : "School selection failed. Please try again.",
          variant: "destructive"
        });
        
        if (data.error === 'PENDING_EXPIRED') {
          setStep('credentials');
          setCredentials({ email: '', password: '' });
          setSchools([]);
          setSelectedSchool('');
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetLogin = () => {
    setStep('credentials');
    setCredentials({ email: '', password: '' });
    setSchools([]);
    setSelectedSchool('');
    setTempToken('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <School className="h-5 w-5" />
            {step === 'credentials' ? 'Login to PassPilot' : 'Select School'}
          </CardTitle>
          {step === 'school-selection' && (
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              You have access to multiple schools. Please choose which one to access.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {step === 'credentials' && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  required
                  data-testid="input-email"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  required
                  data-testid="input-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
                data-testid="button-login"
              >
                {loading ? 'Checking credentials...' : 'Continue'}
              </Button>
            </form>
          )}

          {step === 'school-selection' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Multiple Schools Found</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Logged in as: <strong>{credentials.email}</strong>
                </p>
              </div>

              <div>
                <Label htmlFor="school-select">Select School</Label>
                <Select onValueChange={setSelectedSchool} data-testid="select-school">
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your school..." />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleStep2}
                  className="flex-1" 
                  disabled={loading || !selectedSchool}
                  data-testid="button-access-school"
                >
                  {loading ? 'Accessing...' : 'Access School'}
                </Button>
                
                <Button 
                  onClick={resetLogin}
                  variant="outline"
                  disabled={loading}
                  data-testid="button-back"
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4 text-center space-y-2">
            <Button 
              variant="link" 
              onClick={() => setLocation('/register-v2')}
              data-testid="link-register"
            >
              Need an account? Register your school
            </Button>
            
            <Button 
              variant="link" 
              onClick={() => setLocation('/reset-password')}
              data-testid="link-reset"
            >
              Forgot password?
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}