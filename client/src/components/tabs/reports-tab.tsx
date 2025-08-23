import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ReportsTabProps {
  user: any;
}

export function ReportsTab({ user }: ReportsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    dateRange: 'today',
    grade: 'all',
    teacher: 'all',
    passType: 'all',
  });
  
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Helper function to calculate duration in minutes
  const calculateDuration = (issuedAt: string, returnedAt?: string) => {
    if (!returnedAt) return null;
    const issued = new Date(issuedAt);
    const returned = new Date(returnedAt);
    const diffMs = returned.getTime() - issued.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    // Return actual duration - don't force minimum of 1 minute
    return Math.max(0, diffMinutes);
  };

  const { data: passes = [], refetch, isLoading } = useQuery<any[]>({
    queryKey: ['/api/passes', JSON.stringify(filters), JSON.stringify(customDateRange)], // Ensure deep comparison
    refetchInterval: 3000, // Refresh every 3 seconds
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Add cache buster to prevent mobile caching issues
      params.append('t', Date.now().toString());
      
      if (filters.dateRange && filters.dateRange !== 'all') {
        const now = new Date();
        let dateStart = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            dateStart.setHours(0, 0, 0, 0);
            params.append('dateStart', dateStart.toISOString());
            break;
          case 'week':
            dateStart.setDate(now.getDate() - 7);
            params.append('dateStart', dateStart.toISOString());
            break;
          case 'month':
            dateStart.setMonth(now.getMonth() - 1);
            params.append('dateStart', dateStart.toISOString());
            break;
          case 'custom':
            if (customDateRange.startDate) {
              params.append('dateStart', new Date(customDateRange.startDate + 'T00:00:00').toISOString());
            }
            if (customDateRange.endDate) {
              params.append('dateEnd', new Date(customDateRange.endDate + 'T23:59:59').toISOString());
            }
            break;
        }
      }
      
      if (filters.grade && filters.grade !== 'all') {
        params.append('grade', filters.grade);
      }
      
      if (filters.teacher && filters.teacher !== '' && filters.teacher !== 'all') {
        params.append('teacherId', filters.teacher);
      }
      
      if (filters.passType && filters.passType !== 'all') {
        params.append('passType', filters.passType);
      }

      const url = `/api/passes${params.toString() ? '?' + params.toString() : ''}`;
      const response = await apiRequest('GET', url);
      const data = await response.json();
      console.log('Reports filter applied:', { filters, customDateRange, resultCount: data?.length, url });
      return Array.isArray(data) ? data : [];
    },
    gcTime: 0, // Don't cache results to ensure fresh data on mobile
  });

  // Auto-refetch when filters change (especially important for mobile PWA)
  useEffect(() => {
    console.log('Filters changed, triggering refetch:', filters);
    refetch();
  }, [filters, customDateRange, refetch]);

  // Delete pass mutation
  const deletePassMutation = useMutation({
    mutationFn: async (passId: string) => {
      const response = await apiRequest('DELETE', `/api/passes/${passId}`);
      if (!response.ok) {
        throw new Error('Failed to delete pass');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/passes'] });
      toast({
        title: "Pass Deleted",
        description: "The pass record has been removed from the system and reports.",
      });
    },
    onError: (error) => {
      console.error('Delete pass error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the pass record. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: grades = [] } = useQuery<any[]>({
    queryKey: ['/api/grades'],
  });

  const { data: teachers = [] } = useQuery<any[]>({
    queryKey: ['/api/teachers'],
  });

  // Filter grades based on teacher's assigned grades
  const teacherAssignedGrades = user?.assignedGrades || [];
  const filteredGrades = teacherAssignedGrades.length === 0 
    ? grades 
    : grades.filter(grade => teacherAssignedGrades.includes(grade.name));

  const handleApplyFilters = () => {
    // Force a fresh fetch by manually calling refetch
    refetch();
    console.log('Manual filter apply clicked:', filters);
    toast({
      title: "Filters Applied",
      description: `Report data updated. Showing results for: ${filters.dateRange}${filters.passType !== 'all' ? `, ${filters.passType} passes` : ''}`,
    });
  };

  const handleExportCSV = () => {
    if (!passes || passes.length === 0) {
      toast({
        title: "No Data",
        description: "No pass data available to export. Apply filters first.",
        variant: "destructive",
      });
      return;
    }

    const csvHeaders = ["Student Name", "Grade/Class", "Teacher", "Pass Type", "Custom Reason", "Checkout Time", "Return Time", "Duration (min)"];
    const csvRows = passes.map((pass: any) => {
      // Check both returnedAt and status to determine if pass is returned
      const isReturned = pass.returnedAt || pass.status === 'returned';
      const calculatedDuration = isReturned ? calculateDuration(pass.issuedAt, pass.returnedAt) : null;
      const displayDuration = calculatedDuration !== null ? calculatedDuration : (pass.duration && pass.duration >= 1 ? pass.duration : null);
      
      return [
        `${pass.student?.firstName} ${pass.student?.lastName}` || "Unknown",
        pass.student?.grade || "Unknown", 
        `${pass.teacher?.firstName} ${pass.teacher?.lastName}` || "Unknown",
        pass.passType === 'nurse' ? 'Nurse' : 
        pass.passType === 'discipline' ? 'Discipline' : 'General Hall Pass',
        pass.customDestination || pass.customReason || "",
        new Date(pass.issuedAt).toLocaleString(),
        isReturned ? new Date(pass.returnedAt || pass.issuedAt).toLocaleString() : "Still Out",
        displayDuration !== null ? displayDuration : "Still Out"
      ];
    });

    // Add BOM for proper Excel UTF-8 handling and use Excel-compatible format
    const BOM = '\uFEFF';
    const csvContent = BOM + [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    // Use Excel-compatible MIME type for better direct opening
    const blob = new Blob([csvContent], { 
      type: "application/vnd.ms-excel;charset=utf-8;" 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pass-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Pass report has been downloaded and should open directly in Excel.",
    });
  };

  const handleExportPDF = async () => {
    if (!passes || passes.length === 0) {
      toast({
        title: "No Data",
        description: "No pass data available to export. Apply filters first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Dynamic import to avoid bundling issues
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Hall Pass Report', 14, 22);
      
      // Add date range and filters info
      doc.setFontSize(12);
      const today = new Date().toLocaleDateString();
      doc.text(`Generated: ${today}`, 14, 35);
      doc.text(`Filter: ${filters.dateRange} | Grade/Class: ${filters.grade} | Teacher: ${filters.teacher}`, 14, 45);
      
      // Prepare table data
      const tableHeaders = ['Student Name', 'Grade/Class', 'Teacher', 'Pass Type', 'Destination', 'Checkout Time', 'Return Time', 'Duration'];
      const tableRows = passes.map((pass: any) => {
        const isReturned = pass.returnedAt || pass.status === 'returned';
        const calculatedDuration = isReturned ? calculateDuration(pass.issuedAt, pass.returnedAt) : null;
        const displayDuration = calculatedDuration !== null ? `${calculatedDuration} min` : "Still Out";
        
        return [
          `${pass.student?.firstName} ${pass.student?.lastName}` || "Unknown",
          pass.student?.grade || "Unknown",
          `${pass.teacher?.firstName} ${pass.teacher?.lastName}` || "Unknown",
          pass.passType === 'nurse' ? 'Nurse' : 
          pass.passType === 'discipline' ? 'Discipline' : 'General',
          pass.customDestination || pass.destination || 'General',
          new Date(pass.issuedAt).toLocaleString([], { 
            month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          }),
          isReturned ? new Date(pass.returnedAt || pass.issuedAt).toLocaleString([], { 
            month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          }) : "Still Out",
          displayDuration
        ];
      });

      // Add table using autoTable plugin
      (doc as any).autoTable({
        head: [tableHeaders],
        body: tableRows,
        startY: 55,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 25 }, // Student Name
          1: { cellWidth: 15 }, // Grade  
          2: { cellWidth: 25 }, // Teacher
          3: { cellWidth: 20 }, // Pass Type
          4: { cellWidth: 20 }, // Destination
          5: { cellWidth: 25 }, // Checkout Time
          6: { cellWidth: 25 }, // Return Time
          7: { cellWidth: 15 }, // Duration
        },
      });

      // Add summary stats at the bottom
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(12);
      doc.text('Summary Statistics:', 14, finalY);
      doc.setFontSize(10);
      doc.text(`Total Passes: ${stats.totalPasses}`, 14, finalY + 10);
      doc.text(`Average Duration: ${stats.avgDuration} minutes`, 14, finalY + 20);
      doc.text(`Peak Hour: ${stats.peakHour}`, 14, finalY + 30);
      doc.text(`Unique Students: ${stats.uniqueStudents}`, 14, finalY + 40);

      // Save the PDF
      const fileName = `pass-report-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF Export Complete",
        description: "Pass report has been downloaded as PDF.",
      });
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate real statistics from pass data
  const completedPasses = passes.filter(p => p.status === 'returned' && p.returnedAt);
  const passesWithDuration = completedPasses.map(p => {
    const duration = calculateDuration(p.issuedAt, p.returnedAt) ?? p.duration;
    return { ...p, calculatedDuration: duration };
  }).filter(p => p.calculatedDuration !== null);

  const stats = {
    totalPasses: passes.length,
    avgDuration: passesWithDuration.length > 0 
      ? Math.round(passesWithDuration.reduce((sum, p) => sum + (p.calculatedDuration || 0), 0) / passesWithDuration.length * 10) / 10
      : 0,
    peakHour: passes.length > 0 
      ? new Date(passes.reduce((latest, pass) => 
          new Date(pass.issuedAt) > new Date(latest.issuedAt) ? pass : latest
        ).issuedAt).toLocaleTimeString([], { hour: 'numeric' })
      : 'N/A',
    uniqueStudents: new Set(passes.map(p => p.studentId)).size,
  };

  // Calculate pass type breakdown
  const passTypeStats = {
    general: passes.filter(p => (p.passType || 'general') === 'general').length,
    nurse: passes.filter(p => p.passType === 'nurse').length,
    discipline: passes.filter(p => p.passType === 'discipline').length,
  };

  // Get recent activity from TODAY ONLY (daily reset functionality)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaysPasses = passes.filter(pass => {
    const passDate = new Date(pass.issuedAt);
    return passDate >= today;
  });

  const recentActivity = todaysPasses.length > 0 ? todaysPasses
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
    .slice(0, 10)
    .map(pass => {
      const calculatedDuration = calculateDuration(pass.issuedAt, pass.returnedAt);
      return {
        id: pass.id,
        studentName: `${pass.student?.firstName} ${pass.student?.lastName}` || 'Unknown Student',
        action: pass.status === 'returned' 
          ? `Returned after ${calculatedDuration !== null ? calculatedDuration : (pass.duration || 0)} minutes`
          : `Checked out${pass.customDestination ? ` - ${pass.customDestination}` : (pass.destination ? ` to ${pass.destination}` : '')}`,
        destination: pass.destination,
        time: new Date(pass.issuedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        date: 'Today',
        passType: pass.passType || 'general',
        customDestination: pass.customDestination
      };
    }) : [];

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Reports</h2>
        <p className="text-sm text-muted-foreground">View and export student pass usage data</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="font-medium text-foreground mb-4">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="dateRange">Date Range</Label>
              <Select 
                value={filters.dateRange} 
                onValueChange={(value) => {
                  console.log('Date range changed:', value);
                  setFilters({ ...filters, dateRange: value });
                }}
              >
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Custom Date Range Inputs */}
            {filters.dateRange === 'custom' && (
              <>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={customDateRange.startDate}
                    onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={customDateRange.endDate}
                    onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                    data-testid="input-end-date"
                  />
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="gradeFilter">Grade/Class</Label>
              <Select 
                value={filters.grade} 
                onValueChange={(value) => {
                  console.log('Grade changed:', value);
                  setFilters({ ...filters, grade: value });
                }}
              >
                <SelectTrigger data-testid="select-grade-filter">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {filteredGrades.map((grade: any) => (
                    <SelectItem key={grade.id} value={grade.name}>Grade {grade.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="teacherFilter">Teacher</Label>
              <Select 
                value={filters.teacher} 
                onValueChange={(value) => {
                  console.log('Teacher changed:', value);
                  setFilters({ ...filters, teacher: value });
                }}
              >
                <SelectTrigger data-testid="select-teacher-filter">
                  <SelectValue placeholder="All Teachers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map((teacher: any) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="passTypeFilter">Pass Type</Label>
              <Select 
                value={filters.passType} 
                onValueChange={(value) => {
                  console.log('Pass type changed:', value);
                  setFilters({ ...filters, passType: value });
                }}
              >
                <SelectTrigger data-testid="select-pass-type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="discipline">Discipline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleApplyFilters}
                className="w-full"
                data-testid="button-apply-filters"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Apply Filters'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pass Type Breakdown */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="font-medium text-foreground mb-4">Pass Type Breakdown</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-foreground">General</span>
              </div>
              <div className="text-2xl font-bold text-blue-600" data-testid="stat-general-passes">{passTypeStats.general}</div>
              <div className="text-xs text-muted-foreground">Bathroom/General</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-foreground">Nurse</span>
              </div>
              <div className="text-2xl font-bold text-red-600" data-testid="stat-nurse-passes">{passTypeStats.nurse}</div>
              <div className="text-xs text-muted-foreground">Health Office</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm font-medium text-foreground">Discipline</span>
              </div>
              <div className="text-2xl font-bold text-orange-600" data-testid="stat-discipline-passes">{passTypeStats.discipline}</div>
              <div className="text-xs text-muted-foreground">Office/Admin</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary" data-testid="stat-total-passes">{stats.totalPasses}</div>
            <div className="text-sm text-muted-foreground">Total Passes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-secondary" data-testid="stat-avg-duration">{stats.avgDuration}</div>
            <div className="text-sm text-muted-foreground">Avg Minutes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent" data-testid="stat-peak-hour">{stats.peakHour}</div>
            <div className="text-sm text-muted-foreground">Peak Hour</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground" data-testid="stat-unique-students">{stats.uniqueStudents}</div>
            <div className="text-sm text-muted-foreground">Students</div>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground">Export Data</h3>
            <div className="flex space-x-2">
              <Button 
                onClick={handleExportCSV}
                className="bg-secondary hover:bg-secondary/90"
                data-testid="button-export-csv"
              >
                <i className="fas fa-file-csv mr-2"></i>Export CSV
              </Button>
              <Button 
                onClick={handleExportPDF}
                className="bg-destructive hover:bg-destructive/90"
                data-testid="button-export-pdf"
              >
                <i className="fas fa-file-pdf mr-2"></i>Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">Today's Activity</h3>
              <div className="text-xs text-muted-foreground">
                Resets daily • View historical data using date filters above
              </div>
            </div>
          </div>
          <div className="divide-y divide-border" data-testid="recent-activity-list">
            {recentActivity.length === 0 ? (
              <div className="p-4 text-center">
                <i className="fas fa-history text-muted-foreground text-2xl mb-2"></i>
                <p className="text-sm text-muted-foreground">No activity today</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Historical data available using date filters above
                </p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="p-4" data-testid={`activity-${activity.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {activity.studentName.split(' ').map((n: string) => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-foreground">{activity.studentName}</p>
                          {/* Show destination badge with proper colors */}
                          {(() => {
                            // Get the destination to display
                            const destination = activity.customDestination || activity.destination || '';
                            const lowerDest = destination.toLowerCase();
                            
                            // Determine badge color and text based on destination
                            let badgeClass = 'bg-blue-100 text-blue-700'; // default
                            let displayText = 'General';
                            
                            if (activity.customDestination) {
                              badgeClass = 'bg-purple-100 text-purple-700';
                              displayText = activity.customDestination;
                            } else if (lowerDest.includes('nurse')) {
                              badgeClass = 'bg-red-100 text-red-700';
                              displayText = 'Nurse';
                            } else if (lowerDest.includes('main office') || lowerDest.includes('office')) {
                              badgeClass = 'bg-yellow-100 text-yellow-700';
                              displayText = 'Main Office';
                            } else if (lowerDest.includes('discipline')) {
                              badgeClass = 'bg-orange-100 text-orange-700';
                              displayText = 'Discipline';
                            }
                            
                            return (
                              <span className={`px-2 py-1 text-xs rounded-full ${badgeClass}`}>
                                {displayText}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-muted-foreground">{activity.action}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                        <p className="text-xs text-muted-foreground">{activity.date}</p>
                      </div>
                      {/* Delete button with confirmation */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            data-testid={`button-delete-pass-${activity.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center space-x-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              <span>Delete Pass Record</span>
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this pass record for <strong>{activity.studentName}</strong>? 
                              This will permanently remove it from all reports and cannot be undone.
                              <br /><br />
                              <em>This is useful for correcting mistakes when the wrong student was accidentally marked out.</em>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePassMutation.mutate(activity.id)}
                              className="bg-destructive hover:bg-destructive/90"
                              disabled={deletePassMutation.isPending}
                            >
                              {deletePassMutation.isPending ? 'Deleting...' : 'Delete Pass'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
