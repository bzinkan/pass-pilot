import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-blue-700 text-white min-h-screen flex items-center relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1580582932707-520aed937b7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')"
          }}
        />
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-id-card text-primary text-2xl"></i>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                PassPilot
              </h1>
              <p className="text-xl md:text-2xl mb-8 opacity-90">
                Streamline Student Pass Management with Real-Time Tracking
              </p>
              <p className="text-lg mb-12 opacity-80 max-w-2xl mx-auto">
                Designed specifically for teachers and schools to efficiently manage bathroom passes, 
                track student movements, and maintain classroom safety with intelligent reporting.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                onClick={() => setLocation('/trial')}
                className="bg-white text-primary px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transition duration-200 shadow-lg"
                data-testid="button-start-trial"
              >
                Start Free Trial
              </Button>
              <Button 
                onClick={() => setLocation('/login')}
                variant="outline"
                className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-primary transition duration-200"
                data-testid="button-login"
              >
                Log In
              </Button>
            </div>
            
            <div className="flex flex-col items-center gap-2 mb-12">
              <Button 
                onClick={() => setLocation('/login')}
                variant="link"
                className="text-white hover:text-gray-200 underline text-lg"
                data-testid="button-forgot-password-landing"
              >
                Forgot your password?
              </Button>
              <Button 
                onClick={() => setLocation('/guide')}
                variant="link"
                className="text-white hover:text-gray-200 underline text-lg"
                data-testid="button-quick-guide"
              >
                Quick Start Guide
              </Button>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
                <i className="fas fa-clock text-3xl mb-4"></i>
                <h3 className="font-semibold mb-2">Real-Time Tracking</h3>
                <p className="text-sm opacity-80">Monitor student movements instantly with live updates</p>
              </div>
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
                <i className="fas fa-chart-line text-3xl mb-4"></i>
                <h3 className="font-semibold mb-2">Smart Reports</h3>
                <p className="text-sm opacity-80">Generate detailed analytics and export data easily</p>
              </div>
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
                <i className="fas fa-shield-alt text-3xl mb-4"></i>
                <h3 className="font-semibold mb-2">Simple & Private</h3>
                <p className="text-sm opacity-80">No student IDs or emails required - just names for easy tracking</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Everything You Need for Efficient Pass Management
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              PassPilot provides comprehensive tools for teachers and administrators to maintain 
              student safety while reducing classroom disruptions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card rounded-xl shadow-lg p-8 hover:shadow-xl transition duration-300">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-6">
                <i className="fas fa-clipboard-list text-white text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Live Pass Tracking</h3>
              <p className="text-muted-foreground">
                See which students are currently out of class with real-time status updates and duration tracking.
              </p>
            </div>

            <div className="bg-card rounded-xl shadow-lg p-8 hover:shadow-xl transition duration-300">
              <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-6">
                <i className="fas fa-users text-white text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Multi-Grade Management</h3>
              <p className="text-muted-foreground">
                Manage multiple grade levels and classrooms with easy switching between student rosters.
              </p>
            </div>

            <div className="bg-card rounded-xl shadow-lg p-8 hover:shadow-xl transition duration-300">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-6">
                <i className="fas fa-tablet-alt text-white text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Kiosk Mode</h3>
              <p className="text-muted-foreground">
                Let students sign themselves in/out using a dedicated device while you maintain full oversight and control.
              </p>
            </div>

            <div className="bg-card rounded-xl shadow-lg p-8 hover:shadow-xl transition duration-300">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-6">
                <i className="fas fa-chart-bar text-white text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Detailed Reports</h3>
              <p className="text-muted-foreground">
                Generate comprehensive reports with filtering options and export to CSV or PDF formats.
              </p>
            </div>

            <div className="bg-card rounded-xl shadow-lg p-8 hover:shadow-xl transition duration-300">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-6">
                <i className="fas fa-mobile-alt text-white text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Mobile Friendly</h3>
              <p className="text-muted-foreground">
                Access PassPilot from any device with a responsive design optimized for tablets and phones.
              </p>
            </div>

            <div className="bg-card rounded-xl shadow-lg p-8 hover:shadow-xl transition duration-300">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mb-6">
                <i className="fas fa-cogs text-white text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Admin Controls</h3>
              <p className="text-muted-foreground">
                School administrators can manage teacher accounts, billing, and configure system settings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Temporarily Hidden for School Testing */}

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Classroom Management?
          </h2>
          <p className="text-xl mb-12 opacity-90 max-w-2xl mx-auto">
            Join thousands of teachers and schools already using PassPilot to create safer, 
            more organized learning environments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => setLocation('/trial')}
              className="bg-white text-primary px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transition duration-200 shadow-lg"
              data-testid="button-start-trial"
            >
              Start Free Trial
            </Button>
            <Button 
              onClick={() => setLocation('/register')}
              variant="outline"
              className="bg-transparent border-2 border-white text-white px-6 py-4 rounded-lg font-semibold hover:bg-white hover:text-primary transition duration-200"
              data-testid="button-view-pricing"
            >
              View Pricing & Plans
            </Button>
            <Button 
              variant="outline"
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-primary transition duration-200"
              data-testid="button-schedule-demo"
            >
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-id-card text-white text-sm"></i>
              </div>
              <span className="text-xl font-bold">PassPilot</span>
            </div>
            
            <div className="mb-8">
              <h4 className="font-semibold mb-4 text-lg">Support</h4>
              <div className="text-xs text-gray-500 mb-2">Teacher helping teachers</div>
              <a 
                href="mailto:passpilotapp@gmail.com" 
                className="text-primary hover:text-primary/80 text-lg"
                data-testid="link-support-email"
              >
                passpilotapp@gmail.com
              </a>
              <p className="text-sm text-gray-400 mt-2">
                Adding pics for troubleshooting highly recommended
              </p>
            </div>
            
            <div className="border-t border-gray-800 pt-8">
              <p className="text-sm text-gray-400">&copy; 2024 PassPilot. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>



    </div>
  );
}
