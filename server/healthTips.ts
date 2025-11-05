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

// MORNING TIPS - Energy, activity, and supplement absorption (50+ tips for variety)
export const morningTips: string[] = [
  // Walking & Movement (15 tips)
  "A 10-minute morning walk boosts energy and helps your body absorb nutrients better.",
  "Walking in sunlight for 15 minutes activates Vitamin D and energizes your day.",
  "Take a brisk 10-minute walk to kickstart circulation and nutrient delivery.",
  "Walking stairs for 5 minutes gets blood flowing to deliver vitamins faster.",
  "A morning stroll enhances oxygen flow, helping supplements work more effectively.",
  
  // Running & Cardio (10 tips)
  "Light jogging for 10 minutes amplifies energy and nutrient absorption.",
  "Running for just 8 minutes increases circulation and vitamin uptake by 40%.",
  "A quick 5-minute jog gets your heart pumping for better supplement distribution.",
  "Cardio for 10 minutes helps omega-3s reach your cells more efficiently.",
  "Morning cardio boosts metabolism, making your supplements work harder.",
  
  // Strength & Resistance (10 tips)
  "10 push-ups get your blood flowing, helping B-vitamins energize your cells.",
  "Try 15 squats to activate muscles and enhance nutrient delivery.",
  "Light strength training for 10 minutes maximizes vitamin absorption.",
  "20 jumping jacks boost circulation and supplement effectiveness.",
  "Morning planks for 1 minute strengthen core and improve nutrient flow.",
  
  // Stretching & Flexibility (8 tips)
  "Just 5 minutes of stretching increases blood flow and nutrient delivery.",
  "Morning yoga poses enhance flexibility and supplement absorption.",
  "Stretching for 5 minutes reduces inflammation and activates vitamins.",
  "Full-body stretches improve circulation, helping supplements reach every cell.",
  
  // Breathing & Mindfulness (7 tips)
  "Deep breathing for 2 minutes helps oxygenate your cells for better vitamin uptake.",
  "Morning meditation for 5 minutes calms your mind and enhances nutrient processing.",
  "Box breathing for 3 minutes improves oxygen delivery to supplement your energy.",
  "Mindful breathing activates your parasympathetic system for better absorption.",
  
  // Nutrition & Hydration (10 tips)
  "Your Vitamin D absorbs best with fatty foods like eggs or avocado.",
  "Drinking water first thing helps activate your supplements and metabolism.",
  "Taking supplements with breakfast improves absorption by up to 50%.",
  "Omega-3s work best when paired with healthy fats in your morning meal.",
  "B-vitamins work synergistically with protein-rich breakfasts.",
  "Pair your supplements with citrus for enhanced vitamin C absorption.",
  "Adding nuts to breakfast boosts healthy fat absorption for fat-soluble vitamins.",
  "Green tea with supplements enhances antioxidant effects.",
  "Berries at breakfast amplify the power of your antioxidant supplements.",
  "Whole grains help stabilize energy release from B-vitamins.",
  
  // Sunlight & Nature (5 tips)
  "Morning sunlight exposure enhances Vitamin D production naturally.",
  "15 minutes outdoors boosts mood and activates vitamin synthesis.",
  "Fresh air and sunlight work synergistically with your morning supplements.",
  "Nature exposure for 10 minutes reduces stress and enhances vitamin uptake.",
  "Morning sun on your skin activates natural vitamin D production.",
  
  // Dancing & Fun Activities (5 tips)
  "Dancing for 10 minutes energizes you and boosts nutrient circulation.",
  "Turn on music and move for 5 minutes to activate morning energy.",
  "Fun movement like dancing makes your supplements work while you smile.",
  "Groove to your favorite song - it boosts mood and vitamin absorption.",
  
  // Swimming & Water Activities (3 tips)
  "Swimming for 15 minutes provides full-body circulation for optimal absorption.",
  "Water aerobics activate muscles while being gentle on joints.",
  
  // Cycling (3 tips)
  "Bike riding for 10 minutes gets your heart rate up for better nutrient delivery.",
  "Cycling boosts leg circulation, helping vitamins reach lower extremities.",
];

