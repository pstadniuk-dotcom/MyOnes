/**
 * Response Detector — Check Gmail inbox for replies to sent pitches
 *
 * Periodically checks the Gmail inbox for replies to outreach pitches,
 * classifies responses, and updates prospect status automatically.
 * Notifies admin of positive responses.
 */
import { google } from 'googleapis';
import OpenAI from 'openai';
import logger from '../../../infra/logging/logger';
import { agentRepository } from '../agent.repository';
import { getPrAgentConfig } from '../agent-config';
import { logResponseDetected } from '../../crm/crm-bridge';

interface DetectedResponse {
  pitchId: string;
  prospectId: string;
  prospectName: string;
  classification: 'interested' | 'declined' | 'ask_later' | 'forwarded' | 'auto_reply' | 'unknown';
  snippet: string;
  receivedAt: Date;
  gmailMessageId: string;
}

const GMAIL_CONFIG_KEY = 'gmail_oauth_config';

/**
 * Check Gmail inbox for replies to sent pitches
 */
export async function detectResponses(): Promise<{
  checked: number;
  responsesFound: number;
  responses: DetectedResponse[];
}> {
  const gmailConfig = await agentRepository.getAgentConfig(GMAIL_CONFIG_KEY);
  if (!gmailConfig?.clientId || !gmailConfig?.clientSecret || !gmailConfig?.refreshToken) {
    logger.info('[response-detector] Gmail not configured, skipping response check');
    return { checked: 0, responsesFound: 0, responses: [] };
  }

  const oauth2Client = new google.auth.OAuth2(gmailConfig.clientId, gmailConfig.clientSecret);
  oauth2Client.setCredentials({ refresh_token: gmailConfig.refreshToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Get sent pitches that haven't received a response
  const { pitches } = await agentRepository.listPitches({ status: 'sent' });
  const unrespondedPitches = pitches.filter(p => !p.responseReceived);

  if (unrespondedPitches.length === 0) {
    return { checked: 0, responsesFound: 0, responses: [] };
  }

  const responses: DetectedResponse[] = [];

  for (const pitch of unrespondedPitches) {
    try {
      const prospect = await agentRepository.getProspectById(pitch.prospectId);
      if (!prospect?.contactEmail) continue;

      // Search for replies from this contact
      const query = `from:${prospect.contactEmail} subject:"${pitch.subject.replace(/"/g, '')}" newer_than:30d`;
      const searchResult = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 5,
      });

      if (!searchResult.data.messages?.length) continue;

      // Get the first reply
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: searchResult.data.messages[0].id!,
        format: 'minimal',
      });

      const snippet = message.data.snippet || '';
      const receivedAt = new Date(parseInt(message.data.internalDate || '0'));

      // Classify the response using AI
      const classification = await classifyResponse(snippet, prospect.name);

      responses.push({
        pitchId: pitch.id,
        prospectId: prospect.id,
        prospectName: prospect.name,
        classification,
        snippet: snippet.substring(0, 300),
        receivedAt,
        gmailMessageId: message.data.id || '',
      });

      // Update pitch and prospect records
      await agentRepository.updatePitch(pitch.id, {
        responseReceived: true,
        responseAt: receivedAt,
        responseSummary: `[${classification}] ${snippet.substring(0, 200)}`,
      });

      if (classification === 'interested') {
        await agentRepository.updateProspectStatus(prospect.id, 'responded');
      } else if (classification === 'declined') {
        await agentRepository.updateProspectStatus(prospect.id, 'rejected');
      }

      // Log to CRM timeline
      logResponseDetected(prospect, classification, snippet.substring(0, 300)).catch(() => {});

      logger.info(`[response-detector] Response from "${prospect.name}": ${classification}`);
    } catch (err: any) {
      logger.warn(`[response-detector] Failed to check pitch ${pitch.id}: ${err.message}`);
    }

    // Rate limit Gmail API calls
    await new Promise(r => setTimeout(r, 500));
  }

  return {
    checked: unrespondedPitches.length,
    responsesFound: responses.length,
    responses,
  };
}

/**
 * Classify a response using AI
 */
async function classifyResponse(snippet: string, prospectName: string): Promise<DetectedResponse['classification']> {
  // Quick heuristics before AI
  const lower = snippet.toLowerCase();
  if (lower.includes('out of office') || lower.includes('auto-reply') || lower.includes('automatic reply')) {
    return 'auto_reply';
  }
  if (lower.includes('unsubscribe') || lower.includes('remove me')) {
    return 'declined';
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const config = await getPrAgentConfig();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Classify this email response to a PR pitch. Return ONLY one of: "interested", "declined", "ask_later", "forwarded", "auto_reply", "unknown".

- interested: They want to talk, schedule, or learn more
- declined: They said no, not interested, or not a fit
- ask_later: They asked to follow up later or said bad timing
- forwarded: They forwarded to someone else or said to contact another person
- auto_reply: Automated out-of-office or auto-response
- unknown: Can't determine intent`,
        },
        {
          role: 'user',
          content: `Response from ${prospectName}:\n"${snippet}"`,
        },
      ],
      temperature: 0.1,
      max_tokens: 20,
    });

    const result = response.choices[0].message.content?.trim().toLowerCase().replace(/['"]/g, '') || 'unknown';
    const valid = ['interested', 'declined', 'ask_later', 'forwarded', 'auto_reply', 'unknown'] as const;
    return valid.includes(result as any) ? result as DetectedResponse['classification'] : 'unknown';
  } catch {
    return 'unknown';
  }
}
