import { Request, Response } from 'express';
import { authService } from '../../modules/auth/auth.service';
import { refreshTokenService } from '../../modules/auth/refresh-token.service';
import { logger } from '../../infra/logging/logger';
import { getClientIP, checkRateLimit, createSseTicket } from '../middleware/middleware';
import { logAuthEvent } from '../../modules/auth/auth-audit';
import { usersRepository } from '../../modules/users/users.repository';
import posthog from '../../infra/posthog';
import { syncUserProperties } from '../../infra/posthog';

const REFRESH_TOKEN_COOKIE_NAME = 'ones_refresh_token';

// Helper to access userId and cookies with correct types
interface AuthenticatedRequest extends Request {
    userId?: string;
    cookies: Record<string, string>;
}

export class AuthController {
    private setRefreshTokenCookie = (res: Response, refreshToken: string) => {
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/api/auth/refresh' // Only send to refresh endpoint for extra security
        });
        
        // Also set a logout cookie that can be accessed by all /api/auth routes
        // but the main refresh token is restricted to /refresh
        res.cookie(`${REFRESH_TOKEN_COOKIE_NAME}_family`, refreshToken.split(':')[0], {
            httpOnly: true,
            secure: isProd,
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: '/api/auth'
        });
    };

    private clearRefreshTokenCookies = (res: Response) => {
        res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: '/api/auth/refresh' });
        res.clearCookie(`${REFRESH_TOKEN_COOKIE_NAME}_family`, { path: '/api/auth' });
    };

    signup = async (req: Request, res: Response) => {
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
            const { user, token, refreshToken } = await authService.signup(req.body, clientIP, clientUserAgent);

            logger.info('Signup success', { userId: user.id, duration: `${Date.now() - startTime}ms` });
            logAuthEvent(req, { userId: user.id, email: user.email, action: 'signup', provider: 'email', success: true });

            posthog.capture({ distinctId: user.id, event: 'user_signed_up', properties: { provider: 'email', email: user.email } });
            void syncUserProperties(user.id);

            this.setRefreshTokenCookie(res, refreshToken);

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
                token,
            });
        } catch (error: any) {
            logger.error('Signup error', { error: error.message });
            logAuthEvent(req, { email: req.body?.email || 'unknown', action: 'signup', provider: 'email', success: false, failureReason: error.message });
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Validation failed', details: error.errors });
            }
            if (error.message === 'User with this email already exists') {
                return res.status(409).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to create account' });
        }
    };

    login = async (req: Request, res: Response) => {
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

            const { user, token, refreshToken } = await authService.login(req.body);

            logger.info('Login success', { userId: user.id });
            logAuthEvent(req, { userId: user.id, email: user.email, action: 'login_success', provider: 'email', success: true });

            posthog.capture({ distinctId: user.id, event: 'user_logged_in', properties: { provider: 'email' } });
            void syncUserProperties(user.id);

            this.setRefreshTokenCookie(res, refreshToken);

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
                token,
            });
        } catch (error: any) {
            const errorMsg = error?.message || error?.toString() || 'Unknown error';
            logger.error('Login error caught', { error: errorMsg, errorType: error?.name });
            const attemptedEmail = req.body?.email || 'unknown';
            logAuthEvent(req, { email: attemptedEmail, action: 'login_failed', provider: 'email', success: false, failureReason: errorMsg });
            
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Validation failed', details: error.errors });
            }
            if (errorMsg === 'Invalid email or password') {
                return res.status(401).json({ error: errorMsg });
            }
            if (errorMsg.includes('Account locked')) {
                return res.status(423).json({ error: errorMsg });
            }
            if (errorMsg.includes('deleted') && errorMsg.includes('cannot be accessed')) {
                return res.status(403).json({ error: errorMsg });
            }
            if (errorMsg.includes('suspended')) {
                return res.status(403).json({ error: errorMsg });
            }
            res.status(500).json({ error: 'Login failed' });
        }
    };

    googleLogin = async (req: Request, res: Response) => {
        try {
            const { token: idToken, ageConfirmed } = req.body;
            if (!idToken) return res.status(400).json({ error: 'Google ID token is required' });

            const clientIP = getClientIP(req);
            const clientUserAgent = req.headers['user-agent'] || null;
            const { user, token, refreshToken } = await authService.googleLogin(idToken, ageConfirmed, clientIP, clientUserAgent);

            logger.info('Google login success', { userId: user.id });
            logAuthEvent(req, { userId: user.id, email: user.email, action: 'google_login', provider: 'google', success: true });

            posthog.capture({ distinctId: user.id, event: 'user_logged_in', properties: { provider: 'google' } });
            void syncUserProperties(user.id);

            this.setRefreshTokenCookie(res, refreshToken);

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
                token,
            });
        } catch (error: any) {
            logger.error('Google login error', { error: error.message });
            logAuthEvent(req, { email: 'google-sso', action: 'google_login', provider: 'google', success: false, failureReason: error.message });
            res.status(401).json({ error: error.message });
        }
    };

    facebookLogin = async (req: Request, res: Response) => {
        try {
            const { token: accessToken, ageConfirmed } = req.body;
            if (!accessToken) return res.status(400).json({ error: 'Facebook access token is required' });

            const clientIP = getClientIP(req);
            const clientUserAgent = req.headers['user-agent'] || null;
            const { user, token, refreshToken } = await authService.facebookLogin(accessToken, ageConfirmed, clientIP, clientUserAgent);

            logger.info('Facebook login success', { userId: user.id });
            logAuthEvent(req, { userId: user.id, email: user.email, action: 'facebook_login', provider: 'facebook', success: true });

            posthog.capture({ distinctId: user.id, event: 'user_logged_in', properties: { provider: 'facebook' } });
            void syncUserProperties(user.id);

            this.setRefreshTokenCookie(res, refreshToken);

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
                token,
            });
        } catch (error: any) {
            logger.error('Facebook login error', { error: error.message });
            logAuthEvent(req, { email: 'facebook-sso', action: 'facebook_login', provider: 'facebook', success: false, failureReason: error.message });
            res.status(401).json({ error: error.message });
        }
    };

    logout = async (req: Request, res: Response) => {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.userId;
        let email = 'n/a';
        
        if (userId) {
            try {
                const user = await usersRepository.getUser(userId);
                if (user) {
                    email = user.email;
                }

                const family = authReq.cookies[`${REFRESH_TOKEN_COOKIE_NAME}_family`];
                if (family) {
                    await refreshTokenService.revokeFamilyTokens(family);
                    logger.info('Revoked token family on logout', { userId, family });
                }
            } catch (error) {
                logger.error('Failed cleanup for logout audit or revocation', { userId, error });
            }
        }

        this.clearRefreshTokenCookies(res);
        logAuthEvent(req, { userId, email, action: 'logout', provider: 'email', success: true });
        res.json({ message: 'Logged out successfully' });
    };

    getMe = async (req: Request, res: Response) => {
        try {
            const userId = (req as AuthenticatedRequest).userId!;
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
    };

    forgotPassword = async (req: Request, res: Response) => {
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
            logAuthEvent(req, { email, action: 'password_reset', provider: 'email', success: true });

            res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
        } catch (error) {
            logger.error('Forgot password error', { error });
            logAuthEvent(req, { email: req.body?.email || 'unknown', action: 'password_reset', provider: 'email', success: false, failureReason: 'server_error' });
            res.status(500).json({ error: 'Failed to process password reset request' });
        }
    };

    resetPassword = async (req: Request, res: Response) => {
        try {
            const { token, password } = req.body;
            if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });

            const result = await authService.resetPassword(token, password);
            if (result && result.userId) {
                await refreshTokenService.revokeAllUserTokens(result.userId);
                logger.info('Revoked all tokens after password reset', { userId: result.userId });
            }
            logAuthEvent(req, { email: 'token-based', action: 'password_reset', provider: 'email', success: true });

            res.json({ message: 'Password reset successful. You can now log in with your new password.' });
        } catch (error: any) {
            logger.error('Reset password error', { error: error.message });
            logAuthEvent(req, { email: 'token-based', action: 'password_reset', provider: 'email', success: false, failureReason: error.message });
            res.status(400).json({ error: error.message });
        }
    };

    verifyEmail = async (req: Request, res: Response) => {
        try {
            const { token } = req.body;
            if (!token) return res.status(400).json({ error: 'Token is required' });

            const user = await authService.verifyEmail(token);
            if (!user) return res.status(400).json({ error: 'Verification failed' });

            logAuthEvent(req, { userId: user.id, email: user.email, action: 'signup', provider: 'email', success: true });

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
    };

    refresh = async (req: Request, res: Response) => {
        try {
            const authReq = req as AuthenticatedRequest;
            const refreshToken = authReq.cookies[REFRESH_TOKEN_COOKIE_NAME];
            if (!refreshToken) {
                return res.status(401).json({ error: 'Refresh token is required' });
            }

            const result = await refreshTokenService.rotateToken(refreshToken);
            if (!result) {
                this.clearRefreshTokenCookies(res);
                return res.status(401).json({ error: 'Invalid or expired refresh token' });
            }

            this.setRefreshTokenCookie(res, result.refreshToken);

            res.json({
                token: result.accessToken,
            });
        } catch (error: any) {
            logger.error('Token refresh error', { error: error.message });
            res.status(500).json({ error: 'Failed to refresh token' });
        }
    };

    getSseTicket = async (req: Request, res: Response) => {
        try {
            const userId = (req as AuthenticatedRequest).userId!;
            const ticket = createSseTicket(userId);
            res.json({ ticket });
        } catch (error: any) {
            logger.error('SSE ticket error', { error: error.message });
            res.status(500).json({ error: 'Failed to create SSE ticket' });
        }
    };

    resendVerification = async (req: Request, res: Response) => {
        try {
            const userId = (req as AuthenticatedRequest).userId;
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
    };
}

export const authController = new AuthController();
