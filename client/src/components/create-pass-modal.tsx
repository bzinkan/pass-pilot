import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CreatePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  teacherName: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  fullName: string;
}

export default function CreatePassModal({ isOpen, onClose, teacherId, teacherName }: CreatePassModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    studentId: "",
    destination: "",
    customDestination: "",
    duration: "10",
    notes: "",
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    enabled: isOpen,
  });

  const createPassMutation = useMutation({
    mutationFn: async (passData: any) => {
      const response = await apiRequest("POST", "/api/passes", passData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pass Created",
        description: "Hallway pass has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/passes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      onClose();
      setFormData({
        studentId: "",
        destination: "",
        customDestination: "",
        duration: "10",
        notes: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create pass. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedStudent = students.find(s => s.id === formData.studentId);
    if (!selectedStudent) {
      toast({
        title: "Error",
        description: "Please select a student.",
        variant: "destructive",
      });
      return;
    }

    const passData = {
      studentId: formData.studentId,
      studentName: selectedStudent.fullName,
      teacherId,
      teacherName,
      destination: formData.destination === "other" ? formData.customDestination : formData.destination,
      customDestination: formData.destination === "other" ? formData.customDestination : null,
      duration: parseInt(formData.duration),
      notes: formData.notes || null,
    };

    createPassMutation.mutate(passData);
  };

  const destinations = [
    { value: "bathroom", label: "Bathroom" },
    { value: "library", label: "Library" },
    { value: "nurse", label: "Nurse's Office" },
    { value: "office", label: "Main Office" },
    { value: "counselor", label: "Counselor's Office" },
    { value: "other", label: "Other" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={onClose}>
      <div 
        className="relative top-20 mx-auto p-5 border w-full max-w-md bg-white rounded-lg shadow-lg" 
        onClick={(e) => e.stopPropagation()}
        data-testid="modal-create-pass"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900" data-testid="text-modal-title">Create New Pass</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            data-testid="button-close-modal"
          >
            <X size={20} />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Student Selection */}
          <div>
            <Label htmlFor="student" className="block text-sm font-medium text-gray-700 mb-2">
              Select Student
            </Label>
            <Select
              value={formData.studentId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, studentId: value }))}
              required
            >
              <SelectTrigger data-testid="select-student">
                <SelectValue placeholder="Choose a student..." />
              </SelectTrigger>
              <SelectContent>
                {studentsLoading ? (
                  <SelectItem value="" disabled>Loading students...</SelectItem>
                ) : (
                  students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.fullName} (ID: {student.studentId})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Destination */}
          <div>
            <Label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-2">
              Destination
            </Label>
            <Select
              value={formData.destination}
              onValueChange={(value) => setFormData(prev => ({ ...prev, destination: value }))}
              required
            >
              <SelectTrigger data-testid="select-destination">
                <SelectValue placeholder="Select destination..." />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((dest) => (
                  <SelectItem key={dest.value} value={dest.value}>
                    {dest.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Destination */}
          {formData.destination === "other" && (
            <div>
              <Label htmlFor="customDestination" className="block text-sm font-medium text-gray-700 mb-2">
                Specify Destination
              </Label>
              <Input
                id="customDestination"
                type="text"
                value={formData.customDestination}
                onChange={(e) => setFormData(prev => ({ ...prev, customDestination: e.target.value }))}
                placeholder="Enter custom destination"
                required
                data-testid="input-custom-destination"
              />
            </div>
          )}

          {/* Duration */}
          <div>
            <Label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes)
            </Label>
            <Select
              value={formData.duration}
              onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}
              required
            >
              <SelectTrigger data-testid="select-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="20">20 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes..."
              rows={2}
              data-testid="textarea-notes"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              className="flex-1" 
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-hall-primary hover:bg-hall-primary/90" 
              disabled={createPassMutation.isPending}
              data-testid="button-create-pass"
            >
              {createPassMutation.isPending ? "Creating..." : "Create Pass"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
