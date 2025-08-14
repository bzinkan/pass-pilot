import { ArrowLeft, Users, Smartphone, Clock, BarChart3, Shield, Target, Package, Monitor, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Features() {
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
            PassPilot Key Features
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Everything you need for modern digital hall pass management
          </p>
        </div>

        {/* Feature Cards */}
        <div className="space-y-6">
          {/* Multi-Class & Multi-Teacher Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Multi-Class & Multi-Teacher Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="font-semibold text-blue-800 dark:text-blue-200">
                  Perfect for single teacher use or multi-teacher school-wide tracking.
                </p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  Very affordable for an individual teacher who wants to track passes in their own classroom.
                </p>
              </div>
              <ul className="space-y-2">
                <li>• Manage multiple grade levels and classes.</li>
                <li>• Grade-based privacy controls.</li>
                <li>• Bulk student import from spreadsheets.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Mobile-First Design */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-6 h-6 text-green-600" />
                Mobile-First Design
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                <li>• Works on phones, tablets, and computers.</li>
                <li>• Install as a mobile app (PWA) for quick access.</li>
                <li>• No downloads required — runs in any modern browser.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Real-Time Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-6 h-6 text-orange-600" />
                Real-Time Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                <li>• See exactly who's out of class right now.</li>
                <li>• Automatic pass duration tracking.</li>
                <li>• Optional instant notifications when students return.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Comprehensive Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-purple-600" />
                Comprehensive Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                <li>• Daily, weekly, and monthly pass statistics.</li>
                <li>• Separate tracking for bathroom, nurse, and discipline passes.</li>
                <li>• Export data for parent conferences & admin meetings.</li>
              </ul>
            </CardContent>
          </Card>

          {/* School-Ready Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-red-600" />
                School-Ready Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                <li>• Secure login system.</li>
                <li>• Admin controls for school-wide deployment.</li>
                <li>• Data privacy compliant.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Perfect For */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-6 h-6 text-indigo-600" />
                Perfect For
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                <li>• Teachers wanting better hall pass control.</li>
                <li>• Department heads tracking student movements.</li>
                <li>• Administrators needing school-wide oversight.</li>
                <li>• Schools transitioning to digital solutions.</li>
                <li>• Teachers tired of lost or forgotten paper passes.</li>
              </ul>
            </CardContent>
          </Card>

          {/* What's Included */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-6 h-6 text-green-600" />
                What's Included
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                <li>• Full web application access.</li>
                <li>• Step-by-step setup guide + video tutorials.</li>
                <li>• Student roster import template.</li>
                <li>• Administrator training materials.</li>
                <li>• Email support for setup assistance.</li>
              </ul>
            </CardContent>
          </Card>

          {/* System Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-6 h-6 text-gray-600" />
                System Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                <li>• Internet connection.</li>
                <li>• Modern browser: Chrome, Safari, Firefox, Edge.</li>
                <li>• Optional: Smartphone or tablet for mobile use.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Getting Started */}
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle className="w-6 h-6" />
                Getting Started Is Easy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="space-y-2 text-green-700 dark:text-green-300">
                <li>1. Purchase & receive your access credentials.</li>
                <li>2. Set up your school and classes (about 5 minutes).</li>
                <li>3. Import or add your students.</li>
                <li>4. Start tracking passes instantly!</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link href="/trial">
            <Button size="lg" className="flex-1" data-testid="button-start-trial">
              Start Free Trial
            </Button>
          </Link>
          <Link href="/guide">
            <Button variant="outline" size="lg" className="flex-1" data-testid="button-view-guide">
              View Quick Start Guide
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}