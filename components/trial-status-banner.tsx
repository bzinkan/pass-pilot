import { useQuery } from "@tanstack/react-query";
import { Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrialStatusBannerProps {
  user: any;
}

export default function TrialStatusBanner({ user }: TrialStatusBannerProps) {
  const { data: school } = useQuery({
    queryKey: ["/api/school", user?.schoolId],
    enabled: !!user?.schoolId,
  });

  // Don't show banner if not on trial or trial hasn't expired
  if (!school || school.plan !== 'free_trial' || !school.isTrialExpired) {
    return null;
  }

  const daysRemaining = school.trialEndDate 
    ? Math.max(0, Math.ceil((new Date(school.trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isExpired = daysRemaining <= 0;

  return (
    <div className={`${isExpired ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border-b px-4 py-3`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isExpired ? (
            <AlertTriangle className="text-red-600" size={20} />
          ) : (
            <Calendar className="text-yellow-600" size={20} />
          )}
          <div>
            <p className={`font-medium ${isExpired ? 'text-red-800' : 'text-yellow-800'}`}>
              {isExpired 
                ? "Your free trial has expired" 
                : `Your free trial expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
              }
            </p>
            <p className={`text-sm ${isExpired ? 'text-red-700' : 'text-yellow-700'}`}>
              {isExpired 
                ? "Upgrade to a paid plan to continue using PassPilot"
                : "Upgrade now to ensure uninterrupted access to all features"
              }
            </p>
          </div>
        </div>
        <Button 
          className={isExpired ? "bg-red-600 hover:bg-red-700" : "bg-yellow-600 hover:bg-yellow-700"}
        >
          Upgrade Now
        </Button>
      </div>
    </div>
  );
}