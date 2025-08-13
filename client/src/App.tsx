import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
// Authentication is handled via hooks, no provider needed
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ResetPassword from "@/pages/reset-password";
import KioskDemo from "@/pages/kiosk-demo";
import Kiosk from "./pages/kiosk";
import Guide from "./pages/guide";
import Features from "./pages/features";
import BillingSuccess from "./pages/billing-success";
import AdminDashboard from "./pages/admin-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/kiosk-demo" component={KioskDemo} />
      <Route path="/kiosk" component={Kiosk} />
      <Route path="/guide" component={Guide} />
      <Route path="/features" component={Features} />
      <Route path="/billing-success" component={BillingSuccess} />
      <Route path="/admin" component={AdminDashboard} />
      {/* Catch-all route for unmatched paths */}
      <Route>
        <Home />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
