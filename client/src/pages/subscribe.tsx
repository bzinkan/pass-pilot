import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard } from 'lucide-react';
import { Link } from 'wouter';

// Load Stripe with public key
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/billing-success`,
      },
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "You are now subscribed to PassPilot!",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border rounded-lg bg-gray-50">
        <PaymentElement />
      </div>
      
      <div className="flex gap-3">
        <Button 
          type="button" 
          variant="outline" 
          asChild 
          className="flex-1"
          data-testid="button-back-to-plans"
        >
          <Link href="/register">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plans
          </Link>
        </Button>
        
        <Button 
          type="submit" 
          disabled={!stripe || isLoading} 
          className="flex-1"
          data-testid="button-complete-subscription"
        >
          {isLoading ? (
            <>
              <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Complete Subscription
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [planName, setPlanName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Get plan from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan');
    
    if (!plan) {
      setError("No subscription plan specified");
      return;
    }

    setPlanName(plan);

    // Create subscription with selected plan
    apiRequest("POST", "/api/get-or-create-subscription", { planId: plan })
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError(data.error || "Failed to initialize payment");
        }
      })
      .catch((error) => {
        console.error("Subscription error:", error);
        setError("Failed to initialize subscription");
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-600">Subscription Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{error}</p>
            <Button asChild data-testid="button-back-to-register">
              <Link href="/register">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Registration
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Setting up your subscription...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-center">
            Complete Your Subscription
          </CardTitle>
          <p className="text-center text-gray-600">
            Subscribing to: <span className="font-semibold">{planName}</span>
          </p>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <SubscribeForm />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
}