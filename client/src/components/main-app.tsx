import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChevronDown, Smartphone } from "lucide-react";
import { PassesTab } from "./tabs/passes-tab";
import { MyClassTab } from "./tabs/myclass-tab";
import { RosterTab } from "./tabs/roster-tab";
import { UploadTab } from "./tabs/upload-tab";
import { ReportsTab } from "./tabs/reports-tab";
import { ProfileTab } from "./tabs/profile-tab";
import { BillingTab } from "./tabs/billing-tab";
import { SetupTab } from "./tabs/setup-tab";
import TrialStatusBanner from "./trial-status-banner";

import { useToast } from "@/hooks/use-toast";
import { usePassNotifications } from "@/hooks/use-pass-notifications";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface MainAppProps {
  user: any;
  onLogout: () => void;
}

export function MainApp({ user, onLogout }: MainAppProps) {
  const [currentTab, setCurrentTab] = useState('passes');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Kiosk mode state
  const [showKioskDialog, setShowKioskDialog] = useState(false);
  const [kioskPin, setKioskPin] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  
  // Enable pass notifications
  usePassNotifications({ user, enabled: user?.enableNotifications });
  
  // Initialize selectedGrades from localStorage
  const [selectedGrades, setSelectedGrades] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`selectedGrades_${user.id}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  
  // Initialize currentGrade from localStorage
  const [currentGrade, setCurrentGrade] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`currentGrade_${user.id}`) || null;
    } catch {
      return null;
    }
  });
  
  // Save selectedGrades to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(`selectedGrades_${user.id}`, JSON.stringify(Array.from(selectedGrades)));
    } catch (error) {
      console.warn('Failed to save selected grades to localStorage:', error);
    }
  }, [selectedGrades, user.id]);
  
  // Save currentGrade to localStorage whenever it changes
  useEffect(() => {
    try {
      if (currentGrade) {
        localStorage.setItem(`currentGrade_${user.id}`, currentGrade);
      } else {
        localStorage.removeItem(`currentGrade_${user.id}`);
      }
    } catch (error) {
      console.warn('Failed to save current grade to localStorage:', error);
    }
  }, [currentGrade, user.id]);

  const tabs = [
    { id: 'passes', label: 'Passes', icon: 'fas fa-clipboard-list' },
    { id: 'myclass', label: 'My Class', icon: 'fas fa-chalkboard-teacher' },
    { id: 'roster', label: 'Roster', icon: 'fas fa-users' },
    { id: 'upload', label: 'Upload', icon: 'fas fa-cloud-upload-alt' },
    { id: 'reports', label: 'Reports', icon: 'fas fa-chart-bar' },
    { id: 'profile', label: 'Profile', icon: 'fas fa-user' },
  ];

  // Add admin-only tabs
  if (user.isAdmin) {
    tabs.push({ id: 'admin', label: 'Admin', icon: 'fas fa-cog' });
    tabs.push({ id: 'billing', label: 'Billing', icon: 'fas fa-credit-card' });
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case 'passes':
        return <PassesTab user={user} selectedGrades={selectedGrades} />;
      case 'myclass':
        return <MyClassTab 
          user={user} 
          selectedGrades={selectedGrades} 
          currentGrade={currentGrade}
          onRemoveGrade={(gradeName) => {
            const newSelectedGrades = new Set(selectedGrades);
            newSelectedGrades.delete(gradeName);
            if (currentGrade === gradeName) {
              // Set to the first remaining grade or null
              const remainingGrades = Array.from(newSelectedGrades);
              setCurrentGrade(remainingGrades.length > 0 ? remainingGrades[0]! : null);
            }
            setSelectedGrades(newSelectedGrades);
          }}
        />;
      case 'roster':
        return <RosterTab 
          user={user} 
          selectedGrades={selectedGrades}
          onGradeClick={(gradeName) => {
            const newSelectedGrades = new Set(selectedGrades);
            if (selectedGrades.has(gradeName)) {
              newSelectedGrades.delete(gradeName);
              if (currentGrade === gradeName) {
                setCurrentGrade(null);
              }
            } else {
              newSelectedGrades.add(gradeName);
              setCurrentGrade(gradeName);
            }
            setSelectedGrades(newSelectedGrades);
          }} 
        />;
      case 'upload':
        return <UploadTab user={user} />;
      case 'reports':
        return <ReportsTab user={user} />;
      case 'admin':
        return user.isAdmin ? <SetupTab user={user} /> : null;
      case 'profile':
        return <ProfileTab user={user} />;
      case 'billing':
        return user.isAdmin ? <BillingTab user={user} /> : null;
      default:
        return <PassesTab user={user} />;
    }
  };



  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-foreground">PassPilot</h1>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{user.schoolName || 'School'}</span>
              <span>•</span>
              <span>{user.name || 'Teacher'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-user-menu">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowKioskDialog(true)} data-testid="menu-switch-kiosk">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Switch to Kiosk
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout} data-testid="menu-logout">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 min-h-screen">
        <div className="p-4">
          <TrialStatusBanner />
        </div>
        {renderTabContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
        <div className={`grid h-16 ${tabs.length === 6 ? 'grid-cols-6' : 'grid-cols-7'}`}>
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              className={`flex flex-col items-center justify-center h-full rounded-none ${
                currentTab === tab.id 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setCurrentTab(tab.id)}
              data-testid={`button-tab-${tab.id}`}
            >
              <i className={`${tab.icon} text-lg mb-1`}></i>
              <span className="text-xs">{tab.label}</span>
            </Button>
          ))}
        </div>
      </nav>

      {/* Kiosk Mode Dialog */}
      <Dialog open={showKioskDialog} onOpenChange={setShowKioskDialog}>
        <DialogContent data-testid="dialog-kiosk-setup">
          <DialogHeader>
            <DialogTitle>Switch to Kiosk Mode</DialogTitle>
            <DialogDescription>
              Set up this device for shared use. Students can check out passes without accessing teacher settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                4-Digit PIN (for exiting kiosk mode):
              </label>
              <Input
                type="password"
                placeholder="Enter 4-digit PIN"
                value={kioskPin}
                onChange={(e) => setKioskPin(e.target.value.slice(0, 4))}
                maxLength={4}
                className="text-center text-lg"
                data-testid="input-kiosk-pin"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Location Label (optional):
              </label>
              <Input
                placeholder="e.g., Mr. Smith's Room, Hallway Tablet"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                data-testid="input-location-label"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSwitchToKiosk}
                disabled={kioskPin.length !== 4}
                className="flex-1"
                data-testid="button-confirm-kiosk"
              >
                Switch to Kiosk
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowKioskDialog(false);
                  setKioskPin("");
                  setLocationLabel("");
                }}
                className="flex-1"
                data-testid="button-cancel-kiosk"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  async function handleSwitchToKiosk() {
    try {
      // Save the kiosk PIN to the user's profile
      const response = await fetch('/api/auth/set-kiosk-pin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          pin: kioskPin,
        }),
      });

      if (!response.ok) throw new Error('Failed to set kiosk PIN');

      // Create kiosk session - simplified approach
      const kioskSession = {
        teacherId: user.id,
        teacherName: user.name,
        locationLabel: locationLabel || undefined,
        schoolId: user.schoolId,
        currentGrade: currentGrade, // Just pass the current active grade
        token: localStorage.getItem('token'), // Include auth token for API calls
      };

      console.log('Creating kiosk session:', kioskSession);

      sessionStorage.setItem('kioskSession', JSON.stringify(kioskSession));
      
      // Navigate to kiosk mode
      setLocation('/kiosk');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch to kiosk mode. Please try again.",
        variant: "destructive",
      });
    }
  }
}
