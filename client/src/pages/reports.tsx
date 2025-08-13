import { useQuery } from "@tanstack/react-query";
import TopBar from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Clock, Users, AlertTriangle } from "lucide-react";
import type { HallPassWithStudent } from "@shared/schema";

export default function Reports() {
  const { data: allPasses } = useQuery({
    queryKey: ["/api/hall-passes"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  // Calculate additional metrics
  const getMetrics = () => {
    if (!allPasses) return null;

    const today = new Date().toISOString().split('T')[0];
    const todayPasses = allPasses.filter((pass: HallPassWithStudent) => 
      new Date(pass.createdAt!).toISOString().split('T')[0] === today
    );

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const weekPasses = allPasses.filter((pass: HallPassWithStudent) => 
      new Date(pass.createdAt!) >= thisWeek
    );

    const destinationCounts = allPasses.reduce((acc: Record<string, number>, pass: HallPassWithStudent) => {
      acc[pass.destination] = (acc[pass.destination] || 0) + 1;
      return acc;
    }, {});

    const topDestinations = Object.entries(destinationCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5);

    const completedPasses = allPasses.filter((pass: HallPassWithStudent) => pass.timeIn);
    const totalDuration = completedPasses.reduce((sum: number, pass: HallPassWithStudent) => {
      if (pass.timeIn && pass.timeOut) {
        const duration = Math.floor((new Date(pass.timeIn).getTime() - new Date(pass.timeOut).getTime()) / (1000 * 60));
        return sum + duration;
      }
      return sum;
    }, 0);

    return {
      todayCount: todayPasses.length,
      weekCount: weekPasses.length,
      totalCount: allPasses.length,
      topDestinations,
      averageDuration: completedPasses.length > 0 ? Math.round(totalDuration / completedPasses.length) : 0,
      completionRate: allPasses.length > 0 ? Math.round((completedPasses.length / allPasses.length) * 100) : 0,
    };
  };

  const metrics = getMetrics();

  return (
    <>
      <TopBar 
        title="Reports & Analytics" 
        subtitle="View detailed analytics and generate reports" 
      />
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Passes</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="text-total-passes">
                  {metrics?.totalCount || 0}
                </p>
              </div>
              <div className="bg-primary-100 p-3 rounded-full">
                <Users className="text-primary-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="text-week-passes">
                  {metrics?.weekCount || 0}
                </p>
              </div>
              <div className="bg-success-100 p-3 rounded-full">
                <TrendingUp className="text-success-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="text-avg-duration">
                  {metrics?.averageDuration || 0}m
                </p>
              </div>
              <div className="bg-warning-100 p-3 rounded-full">
                <Clock className="text-warning-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="text-completion-rate">
                  {metrics?.completionRate || 0}%
                </p>
              </div>
              <div className="bg-error-100 p-3 rounded-full">
                <AlertTriangle className="text-error-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Destinations */}
        <Card>
          <CardHeader>
            <CardTitle>Top Destinations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics?.topDestinations.map(([destination, count], index) => (
                <div key={destination} className="flex items-center justify-between" data-testid={`destination-${index}`}>
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{destination}</span>
                  </div>
                  <Badge variant="secondary" data-testid={`count-${destination}`}>
                    {count} passes
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Active Passes</span>
                <Badge className="bg-success-100 text-success-600" data-testid="badge-active">
                  {stats?.activePasses || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Overdue Passes</span>
                <Badge className="bg-error-100 text-error-600" data-testid="badge-overdue">
                  {stats?.overduePasses || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Today's Passes</span>
                <Badge variant="outline" data-testid="badge-today">
                  {stats?.todayPasses || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" data-testid="button-export-daily">
              <Download className="h-4 w-4 mr-2" />
              Daily Report
            </Button>
            <Button variant="outline" data-testid="button-export-weekly">
              <Download className="h-4 w-4 mr-2" />
              Weekly Report
            </Button>
            <Button variant="outline" data-testid="button-export-monthly">
              <Download className="h-4 w-4 mr-2" />
              Monthly Report
            </Button>
            <Button variant="outline" data-testid="button-export-custom">
              <Download className="h-4 w-4 mr-2" />
              Custom Range
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
