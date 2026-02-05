import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Don't redirect while still loading authentication state
    if (isLoading) return;

    // Redirect if not authenticated
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }

    // Redirect if user is not an admin
    if (user && !user.isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin dashboard.",
        variant: "destructive"
      });
      setLocation('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, setLocation, toast]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="loading-admin-auth">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="access-denied">
        <div className="flex flex-col items-center space-y-4 text-center max-w-md p-6">
          <ShieldAlert className="w-16 h-16 text-destructive" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to access this area. Redirecting...
          </p>
        </div>
      </div>
    );
  }

  // Render protected admin content
  return <>{children}</>;
}
