/**
 * Safe List Component
 * 
 * Example of defensive React UI pattern - never assumes data exists
 */

import { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorView } from '@/components/ui/error-view';
import { safeMap, hasItems } from '@/lib/ui-guards';

interface SafeListProps<T> {
  items?: T[] | null;
  isLoading?: boolean;
  error?: Error | string | null;
  renderItem: (item: T, index: number) => ReactNode;
  emptyMessage?: string;
  loadingCount?: number;
  className?: string;
  keyExtractor?: (item: T, index: number) => string;
}

/**
 * Students List - Example implementation following the pattern
 */
interface Student {
  id: string;
  name: string;
  grade?: string;
}

export function StudentsList({ 
  students = [] 
}: { 
  students?: Student[] 
}) {
  // Gate on data existence - stop rendering until data exists
  if (!hasItems(students)) {
    return <div className="text-gray-500 p-4">No students yet.</div>;
  }

  return (
    <ul className="space-y-2">
      {safeMap(students, (student) => (
        <li key={student.id} className="p-2 border rounded">
          {student.name}
          {student.grade && (
            <span className="text-gray-500 ml-2">({student.grade})</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Generic Safe List with full defensive programming
 */
export function SafeList<T>({
  items = [],
  isLoading = false,
  error = null,
  renderItem,
  emptyMessage = "No items found",
  loadingCount = 3,
  className = "",
  keyExtractor = (_, index) => `item-${index}`
}: SafeListProps<T>) {
  // Loading state - stop rendering until loading completes
  if (isLoading) {
    return (
      <div className={className} data-testid="list-loading">
        <Skeleton variant="text" lines={loadingCount} />
      </div>
    );
  }

  // Error state - provide fallback for errors
  if (error) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    return (
      <div className={className} data-testid="list-error">
        <ErrorView message="Could not load items" description={errorMessage} />
      </div>
    );
  }

  // Guard against null/undefined data
  if (!items) {
    return (
      <div className={className} data-testid="list-null">
        <div className="text-gray-500 p-4">{emptyMessage}</div>
      </div>
    );
  }

  // Empty array - provide meaningful empty state
  if (!hasItems(items)) {
    return (
      <div className={className} data-testid="list-empty">
        <div className="text-gray-500 p-4">{emptyMessage}</div>
      </div>
    );
  }

  // Safe rendering with guaranteed data
  return (
    <div className={className} data-testid="list-content">
      {safeMap(items, (item, index) => (
        <div key={keyExtractor(item, index)}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

/**
 * Example usage with TanStack Query pattern
 */
export function StudentsListWithQuery() {
  // This would typically come from useQuery
  const queryResult = {
    data: undefined as Student[] | undefined,
    isLoading: false,
    error: null as Error | null,
  };

  // For async queries - gate on loading states
  if (queryResult.isLoading) {
    return <Skeleton variant="text" lines={5} data-testid="students-loading" />;
  }

  if (queryResult.error) {
    return (
      <ErrorView 
        message="Could not load students" 
        description={queryResult.error.message}
        data-testid="students-error"
      />
    );
  }

  // Guard against missing data
  if (!queryResult.data) {
    return null; // or a guarded fallback
  }

  return <StudentsList students={queryResult.data} />;
}