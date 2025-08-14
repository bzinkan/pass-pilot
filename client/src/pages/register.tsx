import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { CheckCircle, Users, CreditCard, School, AlertTriangle } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

const subscriptionPlans = [
  {
    id: 'TRIAL',
    name: 'Free Trial',
    price: 0,
    teachers: 1,
    students: 200,
    description: '14-day full-featured trial',
    priceId: 'TRIAL',
    popular: true,
    features: [
      '14-day free trial',
      'No credit card required',
      'Up to 200 students',
      'All features included',
      'Email support'
    ]
  },
  {
    id: 'TEACHER_MONTHLY',
    name: 'Teacher Plan (Monthly)',
    price: 6,
    teachers: 1,
    students: 200,
    description: 'For individual classrooms',
    priceId: 'price_1Rtco7Bw14YCsyD6u5jnXzsw',
    popular: false,
    features: [
      'Individual teacher account',
      'Unlimited passes',
      'Up to 200 students',
      'All features included',
      'Email support'
    ]
  },
  {
    id: 'TEACHER_ANNUAL',
    name: 'Teacher Plan (Annual)',
    price: 60,
    teachers: 1,
    students: 200,
    description: 'For individual classrooms - Save 17%',
    priceId: 'price_1Rtco7Bw14YCsyD6LEmSd5ek',
    popular: false,
    features: [
      'Individual teacher account',
      'Unlimited passes',
      'Up to 200 students',
      'All features included',
      'Email support',
      '2 months free vs monthly'
    ]
  },
  {
    id: 'SMALL_TEAM_MONTHLY',
    name: 'Small Team (Monthly)',
    price: 25,
    teachers: 10,
    students: 1500,
    description: 'For departments & grade-level teams',
    priceId: 'price_1Rtq3Bw14YCsyD6s94Aj95z',
    popular: true,
    features: [
      'Up to 10 teacher accounts',
      'Unlimited passes',
      '1,500 students total',
      'All features included',
      'Priority support',
      'Admin dashboard'
    ]
  },
  {
    id: 'SMALL_TEAM_ANNUAL',
    name: 'Small Team (Annual)',
    price: 250,
    teachers: 10,
    students: 1500,
    description: 'For departments & grade-level teams - Save 17%',
    priceId: 'price_1RuILMBw14YCsyD6MuU96dpu',
    popular: false,
    features: [
      'Up to 10 teacher accounts',
      'Unlimited passes',
      '1,500 students total',
      'All features included',
      'Priority support',
      'Admin dashboard',
      '2 months free vs monthly'
    ]
  },
  {
    id: 'SMALL_SCHOOL',
    name: 'Small School (≤500 students)',
    price: 500,
    teachers: -1,
    students: 500,
    description: 'Annual plan for entire schools',
    priceId: 'price_1RuILMBw14YCsyD6MuU96dpu',
    popular: false,
    features: [
      'Unlimited teachers',
      'Unlimited passes',
      'Up to 500 students',
      'Admin dashboards',
      'Advanced reporting',
      'Priority support'
    ]
  },
  {
    id: 'MEDIUM_SCHOOL',
    name: 'Medium School (501-1,000 students)',
    price: 900,
    teachers: -1,
    students: 1000,
    description: 'Annual plan for growing schools',
    priceId: 'price_1RuIlM7Bw14YCsyD6TpMZ5yT4',
    popular: false,
    features: [
      'Unlimited teachers',
      'Unlimited passes',
      'Up to 1,000 students',
      'Admin dashboards',
      'Advanced reporting',
      'Priority support'
    ]
  },
  {
    id: 'LARGE_SCHOOL',
    name: 'Large School (1,001-2,000 students)',
    price: 1500,
    teachers: -1,
    students: 2000,
    description: 'Annual plan for large institutions',
    priceId: 'price_1RuIMeBw14YCsyD6kMEIEhTG',
    popular: false,
    features: [
      'Unlimited teachers',
      'Unlimited passes',
      'Up to 2,000 students',
      'Admin dashboards',
      'Advanced reporting',
      'Priority support'
    ]
  },

];

