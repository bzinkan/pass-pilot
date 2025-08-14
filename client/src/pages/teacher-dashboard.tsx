import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, CheckCircle, Clock, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CreatePassModal from "@/components/create-pass-modal";
import StatsCard from "@/components/stats-card";
import type { Pass } from "@shared/schema";

interface Stats {
  activePasses: number;
  todayPasses: number;
  expiringSoon: number;
  avgDuration: string;
}

export default function TeacherDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activePasses = [], isLoading: passesLoading } = useQuery<Pass[]>({
    queryKey: ["/api/passes/active"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: passHistory = [] } = useQuery<Pass[]>({
    queryKey: ["/api/passes/history"],
    select: (data) => data.slice(0, 5), // Show only recent 5
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to revoke pass. Please try again.",
        variant: "destructive",
      });
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

  const getPassStatus = (pass: Pass) => {
    const now = new Date();
    const expiresAt = new Date(pass.expiresAt);
    const timeRemaining = expiresAt.getTime() - now.getTime();
    
    if (timeRemaining <= 0) return { status: "expired", label: "Expired", className: "bg-red-100 text-red-800" };
    if (timeRemaining <= 5 * 60 * 1000) return { status: "expiring", label: "Expiring", className: "bg-orange-100 text-orange-800" };
    return { status: "active", label: "Active", className: "bg-green-100 text-green-800" };
  };

  const getDuration = (pass: Pass) => {
    if (!pass.returnedAt) return "-";
    const duration = new Date(pass.returnedAt).getTime() - new Date(pass.issuedAt).getTime();
    return `${Math.round(duration / (1000 * 60))} min`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6" data-testid="teacher-dashboard">
      {/* Quick Actions Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900" data-testid="text-dashboard-title">
              Teacher Dashboard
            </h2>
            <p className="text-gray-600 mt-1">Manage student hallway passes</p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-hall-primary hover:bg-hall-primary/90 text-white px-6 py-3 font-medium"
            data-testid="button-create-pass"
          >
            <Plus className="mr-2" size={16} />
            Create New Pass
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Active Passes"
            value={stats.activePasses}
            icon={Users}
            bgColor="bg-blue-50"
            iconColor="text-hall-primary"
          />
          <StatsCard
            title="Today's Passes"
            value={stats.todayPasses}
            icon={CheckCircle}
            bgColor="bg-green-50"
            iconColor="text-hall-success"
          />
          <StatsCard
            title="Expiring Soon"
            value={stats.expiringSoon}
            icon={Clock}
            bgColor="bg-orange-50"
            iconColor="text-hall-warning"
          />
          <StatsCard
            title="Avg Duration"
            value={stats.avgDuration}
            icon={TrendingUp}
            bgColor="bg-gray-50"
            iconColor="text-hall-secondary"
          />
        </div>
      )}

      {/* Active Passes Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900" data-testid="text-active-passes-title">
            Active Passes
          </h3>
        </div>
        <div className="overflow-x-auto">
          {passesLoading ? (
            <div className="px-6 py-8 text-center text-gray-500">Loading active passes...</div>
          ) : activePasses.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500" data-testid="text-no-active-passes">
              No active passes at the moment.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200" data-testid="table-active-passes">
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activePasses.map((pass) => {
                  const passStatus = getPassStatus(pass);
                  return (
                    <tr key={pass.id} data-testid={`row-pass-${pass.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-700">
                              {getInitials(pass.studentName)}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900" data-testid={`text-student-name-${pass.id}`}>
                              {pass.studentName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-destination-${pass.id}`}>
                        {pass.customDestination || pass.destination}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-testid={`text-issued-time-${pass.id}`}>
                        {formatTime(pass.issuedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-time-remaining-${pass.id}`}>
                        {getTimeRemaining(pass.expiresAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${passStatus.className}`} data-testid={`text-status-${pass.id}`}>
                          {passStatus.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokePassMutation.mutate(pass.id)}
                          disabled={revokePassMutation.isPending}
                          className="text-hall-danger hover:text-red-700"
                          data-testid={`button-revoke-${pass.id}`}
                        >
                          <X size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent Pass History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900" data-testid="text-history-title">
            Recent Pass History
          </h3>
          <Button variant="link" className="text-hall-primary hover:text-hall-primary/80 text-sm font-medium" data-testid="button-view-all-history">
            View All
          </Button>
        </div>
        <div className="px-6 py-4">
          {passHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-4" data-testid="text-no-history">
              No completed passes yet.
            </div>
          ) : (
            <div className="space-y-4">
              {passHistory.map((pass) => (
                <div key={pass.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0" data-testid={`row-history-${pass.id}`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-700">
                        {getInitials(pass.studentName)}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900" data-testid={`text-history-student-${pass.id}`}>
                        {pass.studentName}
                      </span>
                      <span className="text-sm text-gray-500 ml-2" data-testid={`text-history-destination-${pass.id}`}>
                        → {pass.customDestination || pass.destination}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500" data-testid={`text-history-duration-${pass.id}`}>
                      {getDuration(pass)}
                    </span>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800" data-testid={`text-history-status-${pass.id}`}>
                      {pass.status === 'returned' ? 'Returned' : 'Completed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreatePassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teacherId="teacher-1"
        teacherName="John Smith"
      />
    </div>
  );
}
