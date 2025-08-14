import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function SetupTab({ user }: { user: any }) {
  const [newGradeName, setNewGradeName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: grades = [] } = useQuery({
    queryKey: ["/api/grades", user.schoolId],
  });

  const { data: school } = useQuery({
    queryKey: ["/api/school", user.schoolId],
  });

  const addGradeMutation = useMutation({
    mutationFn: async (gradeName: string) => {
      const response = await apiRequest('POST', '/api/grades', {
        schoolId: user.schoolId,
        name: gradeName,
        displayOrder: grades.length
      });
      return response.json();
    },
    onSuccess: () => {
      setNewGradeName("");
      queryClient.invalidateQueries({ queryKey: ["/api/grades"] });
      toast({
        title: "Grade added",
        description: "The grade has been successfully added.",
      });
    },
  });

  const handleAddGrade = () => {
    if (newGradeName.trim()) {
      addGradeMutation.mutate(newGradeName.trim());
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>School Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>School Name</Label>
              <Input value={school?.name || ""} readOnly />
            </div>
            <div>
              <Label>Plan</Label>
              <Input value={school?.plan || "free_trial"} readOnly />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Current Teachers</Label>
              <Input value={`${school?.currentTeachers || 0} / ${school?.maxTeachers || 10}`} readOnly />
            </div>
            <div>
              <Label>Current Students</Label>
              <Input value={`${school?.currentStudents || 0} / ${school?.maxStudents || 500}`} readOnly />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grade Levels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Add new grade (e.g., 6th Grade, Freshman)"
              value={newGradeName}
              onChange={(e) => setNewGradeName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddGrade()}
            />
            <Button 
              onClick={handleAddGrade} 
              disabled={!newGradeName.trim() || addGradeMutation.isPending}
            >
              <Plus className="mr-2" size={16} />
              Add Grade
            </Button>
          </div>

          {grades.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <GraduationCap className="mx-auto mb-4 text-gray-400" size={48} />
              <p>No grade levels configured yet.</p>
              <p className="text-sm">Add your first grade level above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {grades.map((grade: any) => (
                <div key={grade.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{grade.name}</span>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">
                      <Edit size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pass Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Default Pass Duration</Label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="5">5 minutes</option>
                <option value="10" selected>10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </div>
            <div>
              <Label>Max Active Passes per Student</Label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="1" selected>1 pass at a time</option>
                <option value="2">2 passes at a time</option>
                <option value="3">3 passes at a time</option>
              </select>
            </div>
          </div>
          
          <Button>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}