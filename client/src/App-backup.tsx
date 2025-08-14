import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import Home from "@/pages/home";
import Login from "@/pages/login";
import { ProfessionalRegistration } from "@/components/professional-registration";
import TrialRegistration from "@/components/trial-registration";
import RegistrationSuccess from "@/pages/registration-success";
import RegistrationCancelled from "@/pages/registration-cancelled";
import TrialSuccess from "@/pages/trial-success";
import VerificationPending from "@/pages/verification-pending";
import ResetPassword from "@/pages/reset-password";
import KioskDemo from "@/pages/kiosk-demo";
import Kiosk from "./pages/kiosk";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={ProfessionalRegistration} />
      <Route path="/trial" component={TrialRegistration} />
      <Route path="/verification-pending" component={VerificationPending} />
      <Route path="/registration-success" component={RegistrationSuccess} />
      <Route path="/registration-cancelled" component={RegistrationCancelled} />
      <Route path="/trial-success" component={TrialSuccess} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/kiosk-demo" component={KioskDemo} />
      <Route path="/kiosk" component={Kiosk} />
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
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;