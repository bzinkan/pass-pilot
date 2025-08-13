import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function RegisterV2() {
  const [formData, setFormData] = useState({
    schoolName: '',
    adminName: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiRequest('POST', '/api/registration/v2/register', formData);
      
      if (response.ok) {
        const data = await response.json();
        
        // Store user data for demo login
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        
        toast({
          title: "Registration Successful!",
          description: data.message || "Welcome to PassPilot V2",
        });
        
        // Redirect to main app
        setLocation('/');
      } else {
        const error = await response.json();
        toast({
          title: "Registration Failed",
          description: error.detail || error.error || "Registration failed",
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

  const checkEmailAvailability = async () => {
    if (!formData.email || !formData.schoolName) return;

    try {
      const response = await apiRequest('GET', `/api/registration/v2/email-available?schoolName=${encodeURIComponent(formData.schoolName)}&email=${encodeURIComponent(formData.email)}`);
      const data = await response.json();
      setEmailAvailable(data.available);
    } catch (error) {
      console.warn('Email availability check failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Register Your School - V2</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Simplified registration with no email restrictions
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="schoolName">School Name</Label>
              <Input
                id="schoolName"
                type="text"
                value={formData.schoolName}
                onChange={(e) => setFormData(prev => ({ ...prev, schoolName: e.target.value }))}
                placeholder="Enter your school name"
                required
                data-testid="input-school-name"
              />
            </div>

            <div>
              <Label htmlFor="adminName">Admin Name</Label>
              <Input
                id="adminName"
                type="text"
                value={formData.adminName}
                onChange={(e) => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                placeholder="Your full name"
                data-testid="input-admin-name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email (Any Format Accepted)</Label>
              <Input
                id="email"
                type="text"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                onBlur={checkEmailAvailability}
                placeholder="Enter any email address"
                required
                data-testid="input-email"
              />
              {!emailAvailable && (
                <p className="text-sm text-red-600 mt-1">
                  Email already registered
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Choose a password"
                required
                data-testid="input-password"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !emailAvailable}
              data-testid="button-register"
            >
              {loading ? 'Creating Account...' : 'Register School'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button 
              variant="link" 
              onClick={() => setLocation('/login')}
              data-testid="link-login"
            >
              Already have an account? Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}