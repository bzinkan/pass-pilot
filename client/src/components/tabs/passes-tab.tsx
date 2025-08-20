import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton, SkeletonLayouts } from "@/components/ui/skeleton";
import { ErrorView } from "@/components/ui/error-view";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { safeMap, hasItems } from "@/lib/ui-guards";

interface PassesTabProps {
  user: any;
  selectedGrades?: Set<string>;
}

export function PassesTab({ user, selectedGrades = new Set() }: PassesTabProps) {
  const { data: passes, isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ['/api/passes/active', { teacherId: user?.id }],
    queryFn: () => {
      const url = new URL('/api/passes/active', window.location.origin);
      if (user?.id) {
        url.searchParams.set('teacherId', user.id);
      }
      return fetch(url.toString(), {
        credentials: 'include', // Include cookies for authentication
      }).then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch passes: ${res.status} ${res.statusText}`);
        }
        return res.json();
      });
    },
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });
  const [filterType, setFilterType] = useState<string>("all");

  // Gate on loading states - stop rendering until data exists
  if (isLoading) {
    return (
      <div className="p-4" data-testid="passes-loading">
        <SkeletonLayouts.List count={4} />
      </div>
    );
  }

  // Error state - provide fallback for errors
  if (error) {
    return (
      <div className="p-4" data-testid="passes-error">
        <ErrorView 
          message="Could not load passes" 
          description={error.message}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Guard against missing data - never assume arrays exist
  if (!passes) {
    return null; // guarded fallback
  }

  const formatDuration = (issuedAt: string | Date | null | undefined) => {
    if (!issuedAt) return "Unknown";
    
    try {
      const now = new Date();
      const issued = new Date(issuedAt);
      
      // Check if date is valid
      if (isNaN(issued.getTime())) {
        return "Unknown";
      }
      
      const diffMs = now.getTime() - issued.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} min`;
    } catch (error) {
      return "Unknown";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-pink-100 text-pink-600',
      'bg-green-100 text-green-600',
      'bg-purple-100 text-purple-600',
      'bg-yellow-100 text-yellow-600',
      'bg-red-100 text-red-600'
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  const getPassTypeBadge = (passType: string) => {
    switch (passType) {
      case 'nurse':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Nurse</Badge>;
      case 'discipline':
        return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">Discipline</Badge>;
      case 'general':
      default:
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">General</Badge>;
    }
  };

  // Safe filtering - filter passes based on selected type and teacher's selected grades
  const filteredPasses = safeMap(passes, (pass: any) => pass).filter((pass: any) => {
    // First filter by pass type
    const typeMatch = filterType === "all" || pass.passType === filterType;
    
    // Then filter by selected grades - only show students from grades the teacher has selected
    const gradeMatch = selectedGrades.size === 0 || selectedGrades.has(pass.student?.grade);
    
    return typeMatch && gradeMatch;
  });

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Current Passes</h2>
        <p className="text-sm text-muted-foreground">Students currently checked out</p>
      </div>

      {/* Filter and Status Section */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
            <span className="text-muted-foreground">Live updates enabled</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-sm text-muted-foreground">
              Showing {filteredPasses.length} of {passes.length} passes
            </div>
            {selectedGrades.size > 0 && (
              <div className="text-xs text-blue-600 font-medium">
                Viewing grades: {Array.from(selectedGrades).sort().join(', ')}
              </div>
            )}
            {selectedGrades.size === 0 && (
              <div className="text-xs text-orange-600 font-medium">
                No grades selected - select grades in Roster tab to view passes
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Filter by type:</span>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="nurse">Nurse</SelectItem>
              <SelectItem value="discipline">Discipline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3" data-testid="active-passes-list">
        {filteredPasses.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <i className="fas fa-check-circle text-secondary text-2xl mb-2"></i>
              <p className="text-sm text-muted-foreground">
                {passes.length === 0 
                  ? "All students are in class" 
                  : `No ${filterType === 'all' ? '' : filterType + ' '}passes currently active`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPasses.map((pass: any) => (
            <Card key={pass.id} className="shadow-sm" data-testid={`pass-card-${pass.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getAvatarColor(`${pass.student?.firstName} ${pass.student?.lastName}` || '')}`}>
                      <span className="text-sm font-medium" data-testid={`student-initials-${pass.id}`}>
                        {getInitials(`${pass.student?.firstName} ${pass.student?.lastName}` || '')}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-foreground" data-testid={`student-name-${pass.id}`}>
                          {pass.student?.firstName} {pass.student?.lastName}
                        </h3>
                        {getPassTypeBadge(pass.passType)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Grade <span data-testid={`student-grade-${pass.id}`}>{pass.student?.grade}</span> • 
                        Out for <span data-testid={`pass-duration-${pass.id}`}>{formatDuration(pass.issuedAt)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Issued by: <span className="font-medium">{pass.teacher?.firstName} {pass.teacher?.lastName}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Checked out</p>
                    <p className="text-sm font-medium text-foreground" data-testid={`checkout-time-${pass.id}`}>
                      {new Date(pass.issuedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
