import TopBar from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Save, RotateCcw } from "lucide-react";

export default function Settings() {
  return (
    <>
      <TopBar 
        title="Settings" 
        subtitle="Configure system preferences and defaults" 
      />
      
      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="school-name">School Name</Label>
                <Input
                  id="school-name"
                  defaultValue="Lincoln High School"
                  data-testid="input-school-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-teacher">Default Teacher</Label>
                <Input
                  id="default-teacher"
                  defaultValue="Ms. Anderson"
                  data-testid="input-default-teacher"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="max-duration">Maximum Pass Duration (minutes)</Label>
                <Select defaultValue="30">
                  <SelectTrigger data-testid="select-max-duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="20">20 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warning-time">Warning Time (minutes before overdue)</Label>
                <Select defaultValue="5">
                  <SelectTrigger data-testid="select-warning-time">
                    <SelectValue placeholder="Select warning time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 minutes</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pass Options */}
        <Card>
          <CardHeader>
            <CardTitle>Pass Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-print passes</Label>
                <p className="text-sm text-gray-500">Automatically print passes after creation</p>
              </div>
              <Switch data-testid="switch-auto-print" />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require return confirmation</Label>
                <p className="text-sm text-gray-500">Students must check in when returning</p>
              </div>
              <Switch defaultChecked data-testid="switch-require-return" />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Send overdue notifications</Label>
                <p className="text-sm text-gray-500">Alert staff when passes become overdue</p>
              </div>
              <Switch defaultChecked data-testid="switch-overdue-notifications" />
            </div>
          </CardContent>
        </Card>

        {/* Destinations */}
        <Card>
          <CardHeader>
            <CardTitle>Destinations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Configure available destinations for hall passes:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  "Restroom",
                  "Nurse's Office",
                  "Principal's Office",
                  "Library",
                  "Guidance Counselor",
                  "Locker",
                  "Other"
                ].map((destination) => (
                  <div key={destination} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">{destination}</span>
                    <Switch defaultChecked data-testid={`switch-destination-${destination.toLowerCase().replace(/[^a-z]/g, '-')}`} />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" data-testid="button-reset">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button data-testid="button-save">
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </>
  );
}
