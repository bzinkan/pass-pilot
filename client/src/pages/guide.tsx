import { ArrowLeft, CheckCircle, Clock, Users, Settings, BarChart3, Upload, UserPlus, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Guide() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            PassPilot Quick Start Guide
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Everything you need to get started with digital hall pass management
          </p>
        </div>

        {/* Section 1: Logging In */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              1. Logging In
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>• Use your email to log in.</p>
            <p>• You can set any password you want — the app will save it as your permanent password.</p>
          </CardContent>
        </Card>

        {/* Section 2: The 6 Tabs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              2. The 6 Tabs at the Bottom
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Profile</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Edit your name, change your password, and adjust system settings like the optional notification system (e.g., set to 5 minutes to get an alert if a student is out too long).
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Report</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Tracks daily, weekly, and custom date ranges. Logs teacher activity for accountability. Tracks reasons students are out (General, Nurse, Discipline, Custom). Export as PDF or Excel.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Upload className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Upload</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Upload student rosters via Google Classroom or Clever.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <UserPlus className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Roster</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Add any grade level. Select the grades you teach to quickly switch between them in MyClass. Click a grade tab to highlight it green — that means it's active.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">MyClass</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Manage students being out. Tabs match your selected grades. 'Mark Out' logs them as out and starts a timer. Choose a reason (Nurse, Discipline, Custom). All activity logs to Reports.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Badge className="bg-blue-100 text-blue-700">
                    Passes
                  </Badge>
                  <div>
                    <h4 className="font-semibold">Passes</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      See all students currently out — filtered by your assigned classes in Roster. Admins can monitor the whole school.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Kiosk Mode */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-green-600" />
              3. Kiosk Mode & Mobile App Installation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3">Kiosk Mode Setup:</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Lets students sign themselves in/out from a dedicated device (e.g., touchscreen Chromebook).
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                You can have both Kiosk Mode and your Teacher View open at the same time.
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-3">How to use:</h4>
                <ol className="space-y-2 text-sm">
                  <li>1. Log in and set your grades in Roster.</li>
                  <li>2. Click the dropdown (upper-right corner) → Switch to Kiosk.</li>
                  <li>3. Leave this screen open for student use.</li>
                  <li>4. To have your Teacher View open just navigate to a new PassPilot URL on your computer and log in again.</li>
                </ol>
                <p className="text-sm mt-3 text-gray-600 dark:text-gray-300">
                  Everything is tied to your teacher ID, so when you log in again the Kiosk and any additional Kiosks will be linked to your Teacher View.
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Example Setup</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Mike keeps Teacher View on his laptop while a Chromebook in the corner runs Kiosk Mode. Students sign in/out themselves, and Mike can override or monitor everything from MyClass.
                </p>
              </div>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">📱 Install as Mobile App (PWA):</h4>
              <div className="space-y-2 text-sm">
                <p><strong>On iPhone/iPad:</strong></p>
                <p>1. Open PassPilot in Safari</p>
                <p>2. Tap the Share button (square with arrow)</p>
                <p>3. Scroll down and tap "Add to Home Screen"</p>
                <p>4. Tap "Add" - now you have a PassPilot app icon!</p>
                
                <p className="mt-3"><strong>On Android:</strong></p>
                <p>1. Open PassPilot in Chrome</p>
                <p>2. Tap the menu (3 dots) in the top right</p>
                <p>3. Tap "Add to Home screen" or "Install app"</p>
                <p>4. Tap "Add" - now you have a PassPilot app icon!</p>
                
                <p className="mt-3"><strong>Benefits:</strong> Faster access, works offline, feels like a native app</p>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg mt-4">
                  <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">⚠️ Important PWA Kiosk Warning:</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    In PWA mode, you cannot close tabs or access browser controls. If you forget your 4-digit kiosk exit password, you'll need to force-close the app (double-tap home button and swipe up on iOS, or use recent apps on Android) and reopen PassPilot.
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                    <strong>Recommendation:</strong> Write down your 4-digit password or use something memorable before entering kiosk mode in PWA.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link href="/trial">
            <Button size="lg" className="flex-1" data-testid="button-start-trial">
              Start Free Trial
            </Button>
          </Link>
          <Link href="/features">
            <Button variant="outline" size="lg" className="flex-1" data-testid="button-view-features">
              View Key Features
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}