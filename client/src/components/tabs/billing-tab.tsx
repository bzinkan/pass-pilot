import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Calendar, CreditCard, X, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BillingTabProps {
  user: any;
}

export function BillingTab({ user }: BillingTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch subscription status
  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ['/api/subscription-status'],
    enabled: !!user
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/subscription/cancel"),
    onSuccess: (data) => {
      toast({
        title: "Subscription Cancelled",
        description: data.message
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive"
      });
    }
  });

  // Reactivate subscription mutation
  const reactivateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/subscription/reactivate"),
    onSuccess: (data) => {
      toast({
        title: "Subscription Reactivated",
        description: data.message
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Reactivation Failed",
        description: error.message || "Failed to reactivate subscription",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount / 100);
  };

  const plans = [
    {
      name: "Basic",
      users: "3 users",
      price: "$6",
      annual: "$48/year",
      monthlySavings: "$24",
      features: ["3 teacher licenses", "Full feature access", "Email support", "All reporting tools"],
      current: true,
    },
    {
      name: "Small School",
      users: "10 users",
      price: "$35",
      annual: "$336/year",
      monthlySavings: "$84",
      features: ["10 teacher licenses", "Full feature access", "Email support", "All reporting tools"],
      current: false,
    },
    {
      name: "Medium School",
      users: "25 users", 
      price: "$75",
      annual: "$720/year",
      monthlySavings: "$180",
      features: ["25 teacher licenses", "Full feature access", "Email support", "All reporting tools"],
      current: false,
    },
    {
      name: "Large School",
      users: "50 users",
      price: "$120",
      annual: "$1,152/year",
      monthlySavings: "$288",
      features: ["50 teacher licenses", "Full feature access", "Email support", "All reporting tools"],
      current: false,
    },
    {
      name: "Unlimited",
      users: "Unlimited",
      price: "$180",
      annual: "$1,728/year",
      monthlySavings: "$432",
      features: ["Unlimited teachers", "Full feature access", "Email support", "All reporting tools"],
      current: false,
    },
  ];

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Billing & Subscription</h2>
        <p className="text-sm text-muted-foreground">Manage your subscription and billing information</p>
      </div>

      <div className="space-y-6">
        {/* Current Subscription Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="font-medium text-foreground">Current Subscription</h3>
              </div>
              <Badge 
                variant={subscriptionData?.hasActiveSubscription ? "default" : "secondary"}
                data-testid="subscription-status-badge"
              >
                {subscriptionData?.hasActiveSubscription ? 'Active' : subscriptionData?.isTrialAccount ? 'Free Trial' : 'Free Plan'}
              </Badge>
            </div>

            {subscriptionData?.hasActiveSubscription ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Plan</p>
                    <p className="text-sm text-muted-foreground capitalize">{subscriptionData.plan?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Amount</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(subscriptionData.amount, subscriptionData.currency)} 
                      <span className="text-xs">/{subscriptionData.interval}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Teacher Licenses</p>
                    <p className="text-sm text-muted-foreground">
                      {subscriptionData.maxTeachers === -1 ? 'Unlimited' : subscriptionData.maxTeachers}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Next Billing</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(subscriptionData.currentPeriodEnd)}
                    </p>
                  </div>
                </div>

                {/* Subscription Actions */}
                <div className="border-t pt-4">
                  {subscriptionData.cancelled ? (
                    <div className="space-y-3">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Your subscription has been cancelled and will end on {formatDate(subscriptionData.currentPeriodEnd)}.
                          You can reactivate it at any time before then.
                        </AlertDescription>
                      </Alert>
                      <Button 
                        onClick={() => reactivateMutation.mutate()}
                        disabled={reactivateMutation.isPending}
                        className="w-full"
                        data-testid="button-reactivate-subscription"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {reactivateMutation.isPending ? 'Reactivating...' : 'Reactivate Subscription'}
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your current billing period.')) {
                          cancelMutation.mutate();
                        }
                      }}
                      disabled={cancelMutation.isPending}
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      data-testid="button-cancel-subscription"
                    >
                      <X className="w-4 h-4 mr-2" />
                      {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Subscription'}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {subscriptionData?.isTrialAccount 
                    ? 'You are currently on a free trial with unlimited access.' 
                    : 'You are on the free plan with limited features.'}
                </p>
                <Button 
                  className="w-full" 
                  data-testid="button-upgrade-subscription"
                  onClick={() => window.open('/register', '_blank')}
                >
                  Upgrade to Paid Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Plans */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium text-foreground mb-4">Available Plans</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {plans.map((plan) => {
                const isCurrent = plan.name.toLowerCase().replace(' ', '_') === subscriptionData?.plan;
                return (
                  <Card key={plan.name} className={isCurrent ? "border-primary" : ""}>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <h4 className="font-medium text-foreground mb-1">{plan.name}</h4>
                        <p className="text-xs text-muted-foreground mb-3">{plan.users}</p>
                        <div className="text-2xl font-bold text-foreground mb-1">{plan.price}</div>
                        <p className="text-xs text-muted-foreground mb-1">per month</p>
                        <p className="text-xs text-green-600 dark:text-green-400 mb-1">{plan.annual}</p>
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-4">Save {plan.monthlySavings} annually</p>
                        
                        <ul className="text-xs text-muted-foreground space-y-1 mb-6">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></div>
                              {feature}
                            </li>
                          ))}
                        </ul>
                        
                        {isCurrent ? (
                          <Badge variant="secondary" className="w-full">Current Plan</Badge>
                        ) : (
                          <Button 
                            className="w-full" 
                            variant="outline"
                            onClick={() => window.open('/register', '_blank')}
                            data-testid={`button-select-${plan.name.toLowerCase().replace(' ', '-')}`}
                          >
                            Select Plan
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}