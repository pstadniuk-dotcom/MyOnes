import cron from 'node-cron';
import logger from '../infra/logging/logger';
import { usersRepository } from '../modules/users/users.repository';
import { notificationsService } from '../modules/notifications/notifications.service';
import { formulasRepository } from '../modules/formulas/formulas.repository';
import { consentsRepository } from '../modules/consents/consents.repository';
import { sendNotificationSms, sendRawSms } from '../utils/smsService';
import { type FormulaIngredient } from './healthTips';

interface ReminderCheck {
  userId: string;
  phone: string;
  timezone: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  capsuleCount: number;
  ingredients: FormulaIngredient[];
}

// Track which users we've sent reminders to today (to avoid duplicates)
const sentRemindersToday = new Map<string, Set<string>>(); // userId -> Set<mealTypes>
let consentEnumAvailable = true;
let consentEnumWarningEmitted = false;

function resetDailyTracking() {
  sentRemindersToday.clear();
  logger.info('Daily reminder tracking reset');
}

function hasReminderBeenSent(userId: string, mealType: string): boolean {
  return sentRemindersToday.get(userId)?.has(mealType) || false;
}

function markReminderAsSent(userId: string, mealType: string) {
  if (!sentRemindersToday.has(userId)) {
    sentRemindersToday.set(userId, new Set());
  }
  sentRemindersToday.get(userId)!.add(mealType);
}

function getCurrentTimeInTimezone(timezone: string): { hours: number; minutes: number } {
  try {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  } catch (error) {
    logger.error(`Error getting time for timezone ${timezone}`, { error });
    const now = new Date();
    return { hours: now.getUTCHours(), minutes: now.getUTCMinutes() };
  }
}

async function hasSmsAccountabilityConsent(userId: string): Promise<boolean> {
  if (!consentEnumAvailable) {
    return false;
  }

  try {
    const consent = await consentsRepository.getUserConsent(userId, 'sms_accountability');
    return !!consent;
  } catch (error: any) {
    if (error?.code === '22P02') {
      consentEnumAvailable = false;
      if (!consentEnumWarningEmitted) {
        consentEnumWarningEmitted = true;
        logger.warn('sms_accountability consent enum value is not available in current DB schema; SMS accountability reminders disabled until schema is synced.');
      }
      return false;
    }
    throw error;
  }
}

async function checkAndSendReminders() {
  try {
    // Get all users with daily reminders enabled
    const allUsers = await usersRepository.listAllUsers();

    for (const user of allUsers) {
      // Get notification preferences to check if daily reminders are enabled
      const prefs = await notificationsService.getPreferences(user.id);

      if (!prefs?.dailyRemindersEnabled) continue;
      if (!user.phone) continue;

      const hasConsent = await hasSmsAccountabilityConsent(user.id);
      if (!hasConsent) continue;

      const timezone = user.timezone || 'America/New_York';
      const currentTime = getCurrentTimeInTimezone(timezone);
      const currentTimeStr = `${currentTime.hours.toString().padStart(2, '0')}:${currentTime.minutes.toString().padStart(2, '0')}`;

      // Get user's active formula to determine capsule count and ingredients
      const formulas = await formulasRepository.getFormulaHistory(user.id);
      const activeFormula = formulas[0]; // Most recent formula

      if (!activeFormula) continue;

      // Calculate total capsule count from formula
      // Use the formula's targetCapsules (accurate) instead of estimating from totalMg
      const totalCapsules = (activeFormula as any).targetCapsules || Math.max(1, Math.ceil(Math.max(activeFormula.totalMg || 0, 0) / 550));

      // Gather ingredients for personalized tips
      const bases = Array.isArray(activeFormula.bases) ? activeFormula.bases : [];
      const additions = Array.isArray(activeFormula.additions) ? activeFormula.additions : [];
      const ingredients: FormulaIngredient[] = [...bases, ...additions];

      // Check scheduled meal times (morning, afternoon, evening)
      const reminders: Array<{ mealType: 'breakfast' | 'lunch' | 'dinner'; time: string | null | undefined }> = [
        { mealType: 'breakfast', time: prefs.reminderBreakfast },
        { mealType: 'lunch', time: prefs.reminderLunch },
        { mealType: 'dinner', time: prefs.reminderDinner }
      ];

      // Count how many meal reminders are active so we can split capsules evenly
      const activeMealCount = reminders.filter(r => !!r.time).length || 1;
      const capsulesPerMeal = Math.ceil(totalCapsules / activeMealCount);

      for (const { mealType, time } of reminders) {
        if (!time) {
          continue;
        }
        const [targetHours, targetMinutes] = time.split(':').map(Number);

        const timeMatches = currentTime.hours === targetHours && currentTime.minutes === targetMinutes;
        const alreadySent = hasReminderBeenSent(user.id, mealType);

        if (timeMatches && !alreadySent) {
          logger.info('Sending meal reminder', { userId: user.id, mealType });
          await sendReminderSms({
            userId: user.id,
            phone: user.phone,
            timezone,
            mealType,
            capsuleCount: capsulesPerMeal,
            ingredients
          });

          markReminderAsSent(user.id, mealType);
        }
      }

      // Check custom time reminder for pills only
      const pillsSlotPref = prefs.pillsTimeSlot;
      const pillsCustomTime = prefs.pillsCustomTime;
      if (pillsSlotPref === 'custom' && pillsCustomTime) {
        const customKey = 'custom_pills';
        const alreadySent = hasReminderBeenSent(user.id, customKey);

        if (pillsCustomTime === currentTimeStr && !alreadySent) {
          logger.info('Sending custom pills reminder', { userId: user.id, time: pillsCustomTime });
          await sendCustomNotificationSms(user.id, user.phone, 'pills', capsulesPerMeal, ingredients);
          markReminderAsSent(user.id, customKey);
        }
      }
    }
  } catch (error) {
    logger.error('Error in checkAndSendReminders', { error });
  }
}

