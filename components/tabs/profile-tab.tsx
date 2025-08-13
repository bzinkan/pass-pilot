import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { User, Settings, School, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

interface ProfileTabProps {
  user: any;
}

export function ProfileTab({ user }: ProfileTabProps) {
  const [settings, setSettings] = useState({
    schoolName: user.schoolName || '',
    enableNotifications: user.enableNotifications ?? true,
    autoReturn: user.autoReturn ?? false,
    passTimeout: user.passTimeout ?? 30,
  });
  const [userName, setUserName] = useState(user.name || '');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { toast } = useToast();

  // Update settings when user prop changes
  useEffect(() => {
    setSettings({
      schoolName: user.schoolName || '',
      enableNotifications: user.enableNotifications ?? true,
      autoReturn: user.autoReturn ?? false,
      passTimeout: user.passTimeout ?? 30,
    });
  }, [user]);

  const handleSaveSettings = async () => {
    try {
      // Save name if it changed
      if (userName !== user.name) {
        await apiRequest('PUT', '/api/users/me', { name: userName });
      }
      
      await apiRequest('PUT', '/api/users/settings', settings);
      
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      
      toast({
        title: "Settings Saved",
        description: "Your profile and settings have been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiRequest('PUT', '/api/users/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      
      setShowPasswordDialog(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Profile & Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your profile and configure your school settings
        </p>
      </div>

      <div className="space-y-6">
        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input 
                  value={user.email} 
                  readOnly
                  disabled 
                  className="bg-muted" 
                  data-testid="input-email"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed
                </p>
              </div>
              <div>
                <Label>Name</Label>
                <Input 
                  value={userName} 
                  onChange={(e) => setUserName(e.target.value)} 
                  placeholder="Enter your name"
                  data-testid="input-name"
                />
              </div>
              <div>
                <Label>Role</Label>
                <Input 
                  value={user.isAdmin ? 'Administrator' : 'Teacher'} 
                  readOnly
                  disabled 
                  className="bg-muted"
                  data-testid="input-role"
                />
              </div>
              <div>
                <Label>Password</Label>
                <div className="flex gap-2">
                  <Input 
                    value="••••••••" 
                    onChange={() => {}}
                    readOnly
                    disabled 
                    className="bg-muted flex-1"
                    type="password"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordDialog(true)}
                    data-testid="button-change-password"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Change
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* School Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="w-5 h-5" />
              School Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  id="schoolName"
                  value={settings.schoolName}
                  onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                  placeholder="Enter school name"
                  data-testid="input-school-name"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when students are out for extended periods
                  </p>
                </div>
                <Switch
                  checked={settings.enableNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableNotifications: checked })}
                  data-testid="switch-notifications"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Return Students</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically mark students as returned after timeout
                  </p>
                </div>
                <Switch
                  checked={settings.autoReturn}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoReturn: checked })}
                  data-testid="switch-auto-return"
                />
              </div>
              
              <div>
                <Label htmlFor="passTimeout">Pass Timeout (minutes)</Label>
                <Input
                  id="passTimeout"
                  type="number"
                  value={settings.passTimeout}
                  onChange={(e) => setSettings({ ...settings, passTimeout: parseInt(e.target.value) || 30 })}
                  min="5"
                  max="180"
                  data-testid="input-pass-timeout"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Time before a pass is considered overdue (5-180 minutes)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium">Create Grades</p>
                  <p className="text-sm text-muted-foreground">
                    Go to the Roster tab and add your grade levels (6th, 7th, 8th, etc.)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium">Add Students</p>
                  <p className="text-sm text-muted-foreground">
                    Use bulk add or individual student creation in the Roster tab
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium">Select Active Grades</p>
                  <p className="text-sm text-muted-foreground">
                    Click on grade cards in Roster to make them active in MyClass (they'll turn green)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mt-0.5">
                  4
                </div>
                <div>
                  <p className="font-medium">Manage Passes</p>
                  <p className="text-sm text-muted-foreground">
                    Use the MyClass tab to issue and track student hall passes
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            onClick={handleSaveSettings}
            data-testid="button-save-settings"
          >
            Save Settings
          </Button>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  data-testid="input-current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  data-testid="input-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  data-testid="input-confirm-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
              disabled={isChangingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              data-testid="button-confirm-password-change"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}