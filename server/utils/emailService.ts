import sgMail from '@sendgrid/mail';
import { getFrontendUrl } from './urlHelper';
import { logger } from '../infra/logging/logger';

/** Escape HTML special characters to prevent injection in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Validate that a URL is http(s) to prevent javascript: or data: URI injection */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return url;
    }
    return '';
  } catch {
    return '';
  }
}

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
  const { title: rawTitle, content: rawContent, actionUrl: rawActionUrl, actionText: rawActionText, type } = notification;

  // Escape user-provided values to prevent HTML/script injection
  const title = escapeHtml(rawTitle);
  // Content is server-generated HTML from trusted callers — do not escape.
  // Defensive: reverse any accidental double-escaping (e.g. from a previous code path).
  const content = rawContent.includes('&lt;')
    ? rawContent.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    : rawContent;
  const actionText = rawActionText ? escapeHtml(rawActionText) : undefined;
  const actionUrl = rawActionUrl ? sanitizeUrl(rawActionUrl) : undefined;

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
              <div style="margin:0 auto 10px;text-align:center;">
                <img src="${getFrontendUrl()}/Ones%20Logo%20Green.svg" alt="Ones" width="48" height="48" style="display:inline-block;width:48px;height:48px;" />
              </div>
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

// ── Internal admin notifications ──────────────────────────────────────

/**
 * Return the list of admin email addresses that should receive internal
 * operational notifications (new orders, etc.). Configurable via the
 * ADMIN_ORDER_NOTIFICATION_EMAILS env var (comma-separated).
 * Defaults to pete@ones.health.
 */
function getAdminOrderNotificationRecipients(): string[] {
  const raw = process.env.ADMIN_ORDER_NOTIFICATION_EMAILS?.trim();
  if (!raw) return ['pete@ones.health'];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
}

export interface AdminOrderNotificationInput {
  orderId: string;
  orderSource: 'checkout' | 'autoship';
  amountCents: number;
  currency?: string;
  manufacturerCostCents?: number | null;
  transactionId?: string | null;
  customer: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  formula?: {
    id?: string | null;
    name?: string | null;
    version?: number | null;
  } | null;
  shippingAddress?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  membershipTier?: string | null;
}

/**
 * Send an internal notification to platform admins whenever a new order is
 * created and payment has been captured. Non-fatal — errors are logged but
 * never thrown back to the caller.
 */
export async function sendAdminOrderNotification(
  input: AdminOrderNotificationInput,
): Promise<void> {
  const recipients = getAdminOrderNotificationRecipients();
  if (recipients.length === 0) return;

  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
    logger.warn('Admin order notification skipped: SendGrid not configured');
    return;
  }

  const currency = (input.currency || 'USD').toUpperCase();
  const amount = `$${(input.amountCents / 100).toFixed(2)}`;
  const mfrCost =
    typeof input.manufacturerCostCents === 'number'
      ? `$${(input.manufacturerCostCents / 100).toFixed(2)}`
      : null;
  const marginCents =
    typeof input.manufacturerCostCents === 'number'
      ? input.amountCents - input.manufacturerCostCents
      : null;
  const margin = marginCents !== null ? `$${(marginCents / 100).toFixed(2)}` : null;

  const customerName = escapeHtml(input.customer.name || 'Unknown');
  const customerEmail = input.customer.email ? escapeHtml(input.customer.email) : '—';
  const customerPhone = input.customer.phone ? escapeHtml(input.customer.phone) : '—';
  const formulaName = input.formula?.name
    ? escapeHtml(input.formula.name)
    : input.formula?.version
    ? `Formula v${input.formula.version}`
    : '—';
  const sourceLabel =
    input.orderSource === 'autoship' ? 'Auto-ship renewal' : 'New checkout';
  const membership = input.membershipTier ? escapeHtml(input.membershipTier) : null;

  const addr = input.shippingAddress;
  const shipHtml = addr && addr.line1
    ? [
        escapeHtml(addr.line1),
        addr.line2 ? escapeHtml(addr.line2) : null,
        [addr.city, addr.state, addr.postalCode].filter(Boolean).map((s) => escapeHtml(String(s))).join(', '),
        addr.country ? escapeHtml(addr.country) : null,
      ]
        .filter(Boolean)
        .join('<br>')
    : '—';

  const adminOrderUrl = `${getFrontendUrl()}/admin/orders`;
  const adminUserUrl = `${getFrontendUrl()}/admin/users/${input.customer.id}`;

  const rows: Array<[string, string]> = [
    ['Source', sourceLabel],
    ['Order ID', escapeHtml(input.orderId)],
    ['Amount', `<strong>${amount} ${currency}</strong>`],
  ];
  if (mfrCost) rows.push(['Manufacturer cost', mfrCost]);
  if (margin) rows.push(['Gross margin', margin]);
  if (input.transactionId) rows.push(['Transaction', escapeHtml(input.transactionId)]);
  rows.push(['Customer', `${customerName} (<a href="${adminUserUrl}">view profile</a>)`]);
  rows.push(['Email', customerEmail]);
  rows.push(['Phone', customerPhone]);
  rows.push(['Formula', formulaName]);
  if (membership) rows.push(['Membership', membership]);
  rows.push(['Ship to', shipHtml]);

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#6b7280;white-space:nowrap;vertical-align:top;">${label}</td>
          <td style="padding:6px 0;color:#111827;vertical-align:top;">${value}</td>
        </tr>`,
        )
        .join('')}
    </table>
  `;

  const content = `
    <p>A new order just processed on ones.health.</p>
    ${tableHtml}
  `;

  const subject = `[ONES] ${sourceLabel} — ${amount} — ${input.customer.name || input.customer.email || 'customer'}`;

  // Send to each admin recipient individually so SendGrid reports per-recipient.
  // These are fire-and-forget; we never let email failures block order completion.
  await Promise.all(
    recipients.map(async (to) => {
      try {
        const msg = {
          to,
          from: { email: SENDGRID_FROM_EMAIL!, name: SENDGRID_FROM_NAME },
          subject,
          html: getEmailTemplate({
            to,
            subject,
            title: sourceLabel,
            content,
            actionUrl: adminOrderUrl,
            actionText: 'Open Admin Orders',
            type: 'order_update',
          }),
        };
        const [response] = await sgMail.send(msg);
        logger.info('Admin order notification sent', {
          to,
          orderId: input.orderId,
          statusCode: response.statusCode,
        });
      } catch (error: any) {
        logger.error('Failed to send admin order notification', {
          to,
          orderId: input.orderId,
          error: error?.message || error,
          responseBody: error?.response?.body,
        });
      }
    }),
  );
}