// Send a custom-timed pill reminder
async function sendCustomNotificationSms(
  userId: string,
  phone: string,
  _notificationType: string,
  capsuleCount: number,
  _ingredients: FormulaIngredient[]
) {
  try {
    const message = `💊 Reminder: Take ${capsuleCount} capsule${capsuleCount !== 1 ? 's' : ''} now.`;

    const success = await sendNotificationSms({
      to: phone,
      message,
      type: 'system'
    });

    if (success) {
      logger.info('Sent custom pill reminder', { userId });
    } else {
      logger.warn('Failed to send custom pill reminder', { userId });
    }
  } catch (error) {
    logger.error('Error sending custom pill SMS', { error });
  }
}

async function sendReminderSms(reminder: ReminderCheck) {
  try {
    const { phone, mealType, capsuleCount, userId } = reminder;

    // Get notification preferences to check pill time slot
    const prefs = await notificationsService.getPreferences(userId);

    // Format meal type for display
    const mealDisplay = mealType.charAt(0).toUpperCase() + mealType.slice(1);

    // Map meal type to time slot
    const mealToSlot: Record<string, string> = {
      breakfast: 'morning',
      lunch: 'afternoon',
      dinner: 'evening'
    };
    const currentSlot = mealToSlot[mealType];

    // Pills-only SMS — check if this time slot matches
    const pillsSlot = prefs?.pillsTimeSlot ?? 'all';
    if (pillsSlot !== 'all' && pillsSlot !== currentSlot) {
      return; // Not the right time slot for pills
    }

    const message = `💊 ${mealDisplay} time! Take ${capsuleCount} capsule${capsuleCount !== 1 ? 's' : ''} with your meal.`;

    // Send SMS via Twilio
    const success = await sendNotificationSms({
      to: phone,
      message,
      type: 'system'
    });

    if (success) {
      logger.info('Sent meal reminder', { userId: reminder.userId, mealType });
    } else {
      logger.warn('Failed to send meal reminder', { userId: reminder.userId, mealType });
    }
  } catch (error) {
    logger.error('Error sending reminder SMS', { error });
  }
}

async function checkAndSendRenewalReminders() {
  try {
    const renewals = await usersRepository.getUpcomingRenewals(5);
    for (const sub of renewals) {
      const user = await usersRepository.getUser(sub.userId);
      if (!user?.phone || !(await hasSmsAccountabilityConsent(user.id))) continue;

      await sendRawSms(
        user.phone,
        `Hi ${user.name}, your Ones supplement subscription renews in 5 days! 🔄\n\nIf you've had any changes in your health, diet, or goals, now is the perfect time to chat with your AI practitioner to update your formula before your next batch ships.\n\nReply to this message or log in to update your profile.`
      );
    }
  } catch (error) {
    logger.error('Error in checkAndSendRenewalReminders', { error });
  }
}

// Start the scheduler
export function startSmsReminderScheduler() {
  logger.info('SMS reminder scheduler starting');

  cron.schedule('* * * * *', async () => {
    await checkAndSendReminders();
  });

  cron.schedule('0 12 * * *', async () => {
    await checkAndSendRenewalReminders();
  });

  cron.schedule('0 0 * * *', () => {
    resetDailyTracking();
  });

  logger.info('SMS reminder scheduler started');
}

// Export for manual testing
export { checkAndSendReminders, checkAndSendRenewalReminders, sendReminderSms };
