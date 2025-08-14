import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useLocation, Link } from 'wouter';

export default function RegisterSuccess() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'PENDING' | 'ACTIVE' | 'FAILED'>('PENDING');
  const [isPolling, setIsPolling] = useState(true);
  
  // Get session_id from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('FAILED');
      setIsPolling(false);
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/register/status?session_id=${sessionId}`);
        const data = await response.json();
        
        if (response.ok && data.ok) {
          setStatus(data.status);
          if (data.status === 'ACTIVE' || data.status === 'FAILED') {
            setIsPolling(false);
          }
        }
      } catch (error) {
        console.error('Failed to check registration status:', error);
      }
    };

    // Poll immediately and then every 2 seconds
    pollStatus();
    const interval = setInterval(pollStatus, 2000);

    // Stop polling after 5 minutes
    const timeout = setTimeout(() => {
      setIsPolling(false);
      clearInterval(interval);
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [sessionId]);

  const getStatusIcon = () => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'FAILED':
        return <AlertCircle className="h-16 w-16 text-red-500" />;
      default:
        return <Clock className="h-16 w-16 text-blue-500 animate-pulse" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'ACTIVE':
        return {
          title: 'Registration Complete!',
          description: 'Your school has been successfully set up. You can now log in with your admin account.'
        };
      case 'FAILED':
        return {
          title: 'Registration Failed',
          description: 'Something went wrong during registration. Please contact support or try again.'
        };
      default:
        return {
          title: 'Setting up your school...',
          description: 'Please wait while we process your registration and set up your account.'
        };
    }
  };

  const statusMessage = getStatusMessage();

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Invalid Registration</CardTitle>
            <CardDescription className="text-center">
              No session ID found. Please start the registration process again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/register-v2">
              <Button>Start Registration</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex flex-col items-center space-y-4">
            {getStatusIcon()}
            <CardTitle className="text-center">{statusMessage.title}</CardTitle>
            <CardDescription className="text-center">
              {statusMessage.description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'PENDING' && isPolling && (
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking status...</span>
            </div>
          )}

          {status === 'ACTIVE' && (
            <Link href="/login">
              <Button className="w-full" data-testid="button-login">
                Go to Login
              </Button>
            </Link>
          )}

          {status === 'FAILED' && (
            <div className="space-y-2">
              <Link href="/register-v2">
                <Button className="w-full" variant="outline">
                  Try Again
                </Button>
              </Link>
              <p className="text-xs text-gray-500">
                Session ID: {sessionId}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}