import { Request, Response } from 'express';
import { authService } from '../../modules/auth/auth.service';
import { logger } from '../../infra/logging/logger';
import { getClientIP, checkRateLimit } from '../middleware/middleware';
import { logAuthEvent } from '../../modules/auth/auth-audit';

export class AuthController {
    async signup(req: Request, res: Response) {
        const startTime = Date.now();
        try {
            const clientIP = getClientIP(req);
            const rateLimit = checkRateLimit(`signup-${clientIP}`, 3, 15 * 60 * 1000);
            if (!rateLimit.allowed) {
                return res.status(429).json({
                    error: 'Too many signup attempts. Please try again later.',
                    retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
                });
            }

            const clientUserAgent = req.headers['user-agent'] || null;
            const { user, token } = await authService.signup(req.body, clientIP, clientUserAgent);

            logger.info('Signup success', { userId: user.id, duration: `${Date.now() - startTime}ms` });

            res.status(201).json({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    createdAt: user.createdAt.toISOString(),
                    isAdmin: user.isAdmin || false,
                    emailVerified: user.emailVerified
                },
                token
            });
        } catch (error: any) {
            logger.error('Signup error', { error: error.message });
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Validation failed', details: error.errors });
            }
            if (error.message === 'User with this email already exists') {
                return res.status(409).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to create account' });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const clientIP = getClientIP(req);
            const isDev = process.env.NODE_ENV !== 'production';
            const rateLimit = checkRateLimit(`login-${clientIP}`, isDev ? 100 : 5, 15 * 60 * 1000);
            if (!rateLimit.allowed) {
                return res.status(429).json({
                    error: 'Too many login attempts. Please try again later.',
                    retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
                });
            }

            const { user, token } = await authService.login(req.body);

            logger.info('Login success', { userId: user.id });
            logAuthEvent(req, { userId: user.id, email: user.email, action: 'login_success', provider: 'email', success: true });

            res.json({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    createdAt: user.createdAt.toISOString(),
                    isAdmin: user.isAdmin || false,
                    emailVerified: user.emailVerified
                },
                token
            });
        } catch (error: any) {
            logger.error('Login error', { error: error.message });
            const attemptedEmail = req.body?.email || 'unknown';
            logAuthEvent(req, { email: attemptedEmail, action: 'login_failed', provider: 'email', success: false, failureReason: error.message });
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Validation failed', details: error.errors });
            }
            if (error.message === 'Invalid email or password') {
                return res.status(401).json({ error: error.message });
            }
            res.status(500).json({ error: 'Login failed' });
        }
    }

    async googleLogin(req: Request, res: Response) {
        try {
            const { token: idToken } = req.body;
            if (!idToken) return res.status(400).json({ error: 'Google ID token is required' });

            const clientIP = getClientIP(req);
            const clientUserAgent = req.headers['user-agent'] || null;
            const { user, token } = await authService.googleLogin(idToken, clientIP, clientUserAgent);

            logger.info('Google login success', { userId: user.id });
            logAuthEvent(req, { userId: user.id, email: user.email, action: 'google_login', provider: 'google', success: true });

            res.json({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    createdAt: user.createdAt.toISOString(),
                    isAdmin: user.isAdmin || false,
                    emailVerified: user.emailVerified
                },
                token
            });
        } catch (error: any) {
            logger.error('Google login error', { error: error.message });
            logAuthEvent(req, { email: 'google-sso', action: 'google_login', provider: 'google', success: false, failureReason: error.message });
            res.status(401).json({ error: error.message });
        }
    }

    async facebookLogin(req: Request, res: Response) {
        try {
            const { token: accessToken } = req.body;
            if (!accessToken) return res.status(400).json({ error: 'Facebook access token is required' });

            const clientIP = getClientIP(req);
            const clientUserAgent = req.headers['user-agent'] || null;
            const { user, token } = await authService.facebookLogin(accessToken, clientIP, clientUserAgent);

            logger.info('Facebook login success', { userId: user.id });
            logAuthEvent(req, { userId: user.id, email: user.email, action: 'facebook_login', provider: 'facebook', success: true });

            res.json({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    createdAt: user.createdAt.toISOString(),
                    isAdmin: user.isAdmin || false,
                    emailVerified: user.emailVerified
                },
                token
            });
        } catch (error: any) {
            logger.error('Facebook login error', { error: error.message });
            logAuthEvent(req, { email: 'facebook-sso', action: 'facebook_login', provider: 'facebook', success: false, failureReason: error.message });
            res.status(401).json({ error: error.message });
        }
    }

    async logout(req: Request, res: Response) {
        res.json({ message: 'Logged out successfully' });
    }

    async getMe(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const user = await authService.getMe(userId);

            res.json({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    addressLine1: user.addressLine1,
                    addressLine2: user.addressLine2,
                    city: user.city,
                    state: user.state,
                    postalCode: user.postalCode,
                    country: user.country,
                    createdAt: user.createdAt.toISOString(),
                    isAdmin: user.isAdmin || false,
                    emailVerified: user.emailVerified,
                    hasPassword: !!user.password,
                    isSocialLogin: !!(user.googleId || user.facebookId)
                }
            });
        } catch (error) {
            logger.error('Get me error', { error });
            res.status(500).json({ error: 'Failed to fetch user data' });
        }
    }

    async forgotPassword(req: Request, res: Response) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ error: 'Email is required' });

            const clientIP = getClientIP(req);
            const rateLimit = checkRateLimit(`forgot-password-${clientIP}`, 3, 15 * 60 * 1000);
            if (!rateLimit.allowed) {
                return res.status(429).json({
                    error: 'Too many password reset requests. Please try again later.',
                    retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
                });
            }

            await authService.forgotPassword(email);

            res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
        } catch (error) {
            logger.error('Forgot password error', { error });
            res.status(500).json({ error: 'Failed to process password reset request' });
        }
    }

    async resetPassword(req: Request, res: Response) {
        try {
            const { token, password } = req.body;
            if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });

            await authService.resetPassword(token, password);

            res.json({ message: 'Password reset successful. You can now log in with your new password.' });
        } catch (error: any) {
            logger.error('Reset password error', { error: error.message });
            res.status(400).json({ error: error.message });
        }
    }

    async verifyEmail(req: Request, res: Response) {
        try {
            const { token } = req.body;
            if (!token) return res.status(400).json({ error: 'Token is required' });

            const user = await authService.verifyEmail(token);
            if (!user) return res.status(400).json({ error: 'Verification failed' });

            res.json({
                message: 'Email verified successfully',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    createdAt: user.createdAt.toISOString()
                }
            });
        } catch (error: any) {
            logger.error('Verify email error', { error: error.message });
            res.status(400).json({ error: error.message });
        }
    }

    async resendVerification(req: Request, res: Response) {
        try {
            const userId = req.userId;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const clientIP = getClientIP(req);
            const isDev = process.env.NODE_ENV === 'development';
            const rateLimit = isDev
                ? { allowed: true, resetTime: 0 }
                : checkRateLimit(`resend-verification-${clientIP}`, 3, 15 * 60 * 1000);
            if (!rateLimit.allowed) {
                return res.status(429).json({
                    error: 'Too many verification requests. Please try again later.',
                    retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
                });
            }

            await authService.resendVerification(userId);

            res.json({ message: 'Verification email resent successfully' });
        } catch (error: any) {
            logger.error('Resend verification error', { error: error.message });
            res.status(400).json({ error: error.message });
        }
    }
}

export const authController = new AuthController();
