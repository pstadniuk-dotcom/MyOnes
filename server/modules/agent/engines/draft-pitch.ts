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
import { getPitchStatsBlock } from '../tools/platform-stats';
import { scorePitchQuality } from '../tools/pitch-quality';
import { trackTokens, finalizeRunCost } from '../tools/cost-tracker';
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

  // Fetch live platform stats for dynamic social proof
  let platformStatsBlock = '';
  try {
    platformStatsBlock = await getPitchStatsBlock();
  } catch {
    // Platform stats are optional
  }

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

${platformStatsBlock}

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

CRITICAL TONE RULES:
- NEVER use words like "disrupt", "revolutionize", "game-changing", "groundbreaking", "cutting-edge"
- NEVER claim to be "the first", "the best", or "the only"
- NEVER reference market size ("$50B industry") or position yourself as an industry challenger
- NEVER use em dashes (—). Use commas, periods, or start a new sentence instead
- NEVER say "listeners" or "your audience" in the pitch body. Talk about the problem as something real people face, including yourself
- Frame the value proposition personally: "something I struggled with" or "something I dealt with"
- Frame the ask as genuine curiosity: "exploring if there's interest" not demanding coverage
- Be warm and human, not polished and corporate
- It's OK to be brief and understated — less is more
- NEVER use emojis (🎉 🚀 💪 etc.)
- NEVER start with "Hey!" or "Hey there!" — use "Hi [Name]," or just "[Name],"

❌ NEGATIVE EXAMPLE — this is EXACTLY the kind of pitch we do NOT want:
"""
Subject: 🚀 Disrupting the $50B Supplement Industry with AI

Hey! 🎉 Pete here from ONES — we're revolutionizing personalized nutrition with cutting-edge AI technology! We've built the world's first AI health practitioner that creates custom supplement formulas. I'd LOVE to come on your show and share how we're changing the game. Our clinical-grade platform is truly groundbreaking and I think your audience would be blown away! Let me know when works for you!
"""
^ This is terrible because: emojis, "disrupting", "revolutionizing", "cutting-edge", "world's first", "$50B", demands coverage, self-congratulatory, generic, no audience value.

✅ GOOD EXAMPLE TONE:
"""
Subject: Quick thought on a personalized nutrition segment

Hi Sarah,

I caught your recent episode with Dr. Patel on gut health — really appreciated how you broke down the microbiome research for a general audience.

Here's something I struggled with and I think a lot of people deal with: you're either buying 10 different supplement bottles, guessing at what you need, overdosing on some things, underdosing on others, spending a fortune without knowing if any of it is right. Or you go the AG1 or daily multivitamin route, which is convenient but completely generic. Zero customization, just "trust us." Neither option is actually built for your body.

I built Ones to solve both of those problems. Our AI analyzes your blood work, health data, and wearable metrics to design one custom formula from over 150 ingredients at research-backed doses, built specifically for you. And the AI adapts it as your health changes, so it's not a static product.

I'm Pete, the founder. If that sounds like something your audience would dig, I'd love to chat. No pressure either way.

Best,
Pete
"""

The subject line MUST be specific to this prospect. Reference their show/publication or a topic relevant to them. Create something that feels personal, not mass-produced.

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

    // Track token usage for cost monitoring
    if (response.usage) {
      trackTokens(null, config.model, response.usage.prompt_tokens, response.usage.completion_tokens, 'draft_pitch');
    }

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

    // Run pitch quality self-evaluation
    const qualityResult = scorePitchQuality(pitch, prospect);
    if (qualityResult.recommendation === 'redraft') {
      logger.warn(`[draft-pitch] Low quality pitch for "${prospect.name}" (score: ${qualityResult.score}/100) — flagged for redraft`);
    }

    // Update prospect status
    await agentRepository.updateProspectStatus(prospect.id, 'pitched');

    logger.info(`[draft-pitch] Drafted pitch for "${prospect.name}" (template: ${template.id}, quality: ${qualityResult.score}/100)`);

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

  // Filter out prospects with no actionable contact method — 
  // don't waste AI credits drafting pitches we can never send
  const contactableProspects = prospects.filter(p => {
    // No contact method at all
    if (p.contactMethod === 'unknown' && !p.contactEmail && !p.contactFormUrl) {
      logger.info(`[draft-pitch] Skipping "${p.name}" — no email or form (contactMethod: unknown)`);
      return false;
    }
    // Has a "form" but no email and no actual form fields (likely a guidelines page)
    if (p.contactMethod === 'form' && !p.contactEmail && (!p.formFields || p.formFields.length === 0)) {
      logger.info(`[draft-pitch] Skipping "${p.name}" — form URL but no submission fields detected`);
      return false;
    }
    return true;
  });

  if (contactableProspects.length < prospects.length) {
    logger.info(`[draft-pitch] Filtered out ${prospects.length - contactableProspects.length} uncontactable prospects`);
  }

  const pitched: DraftPitchResult[] = [];
  const errors: string[] = [];

  for (const prospect of contactableProspects) {
    try {
      const result = await draftPitch(prospect);
      pitched.push(result);
    } catch (err: any) {
      errors.push(`${prospect.name}: ${err.message}`);
    }

    // Brief pause between API calls
    await new Promise(r => setTimeout(r, 1000));
  }

  // Finalize cost tracking for this run
  try {
    await finalizeRunCost(runId);
  } catch {
    // Cost tracking is best-effort
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

IMPORTANT TONE RULES:
- NEVER use words like "disrupt", "revolutionize", "game-changing", "groundbreaking"
- Lead with value for the recipient's audience, not self-promotion
- Be warm, human, and low-pressure
- Frame outreach as exploring interest, not demanding coverage
- NEVER use emojis
- NEVER start with "Hey!" — use "Hi [Name]," or just "[Name],"

❌ NEGATIVE EXAMPLE — AVOID this style at all costs:
"Hey! 🎉 Pete here from ONES — we're revolutionizing personalized nutrition with cutting-edge AI technology! Our clinical-grade platform is truly groundbreaking!"

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
