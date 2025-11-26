import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { loginSchema, type LoginData } from '@shared/schema';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login, isLoading } = useAuth();

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: LoginData) => {
    try {
      await login(data);
      // AuthContext handles success toast, localStorage, and redirect
    } catch (error: any) {
      // AuthContext handles error toast
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors" data-testid="link-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-2xl font-bold">Ones</h1>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Welcome back to your health journey</p>
          </div>
        </div>

        <Card className="glass border-none shadow-premium-lg" data-testid="card-login-form">
          <CardHeader className="text-center">
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Continue your personalized supplement journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter your email address"
                          id="email"
                          autoComplete="email"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter your password"
                          id="password"
                          autoComplete="current-password"
                          {...field}
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline" data-testid="link-signup">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}