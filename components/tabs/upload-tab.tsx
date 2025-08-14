import { useState } from "react";
import { Upload, FileText, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UploadTab({ user }: { user: any }) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Student Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center border-2 border-dashed border-gray-300 rounded-lg p-8">
            <Upload className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload Student Roster
            </h3>
            <p className="text-gray-500 mb-4">
              Upload a CSV file with student information to add multiple students at once.
            </p>
            <Button>
              <FileText className="mr-2" size={16} />
              Choose File
            </Button>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• First Name (required)</li>
              <li>• Last Name (required)</li>
              <li>• Student ID (optional)</li>
              <li>• Grade (optional)</li>
              <li>• Email (optional)</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Recent Uploads</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Check className="text-green-500" size={16} />
                  <div>
                    <p className="text-sm font-medium">6th_grade_roster.csv</p>
                    <p className="text-xs text-gray-500">Uploaded 2 hours ago • 25 students</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">View</Button>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <X className="text-red-500" size={16} />
                  <div>
                    <p className="text-sm font-medium">7th_grade_roster.csv</p>
                    <p className="text-xs text-gray-500">Failed • Missing required columns</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Retry</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}