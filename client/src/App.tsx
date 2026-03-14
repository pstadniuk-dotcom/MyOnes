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
import RetailComparisonPricingPage from "@/pages/admin/RetailComparisonPricingPage";
import MembershipAdminPage from "@/pages/admin/MembershipAdminPage";
import ContentManagementPage from "@/pages/admin/ContentManagementPage";
import AdminAnalyticsPage from "@/pages/admin/AdminAnalyticsPage";
import AISettingsPage from "@/pages/admin/AISettingsPage";
import ProductCatalogPage from "@/pages/admin/ProductCatalogPage";
import AdminLiveChatsPage from "@/pages/admin/AdminLiveChatsPage";
import AdminChatAnalyticsPage from "@/pages/admin/AdminChatAnalyticsPage";
import AIUsagePage from "@/pages/admin/AIUsagePage";
import PRAgentPage from "@/pages/admin/PRAgentPage";
import AISupportAgentPage from "@/pages/admin/AISupportAgentPage";
import TrafficSourcesPage from "@/pages/admin/TrafficSourcesPage";
import InfluencerHubPage from "@/pages/admin/InfluencerHubPage";
import B2bProspectingPage from "@/pages/admin/B2bProspectingPage";
import { AdminLayout } from "@/shared/components/AdminLayout";

// Import shared/public components
import SharedFormulaPage from "@/pages/SharedFormulaPage";
import MembershipPage from "@/pages/MembershipPage";
import CheckoutSuccessPage from "@/pages/CheckoutSuccessPage";

// Import V2 landing page (premium design)
import LandingPageV2 from "@/pages/LandingPageV2";
import ScrollToTop from "./shared/components/ScrollToTop";
import { LiveChatWidget } from "@/features/live-chat/components/LiveChatWidget";

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
          <AdminLayout>
            <AdminDashboardPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedAdminRoute>
          <AdminLayout>
            <UserManagementPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/users/:id">
        <ProtectedAdminRoute>
          <AdminLayout>
            <UserDetailPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/support-tickets">
        <ProtectedAdminRoute>
          <AdminLayout>
            <AdminSupportTicketsPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/conversations">
        <ProtectedAdminRoute>
          <AdminLayout>
            <ConversationsPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/orders">
        <ProtectedAdminRoute>
          <AdminLayout>
            <OrdersManagementPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/audit-logs">
        <ProtectedAdminRoute>
          <AdminLayout>
            <AuditLogsPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/blog">
        <ProtectedAdminRoute>
          <AdminLayout>
            <AdminBlogPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/retail-pricing">
        <ProtectedAdminRoute>
          <AdminLayout>
            <RetailComparisonPricingPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/support-tickets/:id">
        {(params) => (
          <ProtectedAdminRoute>
            <AdminLayout>
              <AdminSupportTicketsPage ticketId={params.id} />
            </AdminLayout>
          </ProtectedAdminRoute>
        )}
      </Route>
      <Route path="/admin/membership">
        <ProtectedAdminRoute>
          <AdminLayout>
            <MembershipAdminPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/content">
        <ProtectedAdminRoute>
          <AdminLayout>
            <ContentManagementPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/analytics">
        <ProtectedAdminRoute>
          <AdminLayout>
            <AdminAnalyticsPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/traffic">
        <ProtectedAdminRoute>
          <AdminLayout>
            <TrafficSourcesPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/products">
        <ProtectedAdminRoute>
          <AdminLayout>
            <ProductCatalogPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/settings/ai">
        <ProtectedAdminRoute>
          <AdminLayout>
            <AISettingsPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/live-chats">
        <ProtectedAdminRoute>
          <AdminLayout>
            <AdminLiveChatsPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/chat-analytics">
        <ProtectedAdminRoute>
          <AdminLayout>
            <AdminChatAnalyticsPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/ai-usage">
        <ProtectedAdminRoute>
          <AdminLayout>
            <AIUsagePage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/pr-agent">
        <ProtectedAdminRoute>
          <AdminLayout>
            <PRAgentPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/ai-support-agent">
        <ProtectedAdminRoute>
          <AdminLayout>
            <AISupportAgentPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/influencers">
        <ProtectedAdminRoute>
          <AdminLayout>
            <InfluencerHubPage />
          </AdminLayout>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/b2b">
        <ProtectedAdminRoute>
          <AdminLayout>
            <B2bProspectingPage />
          </AdminLayout>
        </ProtectedAdminRoute>
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

// Capture landing page on first visit for attribution
if (!sessionStorage.getItem('landing_page')) {
  sessionStorage.setItem('landing_page', window.location.pathname + window.location.search);
}

function App() {

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const appContent = (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <ScrollToTop />
        <MainRouter />
        <LiveChatWidget />
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
