import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'login' | 'register';
}

export function AuthModal({ open, onOpenChange, mode: initialMode = 'login' }: AuthModalProps) {

  const { login, registerSchool } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<'login' | 'register' | 'set-password'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [newTeacherInfo, setNewTeacherInfo] = useState<{email: string, name: string} | null>(null);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [registerForm, setRegisterForm] = useState({
    schoolName: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    plan: 'free_trial'
  });

  // Real-time email validation for auth modal - allow upgrades for paid plans
  useEffect(() => {
    const checkEmail = async () => {
      if (!registerForm.adminEmail || !registerForm.adminEmail.includes('@') || mode !== 'register') {
        setEmailExists(false);
        return;
      }

      setEmailChecking(true);
      try {
        // Allow upgrades by passing allowUpgrade=true for paid plans
        const isUpgradeFlow = registerForm.plan !== 'free' && registerForm.plan !== 'free_trial';
        const queryParam = isUpgradeFlow ? '?allowUpgrade=true' : '';
        const response = await apiRequest('GET', `/api/auth/check-email/${encodeURIComponent(registerForm.adminEmail)}${queryParam}`);
        const data = await response.json();
        setEmailExists(data.exists);
      } catch (error) {
        setEmailExists(false);
      } finally {
        setEmailChecking(false);
      }
    };

    const debounceTimer = setTimeout(checkEmail, 500);
    return () => clearTimeout(debounceTimer);
  }, [registerForm.adminEmail, registerForm.plan, mode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const result = await login(loginForm.email, loginForm.password);
      onOpenChange(false);
      setLoginForm({ email: '', password: '' });
      
      if (result?.message) {
        toast({
          title: "Welcome!",
          description: result.message,
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if email already exists for free trials only
    if (emailExists && registerForm.plan === 'free_trial') {
      toast({
        title: "Email Already Registered",
        description: "This email is already registered. Each email can only register for one free trial.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // For paid plans, redirect to full registration flow with payment
      if (registerForm.plan !== 'free' && registerForm.plan !== 'free_trial') {
        // Store form data in localStorage for the professional registration page
        localStorage.setItem('pendingRegistration', JSON.stringify(registerForm));
        onOpenChange(false);
        window.location.href = `/register?plan=${registerForm.plan}`;
        return;
      }

      // For free plans, register directly
      await registerSchool(registerForm);
      onOpenChange(false);
      setRegisterForm({
        schoolName: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        plan: 'free_trial'
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {mode === 'login' ? 'Sign In to PassPilot' : 
             mode === 'set-password' ? 'Set Your Password' : 
             'Register Your School'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === 'login' 
              ? 'Enter your email and password. New teachers: choose any password to get started.' 
              : 'Create a new school account to get started'
            }
          </DialogDescription>
        </DialogHeader>
        
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                type="email"
                id="email"
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
                placeholder="Enter password (new teachers: choose your password)"
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
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="schoolName">School Name</Label>
              <Input
                type="text"
                id="schoolName"
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
                placeholder="admin@lincolnelementary.edu"
                value={registerForm.adminEmail}
                onChange={(e) => setRegisterForm({ ...registerForm, adminEmail: e.target.value })}
                required
                className={emailExists ? "border-red-500 focus:border-red-500" : ""}
                data-testid="input-admin-email"
              />
              {emailChecking && registerForm.adminEmail && (
                <p className="text-sm text-gray-500 mt-1">Checking email availability...</p>
              )}
              {emailExists && (
                <Alert className="mt-2 border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {registerForm.plan === 'free_trial' 
                      ? "This email is already registered. Each email can only be used for one PassPilot account. Please use a different email address."
                      : "This email is already registered. For paid plans, existing users can upgrade - continue to payment."
                    }
                  </AlertDescription>
                </Alert>
              )}
              {!emailExists && !emailChecking && registerForm.adminEmail.includes('@') && (
                <p className="text-sm text-green-600 mt-1">✓ Email is available</p>
              )}
            </div>
            <div>
              <Label htmlFor="adminPassword">Password</Label>
              <Input
                type="password"
                id="adminPassword"
                placeholder="••••••••"
                value={registerForm.adminPassword}
                onChange={(e) => setRegisterForm({ ...registerForm, adminPassword: e.target.value })}
                required
                data-testid="input-admin-password"
              />
            </div>
            <div>
              <Label htmlFor="plan">Choose Plan</Label>
              <Select value={registerForm.plan} onValueChange={(value) => setRegisterForm({ ...registerForm, plan: value })}>
                <SelectTrigger data-testid="select-plan">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Demo Plan (Free)</SelectItem>
                  <SelectItem value="free_trial">30-Day Free Trial</SelectItem>
                  <SelectItem value="basic">Basic - 3 Teachers ($6/month)</SelectItem>
                  <SelectItem value="small_school">Small School - 10 Teachers ($35/month)</SelectItem>
                  <SelectItem value="medium_school">Medium School - 25 Teachers ($75/month)</SelectItem>
                  <SelectItem value="large_school">Large School - 50 Teachers ($120/month)</SelectItem>
                  <SelectItem value="unlimited">Unlimited Teachers ($180/month)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-secondary hover:bg-secondary/90" 
              disabled={isLoading || (emailExists && registerForm.plan === 'free_trial') || emailChecking}
              data-testid="button-register"
            >
              {isLoading ? "Registering..." : 
               emailChecking ? "Checking Email..." :
               emailExists && registerForm.plan === 'free_trial' ? "Email Already Used" :
               emailExists && registerForm.plan !== 'free_trial' ? "Upgrade Account" :
               "Register School"}
            </Button>
          </form>
        )}
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button 
                  className="text-primary hover:underline font-medium"
                  onClick={() => setMode('register')}
                  data-testid="button-switch-register"
                >
                  Register School
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button 
                  className="text-primary hover:underline font-medium"
                  onClick={() => setMode('login')}
                  data-testid="button-switch-login"
                >
                  Sign In
                </button>
              </>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
