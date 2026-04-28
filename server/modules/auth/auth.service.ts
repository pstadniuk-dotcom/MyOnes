import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { usersRepository } from '../users/users.repository';
import { authRepository } from './auth.repository';
import { consentsRepository } from '../consents/consents.repository';
import { refreshTokenService } from './refresh-token.service';
import { signupSchema, loginSchema, type InsertUser, type User } from '@shared/schema';
import { generateToken } from '../../api/middleware/middleware';
import { sendNotificationEmail } from '../../utils/emailService';
import { logger } from '../../infra/logging/logger';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { getFrontendUrl } from '../../utils/urlHelper';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
    async signup(data: any, ipAddress?: string | null, userAgent?: string | null) {
        if (!data.ageConfirmed) {
            throw new Error('You must confirm you are 18 or older to create an account');
        }
        const validatedData = signupSchema.parse(data);

        // Check if user already exists
        const existingUser = await usersRepository.getUserByEmail(validatedData.email);
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

        // Compute signup channel from UTM params
        const utmSource = data.utmSource || null;
        const utmMedium = data.utmMedium || null;
        let signupChannel = 'direct';
        if (data.referralCode) signupChannel = 'referral';
        else if (utmMedium === 'cpc' || utmMedium === 'ppc' || utmMedium === 'paid') signupChannel = 'paid';
        else if (utmMedium === 'email') signupChannel = 'email';
        else if (utmMedium === 'social' || ['instagram', 'tiktok', 'youtube', 'facebook', 'twitter', 'linkedin'].includes(utmSource || '')) signupChannel = 'social';
        else if (utmSource === 'podcast' || utmMedium === 'podcast') signupChannel = 'podcast';
        else if (utmSource) signupChannel = 'organic';
        else if (data.referrer && !data.referrer.includes('ones.health')) signupChannel = 'organic';

        // Generate unique referral code for this user
        const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

        // Resolve referral if a code was provided
        let referredByUserId: string | null = null;
        if (data.referralCode) {
            const referrer = await usersRepository.getUserByReferralCode(data.referralCode);
            if (referrer) {
                referredByUserId = referrer.id;
            }
        }

        // Create user with ToS acceptance timestamp and attribution data
        const userData: InsertUser = {
            name: validatedData.name,
            email: validatedData.email,
            phone: validatedData.phone || null,
            password: hashedPassword,
            tosAcceptedAt: new Date(),
            utmSource,
            utmMedium,
            utmCampaign: data.utmCampaign || null,
            utmContent: data.utmContent || null,
            utmTerm: data.utmTerm || null,
            referrer: data.referrer || null,
            landingPage: data.landingPage || null,
            signupChannel,
            referralCode,
            referredByUserId,
        };

        const user = await usersRepository.createUser(userData);

        // Record referral event if this user was referred
        if (referredByUserId && data.referralCode) {
            if (referredByUserId === user.id) {
                logger.warn('Self-referral detected — skipping referral event creation', {
                    userId: user.id,
                    referralCode: data.referralCode,
                });
            } else {
                try {
                    const { db } = await import('../../infra/db/db');
                    const { referralEvents } = await import('@shared/schema');
                    await db.insert(referralEvents).values({
                        referrerUserId: referredByUserId,
                        referredUserId: user.id,
                        referralCode: data.referralCode,
                        eventType: 'signup',
                    });
                } catch (err) {
                    logger.warn('Failed to record referral event', { error: err });
                }
            }
        }

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

        const { accessToken, refreshToken } = await refreshTokenService.createTokenPair(user.id, user.isAdmin || false);

        return { user, token: accessToken, refreshToken };
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

        // Check if user is deleted
        if (user.deletedAt) {
            logger.warn('Login attempt with deleted account', { email: validatedData.email, deletedAt: user.deletedAt });
            throw new Error('This account has been deleted and cannot be accessed.');
        }

        // Check if user is suspended
        if (user.suspendedAt) {
            logger.warn('Login attempt with suspended account', { email: validatedData.email, suspendedAt: user.suspendedAt });
            let suspensionMsg = 'This account has been suspended.';
            if (user.suspendedReason) {
                suspensionMsg += ` Reason: ${user.suspendedReason}`;
            }
            throw new Error(suspensionMsg);
        }

        // Check account lockout
        if (user.lockedUntil && new Date() < user.lockedUntil) {
            const remainingMs = user.lockedUntil.getTime() - Date.now();
            const remainingMin = Math.ceil(remainingMs / 60000);
            throw new Error(`Account locked. Try again in ${remainingMin} minute${remainingMin === 1 ? '' : 's'}.`);
        }

        const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
        if (!isValidPassword) {
            // Increment failed attempts
            const attempts = (user.failedLoginAttempts || 0) + 1;
            const updates: Record<string, any> = { failedLoginAttempts: attempts };
            if (attempts >= MAX_LOGIN_ATTEMPTS) {
                updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
                logger.warn('Account locked due to too many failed login attempts', { email: validatedData.email, attempts });
            }
            await usersRepository.updateUser(user.id, updates);
            throw new Error('Invalid email or password');
        }

        // Reset failed attempts on successful login
        if (user.failedLoginAttempts > 0) {
            await usersRepository.updateUser(user.id, { failedLoginAttempts: 0, lockedUntil: null });
        }

        const { accessToken, refreshToken } = await refreshTokenService.createTokenPair(user.id, user.isAdmin || false);

        return { user, token: accessToken, refreshToken };
    }

    async googleLogin(googleToken: string, ageConfirmed?: boolean, ipAddress?: string | null, userAgent?: string | null) {
        try {
            let email: string | undefined;
            let name: string | undefined;
            let googleId: string | undefined;

            try {
                // 1. Try as ID Token first (JWT)
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
                // 2. Fallback to Access Token verification with STRICT audience check (as required by audit)
                logger.debug('ID Token verification failed, verifying as Access Token instead');
                
                const tokenInfoRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?access_token=${googleToken}`);
                const tokenInfo = tokenInfoRes.data;

                // Google may return the client id in either azp or aud depending on the token shape.
                const tokenClientId = tokenInfo.azp || tokenInfo.aud;
console.log('GOOGLE ISSUE',tokenClientId, tokenInfo)
                // CRITICAL: Verify that the token was issued for OUR app (Audience check)
                if (tokenClientId !== process.env.GOOGLE_CLIENT_ID) {
                    logger.warn('Google Access Token verification failed: Client ID mismatch', {
                        tokenClientId,
                        expectedClientId: process.env.GOOGLE_CLIENT_ID
                    });
                    throw new Error('Invalid Google token: Issued for a different application');
                }

                // If audience is valid, get user info
                const userInfoRes = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo`, {
                    headers: { 'Authorization': `Bearer ${googleToken}` }
                });
                const data = userInfoRes.data;
                
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
                // 2. Try to find user by email
                user = await usersRepository.getUserByEmail(email);

                if (user) {
                    // Prevent auto-linking for security (Account Takeover protection)
                    logger.warn('Account exists but social not linked — blocking auto-link', { email });
                    throw new Error('An account with this email already exists. Please log in with your password to link your Google account in settings.');
                } else {
                    // 3. Create new user
                    if (!ageConfirmed) {
                        throw new Error('You must confirm you are 18 or older to create an account');
                    }
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

            const { accessToken, refreshToken } = await refreshTokenService.createTokenPair(user.id, user.isAdmin || false);
            return { user, token: accessToken, refreshToken, isNewUser };
        } catch (error: any) {
            logger.error('Google login error', { error: error.message });
            throw new Error('Google authentication failed');
        }
    }

    async facebookLogin(fbAccessToken: string, ageConfirmed?: boolean, ipAddress?: string | null, userAgent?: string | null) {
        try {
            logger.debug('Attempting Facebook login with token...');

            const fbAppId = process.env.VITE_FACEBOOK_APP_ID;
            const fbAppSecret = process.env.FACEBOOK_APP_SECRET;

            if (!fbAppId || !fbAppSecret) {
                logger.error('Facebook App ID or Secret missing in environment');
                throw new Error('Facebook authentication configuration error');
            }

            // appsecret_proof = HMAC-SHA256(app_secret, access_token)
            // Proves the request came from our server, not a token replay attack.
            const appsecretProof = crypto.createHmac('sha256', fbAppSecret).update(fbAccessToken).digest('hex');
            const { data } = await axios.get(
                `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${fbAccessToken}&appsecret_proof=${appsecretProof}`
            );

            if (data?.error) {
                logger.warn('Facebook Graph API rejected the token', { error: data.error });
                throw new Error(data.error.message || 'Invalid Facebook token');
            }

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
                // 2. Try to find user by email
                user = await usersRepository.getUserByEmail(email);

                if (user) {
                    // Email match found — auto-link facebookId to existing account.
                    // This is safe: Facebook has already verified email ownership.
                    logger.info('Auto-linking Facebook to existing account by email match', { email, userId: user.id });
                    await usersRepository.updateUser(user.id, { facebookId });
                } else {
                    // 3. Create new user
                    if (!ageConfirmed) {
                        throw new Error('You must confirm you are 18 or older to create an account');
                    }
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

            const { accessToken, refreshToken } = await refreshTokenService.createTokenPair(user.id, user.isAdmin || false);
            return { user, token: accessToken, refreshToken, isNewUser };
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

    async resetPassword(token: string, password: string) {
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

        return { userId: resetToken.userId };
    }
}

export const authService = new AuthService();
