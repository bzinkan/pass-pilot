import { useQuery } from "@tanstack/react-query";
import { IdCard, CheckCircle } from "lucide-react";
import ActivePassCard from "@/components/active-pass-card";
import type { Pass } from "@shared/schema";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
}

export default function StudentView() {
  // For demo purposes, using hardcoded student - in real app this would come from auth
  const currentStudent: Student = {
    id: "student-1",
    firstName: "Emily",
    lastName: "Martinez", 
    studentId: "2024789"
  };

  const { data: activePass } = useQuery<Pass>({
    queryKey: ["/api/passes/student", currentStudent.id],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: passHistory = [] } = useQuery<Pass[]>({
    queryKey: ["/api/passes/student", currentStudent.id, "history"],
  });

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date | string) => {
    const passDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (passDate.toDateString() === today.toDateString()) {
      return `Today, ${formatTime(date)}`;
    } else if (passDate.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${formatTime(date)}`;
    } else {
      return passDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const getDuration = (pass: Pass) => {
    if (!pass.returnedAt) return "In progress";
    const duration = new Date(pass.returnedAt).getTime() - new Date(pass.issuedAt).getTime();
    return `${Math.round(duration / (1000 * 60))} min`;
  };

  return (
    <div className="space-y-6" data-testid="student-view">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-hall-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
            <IdCard className="text-hall-primary text-2xl" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900" data-testid="text-welcome-message">
            Welcome, {currentStudent.firstName} {currentStudent.lastName}
          </h2>
          <p className="text-gray-600 mt-1" data-testid="text-student-id">
            Student ID: {currentStudent.studentId}
          </p>
        </div>
      </div>

      {/* Active Pass or No Pass Message */}
      {activePass ? (
        <ActivePassCard pass={activePass} studentId={currentStudent.id} />
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center" data-testid="card-no-active-pass">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IdCard className="text-gray-400" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Pass</h3>
          <p className="text-gray-600">You don't currently have an active hallway pass.</p>
        </div>
      )}

      {/* Pass History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900" data-testid="text-pass-history-title">
            My Pass History
          </h3>
        </div>
        <div className="px-6 py-4">
          {passHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-8" data-testid="text-no-pass-history">
              No pass history available.
            </div>
          ) : (
            <div className="space-y-4">
              {passHistory.map((pass) => (
                <div key={pass.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0" data-testid={`row-history-${pass.id}`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                      <CheckCircle className="text-hall-success text-sm" size={16} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900" data-testid={`text-history-destination-${pass.id}`}>
                        {pass.customDestination || pass.destination}
                      </div>
                      <div className="text-sm text-gray-500" data-testid={`text-history-date-${pass.id}`}>
                        {formatDate(pass.issuedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900" data-testid={`text-history-duration-${pass.id}`}>
                      {getDuration(pass)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {pass.status === 'returned' ? 'Completed' : 'Expired'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
