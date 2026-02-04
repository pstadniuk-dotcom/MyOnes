import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { usersRepository } from '../users/users.repository';
import { authRepository } from './auth.repository';
import { signupSchema, loginSchema, type InsertUser, type User } from '@shared/schema';
import { generateToken } from '../../api/middleware/middleware';
import { sendNotificationEmail } from '../../utils/emailService';
import { logger } from '../../infra/logging/logger';

export class AuthService {
    async signup(data: any) {
        const validatedData = signupSchema.parse(data);

        // Check if user already exists
        const existingUser = await usersRepository.getUserByEmail(validatedData.email);
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

        // Create user
        const userData: InsertUser = {
            name: validatedData.name,
            email: validatedData.email,
            phone: validatedData.phone || null,
            password: hashedPassword
        };

        const user = await usersRepository.createUser(userData);
        const token = generateToken(user.id, user.isAdmin || false);

        return { user, token };
    }

    async login(data: any) {
        const validatedData = loginSchema.parse(data);

        const user = await usersRepository.getUserByEmail(validatedData.email);
        if (!user) {
            throw new Error('Invalid email or password');
        }

        const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }

        const token = generateToken(user.id, user.isAdmin || false);

        return { user, token };
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

        const resetUrl = `${process.env.FRONTEND_URL || 'https://my-ones.vercel.app'}/reset-password?token=${resetToken}`;

        try {
            await sendNotificationEmail({
                to: user.email,
                subject: 'Reset Your ONES Password',
                type: 'system',
                title: 'Password Reset Request',
                content: `
                    <p>Hi ${user.name},</p>
                    <p>We received a request to reset your password for your ONES account.</p>
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
