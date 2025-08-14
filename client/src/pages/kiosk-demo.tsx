import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudentKiosk } from "@/components/student-kiosk";
// Teacher approval panel removed
import { Monitor, Users, CheckSquare } from "lucide-react";

export default function KioskDemo() {
  const [currentView, setCurrentView] = useState<"menu" | "student" | "teacher">("menu");

  if (currentView === "student") {
    return <StudentKiosk onBack={() => setCurrentView("menu")} />;
  }

  if (currentView === "teacher") {
    return <TeacherApprovalPanel onBack={() => setCurrentView("menu")} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-6">
      <div className="max-w-4xl mx-auto pt-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-800 mb-4">
            Student Self-Service Pass System Demo
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Experience how a student-operated kiosk system would work compared to teacher-managed passes
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCurrentView("student")}>
            <CardHeader className="text-center">
              <Monitor className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle className="text-xl">Student Kiosk View</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                See what students would experience when requesting passes at a classroom computer or tablet.
              </p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Enter student ID to sign in</li>
                <li>• Select pass type and reason</li>
                <li>• Submit request for teacher approval</li>
                <li>• Return to mark pass complete</li>
              </ul>
              <Button className="w-full mt-4">
                Try Student View →
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCurrentView("teacher")}>
            <CardHeader className="text-center">
              <CheckSquare className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <CardTitle className="text-xl">Teacher Approval Panel</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                See how teachers would approve or deny student pass requests in real-time.
              </p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• View incoming student requests</li>
                <li>• See pass type and reasons</li>
                <li>• Approve or deny with one click</li>
                <li>• Monitor all active passes</li>
              </ul>
              <Button className="w-full mt-4" variant="outline">
                Try Teacher View →
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                Student Self-Service Advantages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-green-700 space-y-2 text-sm">
                <li>• Reduces teacher interruptions during instruction</li>
                <li>• Students take ownership of pass requests</li>
                <li>• Automatic logging and accountability</li>
                <li>• Scales well for larger classes</li>
                <li>• Digital literacy for students</li>
                <li>• Clear audit trail of all requests</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="text-orange-800 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Implementation Considerations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-orange-700 space-y-2 text-sm">
                <li>• Requires dedicated device in each classroom</li>
                <li>• Student ID system and training needed</li>
                <li>• Teacher must monitor approval notifications</li>
                <li>• May not work well for younger students</li>
                <li>• Needs reliable internet connectivity</li>
                <li>• Initial setup and device management</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-bold text-blue-800 mb-2">Hybrid Option</h3>
              <p className="text-blue-700">
                PassPilot could offer both modes - letting schools choose teacher-managed passes 
                OR student self-service kiosks based on their preferences and classroom setup.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}