// Daily wellness tips for pill reminders
// These rotate through morning and evening messages to keep content fresh

export interface HealthTip {
  message: string;
  timeOfDay: 'morning' | 'evening';
}

// MORNING TIPS - Energy, activity, and supplement absorption
export const morningTips: string[] = [
  "A 10-minute morning walk boosts energy and helps your body absorb nutrients better.",
  "Your Vitamin D absorbs best with fatty foods like eggs or avocado.",
  "Drinking water first thing helps activate your supplements and metabolism.",
  "Just 5 minutes of stretching increases blood flow and nutrient delivery.",
  "Morning sunlight exposure enhances Vitamin D production naturally.",
  "Taking supplements with breakfast improves absorption by up to 50%.",
  "A brief walk before breakfast can improve insulin sensitivity all day.",
  "Omega-3s work best when paired with healthy fats in your morning meal.",
  "Deep breathing for 2 minutes helps oxygenate your cells for better vitamin uptake.",
  "B-vitamins from your formula work synergistically with protein-rich breakfasts.",
];

// EVENING TIPS - Recovery, sleep, and relaxation
export const eveningTips: string[] = [
  "Magnesium helps with sleep - perfect timing for tonight's rest.",
  "A 10-minute evening walk can improve sleep quality by 30%.",
  "Taking supplements with dinner gives your body overnight recovery fuel.",
  "Light stretching before bed reduces inflammation and aids muscle recovery.",
  "Evening supplements support overnight cellular repair and regeneration.",
  "Calcium and Magnesium together promote deeper, more restorative sleep.",
  "Avoid screens for 1 hour after taking evening supplements for better sleep.",
  "A warm shower after supplements helps relax muscles and improve absorption.",
  "Evening is perfect for anti-inflammatory ingredients to work overnight.",
  "L-Theanine in your formula promotes calm without drowsiness.",
];

/**
 * Get a random health tip based on time of day
 * @param timeOfDay - 'morning' or 'evening'
 * @param lastTipIndex - Index of last tip shown (to avoid repeats)
 * @returns A health tip string
 */
export function getHealthTip(
  timeOfDay: 'morning' | 'evening',
  lastTipIndex?: number
): { tip: string; index: number } {
  const tips = timeOfDay === 'morning' ? morningTips : eveningTips;
  
  // Get a random index that's different from the last one
  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * tips.length);
  } while (lastTipIndex !== undefined && randomIndex === lastTipIndex && tips.length > 1);
  
  return {
    tip: tips[randomIndex],
    index: randomIndex,
  };
}

/**
 * Format a pill reminder message with optional health tip
 * @param capsuleCount - Number of capsules to take
 * @param mealTime - 'breakfast', 'lunch', or 'dinner'
 * @param includeTip - Whether to include a health tip
 * @returns Formatted SMS message
 */
export function formatPillReminderMessage(
  capsuleCount: number,
  mealTime: 'breakfast' | 'lunch' | 'dinner',
  includeTip: boolean = false
): string {
  const mealTimes = {
    breakfast: 'Breakfast time',
    lunch: 'Lunch reminder',
    dinner: 'Dinner time',
  };
  
  const capsuleText = capsuleCount === 1 ? 'capsule' : 'capsules';
  let message = `${mealTimes[mealTime]}! Take ${capsuleCount} ${capsuleText} with your meal.`;
  
  // Add health tip for morning and evening
  if (includeTip && (mealTime === 'breakfast' || mealTime === 'dinner')) {
    const timeOfDay = mealTime === 'breakfast' ? 'morning' : 'evening';
    const { tip } = getHealthTip(timeOfDay);
    message += `\n\n💡 Tip: ${tip}`;
  }
  
  return message;
}
