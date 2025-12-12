/**
 * Timezone utilities for handling user-local dates on the server
 * 
 * Railway servers run in UTC, but users expect dates based on their local timezone.
 * These utilities help ensure daily logs, streaks, etc. use the correct user date.
 */

/**
 * Get the current date in user's timezone as a Date object set to midnight
 * This ensures daily logs are created for the correct user-local day
 * 
 * @param userTimezone - IANA timezone string (e.g., 'America/Los_Angeles')
 * @returns Date object representing midnight of the user's current day in UTC
 */
export function getUserLocalMidnight(userTimezone: string = 'America/New_York'): Date {
  try {
    // Get current time formatted in user's timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    // This gives us YYYY-MM-DD in user's timezone
    const userDateString = formatter.format(new Date());
    
    // Create a date at midnight UTC for this calendar date
    // This ensures all users logging on "2024-12-10" their time
    // get the same date key regardless of their timezone
    const [year, month, day] = userDateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)); // Noon UTC to avoid edge cases
  } catch (error) {
    console.error(`Invalid timezone "${userTimezone}", falling back to UTC:`, error);
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0));
  }
}

/**
 * Get user's current date as YYYY-MM-DD string
 * Useful for date keys and comparisons
 */
export function getUserLocalDateString(userTimezone: string = 'America/New_York'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch (error) {
    console.error(`Invalid timezone "${userTimezone}", falling back to UTC:`, error);
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Check if a given date is "today" in user's timezone
 */
export function isUserLocalToday(date: Date, userTimezone: string = 'America/New_York'): boolean {
  const userTodayString = getUserLocalDateString(userTimezone);
  
  // Format the input date in user's timezone
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const inputDateString = formatter.format(date);
    return inputDateString === userTodayString;
  } catch {
    return false;
  }
}

/**
 * Check if a given date is "yesterday" in user's timezone
 */
export function isUserLocalYesterday(date: Date, userTimezone: string = 'America/New_York'): boolean {
  const userToday = getUserLocalMidnight(userTimezone);
  const userYesterday = new Date(userToday);
  userYesterday.setDate(userYesterday.getDate() - 1);
  
  const yesterdayString = userYesterday.toISOString().slice(0, 10);
  
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const inputDateString = formatter.format(date);
    return inputDateString === yesterdayString;
  } catch {
    return false;
  }
}

/**
 * Convert a UTC timestamp to the user's local date string (YYYY-MM-DD)
 * Critical for grouping logs by the user's perceived day
 */
export function toUserLocalDateString(date: Date, userTimezone: string = 'America/New_York'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch (error) {
    console.error(`Invalid timezone "${userTimezone}", using UTC:`, error);
    return date.toISOString().slice(0, 10);
  }
}
