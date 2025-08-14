import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AdminTabProps {
  user: any;
}

export function AdminTab({ user }: AdminTabProps) {
  const [newGradeName, setNewGradeName] = useState('');
  const [showAddGradeDialog, setShowAddGradeDialog] = useState(false);
  const { toast } = useToast();

  const { data: grades = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/grades'],
  });

  const addGradeMutation = useMutation({
    mutationFn: (data: { name: string }) => apiRequest('/api/grades', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grades'] });
      setNewGradeName('');
      setShowAddGradeDialog(false);
      toast({
        title: "Grade added successfully",
        description: "The new grade has been added to the system.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add grade",
        description: error.message || "An error occurred while adding the grade.",
        variant: "destructive",
      });
    },
  });

  const handleAddGrade = () => {
    if (!newGradeName.trim()) {
      toast({
        title: "Invalid grade name",
        description: "Please enter a valid grade name.",
        variant: "destructive",
      });
      return;
    }
    addGradeMutation.mutate({ name: newGradeName.trim() });
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="space-y-2">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Student Roster</h1>
          <p className="text-muted-foreground">
            Manage grades and students. Click on grade cards to add them to MyClass tab. Green cards are active in MyClass.
          </p>
        </div>
      </div>

      {/* Grade Levels Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <CardTitle>Grade Levels</CardTitle>
          </div>
          <Dialog open={showAddGradeDialog} onOpenChange={setShowAddGradeDialog}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-add-grade"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Grade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Grade</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label htmlFor="grade-name" className="text-sm font-medium">
                    Grade Name
                  </label>
                  <Input
                    id="grade-name"
                    value={newGradeName}
                    onChange={(e) => setNewGradeName(e.target.value)}
                    placeholder="e.g., 6th, Kindergarten, Pre-K"
                    data-testid="input-grade-name"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddGradeDialog(false);
                      setNewGradeName('');
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddGrade}
                    disabled={addGradeMutation.isPending}
                    data-testid="button-add-grade-confirm"
                  >
                    {addGradeMutation.isPending ? 'Adding...' : 'Add Grade'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No grades created yet. Add a grade to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {grades.map((grade) => (
                <div
                  key={grade.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  data-testid={`grade-card-${grade.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{grade.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      Grade
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click to manage students
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}