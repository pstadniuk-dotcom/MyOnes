/**
 * Multi-Channel Outreach — Generate messages for non-email channels
 *
 * Generates channel-appropriate versions of pitches for:
 * - LinkedIn connection requests + messages
 * - Twitter/X DMs
 * - Instagram DMs
 *
 * Messages are drafted only — never sent automatically.
 * Human copies and sends manually via the respective platform.
 */
import OpenAI from 'openai';
import logger from '../../../infra/logging/logger';
import { getFounderProfile } from '../founder-context';
import { getPrAgentConfig } from '../agent-config';
import type { OutreachProspect, OutreachPitch } from '@shared/schema';

export type Channel = 'linkedin' | 'twitter' | 'instagram';

export interface ChannelMessage {
  channel: Channel;
  message: string;
  characterCount: number;
  characterLimit: number;
  withinLimit: boolean;
  connectionNote?: string; // LinkedIn only
}

const CHANNEL_LIMITS: Record<Channel, number> = {
  linkedin: 300, // Connection request note limit
  twitter: 1000, // DM limit
  instagram: 1000, // DM limit
};

/**
 * Generate channel-specific outreach messages from an existing pitch
 */
export async function generateChannelMessages(
  prospect: OutreachProspect,
  pitch: OutreachPitch,
  channels: Channel[] = ['linkedin', 'twitter'],
): Promise<ChannelMessage[]> {
  const config = await getPrAgentConfig();
  const profile = await getFounderProfile();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const messages: ChannelMessage[] = [];

  for (const channel of channels) {
    try {
      const limit = CHANNEL_LIMITS[channel];
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Use mini for short-form content
        messages: [
          {
            role: 'system',
            content: `You are ${profile.name}, ${profile.title} at ${profile.company}. You're reaching out to ${prospect.hostName || prospect.name} via ${channel}.

RULES for ${channel}:
${channel === 'linkedin' ? `- Write a LinkedIn connection request note (max ${limit} chars)
- Be professional but warm
- Mention a specific reason for connecting
- Don't pitch directly in the connection note
- Also write a follow-up message for after they accept (max 500 chars)` : ''}
${channel === 'twitter' ? `- Write a Twitter/X DM (max ${limit} chars)
- Be casual but respectful
- Reference their content if possible
- Keep it brief — one clear ask` : ''}
${channel === 'instagram' ? `- Write an Instagram DM (max ${limit} chars)
- Be friendly and brief
- Reference their content
- Make it feel personal, not spammy` : ''}

PITCH CONTEXT: ${pitch.subject}
PITCH SUMMARY: ${pitch.body.substring(0, 200)}

OUTPUT: JSON with "message" key${channel === 'linkedin' ? ' and "connectionNote" key' : ''}`,
          },
          {
            role: 'user',
            content: `Write a ${channel} outreach message to ${prospect.hostName || prospect.name} from ${prospect.publicationName || prospect.name}.`,
          },
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(content);
      const message = parsed.message || '';

      messages.push({
        channel,
        message,
        characterCount: message.length,
        characterLimit: limit,
        withinLimit: message.length <= limit,
        connectionNote: channel === 'linkedin' ? parsed.connectionNote : undefined,
      });
    } catch (err: any) {
      logger.warn(`[multi-channel] Failed to generate ${channel} message: ${err.message}`);
    }
  }

  return messages;
}
