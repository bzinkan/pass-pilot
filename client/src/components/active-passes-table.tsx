import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Printer } from "lucide-react";
import { useTimer } from "@/hooks/use-timer";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import PrintPassModal from "./print-pass-modal";
import type { HallPassWithStudent } from "@shared/schema";

interface ActivePassesTableProps {
  passes?: HallPassWithStudent[];
  isLoading: boolean;
  showCreateButton?: boolean;
}

export default function ActivePassesTable({ 
  passes = [], 
  isLoading, 
  showCreateButton = true 
}: ActivePassesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [printPass, setPrintPass] = useState<HallPassWithStudent | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const checkInMutation = useMutation({
    mutationFn: async (passId: string) => {
      const response = await apiRequest("POST", `/api/hall-passes/${passId}/check-in`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hall-passes/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Student checked in successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to check in student",
        variant: "destructive",
      });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hall-passes/active"] });
    },
  });

  const filteredPasses = passes.filter((pass) =>
    pass.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pass.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRemainingTime = (pass: HallPassWithStudent) => {
    const now = new Date();
    const timeOut = new Date(pass.timeOut);
    const minutesElapsed = Math.floor((now.getTime() - timeOut.getTime()) / (1000 * 60));
    const remainingMinutes = pass.duration - minutesElapsed;
    
    if (remainingMinutes <= 0) {
      const overdue = Math.abs(remainingMinutes);
      return {
        time: `-${Math.floor(overdue / 60)}:${(overdue % 60).toString().padStart(2, '0')}`,
        isOverdue: true,
      };
    }
    
    return {
      time: `${Math.floor(remainingMinutes / 60)}:${(remainingMinutes % 60).toString().padStart(2, '0')}`,
      isOverdue: false,
    };
  };

  const getDestinationIcon = (destination: string) => {
    switch (destination.toLowerCase()) {
      case "restroom":
        return "🚻";
      case "nurse":
      case "nurse's office":
        return "🏥";
      case "principal":
      case "principal's office":
        return "🏢";
      case "library":
        return "📚";
      case "guidance":
      case "guidance counselor":
        return "🗣️";
      case "locker":
        return "🗄️";
      default:
        return "📍";
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Active Passes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Passes</CardTitle>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2"
                  data-testid="input-search-passes"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                data-testid="button-refresh"
              >
                <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredPasses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? "No passes found matching your search." : "No active passes at this time."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPasses.map((pass) => {
                    const { time: remainingTime, isOverdue } = getRemainingTime(pass);
                    
                    return (
                      <tr key={pass.id} data-testid={`row-pass-${pass.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <span className="text-primary-600 font-medium text-sm" data-testid={`text-initials-${pass.student.id}`}>
                                  {pass.student.initials}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900" data-testid={`text-name-${pass.student.id}`}>
                                {pass.student.name}
                              </div>
                              <div className="text-sm text-gray-500" data-testid={`text-grade-${pass.student.id}`}>
                                {pass.student.grade} - {pass.student.room}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="mr-2">{getDestinationIcon(pass.destination)}</span>
                            <span className="text-sm text-gray-900" data-testid={`text-destination-${pass.id}`}>
                              {pass.destination}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-timeout-${pass.id}`}>
                          {new Date(pass.timeOut).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${isOverdue ? 'text-error-600' : 'text-gray-900'}`} data-testid={`text-remaining-${pass.id}`}>
                            {remainingTime}
                          </div>
                          <div className="text-xs text-gray-500">of {pass.duration} min</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            className={isOverdue ? "bg-error-100 text-error-800" : "bg-success-100 text-success-800"}
                            data-testid={`status-${pass.id}`}
                          >
                            {isOverdue ? "Overdue" : "Active"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => checkInMutation.mutate(pass.id)}
                            disabled={checkInMutation.isPending}
                            className="text-primary-600 hover:text-primary-900 p-0"
                            data-testid={`button-checkin-${pass.id}`}
                          >
                            Check In
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPrintPass(pass)}
                            className="text-gray-600 hover:text-gray-900 p-1"
                            data-testid={`button-print-${pass.id}`}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {printPass && (
        <PrintPassModal
          pass={printPass}
          isOpen={!!printPass}
          onClose={() => setPrintPass(null)}
        />
      )}
    </>
  );
}
