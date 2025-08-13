import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function TrialStatusBanner() {
  const { user } = useAuth();
  
  // Only show for trial accounts
  if (!user || !user.schoolName) return null;
  
  // This would normally check trial status from the school data
  // For now, we'll show for DeSales as they have special status
  const isDeSalesAccount = user.email?.includes('desalescincy.org');
  
  if (isDeSalesAccount) {
    return (
      <Alert className="mb-4 border-green-200 bg-green-50">
        <Clock className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Unlimited Access:</strong> Your account has unlimited access to all PassPilot features.
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
}

export default TrialStatusBanner;