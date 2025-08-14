import { useAuth } from "@/hooks/use-auth";
import { LandingPage } from "@/components/landing-page";
import { MainApp } from "@/components/main-app";

export default function Home() {
  const { user, logout, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return <MainApp user={user} onLogout={logout} />;
}
