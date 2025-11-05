import cron from 'node-cron';
import { storage } from './storage';
import { sendNotificationSms } from './smsService';
import { generatePersonalizedTip } from './healthTips';

interface ReminderCheck {
  userId: string;
  phone: string;
  timezone: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  capsuleCount: number;
  ingredients: string[];
}

// Track which users we've sent reminders to today (to avoid duplicates)
const sentRemindersToday = new Map<string, Set<string>>(); // userId -> Set<mealTypes>

function resetDailyTracking() {
  sentRemindersToday.clear();
  console.log('📅 Daily reminder tracking reset');
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
    console.error(`Error getting time for timezone ${timezone}:`, error);
    // Fallback to UTC
    const now = new Date();
    return { hours: now.getUTCHours(), minutes: now.getUTCMinutes() };
  }
}

async function checkAndSendReminders() {
  try {
    // Get all users with daily reminders enabled
    const allUsers = await storage.listAllUsers?.() || [];
    
    for (const user of allUsers) {
      // Get notification preferences to check if daily reminders are enabled
      const prefs = await storage.getNotificationPrefs(user.id);
      
      if (!prefs?.dailyRemindersEnabled || !user.phone) {
        continue; // Skip if reminders disabled or no phone number
      }
      
      const timezone = user.timezone || 'America/New_York';
      const currentTime = getCurrentTimeInTimezone(timezone);
      
      // Get user's active formula to determine capsule count and ingredients
      const formulas = await storage.getFormulaHistory(user.id);
      const activeFormula = formulas[0]; // Most recent formula
      
      if (!activeFormula) {
        continue; // Skip if user has no formula
      }
      
      // Calculate total capsule count from formula
      const totalDosage = activeFormula.dosage || 0;
      const capsuleCount = Math.ceil(totalDosage / 1500); // Each capsule is ~1500mg
      
      // Get ingredient names for personalized tips
      const ingredients = [
        ...(activeFormula.baseCombinations || []),
        ...(activeFormula.individualIngredients || [])
      ].map(item => item.ingredient);
      
      // Check each meal time
      const reminders: Array<{ mealType: 'breakfast' | 'lunch' | 'dinner'; time: string }> = [
        { mealType: 'breakfast', time: prefs.reminderBreakfast },
        { mealType: 'lunch', time: prefs.reminderLunch },
        { mealType: 'dinner', time: prefs.reminderDinner }
      ];
      
      for (const { mealType, time } of reminders) {
        const [targetHours, targetMinutes] = time.split(':').map(Number);
        
        // Check if current time matches reminder time (within 1 minute window)
        if (
          currentTime.hours === targetHours && 
          currentTime.minutes === targetMinutes &&
          !hasReminderBeenSent(user.id, mealType)
        ) {
          // Time to send reminder!
          await sendReminderSms({
            userId: user.id,
            phone: user.phone,
            timezone,
            mealType,
            capsuleCount,
            ingredients
          });
          
          markReminderAsSent(user.id, mealType);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error in checkAndSendReminders:', error);
  }
}

async function sendReminderSms(reminder: ReminderCheck) {
  try {
    const { phone, mealType, capsuleCount, ingredients } = reminder;
    
    // Generate AI-powered health tip or use static fallback
    const healthTip = await generatePersonalizedTip(ingredients, mealType);
    
    // Format meal type for display
    const mealDisplay = mealType.charAt(0).toUpperCase() + mealType.slice(1);
    
    // Create personalized message
    const message = `${mealDisplay} time! Take ${capsuleCount} capsule${capsuleCount !== 1 ? 's' : ''} with your meal. 💡 Tip: ${healthTip}`;
    
    // Send SMS via Twilio
    const success = await sendNotificationSms({
      to: phone,
      message,
      type: 'system'
    });
    
    if (success) {
      console.log(`✅ Sent ${mealType} reminder to user ${reminder.userId}`);
    } else {
      console.error(`❌ Failed to send ${mealType} reminder to user ${reminder.userId}`);
    }
  } catch (error) {
    console.error('❌ Error sending reminder SMS:', error);
  }
}

// Start the scheduler
export function startSmsReminderScheduler() {
  console.log('🚀 Starting SMS reminder scheduler...');
  
  // Check every minute for reminders
  cron.schedule('* * * * *', async () => {
    await checkAndSendReminders();
  });
  
  // Reset daily tracking at midnight UTC
  cron.schedule('0 0 * * *', () => {
    resetDailyTracking();
  });
  
  console.log('✅ SMS reminder scheduler started - checking every minute');
}

// Export for manual testing
export { checkAndSendReminders, sendReminderSms };
