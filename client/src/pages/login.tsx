import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { SchoolPicker } from "@/components/school-picker";

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password' | 'first-login'>('login');
  const [isLoading, setIsLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Multi-school login state
  const [requiresSchool, setRequiresSchool] = useState(false);
  const [availableSchools, setAvailableSchools] = useState<Array<{id: string, name: string}>>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');

  const [registerForm, setRegisterForm] = useState({
    schoolName: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    plan: 'free'
  });

  const [forgotPasswordForm, setForgotPasswordForm] = useState({
    email: ''
  });

  const [firstLoginForm, setFirstLoginForm] = useState({
    password: '',
    confirmPassword: ''
  });

  // Store first-time login info from backend
  const [firstLoginInfo, setFirstLoginInfo] = useState<{
    email: string;
    schoolId: string;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Read form data directly to avoid "one step behind" issue
      const formElement = e.currentTarget as HTMLFormElement;
      const formData = new FormData(formElement);
      const email = formData.get('email') as string || loginForm.email;
      const password = formData.get('password') as string || loginForm.password;
      
      console.log("LOGIN - FROM STATE:", loginForm);
      console.log("LOGIN - FROM FORM:", { email, password: '***' });
      
      // Direct API call to handle multi-school response
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Check if this is a first-time login scenario
        if (data.isFirstLogin) {
          setFirstLoginInfo({
            email: data.email,
            schoolId: data.schoolId
          });
          toast({
            title: "First Time Login",
            description: "Please set your password to continue.",
          });
          setMode('first-login');
          return;
        }
        throw new Error(data.error || 'Login failed');
      }
      
      if (data.requiresSchool) {
        // User has multiple schools - show school selector
        setRequiresSchool(true);
        setAvailableSchools(data.schools || []);
        if (data.schools && data.schools.length > 0) {
          setSelectedSchoolId(data.schools[0].id);
        }
        toast({
          title: "Multiple Schools Found",
          description: "Please select which school you want to access.",
        });
      } else if (data.success) {
        // Single school login success - redirect to app
        setLocation('/');
        toast({
          title: "Welcome!",
          description: "Successfully logged in!",
        });
      }
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchoolLogin = async (schoolId: string) => {
    if (!schoolId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          email: loginForm.email, 
          password: loginForm.password, 
          schoolId: schoolId 
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }
      
      setLocation('/');
      toast({
        title: "Welcome!",
        description: `Successfully logged in!`,
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Read form data directly to avoid "one step behind" issue
      const formElement = e.currentTarget as HTMLFormElement;
      const formData = new FormData(formElement);
      const currentRegisterData = {
        schoolName: formData.get('schoolName') as string || registerForm.schoolName,
        adminName: formData.get('adminName') as string || registerForm.adminName,
        adminEmail: formData.get('adminEmail') as string || registerForm.adminEmail,
        adminPassword: formData.get('adminPassword') as string || registerForm.adminPassword,
        plan: 'free_trial'
      };
      
      console.log("REGISTER - FROM STATE:", registerForm);
      console.log("REGISTER - FROM FORM:", { ...currentRegisterData, adminPassword: '***' });
      
      // Register school via API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentRegisterData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      // Clear any registration drafts after successful registration
      localStorage.removeItem('passpilot.registrationDraft');
      localStorage.removeItem('pendingRegistration');
      // No need to manually navigate - authentication state will handle routing
      toast({
        title: "Success!",
        description: "School registered successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordForm.email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message);
      }
      
      toast({
        title: "Reset Email Sent",
        description: "Check your email for password reset instructions.",
      });
      
      setMode('login');
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirstLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (firstLoginForm.password !== firstLoginForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    if (firstLoginForm.password.length < 6) {
      toast({
        title: "Error", 
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/first-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: firstLoginInfo?.email,
          password: firstLoginForm.password,
          schoolId: firstLoginInfo?.schoolId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to set password');
      }
      
      setLocation('/');
      toast({
        title: "Welcome!",
        description: "Password set successfully! You're now logged in.",
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show school picker if multi-school flow
  if (requiresSchool) {
    return (
      <SchoolPicker
        schools={availableSchools}
        email={loginForm.email}
        password={loginForm.password}
        onLogin={handleSchoolLogin}
        onBack={() => {
          setRequiresSchool(false);
          setAvailableSchools([]);
          setSelectedSchoolId('');
        }}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-id-card text-white text-2xl"></i>
          </div>
          <CardTitle className="text-2xl font-bold">
            {mode === 'login' ? 'Sign In to PassPilot' : 
             mode === 'forgot-password' ? 'Reset Your Password' : 
             mode === 'first-login' ? 'Set Your Password' :
             'Register Your School'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mode === 'first-login' ? (
            <form onSubmit={handleFirstLogin} className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Welcome! Since this is your first login, please set a password for your account.
              </div>
              
              <div>
                <Label htmlFor="firstPassword">New Password</Label>
                <Input
                  type="password"
                  id="firstPassword"
                  placeholder="••••••••"
                  value={firstLoginForm.password}
                  onChange={(e) => setFirstLoginForm({ ...firstLoginForm, password: e.target.value })}
                  required
                  minLength={6}
                  data-testid="input-first-password"
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  type="password"
                  id="confirmPassword"
                  placeholder="••••••••"
                  value={firstLoginForm.confirmPassword}
                  onChange={(e) => setFirstLoginForm({ ...firstLoginForm, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                  data-testid="input-confirm-password"
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-set-password">
                {isLoading ? "Setting Password..." : "Set Password & Sign In"}
              </Button>
              
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full" 
                onClick={() => setMode('login')}
                data-testid="button-back-to-login"
              >
                Back to Login
              </Button>
            </form>
          ) : mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="teacher@school.edu"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                  data-testid="input-email"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                  data-testid="input-password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
              
              <div className="flex justify-between items-center">
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-sm text-muted-foreground hover:text-foreground p-0"
                  onClick={() => setMode('forgot-password')}
                  data-testid="button-forgot-password"
                >
                  Forgot Password?
                </Button>
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-sm text-muted-foreground hover:text-foreground p-0"
                  onClick={() => setMode('register')}
                  data-testid="button-register-link"
                >
                  Register School
                </Button>
              </div>
            </form>
          ) : mode === 'forgot-password' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="forgot-email">Email Address</Label>
                <Input
                  type="email"
                  id="forgot-email"
                  placeholder="teacher@school.edu"
                  value={forgotPasswordForm.email}
                  onChange={(e) => setForgotPasswordForm({ ...forgotPasswordForm, email: e.target.value })}
                  required
                  data-testid="input-forgot-email"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-send-reset"
              >
                {isLoading ? "Sending Reset Email..." : "Send Reset Email"}
              </Button>
              
              <div className="flex justify-center">
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setMode('login')}
                  data-testid="button-back-to-login"
                >
                  Back to Sign In
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  type="text"
                  id="schoolName"
                  name="schoolName"
                  placeholder="Lincoln Elementary School"
                  value={registerForm.schoolName}
                  onChange={(e) => setRegisterForm({ ...registerForm, schoolName: e.target.value })}
                  required
                  data-testid="input-school-name"
                />
              </div>
              <div>
                <Label htmlFor="adminName">Administrator Name</Label>
                <Input
                  type="text"
                  id="adminName"
                  name="adminName"
                  placeholder="Principal Smith"
                  value={registerForm.adminName}
                  onChange={(e) => setRegisterForm({ ...registerForm, adminName: e.target.value })}
                  required
                  data-testid="input-admin-name"
                />
              </div>
              <div>
                <Label htmlFor="adminEmail">Administrator Email</Label>
                <Input
                  type="email"
                  id="adminEmail"
                  name="adminEmail"
                  placeholder="admin@lincolnelementary.edu"
                  value={registerForm.adminEmail}
                  onChange={(e) => setRegisterForm({ ...registerForm, adminEmail: e.target.value })}
                  required
                  data-testid="input-admin-email"
                />
              </div>
              <div>
                <Label htmlFor="adminPassword">Password</Label>
                <Input
                  type="password"
                  id="adminPassword"
                  name="adminPassword"
                  placeholder="••••••••"
                  value={registerForm.adminPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, adminPassword: e.target.value })}
                  required
                  data-testid="input-admin-password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-secondary hover:bg-secondary/90" 
                disabled={isLoading}
                data-testid="button-register"
              >
                {isLoading ? "Registering..." : "Register School"}
              </Button>
              
              <div className="flex justify-center">
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setMode('login')}
                  data-testid="button-back-to-login-from-register"
                >
                  Back to Sign In
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
