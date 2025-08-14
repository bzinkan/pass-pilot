import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, User, LogOut, Heart, AlertTriangle, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StudentKioskProps {
  onBack: () => void;
}

export function StudentKiosk({ onBack }: StudentKioskProps) {
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [studentId, setStudentId] = useState("");
  const [selectedPassType, setSelectedPassType] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Mock student data for demonstration
  const mockStudent = {
    id: "1",
    name: "Emma Johnson",
    grade: "5th Grade",
    currentlyOut: false,
    lastPass: "Yesterday, 2:30 PM - Returned 2:45 PM"
  };

  const handleStudentLogin = () => {
    if (studentId.length >= 3) {
      setCurrentStudent(mockStudent);
    }
  };

  const handleRequestPass = async () => {
    if (!selectedPassType) return;
    
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setCurrentStudent(null);
      setStudentId("");
      setSelectedPassType("");
      setCustomReason("");
      alert("Pass request sent to teacher for approval!");
    }, 1500);
  };

  const handleReturnFromPass = () => {
    setCurrentStudent({ ...currentStudent, currentlyOut: false });
    alert("Welcome back! Pass completed.");
  };

  if (!currentStudent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-blue-600">Student Pass Kiosk</CardTitle>
              <p className="text-slate-600">Enter your Student ID to request a pass</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="student-id">Student ID</Label>
                <Input
                  id="student-id"
                  placeholder="Enter your student ID..."
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="text-center text-xl"
                  maxLength={10}
                />
              </div>
              
              <Button 
                onClick={handleStudentLogin}
                className="w-full"
                disabled={studentId.length < 3}
              >
                <User className="w-4 h-4 mr-2" />
                Sign In
              </Button>
              
              <div className="text-center">
                <Button variant="ghost" onClick={onBack} className="text-sm">
                  ← Back to Teacher View
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStudent.currentlyOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="shadow-lg border-orange-200">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <CardTitle className="text-xl">You're Currently Out</CardTitle>
              <p className="text-slate-600">Return from your pass when finished</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <p className="font-medium">{currentStudent.name}</p>
                <p className="text-sm text-slate-600">{currentStudent.grade}</p>
                <Badge className="mt-2 bg-orange-100 text-orange-700">
                  Out for 8 minutes
                </Badge>
              </div>
              
              <Button 
                onClick={handleReturnFromPass}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                I'm Back - End Pass
              </Button>
              
              <Button variant="ghost" onClick={() => setCurrentStudent(null)} className="w-full">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4">
      <div className="max-w-md mx-auto pt-12">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Welcome, {currentStudent.name}</CardTitle>
            <p className="text-slate-600">{currentStudent.grade}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-slate-50 p-3 rounded-lg text-sm">
              <p className="text-slate-600">Last Pass:</p>
              <p className="font-medium">{currentStudent.lastPass}</p>
            </div>

            <div className="space-y-3">
              <Label>Why do you need to leave?</Label>
              <Select value={selectedPassType} onValueChange={setSelectedPassType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pass type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restroom">Restroom</SelectItem>
                  <SelectItem value="water">Water/Drink</SelectItem>
                  <SelectItem value="nurse">Nurse Visit</SelectItem>
                  <SelectItem value="office">Main Office</SelectItem>
                  <SelectItem value="locker">Locker</SelectItem>
                  <SelectItem value="counselor">Counselor</SelectItem>
                  <SelectItem value="other">Other (explain below)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPassType === "other" && (
              <div className="space-y-2">
                <Label htmlFor="custom-reason">Please explain:</Label>
                <Input
                  id="custom-reason"
                  placeholder="Enter reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                onClick={handleRequestPass}
                disabled={!selectedPassType || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Request Pass
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setCurrentStudent(null)}
                disabled={isLoading}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-center">
              <Button variant="ghost" onClick={onBack} className="text-sm">
                ← Teacher View
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}