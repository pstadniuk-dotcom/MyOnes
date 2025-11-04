import twilio from 'twilio';

// Initialize Twilio with credentials from environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: ReturnType<typeof twilio> | null = null;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

interface SmsNotification {
  to: string;
  message: string;
  type: 'order_update' | 'formula_update' | 'consultation_reminder' | 'system';
}

function formatSmsMessage(notification: SmsNotification): string {
  const { message, type } = notification;
  
  // Add emoji prefix based on notification type
  const prefixes: Record<typeof type, string> = {
    order_update: '📦',
    formula_update: '⚗️',
    consultation_reminder: '💬',
    system: '🔔'
  };
  
  const prefix = prefixes[type];
  
  // Format: "📦 ONES: Your order has shipped! Track it here: https://..."
  return `${prefix} ONES: ${message}`;
}

export async function sendNotificationSms(notification: SmsNotification): Promise<boolean> {
  try {
    if (!twilioClient || !TWILIO_PHONE_NUMBER) {
      console.error('❌ Twilio not configured: Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER environment variables');
      return false;
    }
    
    const formattedMessage = formatSmsMessage(notification);
    
    const result = await twilioClient.messages.create({
      body: formattedMessage,
      from: TWILIO_PHONE_NUMBER,
      to: notification.to
    });

    console.log(`✅ SMS sent successfully to ${notification.to} - SID: ${result.sid}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending SMS via Twilio:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return false;
  }
}

export function getNotificationSmsContent(
  type: 'order_update' | 'formula_update' | 'consultation_reminder' | 'system',
  message: string
): Omit<SmsNotification, 'to'> {
  return {
    message,
    type
  };
}
