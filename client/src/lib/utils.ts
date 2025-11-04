import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate capsule dosage distribution across meals
 * Based on 550mg capsule capacity (00-size)
 * Total capsules split evenly across morning, lunch, dinner
 */
export function calculateDosage(totalMg: number): {
  total: number;
  perMeal: number;
  display: string;
} {
  const CAPSULE_CAPACITY_MG = 550;
  const MEALS_PER_DAY = 3;
  
  const totalCapsules = Math.ceil(totalMg / CAPSULE_CAPACITY_MG);
  const capsulesPerMeal = Math.ceil(totalCapsules / MEALS_PER_DAY);
  
  // Total should match what's shown in display: perMeal * MEALS_PER_DAY
  const actualTotal = capsulesPerMeal * MEALS_PER_DAY;
  
  return {
    total: actualTotal,
    perMeal: capsulesPerMeal,
    display: `🌅 ${capsulesPerMeal} • ☀️ ${capsulesPerMeal} • 🌙 ${capsulesPerMeal}`,
  };
}
