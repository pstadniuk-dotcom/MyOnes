import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key from environment variables
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;

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
  
  const typeColors: Record<typeof type, { primary: string; secondary: string; icon: string }> = {
    order_update: { primary: '168 76% 42%', secondary: '168 76% 95%', icon: '📦' },
    formula_update: { primary: '262 83% 58%', secondary: '262 83% 95%', icon: '⚗️' },
    consultation_reminder: { primary: '221 83% 53%', secondary: '221 83% 95%', icon: '💬' },
    system: { primary: '221 83% 53%', secondary: '221 83% 95%', icon: '🔔' }
  };

  const colors = typeColors[type];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, hsl(${colors.primary}) 0%, hsl(${colors.primary.replace('42%', '35%')}) 100%);
      color: #ffffff;
      padding: 40px 30px;
      text-align: center;
    }
    .header .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .content p {
      color: #374151;
      font-size: 16px;
      margin: 0 0 20px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: hsl(${colors.primary});
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      transition: background-color 0.2s;
    }
    .cta-button:hover {
      background-color: hsl(${colors.primary.replace('42%', '38%')});
    }
    .footer {
      background-color: hsl(${colors.secondary});
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 5px 0;
      color: #6b7280;
      font-size: 14px;
    }
    .footer a {
      color: hsl(${colors.primary});
      text-decoration: none;
    }
    .brand {
      font-weight: 700;
      font-size: 24px;
      letter-spacing: 0.05em;
      color: #ffffff;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="icon">${colors.icon}</div>
      <h1>${title}</h1>
      <div class="brand">ONES</div>
    </div>
    <div class="content">
      <p>${content}</p>
      ${actionUrl && actionText ? `
        <div style="text-align: center;">
          <a href="${actionUrl}" class="cta-button">${actionText}</a>
        </div>
      ` : ''}
    </div>
    <div class="footer">
      <p><strong>ONES - Personalized AI Supplements</strong></p>
      <p>Your custom formula, delivered to your door.</p>
      <p style="margin-top: 20px;">
        <a href="https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/dashboard/settings">Manage Notification Preferences</a>
      </p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
        This is a transactional email related to your ONES account.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendNotificationEmail(notification: EmailNotification): Promise<boolean> {
  try {
    if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
      console.error('❌ SendGrid not configured: Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL environment variables');
      return false;
    }
    
    const msg = {
      to: notification.to,
      from: SENDGRID_FROM_EMAIL,
      subject: notification.subject,
      html: getEmailTemplate(notification),
    };

    await sgMail.send(msg);
    console.log(`✅ Email sent successfully to ${notification.to} - ${notification.subject}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email via SendGrid:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
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
