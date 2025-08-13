import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Crown, Shield, Key } from "lucide-react";

export default function SuperAdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Bootstrap form state
  const [bootstrapForm, setBootstrapForm] = useState({
    email: '',
    password: '',
    name: '',
    bootstrapToken: ''
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/login', loginForm),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setLocation('/super-admin/dashboard');
      toast({
        title: "Login Successful",
        description: "Welcome to PassPilot Super Admin panel.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive"
      });
    },
  });

  // Bootstrap mutation
  const bootstrapMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/bootstrap', bootstrapForm),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setLocation('/super-admin/dashboard');
      toast({
        title: "Bootstrap Successful",
        description: "Super admin account created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bootstrap Failed",
        description: error.message || "Failed to create super admin account",
        variant: "destructive"
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
  };

  const handleBootstrap = (e: React.FormEvent) => {
    e.preventDefault();
    bootstrapMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="absolute inset-0 bg-black/20" />
      
      <Card className="w-full max-w-md mx-4 relative z-10 border-slate-200 dark:border-slate-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
              <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Super Admin Access
          </CardTitle>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Platform-level administration for PassPilot
          </p>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Login</span>
              </TabsTrigger>
              <TabsTrigger value="bootstrap" className="flex items-center space-x-2">
                <Key className="h-4 w-4" />
                <span>Bootstrap</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@passpilot.com"
                    required
                    data-testid="input-login-email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter your password"
                    required
                    data-testid="input-login-password"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="bootstrap" className="mt-6">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-200">
                  <Key className="h-4 w-4" />
                  <span className="font-medium text-sm">Bootstrap Mode</span>
                </div>
                <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                  Create the first super admin account. This is only available when no admin accounts exist.
                </p>
              </div>
              
              <form onSubmit={handleBootstrap} className="space-y-4">
                <div>
                  <Label htmlFor="bootstrap-name">Full Name</Label>
                  <Input
                    id="bootstrap-name"
                    type="text"
                    value={bootstrapForm.name}
                    onChange={(e) => setBootstrapForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Super Admin Name"
                    required
                    data-testid="input-bootstrap-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="bootstrap-email">Email</Label>
                  <Input
                    id="bootstrap-email"
                    type="email"
                    value={bootstrapForm.email}
                    onChange={(e) => setBootstrapForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@passpilot.com"
                    required
                    data-testid="input-bootstrap-email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="bootstrap-password">Password</Label>
                  <Input
                    id="bootstrap-password"
                    type="password"
                    value={bootstrapForm.password}
                    onChange={(e) => setBootstrapForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Create a strong password"
                    required
                    data-testid="input-bootstrap-password"
                  />
                </div>
                
                <div>
                  <Label htmlFor="bootstrap-token">Bootstrap Token (Optional)</Label>
                  <Input
                    id="bootstrap-token"
                    type="password"
                    value={bootstrapForm.bootstrapToken}
                    onChange={(e) => setBootstrapForm(prev => ({ ...prev, bootstrapToken: e.target.value }))}
                    placeholder="Leave empty if not required"
                    data-testid="input-bootstrap-token"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Only required if ADMIN_BOOTSTRAP_TOKEN environment variable is set
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={bootstrapMutation.isPending}
                  data-testid="button-bootstrap"
                >
                  {bootstrapMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Super Admin Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 text-center">
            <Button 
              variant="link" 
              onClick={() => setLocation('/')}
              className="text-sm text-slate-600 dark:text-slate-400"
              data-testid="link-back-to-app"
            >
              ← Back to PassPilot
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}