import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface UploadTabProps {
  user: any;
}

export function UploadTab({ user }: UploadTabProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [cleverConnected, setCleverConnected] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/grades'] });
      
      toast({
        title: "Upload Complete",
        description: `Successfully imported ${result.studentsAdded} students and ${result.gradesAdded} grades.`,
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCleverImport = async () => {
    setIsUploading(true);
    try {
      const response = await apiRequest('POST', '/api/import/clever', {});
      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/grades'] });
      
      toast({
        title: "Clever Import Complete",
        description: `Successfully imported ${result.studentsAdded} students from Clever.`,
      });
      setCleverConnected(true);
    } catch (error: any) {
      toast({
        title: "Clever Import Failed",
        description: "Please check your Clever API credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGoogleClassroomImport = async () => {
    setIsUploading(true);
    try {
      const response = await apiRequest('POST', '/api/import/google-classroom', {});
      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/grades'] });
      
      toast({
        title: "Google Classroom Import Complete",
        description: `Successfully imported ${result.studentsAdded} students from Google Classroom.`,
      });
      setGoogleConnected(true);
    } catch (error: any) {
      toast({
        title: "Google Classroom Import Failed",
        description: "Please check your Google Classroom API credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Upload Student Data</h2>
        <p className="text-sm text-muted-foreground">Import student rosters from multiple sources</p>
      </div>

      <div className="space-y-6">
        {/* CSV Upload */}
        <Card>
          <CardHeader>
            <CardTitle>CSV File Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="fileUpload">Select CSV File</Label>
                <Input
                  id="fileUpload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  data-testid="input-file-upload"
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">CSV file should contain the following columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>name (required)</li>
                  <li>grade (required)</li>
                  <li>studentId (optional)</li>
                </ul>
              </div>

              {isUploading && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Processing upload...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clever Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Clever Integration
              {cleverConnected && (
                <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">Connected</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Import student rosters directly from your Clever account. This will sync all students from your connected schools.
              </p>
              <Button
                onClick={handleCleverImport}
                disabled={isUploading}
                className="w-full"
                data-testid="button-clever-import"
              >
                {isUploading ? "Importing..." : "Import from Clever"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Google Classroom Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Google Classroom Integration
              {googleConnected && (
                <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">Connected</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Import student rosters from your Google Classroom courses. All enrolled students will be added to your roster.
              </p>
              <Button
                onClick={handleGoogleClassroomImport}
                disabled={isUploading}
                className="w-full"
                data-testid="button-google-classroom-import"
              >
                {isUploading ? "Importing..." : "Import from Google Classroom"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}