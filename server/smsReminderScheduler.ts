import cron from 'node-cron';
import { storage } from './storage';
import { sendNotificationSms, sendRawSms } from './smsService';
import { generatePersonalizedTip, type FormulaIngredient } from './healthTips';

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
const sentOptimizeRemindersToday = new Map<string, Set<string>>(); // userId -> Set<reminderType>

function resetDailyTracking() {
  sentRemindersToday.clear();
  sentOptimizeRemindersToday.clear();
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

function hasOptimizeReminderBeenSent(userId: string, reminderType: string): boolean {
  return sentOptimizeRemindersToday.get(userId)?.has(reminderType) || false;
}

function markOptimizeReminderAsSent(userId: string, reminderType: string) {
  if (!sentOptimizeRemindersToday.has(userId)) {
    sentOptimizeRemindersToday.set(userId, new Set());
  }
  sentOptimizeRemindersToday.get(userId)!.add(reminderType);
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

async function checkAndSendOptimizeReminders() {
  try {
    console.log('⏰ Checking for OPTIMIZE reminders...');
    const allUsers = await storage.listAllUsers?.() || [];
    console.log(`📋 Found ${allUsers.length} users for optimize reminders`);
    
    for (const user of allUsers) {
      if (!user.phone) continue;

      const prefs = await storage.getOptimizeSmsPreferences(user.id);
      if (!prefs) continue; // Skip if no optimize prefs

      const timezone = user.timezone || 'America/New_York';
      const { hours, minutes } = getCurrentTimeInTimezone(timezone);
      const currentTime = `${hours}:${minutes.toString().padStart(2, '0')}`;
      
      // console.log(`👤 Checking optimize reminders for ${user.id} at ${currentTime}`);

      // 1. Morning Reminder
      if (prefs.morningReminderEnabled && prefs.morningReminderTime === currentTime && !hasOptimizeReminderBeenSent(user.id, 'morning')) {
        console.log(`🔔 Sending Morning Optimize Reminder to ${user.id}`);
        const mealPlan = await storage.getActiveOptimizePlan(user.id, 'nutrition');
        const streak = await storage.getUserStreak(user.id, 'overall');
        
        let message = `☀️ Good morning, ${user.name}!\n\n`;
        
        if (mealPlan && mealPlan.content) {
           const content = mealPlan.content as any;
           const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // Mon=0, Sun=6
           const todayPlan = content.weekPlan?.[todayIndex];
           
           if (todayPlan) {
             message += `TODAY'S PLAN:\n`;
             todayPlan.meals?.forEach((meal: any) => {
               const emoji = meal.mealType === 'breakfast' ? '🍳' : meal.mealType === 'lunch' ? '🥗' : '🍽️';
               message += `${emoji} ${meal.name} (${meal.macros?.calories || 0} cal)\n`;
             });
             message += `\n`;
           }
        }
        
        message += `💊 Don't forget your supplements!\n`;
        message += `💧 Hydration goal: 100oz\n\n`;
        
        if (streak) {
          message += `Current streak: 🔥 ${streak.currentStreak} days - keep it up!`;
        }
        
        await sendRawSms(user.phone, message);
        markOptimizeReminderAsSent(user.id, 'morning');
      }

      // 2. Workout Reminder
      if (prefs.workoutReminderEnabled && prefs.workoutReminderTime === currentTime && !hasOptimizeReminderBeenSent(user.id, 'workout')) {
         console.log(`🔔 Sending Workout Optimize Reminder to ${user.id}`);
         const workoutPlan = await storage.getActiveOptimizePlan(user.id, 'workout');
         
         if (workoutPlan && workoutPlan.content) {
           const content = workoutPlan.content as any;
           // Simple logic: find workout for today's day of week (1-7)
           const todayDay = new Date().getDay() || 7; // 1=Mon, 7=Sun
           const todayWorkout = content.workouts?.find((w: any) => w.dayOfWeek === todayDay);
           
           if (todayWorkout) {
             let message = `💪 Workout time, ${user.name}!\n\n`;
             message += `TODAY'S WORKOUT:\n`;
             message += `${todayWorkout.workoutName} (${todayWorkout.totalDuration} min)\n`;
             
             const mainExercises = todayWorkout.mainWorkout?.exercises?.slice(0, 4) || [];
             mainExercises.forEach((ex: any) => {
               message += `- ${ex.name} ${ex.sets}x${ex.reps}\n`;
             });
             
             message += `\nReply DONE when complete ✅`;
             
             await sendRawSms(user.phone, message);
             markOptimizeReminderAsSent(user.id, 'workout');
           }
         }
      }

      // 3. Evening Check-in
      if (prefs.eveningCheckinEnabled && prefs.eveningCheckinTime === currentTime && !hasOptimizeReminderBeenSent(user.id, 'evening')) {
         console.log(`🔔 Sending Evening Optimize Reminder to ${user.id}`);
         const message = `🌙 End-of-day check-in, ${user.name}!\n\n` +
        `Did you complete today?\n` +
        `Reply with:\n` +
        `✅ YES - All done!\n` +
        `🍽️ NUTRITION - Just meals\n` +
        `💪 WORKOUT - Just workout\n` +
        `❌ SKIP - Tomorrow's a new day`;
        
        await sendRawSms(user.phone, message);
        markOptimizeReminderAsSent(user.id, 'evening');
      }
    }
  } catch (error) {
    console.error('Error in checkAndSendOptimizeReminders:', error);
  }
}

async function checkAndSendReminders() {
  try {
    console.log('⏰ Checking for reminders to send...');
    
    // Get all users with daily reminders enabled
    const allUsers = await storage.listAllUsers?.() || [];
    console.log(`📋 Found ${allUsers.length} total users`);
    
    for (const user of allUsers) {
      // Get notification preferences to check if daily reminders are enabled
      const prefs = await storage.getNotificationPrefs(user.id);
      
      if (!prefs?.dailyRemindersEnabled) {
        console.log(`⏭️  Skipping user ${user.id} - reminders disabled`);
        continue;
      }
      
      if (!user.phone) {
        console.log(`⏭️  Skipping user ${user.id} - no phone number`);
        continue;
      }
      
      const timezone = user.timezone || 'America/New_York';
      const currentTime = getCurrentTimeInTimezone(timezone);
      
      console.log(`👤 Checking user ${user.id} - Local time: ${currentTime.hours}:${currentTime.minutes.toString().padStart(2, '0')} (${timezone})`);
      
      // Get user's active formula to determine capsule count and ingredients
      const formulas = await storage.getFormulaHistory(user.id);
      const activeFormula = formulas[0]; // Most recent formula
      
      if (!activeFormula) {
        console.log(`⏭️  Skipping user ${user.id} - no formula`);
        continue;
      }
      
      // Calculate total capsule count from formula
      const totalDosage = Math.max(activeFormula.totalMg || 0, 0);
      const capsuleCount = Math.max(1, Math.ceil(totalDosage / 1500)); // Each capsule is ~1500mg

      // Gather ingredients for personalized tips
      const bases = Array.isArray(activeFormula.bases) ? activeFormula.bases : [];
      const additions = Array.isArray(activeFormula.additions) ? activeFormula.additions : [];
      const ingredients: FormulaIngredient[] = [...bases, ...additions];
      
      // Check each meal time
      const reminders: Array<{ mealType: 'breakfast' | 'lunch' | 'dinner'; time: string | null | undefined }> = [
        { mealType: 'breakfast', time: prefs.reminderBreakfast },
        { mealType: 'lunch', time: prefs.reminderLunch },
        { mealType: 'dinner', time: prefs.reminderDinner }
      ];
      
      for (const { mealType, time } of reminders) {
        if (!time) {
          continue;
        }
        const [targetHours, targetMinutes] = time.split(':').map(Number);
        
        const timeMatches = currentTime.hours === targetHours && currentTime.minutes === targetMinutes;
        const alreadySent = hasReminderBeenSent(user.id, mealType);
        
        console.log(`  ${mealType}: ${targetHours}:${targetMinutes.toString().padStart(2, '0')} - Match: ${timeMatches}, Sent: ${alreadySent}`);
        
        // Check if current time matches reminder time (within 1 minute window)
        if (timeMatches && !alreadySent) {
          // Time to send reminder!
          console.log(`🔔 SENDING ${mealType} reminder to user ${user.id}!`);
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
    const healthTip = await generatePersonalizedTip(ingredients, mapMealTypeToTipContext(mealType));
    
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
    await checkAndSendOptimizeReminders();
  });
  
  // Reset daily tracking at midnight UTC
  cron.schedule('0 0 * * *', () => {
    resetDailyTracking();
  });
  
  console.log('✅ SMS reminder scheduler started - checking every minute');
}

// Export for manual testing
export { checkAndSendReminders, sendReminderSms };

function mapMealTypeToTipContext(mealType: 'breakfast' | 'lunch' | 'dinner'): 'morning' | 'evening' {
  if (mealType === 'dinner') {
    return 'evening';
  }
  return 'morning';
}
