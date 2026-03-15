import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { signupSchema } from '@shared/schema';
import { SocialAuthButtons } from '@/shared/components/auth/SocialAuthButtons';

// Extended form validation schema to include password confirmation
const extendedSignupSchema = signupSchema.extend({
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Please confirm your password",
  path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof extendedSignupSchema>;

export default function SignupPage() {
  const { signup, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<SignupForm>({
    resolver: zodResolver(extendedSignupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptedTerms: undefined as unknown as true,
      ageConfirmed: undefined as unknown as true,
    }
  });

  const onSubmit = async (data: SignupForm) => {
    try {
      // Extract signup data without confirmPassword
      const { confirmPassword, ...signupData } = data;

      // Capture UTM params and referral from URL
      const params = new URLSearchParams(window.location.search);
      const attribution: Record<string, string> = {};
      if (params.get('utm_source')) attribution.utmSource = params.get('utm_source')!;
      if (params.get('utm_medium')) attribution.utmMedium = params.get('utm_medium')!;
      if (params.get('utm_campaign')) attribution.utmCampaign = params.get('utm_campaign')!;
      if (params.get('utm_content')) attribution.utmContent = params.get('utm_content')!;
      if (params.get('utm_term')) attribution.utmTerm = params.get('utm_term')!;
      if (params.get('ref')) attribution.referralCode = params.get('ref')!;
      attribution.referrer = document.referrer || '';
      attribution.landingPage = sessionStorage.getItem('landing_page') || window.location.pathname;

      await signup({ ...signupData, ...attribution } as any);
    } catch (error) {
      // Error handling is managed by AuthContext
      console.error('Signup error:', error);
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
            <img src="/ones-logo-light.svg" alt="Ones" className="h-7" />
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Start your personalized health journey</p>
          </div>
        </div>

        <Card className="glass border-none shadow-premium-lg" data-testid="card-signup-form">
          <CardHeader className="text-center">
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              Get started with your personalized supplement consultation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your full name"
                          id="name"
                          autoComplete="name"
                          {...field}
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a secure password"
                            id="password"
                            autoComplete="new-password"
                            {...field}
                            className="pr-10"
                            data-testid="input-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="!absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            id="confirmPassword"
                            autoComplete="new-password"
                            {...field}
                            className="pr-10"
                            data-testid="input-confirm-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="!absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="acceptedTerms"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-start gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={(checked) => field.onChange(checked === true ? true : undefined)}
                            id="acceptedTerms"
                            className="mt-0.5"
                            data-testid="checkbox-terms"
                          />
                        </FormControl>
                        <label htmlFor="acceptedTerms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                          I agree to the{' '}
                          <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
                          {' '}and{' '}
                          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                        </label>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ageConfirmed"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-start gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={(checked) => field.onChange(checked === true ? true : undefined)}
                            id="ageConfirmed"
                            className="mt-0.5"
                            data-testid="checkbox-age"
                          />
                        </FormControl>
                        <label htmlFor="ageConfirmed" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                          I confirm I am 18 years of age or older
                        </label>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-signup"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6">
              <SocialAuthButtons />
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}