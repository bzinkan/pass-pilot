import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function BillingPortal() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLocation("/");
      return;
    }
    fetchSubscriptionData();
  }, [user]);

  const fetchSubscriptionData = async () => {
    try {
      const response = await apiRequest("POST", "/api/subscription-status");
      const data = await response.json();
      setSubscriptionData(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load subscription data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripePortal = async () => {
    try {
      const response = await apiRequest("POST", "/api/create-customer-portal");
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open billing portal",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/")}
              data-testid="button-back-home"
            >
              ← Back to App
            </Button>
            <h1 className="text-3xl font-bold">Billing Portal</h1>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Subscription Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge variant={subscriptionData?.isActive ? "default" : "secondary"}>
                    {subscriptionData?.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                
                {subscriptionData?.plan && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Plan:</span>
                    <span>{subscriptionData.plan}</span>
                  </div>
                )}

                {subscriptionData?.nextPaymentDate && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Next Payment:</span>
                    <span>{new Date(subscriptionData.nextPaymentDate).toLocaleDateString()}</span>
                  </div>
                )}

                {subscriptionData?.cancelAtPeriodEnd && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Your subscription is scheduled for cancellation at the end of the current billing period.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage Your Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={handleStripePortal}
                  className="w-full"
                  data-testid="button-stripe-portal"
                >
                  Open Stripe Billing Portal
                </Button>
                
                <p className="text-sm text-muted-foreground">
                  The Stripe billing portal allows you to:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Update payment methods</li>
                  <li>• View invoices and payment history</li>
                  <li>• Update billing information</li>
                  <li>• Cancel or modify your subscription</li>
                  <li>• Download receipts</li>
                </ul>

                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation("/cancel-subscription")}
                    className="w-full text-red-600 hover:text-red-700"
                    data-testid="button-cancel-subscription"
                  >
                    Cancel Subscription
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}