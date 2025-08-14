/**
 * Skeleton Loading Component
 * 
 * Provides consistent loading states throughout the application
 */

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'text' | 'avatar' | 'card';
  lines?: number;
}

export function Skeleton({ 
  className, 
  variant = 'default',
  lines = 1,
  ...props 
}: SkeletonProps & React.HTMLAttributes<HTMLDivElement>) {
  if (variant === 'text') {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(
              "animate-pulse rounded-md bg-muted",
              i === lines - 1 ? "h-4 w-3/4" : "h-4 w-full",
              className
            )}
            {...props}
          />
        ))}
      </div>
    );
  }

  if (variant === 'avatar') {
    return (
      <div
        className={cn(
          "animate-pulse rounded-full bg-muted h-10 w-10",
          className
        )}
        {...props}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="animate-pulse rounded-md bg-muted h-4 w-2/3" />
        <div className="space-y-2">
          <div className="animate-pulse rounded-md bg-muted h-3 w-full" />
          <div className="animate-pulse rounded-md bg-muted h-3 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted h-4 w-full", className)}
      {...props}
    />
  );
}

/**
 * Pre-built skeleton layouts for common patterns
 */
export const SkeletonLayouts = {
  List: ({ count = 3 }: { count?: number }) => (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton variant="avatar" />
          <div className="space-y-2 flex-1">
            <Skeleton variant="text" lines={1} />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  ),

  Table: ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
    <div className="space-y-3">
      <div className="flex space-x-4">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-6 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex space-x-4">
          {Array.from({ length: cols }, (_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  ),

  Card: ({ count = 1 }: { count?: number }) => (
    <div className="grid gap-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="border rounded-lg p-4">
          <Skeleton variant="card" />
        </div>
      ))}
    </div>
  ),
};