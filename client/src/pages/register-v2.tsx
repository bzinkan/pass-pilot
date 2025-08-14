import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function RegisterV2() {
  const [schoolName, setSchoolName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [plan, setPlan] = useState<string>('TRIAL');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/register/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName, adminEmail, plan })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Registration initialization failed');
      }

      // Redirect to Stripe Checkout
      window.location.assign(data.url);
    } catch (error: any) {
      toast({
        title: "Registration Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Register Your School</CardTitle>
          <CardDescription>
            Get started with PassPilot V2 - Webhook-first registration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name</Label>
              <Input
                id="schoolName"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Enter your school name"
                required
                data-testid="input-schoolname"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@school.edu"
                required
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger data-testid="select-plan">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRIAL">Free Trial</SelectItem>
                  <SelectItem value="BASIC">Basic Plan</SelectItem>
                  <SelectItem value="SMALL">Small Plan</SelectItem>
                  <SelectItem value="MEDIUM">Medium Plan</SelectItem>
                  <SelectItem value="LARGE">Large Plan</SelectItem>
                  <SelectItem value="UNLIMITED">Unlimited Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              data-testid="button-submit"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                'Start Registration'
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900">How it works:</h3>
            <ol className="mt-2 text-sm text-blue-800 space-y-1">
              <li>1. Fill out the form above</li>
              <li>2. Complete payment with Stripe</li>
              <li>3. Your school will be automatically provisioned</li>
              <li>4. You'll receive login credentials via email</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}