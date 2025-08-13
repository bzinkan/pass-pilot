import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CancelSubscription() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  if (!user) {
    setLocation("/");
    return null;
  }

  const handleCancelSubscription = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/cancel-subscription");
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Subscription Cancelled",
          description: "Your subscription has been cancelled successfully. You'll retain access until the end of your billing period.",
        });
        setLocation("/billing-portal");
      } else {
        throw new Error(data.error || "Failed to cancel subscription");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/billing-portal")}
              data-testid="button-back-billing"
            >
              ← Back to Billing
            </Button>
            <h1 className="text-3xl font-bold">Cancel Subscription</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Cancel Your PassPilot Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-medium text-yellow-800 mb-2">Before you cancel:</h3>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• You'll lose access to all premium features</li>
                    <li>• Your data will be retained for 30 days in case you want to reactivate</li>
                    <li>• You can continue using the service until the end of your current billing period</li>
                    <li>• No refunds are available for partial billing periods</li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Need help instead?</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    If you're having issues, our support team is here to help. Many problems can be resolved without cancelling.
                  </p>
                  <a 
                    href="mailto:passpilotapp@gmail.com" 
                    className="text-primary hover:underline text-sm"
                  >
                    Contact Support: passpilotapp@gmail.com
                  </a>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Alternative Options:</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setLocation("/upgrade-plans")}
                      className="h-auto p-4 text-left"
                      data-testid="button-view-plans"
                    >
                      <div>
                        <div className="font-medium">Switch Plans</div>
                        <div className="text-sm text-muted-foreground">Find a plan that better fits your needs</div>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => setLocation("/billing-portal")}
                      className="h-auto p-4 text-left"
                      data-testid="button-pause-subscription"
                    >
                      <div>
                        <div className="font-medium">Manage Billing</div>
                        <div className="text-sm text-muted-foreground">Update payment method or pause subscription</div>
                      </div>
                    </Button>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        data-testid="button-confirm-cancel"
                      >
                        I Still Want to Cancel My Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will cancel your subscription. You'll continue to have access until the end of your current billing period, 
                          but you will not be charged again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-dialog">
                          Keep My Subscription
                        </AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleCancelSubscription}
                          disabled={isLoading}
                          className="bg-red-600 hover:bg-red-700"
                          data-testid="button-final-cancel"
                        >
                          {isLoading ? "Cancelling..." : "Yes, Cancel Subscription"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}