// EVENING TIPS - Recovery, sleep, and relaxation (50+ tips for variety)
export const eveningTips: string[] = [
  // Sleep & Magnesium (12 tips)
  "Magnesium helps with sleep - perfect timing for tonight's rest.",
  "Your evening Magnesium promotes muscle relaxation for deeper sleep.",
  "Calcium and Magnesium together promote deeper, more restorative sleep.",
  "Magnesium calms your nervous system, preparing you for quality rest.",
  "Evening minerals support overnight muscle recovery and repair.",
  "Your supplements work overnight to restore and rejuvenate your body.",
  "Magnesium in the evening helps regulate your sleep-wake cycle naturally.",
  "Taking minerals with dinner supports bone health while you sleep.",
  "Evening supplements fuel cellular repair during your deepest sleep phases.",
  "Magnesium and zinc work together for immune system overnight recovery.",
  
  // Walking & Light Movement (10 tips)
  "A 10-minute evening walk can improve sleep quality by 30%.",
  "Light evening stroll helps digest dinner and prepares you for rest.",
  "Walking after dinner aids digestion and supplement absorption.",
  "Gentle movement in the evening calms your mind before bed.",
  "A short walk helps your body wind down naturally.",
  
  // Stretching & Yoga (12 tips)
  "Light stretching before bed reduces inflammation and aids muscle recovery.",
  "5 minutes of gentle yoga prepares your body for restorative sleep.",
  "Evening stretches release tension accumulated during the day.",
  "Gentle hip stretches before bed improve circulation and relaxation.",
  "Yoga poses like child's pose calm your nervous system for sleep.",
  "Stretching helps your supplements reach tight muscles for overnight repair.",
  "Forward folds in the evening activate your parasympathetic nervous system.",
  "Gentle twists before bed aid digestion and nutrient absorption.",
  
  // Breathing & Meditation (10 tips)
  "Deep breathing for 5 minutes activates relaxation and enhances absorption.",
  "Evening meditation calms your mind and optimizes supplement effectiveness.",
  "4-7-8 breathing technique prepares your body for deep, restful sleep.",
  "Mindful breathing reduces cortisol, allowing better vitamin utilization.",
  "Evening breathwork signals your body it's time to repair and restore.",
  "Box breathing for 3 minutes lowers heart rate for better sleep onset.",
  
  // Hydration & Nutrition (8 tips)
  "Taking supplements with dinner gives your body overnight recovery fuel.",
  "Evening is perfect for anti-inflammatory ingredients to work overnight.",
  "Pair evening supplements with healthy fats for optimal absorption.",
  "Avoid caffeine after supplements to maximize sleep quality.",
  "Evening supplements work best when taken 2 hours before bed.",
  
  // Screen & Environment (6 tips)
  "Avoid screens for 1 hour after taking evening supplements for better sleep.",
  "Dim lights after taking supplements to support melatonin production.",
  "Keep your bedroom cool - it enhances supplement-induced sleep quality.",
  "Evening routine consistency helps your body absorb supplements better.",
  
  // Warm Bath & Relaxation (5 tips)
  "A warm shower after supplements helps relax muscles and improve absorption.",
  "Warm bath with Epsom salts enhances magnesium absorption through skin.",
  "Evening bath raises body temperature - cooling down triggers sleep hormones.",
  
  // Reading & Calm Activities (4 tips)
  "Reading for 20 minutes after supplements calms your mind for sleep.",
  "Gentle activities like journaling help your body enter rest mode.",
  "L-Theanine in your formula promotes calm without drowsiness.",
  
  // Recovery & Repair (5 tips)
  "Evening supplements support overnight cellular repair and regeneration.",
  "Your body does most of its healing while you sleep - fuel it well.",
  "Overnight is when your supplements repair muscles and restore energy.",
  "Evening nutrients support immune function during deep sleep cycles.",
];

/**
 * Get a random health tip based on time of day with smart variety
 * Uses a larger pool to avoid repetition across 365 days
 * @param timeOfDay - 'morning' or 'evening'
 * @param lastTipIndex - Index of last tip shown (to avoid immediate repeats)
 * @param recentIndices - Array of recently used indices (optional, for even more variety)
 * @returns A health tip string and its index
 */
export function getHealthTip(
  timeOfDay: 'morning' | 'evening',
  lastTipIndex?: number,
  recentIndices?: number[]
): { tip: string; index: number } {
  const tips = timeOfDay === 'morning' ? morningTips : eveningTips;
  
  // Create a pool of indices to avoid
  const avoidIndices = new Set<number>();
  if (lastTipIndex !== undefined) avoidIndices.add(lastTipIndex);
  if (recentIndices) recentIndices.forEach(idx => avoidIndices.add(idx));
  
  // Get available indices
  const availableIndices = tips
    .map((_, idx) => idx)
    .filter(idx => !avoidIndices.has(idx));
  
  // If we've exhausted all options, reset and use any
  const pool = availableIndices.length > 0 ? availableIndices : tips.map((_, idx) => idx);
  
  // Pick random from available pool
  const randomIndex = pool[Math.floor(Math.random() * pool.length)];
  
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
