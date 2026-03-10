/**
 * Pitch Drafter — AI-powered pitch generation engine
 *
 * Takes a prospect + template + founder profile and generates a personalized
 * pitch email. Each pitch is stored as a draft for human review.
 */
import OpenAI from 'openai';
import logger from '../../../infra/logging/logger';
import { agentRepository } from '../agent.repository';
import { getPrAgentConfig } from '../agent-config';
import { getFounderProfile } from '../founder-context';
import { getTemplateForProspect, type PitchTemplate } from '../templates/pitch-templates';
import type { OutreachProspect, InsertOutreachPitch } from '@shared/schema';

export interface DraftPitchResult {
  pitchId: string;
  prospectId: string;
  subject: string;
  body: string;
  templateUsed: string;
  category: 'podcast' | 'press';
}

/**
 * Draft a pitch for a single prospect
 */
export async function draftPitch(
  prospect: OutreachProspect,
  templateOverride?: PitchTemplate,
): Promise<DraftPitchResult> {
  const config = await getPrAgentConfig();
  const profile = await getFounderProfile();
  const template = templateOverride || getTemplateForProspect(prospect.category, prospect.subType);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const contextBlock = `
PROSPECT DETAILS:
- Name: ${prospect.name}
- Category: ${prospect.category}
- Type: ${prospect.subType || 'general'}
- URL: ${prospect.url}
- Host/Editor: ${prospect.hostName || 'Unknown'}
- Publication: ${prospect.publicationName || prospect.name}
- Audience: ${prospect.audienceEstimate || 'Unknown'}
- Topics they cover: ${prospect.topics?.join(', ') || 'health, wellness'}
- Contact method: ${prospect.contactMethod}
- Notes: ${prospect.notes || 'None'}

FOUNDER PROFILE:
- Name: ${profile.name}
- Title: ${profile.title}
- Company: ${profile.company} (${profile.companyUrl})
- Bio: ${profile.bioShort}
- Expertise: ${profile.topicExpertise.join(', ')}
- Talking points: ${profile.talkingPoints.slice(0, 4).join('; ')}
- Unique angles: ${profile.uniqueAngles.slice(0, 3).join('; ')}
- Credentials: ${profile.credentials.join('; ')}
- DO NOT MENTION: ${profile.doNotMention.join('; ')}

SUBJECT LINE OPTIONS (use these as INSPIRATION but create a UNIQUE, ORIGINAL subject line tailored to this specific prospect — do NOT reuse these verbatim):
${template.exampleSubjectLines.map(s => `- ${s}`).join('\n')}
`;

  try {
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: `${template.systemPrompt}

TONE: ${template.toneGuidance}

MAX LENGTH: ${template.maxLength} words for the body.

CRITICAL: The subject line MUST be unique and specific to this prospect. Reference their show/publication name, a recent topic they covered, or a specific angle. NEVER use generic subject lines like "Why Your Multivitamin Is Probably Wrong" — create something fresh that would make THIS specific editor/host open the email.

OUTPUT FORMAT: Return a JSON object with exactly two keys:
{
  "subject": "The email subject line",
  "body": "The email body text (plain text, no HTML)"
}`,
        },
        {
          role: 'user',
          content: `Draft a ${template.name.toLowerCase()} for this prospect:\n${contextBlock}`,
        },
      ],
      temperature: config.temperature,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);

    const subject = parsed.subject || `${prospect.name} — ${template.name}`;
    const body = parsed.body || '';

    // Save as draft
    const pitch = await agentRepository.createPitch({
      prospectId: prospect.id,
      category: prospect.category,
      pitchType: 'initial',
      templateUsed: template.id,
      subject,
      body,
      status: 'pending_review',
    });

    // Update prospect status
    await agentRepository.updateProspectStatus(prospect.id, 'pitched');

    logger.info(`[draft-pitch] Drafted pitch for "${prospect.name}" (template: ${template.id})`);

    return {
      pitchId: pitch.id,
      prospectId: prospect.id,
      subject,
      body,
      templateUsed: template.id,
      category: prospect.category,
    };
  } catch (err: any) {
    logger.error(`[draft-pitch] Failed for "${prospect.name}": ${err.message}`);
    throw err;
  }
}

/**
 * Draft a follow-up pitch for a previously sent pitch
 */
