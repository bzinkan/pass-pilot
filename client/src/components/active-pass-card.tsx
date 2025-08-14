import { Clock, MapPin, QrCode, HourglassIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Pass } from "@shared/schema";

interface ActivePassCardProps {
  pass: Pass;
  studentId: string;
}

export default function ActivePassCard({ pass, studentId }: ActivePassCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const returnEarlyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/passes/${pass.id}/status`, {
        status: "returned"
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pass Returned",
        description: "You have successfully returned early.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/passes/student", studentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/passes/student", studentId, "history"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to return pass. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const expiresAt = new Date(pass.expiresAt);
    const diffMs = expiresAt.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Expired";
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} remaining`;
  };

  const isExpiring = () => {
    const now = new Date();
    const expiresAt = new Date(pass.expiresAt);
    const diffMs = expiresAt.getTime() - now.getTime();
    return diffMs <= 5 * 60 * 1000; // 5 minutes or less
  };

  return (
    <div className={`rounded-lg shadow-lg p-6 text-white ${
      isExpiring() 
        ? 'bg-gradient-to-r from-orange-500 to-red-600' 
        : 'bg-gradient-to-r from-green-500 to-emerald-600'
    }`} data-testid="card-active-pass">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2">Active Hallway Pass</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <MapPin size={16} />
              <span className="font-medium" data-testid="text-pass-destination">
                {pass.customDestination || pass.destination}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock size={16} />
              <span data-testid="text-pass-issued-time">
                Issued at {formatTime(pass.issuedAt)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <HourglassIcon size={16} />
              <span className="font-semibold" data-testid="text-pass-time-remaining">
                {getTimeRemaining()}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold mb-2" data-testid="text-pass-number">
            #{pass.passNumber}
          </div>
          <div className="bg-white bg-opacity-20 rounded-full px-3 py-1 text-sm">
            Pass Active
          </div>
        </div>
      </div>
      
      {/* QR Code Placeholder */}
      <div className="mt-6 flex justify-center">
        <div className="bg-white p-4 rounded-lg">
          <div className="w-24 h-24 bg-gray-200 flex items-center justify-center" data-testid="qr-code-placeholder">
            <QrCode className="text-4xl text-gray-400" size={48} />
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">Show to staff</p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Button 
          onClick={() => returnEarlyMutation.mutate()}
          disabled={returnEarlyMutation.isPending}
          className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          data-testid="button-return-early"
        >
          {returnEarlyMutation.isPending ? "Returning..." : "Return Early"}
        </Button>
      </div>
    </div>
  );
}
