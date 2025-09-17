import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import SignupPage from "@/pages/SignupPage";
import LoginPage from "@/pages/LoginPage";
import { ThemeProvider } from "next-themes";

// Import dashboard components
import { DashboardLayout } from "@/components/DashboardLayout";
import DashboardPage from "@/pages/DashboardPage";
import ConsultationPage from "@/pages/ConsultationPage";
import MyFormulaPage from "@/pages/MyFormulaPage";
import OrdersPage from "@/pages/OrdersPage";
import ProfilePage from "@/pages/ProfilePage";
import SupportPage from "@/pages/SupportPage";

// Import all landing page components
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import ScienceSection from "@/components/ScienceSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import PricingSection from "@/components/PricingSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <ScienceSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

// Dashboard Router - handles all dashboard routes
function DashboardRouter() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/dashboard/consultation" component={ConsultationPage} />
        <Route path="/dashboard/formula" component={MyFormulaPage} />
        <Route path="/dashboard/orders" component={OrdersPage} />
        <Route path="/dashboard/profile" component={ProfilePage} />
        <Route path="/dashboard/support" component={SupportPage} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

// Main Router
function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/login" component={LoginPage} />
      
      {/* Protected Dashboard Routes */}
      <Route path="/dashboard*">
        <ProtectedRoute>
          <DashboardRouter />
        </ProtectedRoute>
      </Route>
      
      {/* Legacy /chat redirect to dashboard consultation */}
      <Route path="/chat">
        <ProtectedRoute>
          <ConsultationPage />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
