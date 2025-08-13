import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function UpgradePlans() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<string>("trial");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setLocation("/");
      return;
    }
    fetchCurrentPlan();
  }, [user]);

  const fetchCurrentPlan = async () => {
    try {
      const response = await apiRequest("POST", "/api/subscription-status");
      const data = await response.json();
      setCurrentPlan(data.plan || "trial");
    } catch (error) {
      console.error("Failed to fetch current plan:", error);
    }
  };

  const handleUpgrade = async (planType: string) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/upgrade-subscription", {
        planType
      });
      const data = await response.json();
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: "Success",
          description: "Your plan has been updated successfully!",
        });
        fetchCurrentPlan();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upgrade plan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const plans = [
    {
      id: "small_team",
      name: "Small Team",
      price: "$29/month",
      features: [
        "Up to 200 students",
        "Up to 5 teachers",
        "Basic reporting",
        "Email support"
      ],
      recommended: currentPlan === "trial"
    },
    {
      id: "medium_school",
      name: "Medium School",
      price: "$79/month",
      features: [
        "Up to 1,000 students",
        "Up to 25 teachers",
        "Advanced reporting",
        "Priority support",
        "Custom branding"
      ],
      recommended: currentPlan === "small_team"
    },
    {
      id: "large_district",
      name: "Large District",
      price: "$199/month",
      features: [
        "Unlimited students",
        "Unlimited teachers",
        "Advanced analytics",
        "Dedicated support",
        "Custom integrations",
        "Multi-school management"
      ],
      recommended: currentPlan === "medium_school"
    }
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/billing-portal")}
              data-testid="button-back-billing"
            >
              ← Back to Billing
            </Button>
            <h1 className="text-3xl font-bold">Upgrade Your Plan</h1>
          </div>

          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">Current Plan:</span>
              <Badge variant="outline" className="capitalize">
                {currentPlan === "trial" ? "Free Trial" : currentPlan.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-blue-700">
              Choose a plan that fits your school's needs. All plans include our core hall pass management features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id}
                className={`relative ${plan.recommended ? 'border-primary shadow-lg' : ''}`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary">Recommended</Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold text-primary">{plan.price}</div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isLoading || plan.id === currentPlan}
                    className="w-full"
                    variant={plan.recommended ? "default" : "outline"}
                    data-testid={`button-upgrade-${plan.id}`}
                  >
                    {isLoading ? "Processing..." : 
                     plan.id === currentPlan ? "Current Plan" : 
                     `Upgrade to ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Need a Custom Plan?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Large districts or schools with special requirements can contact us for custom pricing and features.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href="mailto:passpilotapp@gmail.com" 
                    className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Contact Sales
                  </a>
                  <Button variant="outline">
                    Schedule Demo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}