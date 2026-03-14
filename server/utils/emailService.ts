import sgMail from '@sendgrid/mail';
import { getFrontendUrl } from './urlHelper';
import { logger } from '../infra/logging/logger';

// Initialize SendGrid with API key from environment variables
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY?.trim();
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL?.trim();
const SENDGRID_FROM_NAME = (process.env.SENDGRID_FROM_NAME || 'Ones').trim();

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

interface EmailNotification {
  to: string;
  subject: string;
  title: string;
  content: string;
  actionUrl?: string;
  actionText?: string;
  type: 'order_update' | 'formula_update' | 'consultation_reminder' | 'system';
}

function getEmailTemplate(notification: EmailNotification): string {
  const { title, content, actionUrl, actionText, type } = notification;

  const typeConfig: Record<typeof type, { accent: string; icon: string }> = {
    order_update:          { accent: '#004700', icon: '📦' },
    formula_update:        { accent: '#004700', icon: '⚗️' },
    consultation_reminder: { accent: '#004700', icon: '💬' },
    system:                { accent: '#004700', icon: '🔔' },
  };

  const { accent, icon } = typeConfig[type];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:${accent};padding:32px 40px 28px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">${title}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <div style="color:#374151;font-size:15px;line-height:1.7;">
                ${content}
              </div>
              ${actionUrl && actionText ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td align="center">
                    <a href="${actionUrl}"
                       style="display:inline-block;background-color:${accent};color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.01em;">
                      ${actionText}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:16px;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">Or copy this link into your browser:<br>
                      <a href="${actionUrl}" style="color:#6b7280;word-break:break-all;">${actionUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <img src="${getFrontendUrl()}/ones-logo-light.svg"
                   alt="Ones"
                   width="140"
                   style="display:block;margin:0 auto 10px;height:auto;"
              />
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#111827;">Personalized AI Supplements</p>
              <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">Your custom formula, delivered to your door.</p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                <a href="${getFrontendUrl()}/dashboard/settings?tab=notifications" style="color:#9ca3af;">Manage preferences</a>
                &nbsp;·&nbsp;
                <a href="${getFrontendUrl()}" style="color:#9ca3af;">ones.health</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function sendNotificationEmail(notification: EmailNotification): Promise<boolean> {
  try {
    if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
      logger.error('SendGrid not configured: Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL environment variables');
      return false;
    }

    const msg = {
      to: notification.to,
      from: { email: SENDGRID_FROM_EMAIL!, name: SENDGRID_FROM_NAME },
      subject: notification.subject,
      html: getEmailTemplate(notification),
    };

    logger.info('Attempting SendGrid send', { to: notification.to, from: SENDGRID_FROM_EMAIL });
    const [response] = await sgMail.send(msg);
    logger.info('Email sent successfully', { to: notification.to, statusCode: response.statusCode });
    return true;
  } catch (error: any) {
    logger.error('Error sending email via SendGrid', {
      error: error?.message || error,
      ...(error?.response && {
        responseStatus: error.response.status,
        responseBody: error.response.body,
      }),
    });
    return false;
  }
}

export function getNotificationEmailContent(
  type: 'order_update' | 'formula_update' | 'consultation_reminder' | 'system',
  title: string,
  content: string,
  metadata?: { actionUrl?: string; actionText?: string }
): Omit<EmailNotification, 'to' | 'subject'> {
  return {
    title,
    content,
    actionUrl: metadata?.actionUrl,
    actionText: metadata?.actionText,
    type
  };
}
