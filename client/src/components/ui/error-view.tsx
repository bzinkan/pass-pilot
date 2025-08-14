/**
 * Error View Component
 * 
 * Provides consistent error states throughout the application
 */

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorViewProps {
  message?: string;
  description?: string;
  variant?: 'default' | 'minimal' | 'card';
  onRetry?: () => void;
  className?: string;
}

export function ErrorView({ 
  message = "Something went wrong",
  description,
  variant = 'default',
  onRetry,
  className
}: ErrorViewProps) {
  if (variant === 'minimal') {
    return (
      <div className={cn("text-red-600 text-sm", className)}>
        {message}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn(
        "border border-red-200 rounded-lg p-4 bg-red-50",
        className
      )}>
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">{message}</h3>
            {description && (
              <p className="text-sm text-red-700 mt-1">{description}</p>
            )}
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center",
      className
    )}>
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{message}</h3>
      {description && (
        <p className="text-gray-600 mb-4 max-w-md">{description}</p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Pre-built error views for common scenarios
 */
export const ErrorViews = {
  NotFound: ({ resource = "item" }: { resource?: string }) => (
    <ErrorView
      message={`${resource.charAt(0).toUpperCase() + resource.slice(1)} not found`}
      description={`The ${resource} you're looking for doesn't exist or has been removed.`}
    />
  ),

  NetworkError: ({ onRetry }: { onRetry?: () => void }) => (
    <ErrorView
      message="Connection failed"
      description="Unable to connect to the server. Please check your internet connection."
      onRetry={onRetry}
    />
  ),

  PermissionDenied: () => (
    <ErrorView
      message="Access denied"
      description="You don't have permission to view this content."
    />
  ),

  LoadingFailed: ({ resource = "data", onRetry }: { resource?: string; onRetry?: () => void }) => (
    <ErrorView
      message={`Failed to load ${resource}`}
      description="Something went wrong while loading. Please try again."
      onRetry={onRetry}
    />
  ),
};