export default function Register() {
  const [step, setStep] = useState<'plan' | 'school' | 'payment'>('plan');
  const [selectedPlan, setSelectedPlan] = useState<typeof subscriptionPlans[0] | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [schoolData, setSchoolData] = useState({
    name: '',
    adminEmail: '',
    adminName: '',
    password: '',
    confirmPassword: ''
  });
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Real-time email validation - allow upgrades for existing users
  useEffect(() => {
    const checkEmail = async () => {
      if (!schoolData.adminEmail || !schoolData.adminEmail.includes('@')) {
        setEmailExists(false);
        return;
      }

      setEmailChecking(true);
      try {
        // Allow upgrades by passing allowUpgrade=true for paid plans
        const isUpgradeFlow = selectedPlan && selectedPlan.id !== 'TRIAL';
        const queryParam = isUpgradeFlow ? '?allowUpgrade=true' : '';
        const response = await apiRequest('GET', `/api/auth/check-email/${encodeURIComponent(schoolData.adminEmail)}${queryParam}`);
        const data = await response.json();
        setEmailExists(data.exists);
      } catch (error) {
        // If check fails, allow form submission to handle it server-side
        setEmailExists(false);
      } finally {
        setEmailChecking(false);
      }
    };

    const debounceTimer = setTimeout(checkEmail, 500);
    return () => clearTimeout(debounceTimer);
  }, [schoolData.adminEmail, selectedPlan]);

  const handlePlanSelect = (plan: typeof subscriptionPlans[0]) => {
    setSelectedPlan(plan);
    setStep('school');
  };

  const handleSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if email already exists for free trials only
    if (emailExists && selectedPlan?.id === 'TRIAL') {
      toast({
        title: "Email Already Registered",
        description: "This email is already registered. Each email can only register for one free trial.",
        variant: "destructive"
      });
      return;
    }
    
    if (schoolData.password !== schoolData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (!selectedPlan) return;

    setLoading(true);

    try {
      // CRITICAL: Use current form data to prevent step-back issues
      // Split adminName into first and last name to match backend schema
      const nameParts = schoolData.adminName.trim().split(' ');
      const adminFirstName = nameParts[0] || 'Admin';
      const adminLastName = nameParts.slice(1).join(' ') || 'User';
      
      const currentFormData = {
        schoolName: schoolData.name,
        adminEmail: schoolData.adminEmail,
        adminFirstName,
        adminLastName,
        adminPassword: schoolData.password,
        plan: selectedPlan.id
      };
      
      console.log('Submitting current form data:', currentFormData);
      
      // Use the main registration endpoint
      const response = await apiRequest('POST', '/api/auth/register', currentFormData);

      if (response.ok) {
        const data = await response.json();
        
        toast({
          title: data.isUpgrade ? "Plan Upgraded Successfully" : "Registration Successful",
          description: data.message || "Your account has been created successfully!",
        });
        
        if (data.isUpgrade) {
          // For upgrades, show special message and redirect to login to refresh features
          toast({
            title: "Logout Required",
            description: "Please log out and log back in to access all new plan features.",
            duration: 8000,
          });
          setLocation('/login');
        } else if (data.autoLogin) {
          // Trial users are auto-logged in, redirect to landing page
          console.log('Auto-login successful, redirecting to landing page');
          setLocation('/');
        } else {
          // Paid plans or manual verification required, go to login
          setLocation('/login');
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Registration Failed",
          description: errorData.message || "An error occurred during registration",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register school",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'plan') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
        <div className="max-w-6xl mx-auto py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
            <p className="text-lg text-gray-600">Select the perfect plan for your school</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {subscriptionPlans.map((plan) => (
              <Card key={plan.id} className={`relative cursor-pointer transition-all hover:shadow-lg ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold text-blue-600">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    {plan.id.includes('annual') ? 'per year' : 
                     plan.id.includes('school') && !plan.id.includes('team') ? 'annually' :
                     plan.price === 0 ? '14 days' : 'per month'}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    {plan.teachers === -1 ? 'Unlimited' : plan.teachers} teacher{plan.teachers !== 1 ? 's' : ''}
                    {plan.students && (
                      <div className="text-xs mt-1">
                        <School className="w-3 h-3 inline mr-1" />
                        {plan.students === -1 ? 'Unlimited' : `Up to ${plan.students}`} students
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-2">
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                  
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full"
                    onClick={() => handlePlanSelect(plan)}
                    data-testid={`button-select-${plan.id}`}
                  >
                    Select Plan
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" onClick={() => setLocation('/')}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'school') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
        <div className="max-w-2xl mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="w-6 h-6" />
                School Information
              </CardTitle>
              <p className="text-sm text-gray-600">
                Selected Plan: <Badge variant="outline">{selectedPlan?.name}</Badge> - ${selectedPlan?.price}/month
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSchoolSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="school-name">School Name</Label>
                  <Input
                    id="school-name"
                    type="text"
                    value={schoolData.name}
                    onChange={(e) => setSchoolData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your school name"
                    required
                    data-testid="input-school-name"
                  />
                </div>

                <div>
                  <Label htmlFor="admin-name">Administrator Name</Label>
                  <Input
                    id="admin-name"
                    type="text"
                    value={schoolData.adminName}
                    onChange={(e) => setSchoolData(prev => ({ ...prev, adminName: e.target.value }))}
                    placeholder="Enter administrator name"
                    required
                    data-testid="input-admin-name"
                  />
                </div>

                <div>
                  <Label htmlFor="admin-email">Administrator Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={schoolData.adminEmail}
                    onChange={(e) => setSchoolData(prev => ({ ...prev, adminEmail: e.target.value }))}
                    placeholder="admin@yourschool.org"
                    required
                    className={emailExists ? "border-red-500 focus:border-red-500" : ""}
                    data-testid="input-admin-email"
                  />
                  {emailChecking && schoolData.adminEmail && (
                    <p className="text-sm text-gray-500 mt-1">Checking email availability...</p>
                  )}
                  {emailExists && (
                    <Alert className="mt-2 border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        {selectedPlan?.id === 'TRIAL' 
                          ? "This email is already registered. Each email can only be used for one PassPilot account. Please use a different email address."
                          : "This email is already registered. For paid plans, existing users can upgrade - continue to payment."
                        }
                      </AlertDescription>
                    </Alert>
                  )}
                  {!emailExists && !emailChecking && schoolData.adminEmail.includes('@') && (
                    <p className="text-sm text-green-600 mt-1">✓ Email is available</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={schoolData.password}
                    onChange={(e) => setSchoolData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Create a secure password"
                    required
                    data-testid="input-password"
                  />
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={schoolData.confirmPassword}
                    onChange={(e) => setSchoolData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm your password"
                    required
                    data-testid="input-confirm-password"
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('plan')}
                    className="flex-1"
                  >
                    Back to Plans
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || (emailExists && selectedPlan?.id === 'TRIAL') || emailChecking}
                    className="flex-1"
                    data-testid="button-complete-registration"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {loading ? 'Processing...' : 
                     emailChecking ? 'Checking Email...' :
                     emailExists && selectedPlan?.id === 'TRIAL' ? 'Email Already Used' :
                     emailExists && selectedPlan?.id !== 'TRIAL' ? 'Upgrade Account' :
                     'Complete Registration'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}