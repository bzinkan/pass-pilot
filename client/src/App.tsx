import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NavigationHeader from "./components/navigation-header";
import TeacherDashboard from "./pages/teacher-dashboard";
import StudentView from "./pages/student-view";
import NotFound from "@/pages/not-found";

function Router() {
  const [activeRole, setActiveRole] = useState<'teacher' | 'student'>('teacher');

  const handleRoleToggle = (role: 'teacher' | 'student') => {
    setActiveRole(role);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader 
        onRoleToggle={handleRoleToggle}
        activeRole={activeRole}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {activeRole === 'teacher' ? <TeacherDashboard /> : <StudentView />}
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/" component={Router} />
          <Route component={NotFound} />
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
