/**
 * Gmail Sender — Send approved pitches via Gmail API
 *
 * Uses OAuth2 for Gmail access (pete@ones.health).
 * Falls back to SendGrid if Gmail is not configured.
 * All sends require prior human approval (pitch status = 'approved').
 */
import { google } from 'googleapis';
import logger from '../../../infra/logging/logger';
import { agentRepository } from '../agent.repository';
import { getPrAgentConfig } from '../agent-config';
import type { OutreachPitch, OutreachProspect } from '@shared/schema';

// Gmail OAuth setup — credentials stored in app_settings
const GMAIL_CONFIG_KEY = 'gmail_oauth_config';

interface GmailConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

/**
 * Get Gmail OAuth client
 */
async function getGmailClient(): Promise<ReturnType<typeof google.gmail> | null> {
  const config = await agentRepository.getAgentConfig(GMAIL_CONFIG_KEY);
  if (!config || !config.clientId || !config.clientSecret || !config.refreshToken) {
    logger.warn('[gmail] Gmail OAuth not configured — pitches will be queued for manual send');
    return null;
  }

  const { clientId, clientSecret, refreshToken } = config as GmailConfig;
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

  if (!prospect.contactEmail) {
    return { success: false, error: 'No contact email for this prospect' };
  }

  const config = await getPrAgentConfig();
  const gmail = await getGmailClient();

  if (!gmail) {
    return { success: false, error: 'Gmail not configured. Send manually from pete@ones.health' };
  }

  try {
    // Build MIME message
    const fromAddress = config.gmailFrom || 'pete@ones.health';
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

    // Update pitch record
    await agentRepository.updatePitch(pitch.id, {
      status: 'sent',
      sentAt: new Date(),
      sentVia: 'gmail',
      followUpDueAt: new Date(Date.now() + config.followUpDays * 24 * 60 * 60 * 1000),
    });

    logger.info(`[gmail] Sent pitch to ${prospect.contactEmail} (messageId: ${messageId})`);
    return { success: true, messageId };

  } catch (err: any) {
    logger.error(`[gmail] Failed to send to ${prospect.contactEmail}: ${err.message}`);
    return { success: false, error: err.message };
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

    if (prospect.contactMethod === 'form') {
      // Skip form-based prospects — handled by form filler
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
