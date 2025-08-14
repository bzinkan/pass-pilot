import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, CheckCircle, Clock, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Pass } from "@shared/schema";

export function PassesTab({ user }: { user: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activePasses = [], isLoading: passesLoading } = useQuery({
    queryKey: ["/api/passes/active", user.schoolId],
    refetchInterval: 30000,
  });

  const revokePassMutation = useMutation({
    mutationFn: async (passId: string) => {
      const response = await apiRequest("PATCH", `/api/passes/${passId}/status`, {
        status: "revoked"
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pass Revoked",
        description: "The hallway pass has been revoked.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/passes/active"] });
    },
  });

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTimeRemaining = (expiresAt: Date | string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Expired";
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins} min`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Active Passes
          </h3>
        </div>
        <div className="overflow-x-auto">
          {passesLoading ? (
            <div className="px-6 py-8 text-center text-gray-500">Loading active passes...</div>
          ) : activePasses.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No active passes at the moment.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issued
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activePasses.map((pass: any) => (
                  <tr key={pass.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {pass.studentName || `${pass.student?.firstName} ${pass.student?.lastName}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pass.customDestination || pass.destination}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(pass.issuedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getTimeRemaining(pass.expiresAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokePassMutation.mutate(pass.id)}
                        disabled={revokePassMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}