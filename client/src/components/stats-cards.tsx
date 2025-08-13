import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar, AlertTriangle, Timer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardsProps {
  stats?: {
    activePasses: number;
    todayPasses: number;
    overduePasses: number;
    averageDuration: string;
  };
  isLoading: boolean;
}

export default function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-12" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Passes</p>
              <p className="text-3xl font-bold text-gray-900" data-testid="text-active-passes">
                {stats?.activePasses || 0}
              </p>
            </div>
            <div className="bg-primary-100 p-3 rounded-full">
              <Clock className="text-primary-600 h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Passes</p>
              <p className="text-3xl font-bold text-gray-900" data-testid="text-today-passes">
                {stats?.todayPasses || 0}
              </p>
            </div>
            <div className="bg-success-100 p-3 rounded-full">
              <Calendar className="text-success-600 h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Passes</p>
              <p className="text-3xl font-bold text-error-600" data-testid="text-overdue-passes">
                {stats?.overduePasses || 0}
              </p>
            </div>
            <div className="bg-error-100 p-3 rounded-full">
              <AlertTriangle className="text-error-600 h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Duration</p>
              <p className="text-3xl font-bold text-gray-900" data-testid="text-avg-duration">
                {stats?.averageDuration || "0m"}
              </p>
            </div>
            <div className="bg-warning-100 p-3 rounded-full">
              <Timer className="text-warning-600 h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
