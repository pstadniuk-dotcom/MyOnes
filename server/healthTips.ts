// Daily wellness tips for pill reminders
// These can be AI-generated based on user's formula or use static fallbacks

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface HealthTip {
  message: string;
  timeOfDay: 'morning' | 'evening';
}

export interface FormulaIngredient {
  ingredient: string;
  amount: number;
  unit: string;
  purpose?: string;
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
 * Generate AI-powered personalized health tip based on user's formula
 * @param ingredients - Array of ingredients in user's formula
 * @param timeOfDay - 'morning' or 'evening'
 * @returns Personalized health tip or null if generation fails
 */
export async function generatePersonalizedTip(
  ingredients: FormulaIngredient[],
  timeOfDay: 'morning' | 'evening'
): Promise<string | null> {
  try {
    // Extract ingredient names for the prompt
    const ingredientList = ingredients
      .map(ing => ing.ingredient)
      .join(', ');

    const timeContext = timeOfDay === 'morning' 
      ? 'morning energy, activity, and nutrient absorption'
      : 'evening recovery, sleep, and relaxation';

    const prompt = `Generate a short, friendly health tip (max 120 characters) for someone taking supplements with these ingredients: ${ingredientList}. 

The tip should be:
- Focused on ${timeContext}
- Include ONE simple, actionable health activity from this diverse list:
  * Walking (10-15 min)
  * Light jogging/running (5-10 min)
  * Stretching (5 min)
  * Deep breathing exercises (2-3 min)
  * Push-ups or squats (10 reps)
  * Dancing (10 min)
  * Jumping jacks (2 min)
  * Climbing stairs (5 min)
  * Light strength training (10 min)
  * Swimming/water activity (15 min)
  * Bike riding (10-15 min)
  * Meditation (5-10 min)
  * Hydrating with water
  * Getting sunlight (10-15 min)
- Relate to how the activity enhances their specific supplement ingredients
- Sound encouraging and personal
- Be specific about time (e.g., "10 minutes" not "a few minutes")
- IMPORTANT: Choose a DIFFERENT activity each time - be creative and varied!

Examples:
- "A 10-minute morning walk helps your Omega-3s absorb and boosts energy."
- "Magnesium works best with 5 minutes of stretching before bed for deeper sleep."
- "10 push-ups get your blood flowing, helping B-vitamins energize your cells."
- "Running for just 10 minutes amplifies Vitamin D production and iron absorption."

Generate ONE unique tip with a different activity:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a wellness coach creating personalized, actionable health tips for supplement users. Keep tips under 120 characters, specific, and encouraging. CRITICAL: Use a different activity type every single time - never repeat the same exercise twice in a row!'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 80,
      temperature: 1.0, // Higher temperature for more variety
    });

    const tip = completion.choices[0]?.message?.content?.trim();
    
    // Remove quotes if AI wrapped the response
    return tip ? tip.replace(/^["']|["']$/g, '') : null;
  } catch (error) {
    console.error('Error generating personalized health tip:', error);
    return null;
  }
}

/**
 * Format a pill reminder message with optional health tip
 * @param capsuleCount - Number of capsules to take
 * @param mealTime - 'breakfast', 'lunch', or 'dinner'
 * @param includeTip - Whether to include a health tip
 * @param customTip - Optional custom tip to use instead of random
 * @returns Formatted SMS message
 */
export function formatPillReminderMessage(
  capsuleCount: number,
  mealTime: 'breakfast' | 'lunch' | 'dinner',
  includeTip: boolean = false,
  customTip?: string
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
    const tip = customTip || getHealthTip(mealTime === 'breakfast' ? 'morning' : 'evening').tip;
    message += `\n\n💡 Tip: ${tip}`;
  }
  
  return message;
}

/**
 * Generate and format a personalized pill reminder with AI-generated tip
 * @param capsuleCount - Number of capsules to take
 * @param mealTime - 'breakfast', 'lunch', or 'dinner'
 * @param ingredients - User's formula ingredients
 * @returns Promise of formatted SMS message with personalized tip
 */
export async function generatePersonalizedReminderMessage(
  capsuleCount: number,
  mealTime: 'breakfast' | 'lunch' | 'dinner',
  ingredients: FormulaIngredient[]
): Promise<string> {
  // Only generate tips for breakfast and dinner
  if (mealTime === 'breakfast' || mealTime === 'dinner') {
    const timeOfDay = mealTime === 'breakfast' ? 'morning' : 'evening';
    
    // Try to generate AI tip
    const personalizedTip = await generatePersonalizedTip(ingredients, timeOfDay);
    
    if (personalizedTip) {
      return formatPillReminderMessage(capsuleCount, mealTime, true, personalizedTip);
    }
  }
  
  // Fallback to static tips or no tip for lunch
  return formatPillReminderMessage(capsuleCount, mealTime, mealTime !== 'lunch');
}
