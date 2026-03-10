import type { ReviewSchedule } from "@shared/schema";

/**
 * Generates an .ics (iCalendar) file for review schedule events
 * Compatible with Google Calendar, Apple Calendar, Outlook, and others
 */
export function generateReviewCalendarEvent(schedule: ReviewSchedule, userName: string): string {
  const now = new Date();
  const reviewDate = new Date(schedule.nextReviewDate);
  
  // Calculate frequency for RRULE
  // bimonthly = "every order" (~8 weeks ≈ 2 months)
  // quarterly = "every other order" (~16 weeks ≈ 4 months)
  const frequencyMap = {
    monthly: { freq: 'MONTHLY', interval: 1 },
    bimonthly: { freq: 'MONTHLY', interval: 2 },
    quarterly: { freq: 'MONTHLY', interval: 4 },
  };
  
  const { freq, interval } = frequencyMap[schedule.frequency];
  
  // Format dates for .ics (YYYYMMDDTHHMMSSZ)
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  // Create unique ID for the event
  const uid = `review-${schedule.id}@ones.health`;
  
  // Set review duration (1 hour)
  const endDate = new Date(reviewDate);
  endDate.setHours(endDate.getHours() + 1);
  
  // Prepare reminder times (1 day and 3 days before)
  const reminder1Day = formatDuration(1);
  const reminder3Days = formatDuration(3);
  
  // Build .ics content
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ones//Formula Review//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Ones Formula Reviews',
    'X-WR-TIMEZONE:America/New_York',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDate(now)}`,
    `DTSTART:${formatDate(reviewDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `RRULE:FREQ=${freq};INTERVAL=${interval}`,
    'SUMMARY:Ones Formula Review',
    'DESCRIPTION:Time to review your personalized supplement formula!\\n\\n' +
      'During this review:\\n' +
      '- Share any health changes or new symptoms\\n' +
      '- Update recent lab results if available\\n' +
      '- Discuss how you\'re feeling on your current formula\\n' +
      '- Make any necessary adjustments\\n\\n' +
      'Join your review session at: https://ones.health/chat?review=true',
    'LOCATION:https://ones.health/chat?review=true',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    `ORGANIZER:mailto:support@ones.health`,
    `ATTENDEE;CN=${userName}:mailto:support@ones.health`,
    // Add reminders
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your Ones formula review is tomorrow!',
    `TRIGGER:-P${reminder1Day}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your Ones formula review is in 3 days',
    `TRIGGER:-P${reminder3Days}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  
  return icsLines.join('\r\n');
}

/**
 * Format duration for TRIGGER in .ics format
 */
function formatDuration(days: number): string {
  return `${days}D`;
}

/**
 * Generate a downloadable .ics file response
 */
export function createIcsDownloadResponse(icsContent: string, filename: string = 'ones-review.ics'): {
  content: string;
  headers: {
    'Content-Type': string;
    'Content-Disposition': string;
  };
} {
  return {
    content: icsContent,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  };
}
