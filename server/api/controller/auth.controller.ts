import { Request, Response } from 'express';
import { authService } from '../../modules/auth/auth.service';
import { logger } from '../../infra/logging/logger';
import { getClientIP, checkRateLimit } from '../middleware/middleware';

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

            const { user, token } = await authService.signup(req.body);

            logger.info('Signup success', { userId: user.id, duration: `${Date.now() - startTime}ms` });

            res.status(201).json({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    createdAt: user.createdAt.toISOString(),
                    isAdmin: user.isAdmin || false
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
            const rateLimit = checkRateLimit(`login-${clientIP}`, 5, 15 * 60 * 1000);
            if (!rateLimit.allowed) {
                return res.status(429).json({
                    error: 'Too many login attempts. Please try again later.',
                    retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
                });
            }

            const { user, token } = await authService.login(req.body);

            logger.info('Login success', { userId: user.id });

            res.json({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    createdAt: user.createdAt.toISOString(),
                    isAdmin: user.isAdmin || false
                },
                token
            });
        } catch (error: any) {
            logger.error('Login error', { error: error.message });
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Validation failed', details: error.errors });
            }
            if (error.message === 'Invalid email or password') {
                return res.status(401).json({ error: error.message });
            }
            res.status(500).json({ error: 'Login failed' });
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
                    isAdmin: user.isAdmin || false
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
}

export const authController = new AuthController();
