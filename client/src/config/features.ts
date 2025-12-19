/**
 * Feature Flags Configuration
 * 
 * Control which features are enabled/disabled in the app.
 * These flags allow us to easily suppress features for investors/MVP
 * while keeping all code intact for future re-enablement.
 * 
 * To re-enable a feature, simply flip the boolean to `true`.
 */

export const FEATURES = {
  /**
   * Optimize Section - AI-generated plans
   * When false: Hides nutrition, workout, lifestyle from navigation
   * All code remains intact in /pages/OptimizePage.tsx and /components/optimize/*
   */
  OPTIMIZE_NUTRITION: false,
  OPTIMIZE_WORKOUT: false,
  OPTIMIZE_LIFESTYLE: false,
  
  /**
   * Tracking Features
   * When false: Hides water tracking and lifestyle logging
   * Supplement tracking is always on (core feature)
   */
  WATER_TRACKING: false,
  LIFESTYLE_TRACKING: false,
  
  /**
   * Standalone Tracking Page
   * When false: Redirects /dashboard/optimize/tracking to /dashboard
   * Supplement tracking moves to main dashboard instead
   */
  TRACKING_PAGE: false,
  
  /**
   * Streak Rewards System
   * Enables discount rewards based on supplement compliance streaks
   */
  STREAK_REWARDS: true,
  
  /**
   * Grocery List
   * Part of nutrition planning - hidden when OPTIMIZE_NUTRITION is false
   */
  GROCERY_LIST: false,
} as const;

/**
 * Helper to check if any optimize feature is enabled
 */
export const isOptimizeEnabled = () => 
  FEATURES.OPTIMIZE_NUTRITION || 
  FEATURES.OPTIMIZE_WORKOUT || 
  FEATURES.OPTIMIZE_LIFESTYLE;

/**
 * Helper to check if full tracking page should be shown
 */
export const isTrackingPageEnabled = () => 
  FEATURES.TRACKING_PAGE || 
  FEATURES.WATER_TRACKING || 
  FEATURES.LIFESTYLE_TRACKING;
