import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, School, CreditCard, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Registration form schema
const registrationSchema = z.object({
  schoolName: z.string().min(2, 'School name must be at least 2 characters'),
  adminEmail: z.string().email('Please enter a valid email address'),
  plan: z.enum(['TRIAL', 'BASIC', 'SMALL', 'MEDIUM', 'LARGE', 'UNLIMITED']),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

// Plan configurations
const PLANS = {
  TRIAL: {
    name: 'Free Trial',
    price: 'Free for 30 days',
    features: ['Up to 10 teachers', 'Up to 500 students', 'Basic features'],
    icon: School,
    popular: false,
  },
  BASIC: {
    name: 'Basic',
    price: '$29/month',
    features: ['Up to 25 teachers', 'Up to 1,000 students', 'All features'],
    icon: Users,
    popular: true,
  },
  SMALL: {
    name: 'Small School',
    price: '$59/month',
    features: ['Up to 50 teachers', 'Up to 2,000 students', 'Priority support'],
    icon: Users,
    popular: false,
  },
  MEDIUM: {
    name: 'Medium School',
    price: '$99/month',
    features: ['Up to 100 teachers', 'Up to 5,000 students', 'Advanced features'],
    icon: Users,
    popular: false,
  },
  LARGE: {
    name: 'Large School',
    price: '$199/month',
    features: ['Up to 200 teachers', 'Up to 10,000 students', 'Custom integrations'],
    icon: Users,
    popular: false,
  },
  UNLIMITED: {
    name: 'Enterprise',
    price: 'Contact Sales',
    features: ['Unlimited teachers', 'Unlimited students', 'White-label solution'],
    icon: CreditCard,
    popular: false,
  },
};

interface RegistrationStatusProps {
  sessionId: string;
  onComplete: () => void;
}

function RegistrationStatus({ sessionId, onComplete }: RegistrationStatusProps) {
  const { toast } = useToast();
  
  const { data: status, isLoading } = useQuery({
    queryKey: ['registration-status', sessionId],
    queryFn: () => apiRequest(`/api/register/status?session_id=${sessionId}`),
    refetchInterval: (data) => {
      // Stop polling when registration is complete or failed
      return data?.status === 'ACTIVE' || data?.status === 'FAILED' ? false : 2000;
    },
    enabled: !!sessionId,
  });

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="registration-status-loading">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking registration status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status?.status === 'ACTIVE') {
    return (
      <Card className="w-full max-w-md mx-auto border-green-200" data-testid="registration-success">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-green-800">Registration Complete!</h3>
              <p className="text-sm text-green-600 mt-1">
                Your school "{status.registration?.schoolName}" has been set up successfully.
              </p>
            </div>
            <Button onClick={onComplete} className="w-full" data-testid="button-continue">
              Continue to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status?.status === 'FAILED') {
    return (
      <Card className="w-full max-w-md mx-auto border-red-200" data-testid="registration-failed">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <XCircle className="h-12 w-12 text-red-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Registration Failed</h3>
              <p className="text-sm text-red-600 mt-1">
                There was an issue processing your registration. Please try again or contact support.
              </p>
            </div>
            <Button onClick={() => window.location.href = '/register'} variant="outline" className="w-full" data-testid="button-retry">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // PENDING status
  return (
    <Card className="w-full max-w-md mx-auto" data-testid="registration-pending">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">Processing Registration</h3>
            <p className="text-sm text-gray-600 mt-1">
              Setting up your school account. This may take a few moments...
            </p>
          </div>
          <Badge variant="outline" data-testid="status-badge">
            Status: {status?.status || 'PENDING'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RegisterV2() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      schoolName: '',
      adminEmail: '',
      plan: 'TRIAL',
    },
  });

  const registrationMutation = useMutation({
    mutationFn: (data: RegistrationForm) => 
      apiRequest('/api/register/init', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      if (data.url) {
        // Redirect to Stripe checkout or demo success page
        window.location.href = data.url;
      } else if (data.sessionId) {
        // Demo mode - start status polling
        setSessionId(data.sessionId);
      }
    },
    onError: (error: any) => {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to start registration process',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: RegistrationForm) => {
    registrationMutation.mutate(data);
  };

  const handleComplete = () => {
    // Redirect to login page
    window.location.href = '/login';
  };

  // Show status polling if we have a session ID
  if (sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <RegistrationStatus sessionId={sessionId} onComplete={handleComplete} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="title-register">
            Register Your School
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Get started with PassPilot's digital hallway pass management system
          </p>
        </div>

        {/* Plan Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Object.entries(PLANS).map(([planKey, plan]) => {
            const Icon = plan.icon;
            const isSelected = form.watch('plan') === planKey;
            
            return (
              <Card 
                key={planKey}
                className={`cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-gray-300'
                } ${plan.popular ? 'border-blue-200 bg-blue-50' : ''}`}
                onClick={() => form.setValue('plan', planKey as any)}
                data-testid={`plan-${planKey.toLowerCase()}`}
              >
                <CardHeader className="text-center">
                  {plan.popular && (
                    <Badge className="w-fit mx-auto mb-2" data-testid="badge-popular">
                      Most Popular
                    </Badge>
                  )}
                  <Icon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="text-lg font-semibold text-blue-600">
                    {plan.price}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Registration Form */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle data-testid="form-title">School Information</CardTitle>
            <CardDescription>
              Enter your school details to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="schoolName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your school name" 
                          {...field}
                          data-testid="input-school-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adminEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Administrator Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="admin@yourschool.edu" 
                          {...field}
                          data-testid="input-admin-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selected Plan</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-plan">
                            <SelectValue placeholder="Select a plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(PLANS).map(([planKey, plan]) => (
                            <SelectItem key={planKey} value={planKey} data-testid={`option-${planKey.toLowerCase()}`}>
                              {plan.name} - {plan.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={registrationMutation.isPending}
                  data-testid="button-start-registration"
                >
                  {registrationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting Registration...
                    </>
                  ) : (
                    'Start Registration'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-sm text-gray-500">
          <p>
            By registering, you agree to our Terms of Service and Privacy Policy.
            Need help? Contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}