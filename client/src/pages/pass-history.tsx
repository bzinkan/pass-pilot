import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import TopBar from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Search, Download } from "lucide-react";
import { format } from "date-fns";
import type { HallPassWithStudent } from "@shared/schema";

export default function PassHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: passes, isLoading } = useQuery({
    queryKey: ["/api/hall-passes"],
  });

  const filteredPasses = passes?.filter((pass: HallPassWithStudent) => {
    const matchesSearch = searchQuery === "" || 
      pass.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pass.destination.toLowerCase().includes(searchQuery.toLowerCase());
    
    const passDate = new Date(pass.createdAt!).toISOString().split('T')[0];
    const matchesDate = selectedDate === "" || passDate === selectedDate;
    
    return matchesSearch && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success-100 text-success-600" data-testid={`status-${status}`}>Active</Badge>;
      case "returned":
        return <Badge variant="secondary" data-testid={`status-${status}`}>Returned</Badge>;
      case "overdue":
        return <Badge className="bg-error-100 text-error-600" data-testid={`status-${status}`}>Overdue</Badge>;
      default:
        return <Badge variant="outline" data-testid={`status-${status}`}>{status}</Badge>;
    }
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

  return (
    <>
      <TopBar 
        title="Pass History" 
        subtitle="View complete history of all hall passes" 
      />
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Passes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by student name or destination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10"
                data-testid="input-date"
              />
            </div>
            <Button variant="outline" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pass History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading pass history...</div>
          ) : filteredPasses?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No passes found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPasses?.map((pass: HallPassWithStudent) => {
                    const duration = pass.timeIn && pass.timeOut 
                      ? Math.floor((new Date(pass.timeIn).getTime() - new Date(pass.timeOut).getTime()) / (1000 * 60))
                      : pass.duration;
                    
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
                          {format(new Date(pass.timeOut), "h:mm a")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-timein-${pass.id}`}>
                          {pass.timeIn ? format(new Date(pass.timeIn), "h:mm a") : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-duration-${pass.id}`}>
                          {duration}m
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(pass.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-teacher-${pass.id}`}>
                          {pass.issuingTeacher}
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
    </>
  );
}
