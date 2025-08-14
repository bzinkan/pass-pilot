import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { useAuth } from "./hooks/use-auth";

import { LandingPage } from "@/components/landing-page";
import { MainApp } from "@/components/main-app";
import Home from "./pages/home";
import Login from "./pages/login-new";
import Register from "./pages/register";
import ResetPassword from "./pages/reset-password";
import Features from "./pages/features";
import Guide from "./pages/guide";
import BillingSuccess from "./pages/billing-success";
import AdminDashboard from "./pages/admin-dashboard";
import Kiosk from "./pages/kiosk";
import KioskDemo from "./pages/kiosk-demo";
import NotFound from "./pages/not-found";

function Router() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/features" component={Features} />
      <Route path="/guide" component={Guide} />
      <Route path="/billing-success" component={BillingSuccess} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/kiosk" component={Kiosk} />
      <Route path="/kiosk-demo" component={KioskDemo} />
      <Route path="/app">
        {user ? (
          <MainApp user={user} onLogout={logout} />
        ) : (
          <Login />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen">
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
