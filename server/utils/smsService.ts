import twilio from 'twilio';
import { logger } from '../infra/logging/logger';

type TwilioConfig = {
  accountSid: string | undefined;
  authToken: string | undefined;
  fromNumber: string | undefined;
  apiKeySid: string | undefined;
  apiKeySecret: string | undefined;
};

let twilioClient: ReturnType<typeof twilio> | null = null;
let twilioClientKey: string | null = null;

function getTwilioConfig(): TwilioConfig {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM,
    apiKeySid: process.env.TWILIO_API_KEY_SID,
    apiKeySecret: process.env.TWILIO_API_KEY_SECRET,
  };
}

function getTwilioClient(): ReturnType<typeof twilio> | null {
  const { accountSid, authToken, apiKeySid, apiKeySecret } = getTwilioConfig();
  if (!accountSid) {
    return null;
  }

  const useApiKeyAuth = Boolean(apiKeySid && apiKeySecret);
  const useTokenAuth = Boolean(authToken);

  if (!useApiKeyAuth && !useTokenAuth) {
    return null;
  }

  const key = useApiKeyAuth
    ? `${accountSid}:${apiKeySid}:${apiKeySecret}`
    : `${accountSid}:${authToken}`;

  if (!twilioClient || twilioClientKey !== key) {
    twilioClient = useApiKeyAuth
      ? twilio(apiKeySid!, apiKeySecret!, { accountSid })
      : twilio(accountSid, authToken!);
    twilioClientKey = key;
  }

  return twilioClient;
}

function normalizePhoneNumber(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }
  return `+${trimmed.replace(/\D/g, '')}`;
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
    const { fromNumber } = getTwilioConfig();
    const client = getTwilioClient();

    if (!client || !fromNumber) {
      logger.warn('Twilio not configured: missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER/TWILIO_FROM');
      return false;
    }
    
    const formattedMessage = formatSmsMessage(notification);
    const to = normalizePhoneNumber(notification.to);
    
    const result = await client.messages.create({
      body: formattedMessage,
      from: fromNumber,
      to,
    });

    logger.info('SMS sent successfully', { to, sid: result.sid, type: notification.type });
    return true;
  } catch (error) {
    logger.error('Error sending SMS via Twilio', { error });
    return false;
  }
}

export async function sendRawSms(to: string, body: string): Promise<boolean> {
  try {
    const { fromNumber } = getTwilioConfig();
    const client = getTwilioClient();

    if (!client || !fromNumber) {
      return false;
    }
    await client.messages.create({
      body,
      from: fromNumber,
      to: normalizePhoneNumber(to),
    });
    return true;
  } catch (error) {
    logger.error('Error sending raw SMS', { error });
    return false;
  }
}

