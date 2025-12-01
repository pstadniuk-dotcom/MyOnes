import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";
import NotFound from "@/pages/not-found";
import SignupPage from "@/pages/SignupPage";
import LoginPage from "@/pages/LoginPage";
import SciencePage from "@/pages/SciencePage";
// ThemeProvider removed: app is light-only

// Import static pages
import AboutPage from "@/pages/AboutPage";
import BlogPage from "@/pages/BlogPage";
import CareersPage from "@/pages/CareersPage";
import PressPage from "@/pages/PressPage";
import PartnershipsPage from "@/pages/PartnershipsPage";
import ContactPage from "@/pages/ContactPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import RefundsPage from "@/pages/RefundsPage";
import DisclaimerPage from "@/pages/DisclaimerPage";
import ReturnsPage from "@/pages/ReturnsPage";
import ShippingPage from "@/pages/ShippingPage";

// Import dashboard components
import { DashboardLayout } from "@/components/DashboardLayout";
import DashboardHome from "@/pages/DashboardHome";
import ConsultationPage from "@/pages/ConsultationPage";
import MyFormulaPage from "@/pages/MyFormulaPage";
import OptimizePage from "@/pages/OptimizePage";
import WearablesPage from "@/pages/WearablesPage";
import LabReportsPage from "@/pages/LabReportsPage";
import OrdersPage from "@/pages/OrdersPage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import SupportPage from "@/pages/SupportPage";

// Import admin components
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import UserManagementPage from "@/pages/admin/UserManagementPage";
import UserDetailPage from "@/pages/admin/UserDetailPage";
import AdminSupportTicketsPage from "@/pages/admin/AdminSupportTicketsPage";

// Import shared/public components
import SharedFormulaPage from "@/pages/SharedFormulaPage";

// Import all landing page components
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import ScienceSection from "@/components/ScienceSection";
import PersonalizationShowcase from "@/components/PersonalizationShowcase";
import TestimonialsSection from "@/components/TestimonialsSection";
import PricingSection from "@/components/PricingSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

// Import V2 landing page (premium design)
import LandingPageV2 from "@/pages/LandingPageV2";

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <ScienceSection />
        <div className="py-16">
          <PersonalizationShowcase />
        </div>
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

// Main Router
function MainRouter() {
  return (
    <Switch>
      <Route path="/" component={LandingPageV2} />
      <Route path="/science" component={SciencePage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/login" component={LoginPage} />
      
      {/* Static Pages */}
      <Route path="/about" component={AboutPage} />
      <Route path="/blog" component={BlogPage} />
      <Route path="/careers" component={CareersPage} />
      <Route path="/press" component={PressPage} />
      <Route path="/partnerships" component={PartnershipsPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/refunds" component={RefundsPage} />
      <Route path="/disclaimer" component={DisclaimerPage} />
      <Route path="/returns" component={ReturnsPage} />
      <Route path="/shipping" component={ShippingPage} />
      <Route path="/help" component={SupportPage} />
      
      {/* Protected Dashboard Routes - explicit paths */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardLayout>
            <DashboardHome />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/chat">
        <ProtectedRoute>
          <DashboardLayout>
            <ConsultationPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/consultation">
        <ProtectedRoute>
          <DashboardLayout>
            <ConsultationPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/formula">
        <ProtectedRoute>
          <DashboardLayout>
            <MyFormulaPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/optimize/:tab?">
        <ProtectedRoute>
          <DashboardLayout>
            <OptimizePage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/wearables">
        <ProtectedRoute>
          <DashboardLayout>
            <WearablesPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/lab-reports">
        <ProtectedRoute>
          <DashboardLayout>
            <LabReportsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/orders">
        <ProtectedRoute>
          <DashboardLayout>
            <OrdersPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/profile">
        <ProtectedRoute>
          <DashboardLayout>
            <ProfilePage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/settings">
        <ProtectedRoute>
          <DashboardLayout>
            <SettingsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/support">
        <ProtectedRoute>
          <DashboardLayout>
            <SupportPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Legacy /chat redirect to dashboard consultation */}
      <Route path="/chat">
        <ProtectedRoute>
          <ConsultationPage />
        </ProtectedRoute>
      </Route>
      
      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedAdminRoute>
          <AdminDashboardPage />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedAdminRoute>
          <UserManagementPage />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/users/:id">
        <ProtectedAdminRoute>
          <UserDetailPage />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/support-tickets">
        <ProtectedAdminRoute>
          <AdminSupportTicketsPage />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/support-tickets/:id">
        {(params) => (
          <ProtectedAdminRoute>
            <AdminSupportTicketsPage ticketId={params.id} />
          </ProtectedAdminRoute>
        )}
      </Route>
      
      {/* Public Shared Formula View */}
      <Route path="/shared/formula/:id" component={SharedFormulaPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <MainRouter />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
