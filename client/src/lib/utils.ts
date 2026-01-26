import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Valid capsule count options (minimum 6, no 3-capsule option)
export const VALID_CAPSULE_COUNTS = [6, 9, 12, 15] as const;
export type CapsuleCount = typeof VALID_CAPSULE_COUNTS[number];

// Capsule capacity in mg
export const CAPSULE_CAPACITY_MG = 550;

// Pricing per month by capsule count
export const CAPSULE_PRICING: Record<CapsuleCount, { monthlyPrice: number; perCapsule: number }> = {
  6: { monthlyPrice: 89, perCapsule: 0.49 },
  9: { monthlyPrice: 119, perCapsule: 0.44 },
  12: { monthlyPrice: 149, perCapsule: 0.41 },
  15: { monthlyPrice: 179, perCapsule: 0.40 },
};

// Capsule tier descriptions for UI
export const CAPSULE_TIER_INFO: Record<CapsuleCount, { label: string; description: string; features: string[] }> = {
  6: { 
    label: 'Essential', 
    description: 'Addresses top 2-3 priorities',
    features: ['8-10 ingredients', '2 per meal', 'Core coverage']
  },
  9: { 
    label: 'Comprehensive', 
    description: 'Full coverage - most popular',
    features: ['12-15 ingredients', '3 per meal', 'Complete support']
  },
  12: { 
    label: 'Therapeutic', 
    description: 'Enhanced intensity for complex needs',
    features: ['15-18 ingredients', '4 per meal', 'Higher doses']
  },
  15: { 
    label: 'Maximum', 
    description: 'Maximum protocol, all bases covered',
    features: ['18-22 ingredients', '5 per meal', 'Full optimization']
  },
};

/**
 * Calculate capsule dosage distribution across meals
 * Based on 550mg capsule capacity (00-size)
 * Total capsules split evenly across morning, lunch, dinner
 * 
 * @param totalMg - Total formula mg
 * @param targetCapsules - Optional: User's selected capsule count (3, 6, 9, 12, or 15)
 */
export function calculateDosage(totalMg: number, targetCapsules?: number): {
  total: number;
  perMeal: number;
  display: string;
  budgetMg: number;
  utilizationPercent: number;
} {
  const MEALS_PER_DAY = 3;
  
  // Use targetCapsules if provided, otherwise calculate from totalMg
  const totalCapsules = targetCapsules || Math.ceil(totalMg / CAPSULE_CAPACITY_MG);
  const capsulesPerMeal = Math.ceil(totalCapsules / MEALS_PER_DAY);
  
  // Total should match what's shown in display: perMeal * MEALS_PER_DAY
  const actualTotal = capsulesPerMeal * MEALS_PER_DAY;
  const budgetMg = actualTotal * CAPSULE_CAPACITY_MG;
  const utilizationPercent = Math.round((totalMg / budgetMg) * 100);
  
  return {
    total: actualTotal,
    perMeal: capsulesPerMeal,
    display: `🌅 ${capsulesPerMeal} • ☀️ ${capsulesPerMeal} • 🌙 ${capsulesPerMeal}`,
    budgetMg,
    utilizationPercent,
  };
}

/**
 * Get the mg budget for a given capsule count
 */
export function getCapsuleBudget(capsuleCount: CapsuleCount): number {
  return capsuleCount * CAPSULE_CAPACITY_MG;
}
