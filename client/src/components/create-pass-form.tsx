import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Search, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertHallPassSchema } from "@shared/schema";
import { DESTINATIONS } from "@/lib/constants";
import type { Student } from "@shared/schema";

const formSchema = insertHallPassSchema.extend({
  studentName: z.string().min(1, "Student is required"),
});

export default function CreatePassForm() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentName: "",
      destination: "",
      duration: 15,
      issuingTeacher: "Ms. Anderson",
      notes: "",
      printRequested: false,
    },
  });

  const { data: searchResults } = useQuery({
    queryKey: ["/api/students/search", searchQuery],
    enabled: searchQuery.length > 0,
    staleTime: 60000,
  });

  const createPassMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Find the student by name
      const student = searchResults?.find((s: Student) => s.name === data.studentName);
      if (!student) {
        throw new Error("Student not found");
      }

      const passData = {
        studentId: student.id,
        destination: data.destination,
        duration: Number(data.duration),
        issuingTeacher: data.issuingTeacher,
        notes: data.notes,
        printRequested: data.printRequested,
      };

      const response = await apiRequest("POST", "/api/hall-passes", passData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hall-passes/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Hall pass created successfully",
      });
      form.reset();
      setSearchQuery("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create hall pass",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createPassMutation.mutate(data);
  };

  const handleStudentSelect = (student: Student) => {
    form.setValue("studentName", student.name);
    setSearchQuery(student.name);
    setShowStudentDropdown(false);
  };

  const handleStudentSearchChange = (value: string) => {
    setSearchQuery(value);
    form.setValue("studentName", value);
    setShowStudentDropdown(value.length > 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Hall Pass</CardTitle>
        <p className="text-sm text-gray-600">Fill out the form to issue a new hall pass to a student</p>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="studentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Search for student..."
                          value={searchQuery}
                          onChange={(e) => handleStudentSearchChange(e.target.value)}
                          onFocus={() => searchQuery.length > 0 && setShowStudentDropdown(true)}
                          className="pl-10"
                          data-testid="input-student-search"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        
                        {showStudentDropdown && searchResults && searchResults.length > 0 && (
                          <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                            {searchResults.map((student: Student) => (
                              <div
                                key={student.id}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                onClick={() => handleStudentSelect(student)}
                                data-testid={`option-student-${student.id}`}
                              >
                                <div className="font-medium text-gray-900">{student.name}</div>
                                <div className="text-sm text-gray-500">{student.grade} - {student.room}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-destination">
                          <SelectValue placeholder="Select destination..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DESTINATIONS.map((dest) => (
                          <SelectItem key={dest.value} value={dest.value}>
                            {dest.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-duration">
                          <SelectValue placeholder="Select duration..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="20">20 minutes</SelectItem>
                        <SelectItem value="25">25 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issuingTeacher"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuing Teacher</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-gray-50"
                        readOnly
                        data-testid="input-teacher"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes or instructions..."
                      rows={3}
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <FormField
                control={form.control}
                name="printRequested"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-print"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Print pass automatically</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setSearchQuery("");
                  }}
                  data-testid="button-reset"
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={createPassMutation.isPending}
                  className="flex items-center space-x-2"
                  data-testid="button-create"
                >
                  <Plus className="h-4 w-4" />
                  <span>{createPassMutation.isPending ? "Creating..." : "Create Pass"}</span>
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
