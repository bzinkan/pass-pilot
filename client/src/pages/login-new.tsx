import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { SchoolPicker } from "@/components/school-picker";
import { useAuth } from "@/hooks/use-auth";

export default function Login() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'first-login'>('login');
  const [isLoading, setIsLoading] = useState(false);
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation('/app');
    }
  }, [user, setLocation]);

  // Multi-school login state
  const [requiresSchool, setRequiresSchool] = useState(false);
  const [availableSchools, setAvailableSchools] = useState<Array<{id: string, name: string}>>([]);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [registerForm, setRegisterForm] = useState({
    schoolName: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    plan: 'TRIAL'
  });

  const [firstLoginForm, setFirstLoginForm] = useState({
    password: '',
    confirmPassword: ''
  });

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
          email: loginForm.email, 
          password: firstLoginForm.password,
          schoolId: availableSchools[0]?.id // Use first school if multiple
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to set password');
      }
      
      // Successful first login - trigger auth state update
      window.location.reload(); // This will cause useAuth to re-check the session
      
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginForm.email, password: loginForm.password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Check if this is a first-time login scenario
        if (data.isFirstLogin) {
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
        toast({
          title: "Multiple Schools Found",
          description: "Please select which school you want to access.",
        });
        return;
      }
      
      // Successful login - trigger auth state update by reloading the page or triggering a re-check
      window.location.reload(); // This will cause useAuth to re-check the session
      
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
      
      // Successful login - trigger auth state update by reloading the page
      window.location.reload(); // This will cause useAuth to re-check the session
      
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      toast({
        title: "Registration Successful!",
        description: "Your school has been registered successfully.",
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
             mode === 'first-login' ? 'Set Your Password' :
             'Register Your School'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mode === 'login' ? (
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
              
              <div className="flex justify-center">
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setMode('register')}
                  data-testid="button-register-link"
                >
                  Register Your School
                </Button>
              </div>
            </form>
          ) : mode === 'first-login' ? (
            <form onSubmit={handleFirstLogin} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Welcome! Please set your password to access PassPilot.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Email: {loginForm.email}
                </p>
              </div>
              <div>
                <Label htmlFor="firstPassword">Choose Password</Label>
                <Input
                  type="password"
                  id="firstPassword"
                  name="firstPassword"
                  placeholder="••••••••"
                  value={firstLoginForm.password}
                  onChange={(e) => setFirstLoginForm({ ...firstLoginForm, password: e.target.value })}
                  required
                  data-testid="input-first-password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={firstLoginForm.confirmPassword}
                  onChange={(e) => setFirstLoginForm({ ...firstLoginForm, confirmPassword: e.target.value })}
                  required
                  data-testid="input-confirm-password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-set-password"
              >
                {isLoading ? "Setting Password..." : "Set Password & Continue"}
              </Button>
              
              <div className="flex justify-center">
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setMode('login')}
                  data-testid="button-back-to-login"
                >
                  Back to Login
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="adminFirstName">First Name</Label>
                  <Input
                    type="text"
                    id="adminFirstName"
                    name="adminFirstName"
                    placeholder="John"
                    value={registerForm.adminFirstName}
                    onChange={(e) => setRegisterForm({ ...registerForm, adminFirstName: e.target.value })}
                    required
                    data-testid="input-admin-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="adminLastName">Last Name</Label>
                  <Input
                    type="text"
                    id="adminLastName"
                    name="adminLastName"
                    placeholder="Smith"
                    value={registerForm.adminLastName}
                    onChange={(e) => setRegisterForm({ ...registerForm, adminLastName: e.target.value })}
                    required
                    data-testid="input-admin-last-name"
                  />
                </div>
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
                  data-testid="button-back-to-login"
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