/**
 * Business Hours Utility
 *
 * Determines whether live support is currently available
 * and provides status messages for the chat widget.
 */

export interface BusinessHoursInfo {
  isOnline: boolean;
  statusMessage: string;
  nextOpenTime?: string; // e.g. "9:00 AM PT"
}

// Business hours config — Pacific Time
const BUSINESS_HOURS = {
  timezone: 'America/Los_Angeles',
  /** Days of the week that are open (0 = Sunday, 6 = Saturday) */
  openDays: [1, 2, 3, 4, 5], // Mon-Fri
  /** Open hour (24h format) */
  openHour: 9,
  /** Close hour (24h format) */
  closeHour: 18, // 6 PM
};

/**
 * Check if live support is currently online.
 */
export function getBusinessHoursInfo(): BusinessHoursInfo {
  const now = new Date();

  // Get current time in Pacific
  const ptString = now.toLocaleString('en-US', {
    timeZone: BUSINESS_HOURS.timezone,
    hour12: false,
  });

  const pt = new Date(ptString);
  const dayOfWeek = pt.getDay();
  const hour = pt.getHours();

  const isBusinessDay = BUSINESS_HOURS.openDays.includes(dayOfWeek);
  const isDuringHours = hour >= BUSINESS_HOURS.openHour && hour < BUSINESS_HOURS.closeHour;
  const isOnline = isBusinessDay && isDuringHours;

  if (isOnline) {
    const remainingHours = BUSINESS_HOURS.closeHour - hour;
    return {
      isOnline: true,
      statusMessage: remainingHours <= 1
        ? 'Online · Closing soon'
        : 'Online · Typically replies in minutes',
    };
  }

  // Calculate next open time
  let nextOpenDay = dayOfWeek;
  let daysUntilOpen = 0;

  if (isBusinessDay && hour >= BUSINESS_HOURS.closeHour) {
    // After hours today — next business day
    daysUntilOpen = 1;
    nextOpenDay = (dayOfWeek + 1) % 7;
  } else if (!isBusinessDay) {
    // Weekend — find next Monday
    daysUntilOpen = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // Sun → Mon, Sat → Mon
    nextOpenDay = 1; // Monday
  }
  // else: before hours today — opens today

  // Skip to next open day if needed
  while (!BUSINESS_HOURS.openDays.includes(nextOpenDay)) {
    daysUntilOpen++;
    nextOpenDay = (nextOpenDay + 1) % 7;
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (daysUntilOpen === 0) {
    return {
      isOnline: false,
      statusMessage: `Away · Back at ${BUSINESS_HOURS.openHour}:00 AM PT`,
      nextOpenTime: `${BUSINESS_HOURS.openHour}:00 AM PT`,
    };
  } else if (daysUntilOpen === 1) {
    return {
      isOnline: false,
      statusMessage: `Away · Back tomorrow at ${BUSINESS_HOURS.openHour}:00 AM PT`,
      nextOpenTime: `Tomorrow ${BUSINESS_HOURS.openHour}:00 AM PT`,
    };
  } else {
    return {
      isOnline: false,
      statusMessage: `Away · Back ${dayNames[nextOpenDay]} at ${BUSINESS_HOURS.openHour}:00 AM PT`,
      nextOpenTime: `${dayNames[nextOpenDay]} ${BUSINESS_HOURS.openHour}:00 AM PT`,
    };
  }
}
