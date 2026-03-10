import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { usersRepository } from '../users/users.repository';
import { authRepository } from './auth.repository';
import { consentsRepository } from '../consents/consents.repository';
import { signupSchema, loginSchema, type InsertUser, type User } from '@shared/schema';
import { generateToken } from '../../api/middleware/middleware';
import { sendNotificationEmail } from '../../utils/emailService';
import { logger } from '../../infra/logging/logger';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { getFrontendUrl } from '../../utils/urlHelper';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
    async signup(data: any, ipAddress?: string | null, userAgent?: string | null) {
        const validatedData = signupSchema.parse(data);

        // Check if user already exists
        const existingUser = await usersRepository.getUserByEmail(validatedData.email);
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

        // Create user with ToS acceptance timestamp
        const userData: InsertUser = {
            name: validatedData.name,
            email: validatedData.email,
            phone: validatedData.phone || null,
            password: hashedPassword,
            tosAcceptedAt: new Date(),
        };

        const user = await usersRepository.createUser(userData);

        // Record Terms of Service & Privacy Policy acceptance as consent record
        try {
            await consentsRepository.createUserConsent({
                userId: user.id,
                consentType: 'tos_acceptance' as any,
                granted: true,
                consentVersion: '1.0',
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
                consentText: 'I agree to the Terms of Service and Privacy Policy.',
                metadata: { source: 'signup' as const, additionalInfo: { acceptedAt: new Date().toISOString() } },
            });
        } catch (err) {
            logger.warn('Failed to record TOS consent at signup', { userId: user.id, error: err });
        }

        // Generate and send verification email
        await this.sendVerificationEmail(user);

        const token = generateToken(user.id, user.isAdmin || false);

        return { user, token };
    }

    private async sendVerificationEmail(user: User) {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await authRepository.createEmailVerificationToken(user.id, verificationToken, expiresAt);

        const verificationUrl = `${getFrontendUrl()}/verify-email?token=${verificationToken}`;

        // In development, log the link so you can test without needing email delivery
        if (process.env.NODE_ENV === 'development') {
            logger.info(`📧 DEV MODE — verification link for ${user.email}:\n  ${verificationUrl}`);
        }

        try {
            await sendNotificationEmail({
                to: user.email,
                subject: 'Verify your Ones account',
                type: 'system',
                title: 'Confirm your email',
                content: `
                    <p style="margin:0 0 12px;">Hi ${user.name},</p>
                    <p style="margin:0 0 12px;">Thanks for signing up. Click the button below to verify your email address and activate your account.</p>
                    <p style="margin:0;font-size:13px;color:#6b7280;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
                `,
                actionUrl: verificationUrl,
                actionText: 'Verify my email',
            });
        } catch (emailError) {
            logger.error('Failed to send verification email', { email: user.email, error: emailError });
        }
    }

    async verifyEmail(token: string) {
        const verificationToken = await authRepository.getEmailVerificationToken(token);

        if (!verificationToken || new Date() > verificationToken.expiresAt) {
            throw new Error('Invalid or expired verification link');
        }

        await usersRepository.updateUser(verificationToken.userId, { emailVerified: true });
        await authRepository.deleteEmailVerificationToken(token);

        const user = await usersRepository.getUser(verificationToken.userId);

        // Send welcome email after verification
        if (user) {
            try {
                const frontendUrl = process.env.FRONTEND_URL || 'https://ones.health';
                await sendNotificationEmail({
                    to: user.email,
                    subject: 'Welcome to Ones — let\'s build your formula',
                    title: 'Welcome to Ones',
                    type: 'system',
                    content: `
                        <p>Hi ${user.name?.split(' ')[0] || 'there'},</p>
                        <p>Your account is verified and ready to go! Here's how to get started:</p>
                        <ol style="padding-left:20px;margin:16px 0;">
                            <li style="margin-bottom:8px;"><strong>Chat with your AI practitioner</strong> — answer a few questions about your health goals, lifestyle, and any supplements you're currently taking.</li>
                            <li style="margin-bottom:8px;"><strong>Upload blood work</strong> (optional) — if you have recent lab results, upload them for a more precise formula.</li>
                            <li style="margin-bottom:8px;"><strong>Connect a wearable</strong> (optional) — sync your Fitbit, Oura, or Whoop to give your AI practitioner real-time insights from your biometric data.</li>
                            <li style="margin-bottom:8px;"><strong>Get your personalized formula</strong> — your AI practitioner will design a custom supplement blend just for you.</li>
                        </ol>
                        <p>Your formula is backed by research and tailored to your unique biology. Let's get started!</p>
                    `,
                    actionUrl: `${frontendUrl}/dashboard/chat`,
                    actionText: 'Start Your Consultation',
                });
            } catch (emailErr) {
                logger.warn('Failed to send welcome email', { userId: user.id, error: emailErr });
            }
        }

        return user;
    }

    async resendVerification(userId: string) {
        const user = await usersRepository.getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.emailVerified) {
            throw new Error('Email already verified');
        }

        // Delete old tokens
        await authRepository.deleteEmailVerificationTokensByUser(userId);

        // Send new email
        await this.sendVerificationEmail(user);
    }

    async login(data: any) {
        const validatedData = loginSchema.parse(data);

        const user = await usersRepository.getUserByEmail(validatedData.email);
        if (!user || !user.password) {
            throw new Error('Invalid email or password');
        }

        const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }

        const token = generateToken(user.id, user.isAdmin || false);

        return { user, token };
    }

    async googleLogin(googleToken: string, ipAddress?: string | null, userAgent?: string | null) {
        try {
            let email: string | undefined;
            let name: string | undefined;
            let googleId: string | undefined;

            try {
                // Try as ID Token first (standard for Google-provided button)
                const ticket = await googleClient.verifyIdToken({
                    idToken: googleToken,
                    audience: process.env.GOOGLE_CLIENT_ID,
                });
                const payload = ticket.getPayload();
                if (payload && payload.email) {
                    email = payload.email;
                    name = payload.name;
                    googleId = payload.sub;
                }
            } catch (error) {
                // If ID Token verification fails, try as Access Token (standard for custom buttons)
                logger.debug('ID Token verification failed, trying as Access Token', { error: error instanceof Error ? error.message : 'Unknown error' });
                const { data } = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo`, {
                    headers: { 'Authorization': `Bearer ${googleToken}` }
                });
                if (data && data.email) {
                    email = data.email;
                    name = data.name;
                    googleId = data.sub;
                }
            }

            if (!email || !googleId) {
                throw new Error('Invalid Google token');
            }

            // 1. Try to find user by googleId
            let user = await usersRepository.getUserByGoogleId(googleId);
            let isNewUser = false;

            if (!user) {
                // 2. Try to find user by email (to link account)
                user = await usersRepository.getUserByEmail(email);

                if (user) {
                    // Update user with googleId
                    await usersRepository.updateUser(user.id, { googleId, emailVerified: true });
                } else {
                    // 3. Create new user
                    user = await usersRepository.createUser({
                        name: name || 'Google User',
                        email,
                        googleId,
                        emailVerified: true,
                        tosAcceptedAt: new Date(),
                    });
                    isNewUser = true;
                }
            }

            // Record ToS consent for new OAuth users
            if (isNewUser) {
                try {
                    await consentsRepository.createUserConsent({
                        userId: user.id,
                        consentType: 'tos_acceptance' as any,
                        granted: true,
                        consentVersion: '1.0',
                        ipAddress: ipAddress || null,
                        userAgent: userAgent || null,
                        consentText: 'Terms of Service and Privacy Policy accepted via Google sign-in.',
                        metadata: { source: 'signup' as const, additionalInfo: { provider: 'google', acceptedAt: new Date().toISOString() } },
                    });
                } catch (err) {
                    logger.warn('Failed to record TOS consent for Google user', { userId: user.id, error: err });
                }
            }

            const token = generateToken(user.id, user.isAdmin || false);
            return { user, token, isNewUser };
        } catch (error: any) {
            logger.error('Google login error', { error: error.message });
            throw new Error('Google authentication failed');
        }
    }

    async facebookLogin(accessToken: string, ipAddress?: string | null, userAgent?: string | null) {
        try {
            logger.debug('Attempting Facebook login with token...');
            // Verify Facebook token and get user info
            const { data } = await axios.get(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`);

            logger.debug('Facebook response data', { data });

            if (!data || !data.email) {
                logger.warn('Facebook login failed: Missing email permission', { data });
                throw new Error('Invalid Facebook token or missing email permission');
            }

            const { id: facebookId, email, name } = data;

            // 1. Try to find user by facebookId
            let user = await usersRepository.getUserByFacebookId(facebookId);
            let isNewUser = false;

            if (!user) {
                // 2. Try to find user by email (to link account)
                user = await usersRepository.getUserByEmail(email);

                if (user) {
                    // Update user with facebookId
                    logger.info('Linking existing user to Facebook account', { userId: user.id, email });
                    await usersRepository.updateUser(user.id, { facebookId, emailVerified: true });
                } else {
                    // 3. Create new user
                    logger.info('Creating new user via Facebook', { email });
                    user = await usersRepository.createUser({
                        name: name || 'Facebook User',
                        email,
                        facebookId,
                        emailVerified: true,
                        tosAcceptedAt: new Date(),
                    });
                    isNewUser = true;
                }
            }

            // Record ToS consent for new OAuth users
            if (isNewUser) {
                try {
                    await consentsRepository.createUserConsent({
                        userId: user.id,
                        consentType: 'tos_acceptance' as any,
                        granted: true,
                        consentVersion: '1.0',
                        ipAddress: ipAddress || null,
                        userAgent: userAgent || null,
                        consentText: 'Terms of Service and Privacy Policy accepted via Facebook sign-in.',
                        metadata: { source: 'signup' as const, additionalInfo: { provider: 'facebook', acceptedAt: new Date().toISOString() } },
                    });
                } catch (err) {
                    logger.warn('Failed to record TOS consent for Facebook user', { userId: user.id, error: err });
                }
            }

            const token = generateToken(user.id, user.isAdmin || false);
            return { user, token, isNewUser };
        } catch (error: any) {
            const fbError = error.response?.data?.error?.message || error.message;
            logger.error('Facebook login error details', {
                error: error.message,
                fbError: fbError,
                response: error.response?.data
            });
            throw new Error(`Facebook authentication failed: ${fbError}`);
        }
    }

    async getMe(userId: string) {
        const user = await usersRepository.getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    async forgotPassword(email: string) {
        const user = await usersRepository.getUserByEmail(email);
        if (!user) {
            // Silently return to prevent email enumeration
            return;
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await authRepository.createPasswordResetToken(user.id, resetToken, expiresAt);

        const resetUrl = `${getFrontendUrl()}/reset-password?token=${resetToken}`;

        try {
            await sendNotificationEmail({
                to: user.email,
                subject: 'Reset Your Ones Password',
                type: 'system',
                title: 'Password Reset Request',
                content: `
                    <p>Hi ${user.name},</p>
                    <p>We received a request to reset your password for your Ones account.</p>
                    <p>Click the button below to reset your password:</p>
                `,
                actionUrl: resetUrl,
                actionText: 'Reset Password',
            });
        } catch (emailError) {
            logger.error('Failed to send password reset email', { email: user.email, error: emailError });
            // Don't throw to hide email failure from user
        }
    }

    async resetPassword(token: string, password: any) {
        if (!password || password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        const resetToken = await authRepository.getPasswordResetToken(token);

        if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
            throw new Error('Invalid or expired reset link');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await usersRepository.updateUserPassword(resetToken.userId, hashedPassword);
        await authRepository.markPasswordResetTokenUsed(token);
    }
}

export const authService = new AuthService();
