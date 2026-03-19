import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Loader2, Mail, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export default function VerifyEmailPage() {
    const [location, setLocation] = useLocation();
    const { user, verifyEmail, resendVerification, isLoading } = useAuth();
    const [verifying, setVerifying] = useState(false);
    const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
    const [error, setError] = useState<string | null>(null);

    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    useEffect(() => {
        if (token && status === 'pending') {
            handleVerify(token);
        }
    }, [token]);

    const handleVerify = async (verificationToken: string) => {
        setVerifying(true);
        try {
            await verifyEmail(verificationToken);
            setStatus('success');
        } catch (err: any) {
            setStatus('error');
            setError(err.message || 'Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    const handleResend = async () => {
        try {
            await resendVerification();
        } catch (err) {
            console.error('Resend error:', err);
        }
    };

    if (token) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
                <Card className="w-full max-w-md glass border-none shadow-premium-lg">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            {verifying ? (
                                <div className="bg-primary/10 p-4 rounded-full">
                                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                </div>
                            ) : status === 'success' ? (
                                <div className="bg-green-100 p-4 rounded-full">
                                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                                </div>
                            ) : (
                                <div className="bg-red-100 p-4 rounded-full">
                                    <XCircle className="w-12 h-12 text-red-600" />
                                </div>
                            )}
                        </div>
                        <CardTitle className="text-2xl">
                            {verifying ? 'Verifying your email...' :
                                status === 'success' ? 'Email Verified!' :
                                    'Verification Failed'}
                        </CardTitle>
                        <CardDescription className="text-base">
                            {verifying ? 'Please wait while we confirm your email address.' :
                                status === 'success' ? 'Your account is now fully active. You can proceed to your dashboard.' :
                                    error || 'The verification link is invalid or has expired.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {status === 'success' ? (
                            <Button
                                className="w-full h-12 text-lg font-semibold"
                                onClick={() => setLocation('/dashboard')}
                            >
                                Go to Dashboard
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        ) : status === 'error' ? (
                            <>
                                {/* <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setLocation('/verify-email')}
                                >
                                    Back to Verification Notice
                                </Button> */}
                                <Button
                                    className="w-full"
                                    onClick={() => setLocation('/signup')}
                                >
                                    Try Signing Up Again
                                </Button>
                            </>
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
            <Card className="w-full max-w-md glass border-none shadow-premium-lg">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-primary/10 p-4 rounded-full">
                            <Mail className="w-12 h-12 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
                    <CardDescription className="text-base">
                        We've sent a verification link to <span className="font-semibold text-foreground">{user?.email}</span>.
                        Please check your inbox and click the link to verify your account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-3">
                        <div className="bg-primary/20 p-1 rounded-full mt-0.5">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-sm text-balance">
                            Didn't receive the email? Check your spam folder or try resending the link below.
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full h-12 text-base"
                        onClick={handleResend}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Mail className="w-4 h-4 mr-2" />
                        )}
                        Resend verification email
                    </Button>

                    <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setLocation('/signup')}
                    >
                        Use a different email address
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
