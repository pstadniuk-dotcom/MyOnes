import { Request, Response } from 'express';
import { usersService } from '../../modules/users/users.service';
import { chatRepository } from '../../modules/chat/chat.repository';
import { insertHealthProfileSchema } from '@shared/schema';
import logger from '../../infra/logging/logger';
import { z } from 'zod';

export class UsersController {
    async getCurrentFormula(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const currentFormula = await usersService.getCurrentFormula(userId);

            if (!currentFormula) {
                return res.status(404).json({ error: 'No formula found' });
            }

            res.json(currentFormula);
        } catch (error) {
            logger.error('Get current formula error', { error });
            res.status(500).json({ error: 'Failed to fetch formula' });
        }
    }

    async getHealthProfile(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const healthProfile = await usersService.getHealthProfile(userId);

            if (!healthProfile) {
                return res.status(404).json({ error: 'No health profile found' });
            }

            res.json(healthProfile);
        } catch (error) {
            logger.error('Get health profile error', { error });
            res.status(500).json({ error: 'Failed to fetch health profile' });
        }
    }

    async saveHealthProfile(req: Request, res: Response) {
        try {
            const userId = req.userId!;

            logger.info('Health profile save request', { userId, body: req.body });

            // Validate request body with proper Zod schema
            const healthProfileUpdate = insertHealthProfileSchema.omit({ userId: true }).parse({
                age: req.body.age,
                sex: req.body.sex,
                weightLbs: req.body.weightLbs,
                heightCm: req.body.heightCm,
                bloodPressureSystolic: req.body.bloodPressureSystolic,
                bloodPressureDiastolic: req.body.bloodPressureDiastolic,
                restingHeartRate: req.body.restingHeartRate,
                sleepHoursPerNight: req.body.sleepHoursPerNight,
                exerciseDaysPerWeek: req.body.exerciseDaysPerWeek,
                stressLevel: req.body.stressLevel,
                smokingStatus: req.body.smokingStatus,
                alcoholDrinksPerWeek: req.body.alcoholDrinksPerWeek,
                conditions: req.body.conditions,
                medications: req.body.medications,
                allergies: req.body.allergies
            });

            logger.info('Health profile validated', { userId, validatedData: healthProfileUpdate });

            const healthProfile = await usersService.saveHealthProfile(userId, healthProfileUpdate);

            logger.info('Health profile saved', { userId, result: !!healthProfile });

            res.json(healthProfile);
        } catch (error) {
            if (error instanceof z.ZodError) {
                logger.error('Health profile validation error', { error: error.errors });
                return res.status(400).json({
                    error: 'Invalid health profile data',
                    details: error.errors
                });
            }
            logger.error('Save health profile error', {
                error: error instanceof Error ? { message: error.message, stack: error.stack } : error
            });
            res.status(500).json({ error: 'Failed to save health profile' });
        }
    }

    async updateProfile(req: Request, res: Response) {
        try {
            const userId = req.userId!;

            // Create validation schema for profile updates
            const updateProfileSchema = z.object({
                name: z.string().min(1).optional(),
                email: z.string().email().optional(),
                phone: z.string().nullable().optional(),
                addressLine1: z.string().nullable().optional(),
                addressLine2: z.string().nullable().optional(),
                city: z.string().nullable().optional(),
                state: z.string().nullable().optional(),
                postalCode: z.string().nullable().optional(),
                country: z.string().nullable().optional(),
            });

            // Validate request body
            const validatedData = updateProfileSchema.parse(req.body);

            const updatedUser = await usersService.updateUserProfile(userId, validatedData);

            if (!updatedUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({ user: updatedUser });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Invalid profile data',
                    details: error.errors
                });
            }
            if (error instanceof Error && error.message === 'Email already in use by another account') {
                return res.status(409).json({ error: error.message });
            }
            logger.error('Update profile error', { error });
            res.status(500).json({ error: 'Failed to update profile' });
        }
    }

    async getOrders(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const orders = await usersService.getOrders(userId);
            res.json(orders);
        } catch (error) {
            logger.error('Get orders error', { error });
            res.status(500).json({ error: 'Failed to fetch orders' });
        }
    }

    async updateTimezone(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { timezone } = req.body;

            if (!timezone || typeof timezone !== 'string') {
                return res.status(400).json({ error: 'Valid timezone required' });
            }

            const result = await usersService.updateUserTimezone(userId, timezone);

            if (!result) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(result);
        } catch (error) {
            logger.error('Update timezone error', { error });
            res.status(500).json({ error: 'Failed to update timezone' });
        }
    }

    async getSubscription(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const subscription = await usersService.getSubscription(userId);

            if (!subscription) {
                return res.status(404).json({ error: 'No subscription found' });
            }

            res.json(subscription);
        } catch (error) {
            logger.error('Get subscription error', { error });
            res.status(500).json({ error: 'Failed to fetch subscription' });
        }
    }

    async getChatSessions(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const sessions = await chatRepository.listChatSessionsByUser(userId);
            res.json(sessions);
        } catch (error) {
            logger.error('Get sessions error', { error });
            res.status(500).json({ error: 'Failed to fetch sessions' });
        }
    }

    async updateSubscription(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { status, plan, pausedUntil } = req.body;

            const updates: any = {};
            if (status) updates.status = status;
            if (plan) updates.plan = plan;
            if (pausedUntil) updates.pausedUntil = new Date(pausedUntil);

            const updatedSubscription = await usersService.updateSubscription(userId, updates);

            if (!updatedSubscription) {
                return res.status(404).json({ error: 'Subscription not found' });
            }

            res.json(updatedSubscription);
        } catch (error) {
            logger.error('Update subscription error', { error });
            res.status(500).json({ error: 'Failed to update subscription' });
        }
    }

    async getPaymentMethods(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const paymentMethods = await usersService.getPaymentMethods(userId);
            res.json(paymentMethods);
        } catch (error) {
            logger.error('Get payment methods error', { error });
            res.status(500).json({ error: 'Failed to fetch payment methods' });
        }
    }

    async addPaymentMethod(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { stripePaymentMethodId, brand, last4 } = req.body;

            if (!stripePaymentMethodId || !brand || !last4) {
                return res.status(400).json({ error: 'Missing required payment method data' });
            }

            const paymentMethod = await usersService.addPaymentMethod(userId, {
                stripePaymentMethodId,
                brand,
                last4
            });

            res.json(paymentMethod);
        } catch (error) {
            logger.error('Add payment method error', { error });
            res.status(500).json({ error: 'Failed to add payment method' });
        }
    }

    async deletePaymentMethod(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const paymentMethodId = req.params.id;

            const deleted = await usersService.deletePaymentMethod(userId, paymentMethodId);

            if (!deleted) {
                return res.status(400).json({ error: 'Failed to delete payment method' });
            }

            res.json({ success: true });
        } catch (error) {
            if (error instanceof Error && error.message === 'Payment method not found') {
                return res.status(404).json({ error: error.message });
            }
            logger.error('Delete payment method error', { error });
            res.status(500).json({ error: 'Failed to delete payment method' });
        }
    }

    async getBillingHistory(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const billingHistory = await usersService.getBillingHistory(userId);
            res.json(billingHistory);
        } catch (error) {
            logger.error('Get billing history error', { error });
            res.status(500).json({ error: 'Failed to fetch billing history' });
        }
    }
}

export const usersController = new UsersController();
