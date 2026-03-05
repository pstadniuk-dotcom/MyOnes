import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "@/shared/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/shared/components/ui/toaster";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { FEATURES, isOptimizeEnabled } from "@/shared/config/features";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import ProtectedAdminRoute from "@/features/admin/components/ProtectedAdminRoute";
import NotFound from "@/pages/not-found";
import SignupPage from "@/pages/SignupPage";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import SciencePage from "@/pages/SciencePage";
// ThemeProvider removed: app is light-only

// Import static pages
import AboutPage from "@/pages/AboutPage";
import BlogPage from "@/pages/BlogPage";
import BlogArticlePage from "@/pages/BlogArticlePage";
import CareersPage from "@/pages/CareersPage";
import PartnershipsPage from "@/pages/PartnershipsPage";
import ContactPage from "@/pages/ContactPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import RefundsPage from "@/pages/RefundsPage";
import DisclaimerPage from "@/pages/DisclaimerPage";
import ReturnsPage from "@/pages/ReturnsPage";
import ShippingPage from "@/pages/ShippingPage";

// Import dashboard components
import { DashboardLayout } from "@/shared/components/DashboardLayout";
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
import NotificationsPage from "@/pages/NotificationsPage";

// Import admin components
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import UserManagementPage from "@/pages/admin/UserManagementPage";
import UserDetailPage from "@/pages/admin/UserDetailPage";
import AdminSupportTicketsPage from "@/pages/admin/AdminSupportTicketsPage";
import ConversationsPage from "@/pages/admin/ConversationsPage";
import OrdersManagementPage from "@/pages/admin/OrdersManagementPage";
import AuditLogsPage from "@/pages/admin/AuditLogsPage";
import AdminBlogPage from "@/pages/admin/AdminBlogPage";

// Import shared/public components
import SharedFormulaPage from "@/pages/SharedFormulaPage";
import MembershipPage from "@/pages/MembershipPage";
import CheckoutSuccessPage from "@/pages/CheckoutSuccessPage";

// Import V2 landing page (premium design)
import LandingPageV2 from "@/pages/LandingPageV2";
import ScrollToTop from "./shared/components/ScrollToTop";

// Main Router
function MainRouter() {
  return (
    <Switch>
      <Route path="/" component={LandingPageV2} />
      <Route path="/science" component={SciencePage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />

      {/* Static Pages */}
      <Route path="/about" component={AboutPage} />
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/:slug" component={BlogArticlePage} />
      <Route path="/careers" component={CareersPage} />
      <Route path="/press">{() => { window.location.href = '/contact?type=press'; return null; }}</Route>
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
      <Route path="/dashboard/my-formula">
        <Redirect to="/dashboard/formula" />
      </Route>
      <Route path="/dashboard/optimize/tracking">
        {/* TrackingPage removed - redirect to dashboard */}
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/dashboard/optimize/:tab?">
        {/* Redirect to dashboard if optimize features are disabled */}
        {!isOptimizeEnabled() ? (
          <Redirect to="/dashboard" />
        ) : (
          <ProtectedRoute>
            <DashboardLayout>
              <OptimizePage />
            </DashboardLayout>
          </ProtectedRoute>
        )}
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
      <Route path="/dashboard/notifications">
        <ProtectedRoute>
          <DashboardLayout>
            <NotificationsPage />
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
          <DashboardLayout>
            <ConsultationPage />
          </DashboardLayout>
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
      <Route path="/admin/conversations">
        <ProtectedAdminRoute>
          <ConversationsPage />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/orders">
        <ProtectedAdminRoute>
          <OrdersManagementPage />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/audit-logs">
        <ProtectedAdminRoute>
          <AuditLogsPage />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/blog">
        <ProtectedAdminRoute>
          <AdminBlogPage />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/support-tickets/:id">
        {(params) => (
          <ProtectedAdminRoute>
            <AdminSupportTicketsPage ticketId={params.id} />
          </ProtectedAdminRoute>
        )}
      </Route>

      {/* Membership & Checkout */}
      <Route path="/membership/success">
        <ProtectedRoute>
          <CheckoutSuccessPage />
        </ProtectedRoute>
      </Route>
      <Route path="/membership">
        <ProtectedRoute>
          <MembershipPage />
        </ProtectedRoute>
      </Route>

      {/* Public Shared Formula View */}
      <Route path="/shared/formula/:id" component={SharedFormulaPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const appContent = (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <ScrollToTop />
        <MainRouter />
      </TooltipProvider>
    </AuthProvider>
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {googleClientId ? (
          <GoogleOAuthProvider clientId={googleClientId}>
            {appContent}
          </GoogleOAuthProvider>
        ) : (
          appContent
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
