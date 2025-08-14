import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function BillingSuccess() {
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sid = urlParams.get('session_id');
    setSessionId(sid);

    // Check if we have error parameters indicating failed auto-login
    const errorParam = urlParams.get('error');
    if (errorParam) {
      console.warn('Auto-login failed, redirecting to login:', errorParam);
      setLocation('/login?error=' + errorParam);
      return;
    }

    // If we have a session_id, the server should have handled auto-login
    // Redirect to main app after 3 seconds to let authentication settle
    const timer = setTimeout(() => {
      setLocation('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Thank you for subscribing to PassPilot! Your account has been activated and you now have full access to all features.
          </p>
          
          {sessionId && (
            <p className="text-sm text-gray-500">
              Session ID: {sessionId.substring(0, 20)}...
            </p>
          )}

          <div className="space-y-3 pt-4">
            <Button asChild className="w-full" data-testid="button-continue">
              <Link href="/">
                <ArrowRight className="w-4 h-4 mr-2" />
                Continue to PassPilot
              </Link>
            </Button>
            
            <p className="text-sm text-gray-500">
              You will be redirected automatically in a few seconds...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}