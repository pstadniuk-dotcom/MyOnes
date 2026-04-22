import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/shared/hooks/use-toast';
import { apiRequest } from '@/shared/lib/api';
import { SESSION_EXPIRED_EVENT, queryClient } from '@/shared/lib/queryClient';
import type { AuthResponse, SignupData, LoginData } from '@shared/schema';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  isAdmin: boolean;
  emailVerified: boolean;
  hasPassword?: boolean;
  isSocialLogin?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signup: (data: SignupData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  googleLogin: (token: string, ageConfirmed?: boolean) => Promise<void>;
  facebookLogin: (token: string, ageConfirmed?: boolean) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const isAuthenticated = !!user && !!token;

  // Handle session expiration from API calls
  const handleSessionExpired = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    // Clear React Query cache to prevent stale data on next login
    queryClient.clear();

    toast({
      title: "Session Expired",
      description: "Your session has expired. Please log in again.",
      variant: "destructive"
    });

    setLocation('/login');
  }, [toast, setLocation]);

  // Listen for session expired events from queryClient
  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [handleSessionExpired]);

  // Initialize authentication state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);

          // Validate token with server
          await validateToken(storedToken);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Clear invalid auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const validateToken = async (authToken: string) => {
    try {
      const response = await apiRequest('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Handle different error scenarios
      if (response.status === 401) {
        // Token expired or invalid - clear auth and don't throw
        console.warn('Token expired or invalid - clearing authentication');
        setToken(null);
        setUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        return; // Don't throw - this is expected behavior
      }

      if (response.status === 404) {
        // User not found - clear auth
        console.error('User account no longer exists - clearing authentication');
        setToken(null);
        setUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        throw new Error('User account not found');
      }

      if (!response.ok) {
        // Other server errors
        throw new Error(`Token validation failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setUser(data.user);

    } catch (error: any) {
      console.error('Token validation error:', error);

      // Only clear auth data for auth-related errors, not network errors
      if (error.message?.includes('Token validation failed') ||
        error.message?.includes('User account not found')) {
        setToken(null);
        setUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }

      throw error;
    }
  };

  const signup = async (signupData: SignupData) => {
    try {
      setIsLoading(true);

      const response = await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(signupData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Store auth data
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Clear any stale cached data from previous sessions
      queryClient.clear();

      toast({
        title: "Welcome to Ones!",
        description: "Your account has been created. Please check your email to verify your account.",
        variant: "default"
      });

      // Redirect to email verification notice page
      setLocation('/verify-email');

    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Signup Failed",
        description: error.message || "Unable to create your account. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (loginData: LoginData) => {
    try {
      setIsLoading(true);

      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Login failed';
        console.error('Login failed:', { status: response.status, error: errorMessage });
        throw new Error(errorMessage);
      }

      // Store auth data
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Clear any stale cached data from previous sessions so fresh data is loaded
      queryClient.clear();

      // Redirect to appropriate page
      if (!data.user.emailVerified) {
        setLocation('/verify-email');
      } else {
        setLocation('/dashboard');
      }

    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || "Unable to log in. Please check your credentials and try again.";
      console.error('Login error caught:', errorMessage, error);
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (googleToken: string, ageConfirmed?: boolean) => {
    try {
      setIsLoading(true);

      const response = await apiRequest('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: googleToken, ageConfirmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Google login failed');
      }

      // Store auth data
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Clear any stale cached data from previous sessions so fresh data is loaded
      queryClient.clear();

      // Redirect to appropriate page
      if (!data.user.emailVerified) {
        setLocation('/verify-email');
      } else {
        setLocation('/dashboard');
      }

    } catch (error: any) {
      console.error('Google login error:', error);
      toast({
        title: "Google Login Failed",
        description: error.message || "Unable to log in with Google. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const facebookLogin = async (fbToken: string, ageConfirmed?: boolean) => {
    try {
      setIsLoading(true);

      const response = await apiRequest('/api/auth/facebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: fbToken, ageConfirmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Facebook login failed');
      }

      // Store auth data
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Clear any stale cached data from previous sessions so fresh data is loaded
      queryClient.clear();

      // Redirect to dashboard
      setLocation('/dashboard');

    } catch (error: any) {
      console.error('Facebook login error:', error);
      toast({
        title: "Facebook Login Failed",
        description: error.message || "Unable to log in with Facebook. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (verificationToken: string) => {
    try {
      setIsLoading(true);
      const response = await apiRequest('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Email verification failed');
      }

      // Update local user state
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));

      toast({
        title: "Email Verified",
        description: "Your email has been verified successfully.",
        variant: "default"
      });

    } catch (error: any) {
      console.error('Email verification error:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired verification link.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    try {
      if (!token) throw new Error('You must be logged in to resend verification');

      const response = await apiRequest('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resend verification email');
      }

      toast({
        title: "Email Sent",
        description: "A new verification link has been sent to your email address.",
        variant: "default"
      });

    } catch (error: any) {
      console.error('Resend verification error:', error);
      toast({
        title: "Error",
        description: error.message || "Could not resend verification email.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const logout = () => {
    try {
      // Make API call to logout endpoint
      apiRequest('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).catch(error => {
        console.warn('Logout API call failed:', error);
        // Continue with local logout even if API call fails
      });

      // Clear auth state
      setToken(null);
      setUser(null);

      // Clear React Query cache to prevent stale data on next login
      queryClient.clear();

      // Clear localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('consultation_draft');
      localStorage.removeItem('consultation_current_session');

      // Redirect to home page
      setLocation('/');

    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUser = async () => {
    if (!token) return;

    try {
      const response = await apiRequest('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh user data');
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));

    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails, likely token is invalid
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    signup,
    login,
    googleLogin,
    facebookLogin,
    verifyEmail,
    resendVerification,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}