export async function draftFollowUp(
  originalPitch: { id: string; prospectId: string; subject: string; body: string; category: 'podcast' | 'press'; pitchType: string },
  prospect: OutreachProspect,
): Promise<DraftPitchResult> {
  const config = await getPrAgentConfig();
  const profile = await getFounderProfile();

  // Determine follow-up number
  const followUpNum = originalPitch.pitchType === 'initial' ? 1 :
    originalPitch.pitchType === 'follow_up_1' ? 2 : 3;

  if (followUpNum > config.maxFollowUps) {
    throw new Error(`Max follow-ups (${config.maxFollowUps}) reached for prospect ${prospect.id}`);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: `You are writing follow-up #${followUpNum} to a pitch that hasn't received a response.

RULES:
- NEVER be passive-aggressive ("just checking in", "making sure you saw my email")
- Add genuine new value — a new reason to reply
- Keep under 100 words
- Reference the original pitch briefly
- Sound like a real person, not automation

ORIGINAL PITCH SUBJECT: ${originalPitch.subject}
ORIGINAL PITCH BODY (first 200 chars): ${originalPitch.body.substring(0, 200)}

PROSPECT: ${prospect.name} (${prospect.category})
HOST: ${prospect.hostName || 'Unknown'}

OUTPUT FORMAT: JSON with "subject" and "body" keys.`,
        },
        {
          role: 'user',
          content: `Write a brief, high-value follow-up email. Add something new — a stat, a timely angle, or a simplified ask.`,
        },
      ],
      temperature: config.temperature,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);

    const subject = parsed.subject || `Re: ${originalPitch.subject}`;
    const body = parsed.body || '';

    const pitch = await agentRepository.createPitch({
      prospectId: prospect.id,
      category: prospect.category,
      pitchType: `follow_up_${followUpNum}`,
      templateUsed: 'follow_up',
      subject,
      body,
      status: 'pending_review',
    });

    logger.info(`[draft-pitch] Drafted follow-up #${followUpNum} for "${prospect.name}"`);

    return {
      pitchId: pitch.id,
      prospectId: prospect.id,
      subject,
      body,
      templateUsed: 'follow_up',
      category: prospect.category,
    };
  } catch (err: any) {
    logger.error(`[draft-pitch] Follow-up failed for "${prospect.name}": ${err.message}`);
    throw err;
  }
}

/**
 * Batch draft pitches for uncontacted prospects
 */
export async function batchDraftPitches(options: {
  category?: 'podcast' | 'press';
  maxPitches?: number;
} = {}): Promise<{
  runId: string;
  pitched: DraftPitchResult[];
  errors: string[];
}> {
  const config = await getPrAgentConfig();
  const maxPitches = options.maxPitches || config.maxPitchesPerRun;

  const runId = await agentRepository.createRun({
    agentName: 'pr_pitch_batch',
    status: 'running',
  });

  // Get uncontacted prospects with good scores
  const { prospects } = await agentRepository.listProspects({
    category: options.category,
    status: 'new',
    minScore: config.minRelevanceScore,
    limit: maxPitches,
  });

  const pitched: DraftPitchResult[] = [];
  const errors: string[] = [];

  for (const prospect of prospects) {
    try {
      const result = await draftPitch(prospect);
      pitched.push(result);
    } catch (err: any) {
      errors.push(`${prospect.name}: ${err.message}`);
    }

    // Brief pause between API calls
    await new Promise(r => setTimeout(r, 1000));
  }

  await agentRepository.updateRun(runId, {
    status: 'completed',
    completedAt: new Date(),
    pitchesDrafted: pitched.length,
    runLog: [
      {
        timestamp: new Date().toISOString(),
        action: 'batch_complete',
        result: `Drafted ${pitched.length} pitches, ${errors.length} errors`,
      },
    ],
  });

  return { runId, pitched, errors };
}

/**
 * AI Rewrite — takes existing pitch + user instructions and rewrites it
 */
export async function rewritePitch(
  pitchId: string,
  instructions: string,
): Promise<{ subject: string; body: string }> {
  const config = await getPrAgentConfig();
  const pitch = await agentRepository.getPitchById(pitchId);
  if (!pitch) throw new Error('Pitch not found');

  const prospect = await agentRepository.getProspectById(pitch.prospectId);
  if (!prospect) throw new Error('Prospect not found');

  const profile = await getFounderProfile();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: config.model,
    messages: [
      {
        role: 'system',
        content: `You are a PR pitch editor for a health-tech startup. You will receive an existing pitch email and instructions from the founder on what to change. Rewrite the pitch according to their instructions while keeping the core message and personalization intact.

PROSPECT: ${prospect.name} (${prospect.category})
FOUNDER: ${profile.name}, ${profile.title} at ${profile.company}

OUTPUT FORMAT: Return a JSON object:
{
  "subject": "The updated subject line",
  "body": "The updated email body (plain text)"
}`,
      },
      {
        role: 'user',
        content: `CURRENT SUBJECT: ${pitch.subject}\n\nCURRENT BODY:\n${pitch.body}\n\nINSTRUCTIONS: ${instructions}`,
      },
    ],
    temperature: config.temperature,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content || '{}';
  const parsed = JSON.parse(content);

  const newSubject = parsed.subject || pitch.subject;
  const newBody = parsed.body || pitch.body;

  // Update the pitch in the database
  await agentRepository.updatePitch(pitchId, {
    subject: newSubject,
    body: newBody,
  });

  logger.info(`[draft-pitch] AI rewrote pitch ${pitchId} for "${prospect.name}"`);

  return { subject: newSubject, body: newBody };
}
