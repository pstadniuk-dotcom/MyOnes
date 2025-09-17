import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: string; // Route to redirect to if not authenticated
}

export default function ProtectedRoute({ 
  children, 
  fallback = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  console.log('ProtectedRoute - location:', location, 'isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  useEffect(() => {
    // Don't redirect while still loading authentication state
    if (isLoading) return;
    
    // Redirect if not authenticated
    if (!isAuthenticated) {
      setLocation(fallback);
    }
  }, [isAuthenticated, isLoading, setLocation, fallback]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated
  // The redirect will happen via useEffect
  if (!isAuthenticated) {
    console.log('ProtectedRoute: User not authenticated, returning null');
    return null;
  }

  console.log('ProtectedRoute: User authenticated, rendering children');
  // Render protected content
  return <>{children}</>;
}