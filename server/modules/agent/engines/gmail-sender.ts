/**
 * Gmail Sender — Send approved pitches via Gmail API
 *
 * Uses OAuth2 for Gmail access (pete@ones.health).
 * Falls back to SendGrid if Gmail is not configured.
 * All sends require prior human approval (pitch status = 'approved').
 */
import { google } from 'googleapis';
import sgMail from '@sendgrid/mail';
import logger from '../../../infra/logging/logger';
import { agentRepository } from '../agent.repository';
import { getPrAgentConfig } from '../agent-config';
import type { OutreachPitch, OutreachProspect } from '@shared/schema';
import { logPitchActivity } from '../../crm/crm-bridge';

// Gmail OAuth setup — credentials stored in app_settings
const GMAIL_CONFIG_KEY = 'gmail_oauth_config';

interface GmailConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

/**
 * Get Gmail OAuth client (decrypts credentials if encrypted)
 */
async function getGmailClient(): Promise<ReturnType<typeof google.gmail> | null> {
  const config = await agentRepository.getAgentConfig(GMAIL_CONFIG_KEY);

  let clientId = config?.clientId || '';
  let clientSecret = config?.clientSecret || '';
  let refreshToken = config?.refreshToken || '';

  // Decrypt credentials if they were encrypted at rest
  if (config?.encrypted && clientId && clientSecret && refreshToken) {
    try {
      const { decryptField } = await import('../../../infra/security/fieldEncryption');
      clientId = decryptField(clientId);
      clientSecret = decryptField(clientSecret);
      refreshToken = decryptField(refreshToken);
    } catch (err: any) {
      logger.error('[gmail] Failed to decrypt OAuth credentials', { error: err.message });
      return null;
    }
  }

  // Fallback to environment variables if DB config is missing
  if (!clientId || !clientSecret || !refreshToken) {
    clientId = process.env.GMAIL_CLIENT_ID || '';
    clientSecret = process.env.GMAIL_CLIENT_SECRET || '';
    refreshToken = process.env.GMAIL_REFRESH_TOKEN || '';
  }

  if (!clientId || !clientSecret || !refreshToken) {
    logger.warn('[gmail] Gmail OAuth not configured — pitches will be queued for manual send');
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Send a single pitch email via Gmail
 */
export async function sendPitchEmail(
  pitch: OutreachPitch,
  prospect: OutreachProspect,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Safety: only send approved pitches
  if (pitch.status !== 'approved') {
    return { success: false, error: `Pitch status is "${pitch.status}", must be "approved"` };
  }

  if (!prospect.contactEmail || prospect.contactEmail === 'null') {
    return { success: false, error: `No contact email for prospect "${prospect.name}". Add an email address before sending.` };
  }

  const config = await getPrAgentConfig();
  const fromAddress = config.gmailFrom || 'pete@ones.health';

  // Try Gmail first
  const gmail = await getGmailClient();
  if (gmail) {
    try {
      const raw = buildMimeMessage({
        from: fromAddress,
        to: prospect.contactEmail,
        subject: pitch.subject,
        body: pitch.body,
      });

      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });

      const messageId = result.data.id || '';
      await agentRepository.updatePitch(pitch.id, {
        status: 'sent',
        sentAt: new Date(),
        sentVia: 'gmail',
        followUpDueAt: new Date(Date.now() + config.followUpDays * 24 * 60 * 60 * 1000),
      });

      logger.info(`[gmail] Sent pitch to ${prospect.contactEmail} (messageId: ${messageId})`);

      // Log to CRM timeline
      logPitchActivity(prospect, { ...pitch, sentVia: 'gmail' } as any, pitch.pitchType?.startsWith('follow_up') ? 'follow_up_sent' : 'pitch_sent').catch(() => {});

      return { success: true, messageId };
    } catch (err: any) {
      logger.warn(`[gmail] Gmail send failed for ${prospect.contactEmail}: ${err.message}. Trying SendGrid fallback...`);
    }
  }

  // Fallback to SendGrid
  const sendgridKey = process.env.SENDGRID_API_KEY?.trim();
  const sendgridFrom = process.env.SENDGRID_FROM_EMAIL?.trim() || fromAddress;
  if (!sendgridKey) {
    return { success: false, error: 'Gmail OAuth expired and SendGrid not configured. Update your Gmail refresh token or set SENDGRID_API_KEY.' };
  }

  try {
    sgMail.setApiKey(sendgridKey);
    const sendgridName = process.env.SENDGRID_FROM_NAME?.trim() || 'Pete';
    const [response] = await sgMail.send({
      to: prospect.contactEmail,
      from: { email: sendgridFrom, name: sendgridName },
      replyTo: { email: 'pete@ones.health', name: 'Pete' },
      subject: pitch.subject,
      text: pitch.body,
    });

    await agentRepository.updatePitch(pitch.id, {
      status: 'sent',
      sentAt: new Date(),
      sentVia: 'sendgrid',
      followUpDueAt: new Date(Date.now() + config.followUpDays * 24 * 60 * 60 * 1000),
    });

    logger.info(`[sendgrid-fallback] Sent pitch to ${prospect.contactEmail} (status: ${response.statusCode})`);

    // Log to CRM timeline
    logPitchActivity(prospect, { ...pitch, sentVia: 'sendgrid' } as any, pitch.pitchType?.startsWith('follow_up') ? 'follow_up_sent' : 'pitch_sent').catch(() => {});

    return { success: true, messageId: `sg-${Date.now()}` };
  } catch (sgErr: any) {
    logger.error(`[sendgrid-fallback] Also failed for ${prospect.contactEmail}: ${sgErr.message}`);
    return { success: false, error: `Gmail: invalid_grant (token expired). SendGrid fallback: ${sgErr.message}` };
  }
}

/**
 * Build a base64url-encoded MIME message
 */
function buildMimeMessage(opts: {
  from: string;
  to: string;
  subject: string;
  body: string;
}): string {
  const { from, to, subject, body } = opts;
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send all approved pitches that haven't been sent yet
 */
export async function sendApprovedPitches(): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const { pitches } = await agentRepository.listPitches({ status: 'approved' });
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const pitch of pitches) {
    const prospect = await agentRepository.getProspectById(pitch.prospectId);
    if (!prospect) {
      errors.push(`Prospect not found for pitch ${pitch.id}`);
      failed++;
      continue;
    }

    if (!prospect.contactEmail) {
      logger.info(`[gmail-sender] Skipping "${prospect.name}" — no email address`);
      failed++;
      errors.push(`${prospect.name}: no email address`);
      continue;
    }

    const result = await sendPitchEmail(pitch, prospect);
    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push(`${prospect.name}: ${result.error}`);
    }

    // Pause between sends to avoid rate limits
    await new Promise(r => setTimeout(r, 2000));
  }

  return { sent, failed, errors };
}
