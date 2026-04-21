/**
 * Pitch Drafter — AI-powered pitch generation engine
 *
 * Takes a prospect + template + founder profile and generates a personalized
 * pitch email. Each pitch is stored as a draft for human review.
 */
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import logger from '../../../infra/logging/logger';
import { agentRepository } from '../agent.repository';
import { getPrAgentConfig } from '../agent-config';
import { getFounderProfile } from '../founder-context';
import { getTemplateForProspect, type PitchTemplate } from '../templates/pitch-templates';
import { getPitchStatsBlock } from '../tools/platform-stats';
import { scorePitchQuality } from '../tools/pitch-quality';
import { trackTokens, finalizeRunCost } from '../tools/cost-tracker';
import type { OutreachProspect, InsertOutreachPitch } from '@shared/schema';
import { logPitchActivity } from '../../crm/crm-bridge';

function isClaudeModel(model: string): boolean {
  return model.startsWith('claude-');
}

async function callPitchAI(
  model: string,
  system: string,
  user: string,
  temperature: number,
): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
  if (isClaudeModel(model) && process.env.ANTHROPIC_API_KEY) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4000,
      temperature,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const text = response.content.find(c => c.type === 'text')?.text ?? '{}';
    return {
      content: text,
      promptTokens: response.usage?.input_tokens || 0,
      completionTokens: response.usage?.output_tokens || 0,
    };
  }
  // Fallback to OpenAI
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const fallbackModel = isClaudeModel(model) ? 'gpt-4o' : model;
  const response = await openai.chat.completions.create({
    model: fallbackModel,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature,
    response_format: { type: 'json_object' },
  });
  return {
    content: response.choices[0].message.content || '{}',
    promptTokens: response.usage?.prompt_tokens || 0,
    completionTokens: response.usage?.completion_tokens || 0,
  };
}

function parseJsonSafe(raw: string): any {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    try { return JSON.parse(jsonrepair(jsonMatch[0])); } catch { return {}; }
  }
}

export interface DraftPitchResult {
  pitchId: string;
  prospectId: string;
  subject: string;
  body: string;
  templateUsed: string;
  category: 'podcast' | 'press' | 'investor';
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
    const systemPromptFull = `${template.systemPrompt}

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

Hey! 🎉 Pete here from ONES — we're revolutionizing personalized nutrition with cutting-edge AI technology! We've built the world's first AI health practitioner that creates custom supplements. I'd LOVE to come on your show and share how we're changing the game. Our clinical-grade platform is truly groundbreaking and I think your audience would be blown away! Let me know when works for you!
"""
^ This is terrible because: emojis, "disrupting", "revolutionizing", "cutting-edge", "world's first", "$50B", demands coverage, self-congratulatory, generic, no audience value.

✅ GOOD EXAMPLE TONE:
"""
Subject: Quick thought on a personalized nutrition segment

Hi Sarah,

I caught your recent episode with Dr. Patel on gut health — really appreciated how you broke down the microbiome research for a general audience.

Here's something I struggled with and I think a lot of people deal with: you're either buying 10 different supplement bottles, guessing at what you need, overdosing on some things, underdosing on others, spending a fortune without knowing if any of it is right. Or you go the AG1 or daily multivitamin route, which is convenient but completely generic. Zero customization, just "trust us." Neither option is actually built for your body.

I built Ones to solve both of those problems. Our AI analyzes your blood work, health data, and wearable metrics to design one custom supplement from over 150 ingredients at research-backed doses, built specifically for you. And the AI adapts it as your health changes, so it's not a static product.

I'm Pete, the founder. If that sounds like something your audience would dig, I'd love to chat. No pressure either way.

Best,
Pete
"""

The subject line MUST be specific to this prospect. Reference their show/publication or a topic relevant to them. Create something that feels personal, not mass-produced.

OUTPUT FORMAT: Return a JSON object with exactly two keys:
{
  "subject": "The email subject line",
  "body": "The email body text (plain text, no HTML)"
}`;

    const response = await callPitchAI(
      config.model,
      systemPromptFull,
      `Draft a ${template.name.toLowerCase()} for this prospect:\n${contextBlock}`,
      config.temperature,
    );

    // Track token usage for cost monitoring
    trackTokens(null, config.model, response.promptTokens, response.completionTokens, 'draft_pitch');

    const parsed = parseJsonSafe(response.content);

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

    // Log to CRM timeline
    logPitchActivity(prospect, pitch as any, 'pitch_drafted').catch(() => {});

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
  originalPitch: { id: string; prospectId: string; subject: string; body: string; category: 'podcast' | 'press' | 'investor'; pitchType: string },
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

  // Fetch enriched contacts for personalization
  const contacts = await agentRepository.getContactsByProspectId(prospect.id);
  const primaryContact = contacts.find(c => c.isPrimary) || contacts[0];

  // Build rich prospect context for follow-ups
  const prospectDetails = [
    prospect.url ? `Website: ${prospect.url}` : null,
    prospect.publicationName ? `Publication/Company: ${prospect.publicationName}` : null,
    prospect.topics?.length ? `Topics they cover: ${prospect.topics.join(', ')}` : null,
    prospect.notes ? `Notes: ${prospect.notes}` : null,
    primaryContact ? `Contact: ${primaryContact.name}${primaryContact.role ? ` (${primaryContact.role})` : ''}` : null,
    primaryContact?.beat ? `Covers: ${primaryContact.beat}` : null,
    primaryContact?.recentArticles?.length ? `Recent articles: ${primaryContact.recentArticles.join('; ')}` : null,
  ].filter(Boolean).join('\n');

  try {
    const followUpSystem = `You are writing follow-up #${followUpNum} to a pitch that hasn't received a response.

RULES:
- NEVER be passive-aggressive ("just checking in", "making sure you saw my email")
- Add genuine new value — a new reason to reply
- Keep under 100 words
- Reference the original pitch briefly
- Sound like a real person, not automation
- Use the prospect details below to add something SPECIFIC and personal

ORIGINAL PITCH SUBJECT: ${originalPitch.subject}
ORIGINAL PITCH BODY (first 200 chars): ${originalPitch.body.substring(0, 200)}

PROSPECT: ${prospect.name} (${prospect.category})
HOST: ${prospect.hostName || 'Unknown'}
${prospectDetails}

FOUNDER: ${profile.name}, ${profile.title} at ${profile.company}

OUTPUT FORMAT: JSON with "subject" and "body" keys.`;

    const response = await callPitchAI(
      config.model,
      followUpSystem,
      `Write a brief, high-value follow-up email. Add something new — a stat, a timely angle, or a simplified ask. Personalize it to their recent coverage or topics if possible.`,
      config.temperature,
    );

    const parsed = parseJsonSafe(response.content);

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

    // Log to CRM timeline
    logPitchActivity(prospect, pitch as any, 'pitch_drafted').catch(() => {});

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
  category?: 'podcast' | 'press' | 'investor';
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

  // Only draft pitches for prospects with an actual email address.
  // Form-only prospects can't be sent automatically and waste AI credits.
  const contactableProspects = prospects.filter(p => {
    if (!p.contactEmail) {
      logger.info(`[draft-pitch] Skipping "${p.name}" — no email address`);
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
 * Batch Redraft — delete all pending_review pitches and re-draft them
 * with the current templates. Use after template changes.
 */
export async function batchRedraftPitches(): Promise<{
  deleted: number;
  redrafted: number;
  errors: string[];
}> {
  // Get all pending_review pitches
  const { pitches } = await agentRepository.listPitches({ status: 'pending_review', limit: 500 });

  if (pitches.length === 0) {
    return { deleted: 0, redrafted: 0, errors: [] };
  }

  // Collect prospect IDs and delete old pitches
  const prospectIds = new Set<string>();
  for (const pitch of pitches) {
    prospectIds.add(pitch.prospectId);
    await agentRepository.deletePitch(pitch.id);
  }

  logger.info(`[draft-pitch] Redraft: deleted ${pitches.length} pending pitches for ${prospectIds.size} prospects`);

  // Re-draft for each prospect
  const redrafted: DraftPitchResult[] = [];
  const errors: string[] = [];

  for (const prospectId of prospectIds) {
    try {
      const prospect = await agentRepository.getProspectById(prospectId);
      if (!prospect) {
        errors.push(`Prospect ${prospectId} not found`);
        continue;
      }
      if (!prospect.contactEmail) {
        logger.info(`[draft-pitch] Redraft: skipping "${prospect.name}" — no email`);
        continue;
      }

      // Reset prospect status to 'new' so it can be re-pitched
      await agentRepository.updateProspectStatus(prospectId, 'new');

      const result = await draftPitch(prospect);
      redrafted.push(result);

      // Brief pause between API calls
      await new Promise(r => setTimeout(r, 1000));
    } catch (err: any) {
      errors.push(`${prospectId}: ${err.message}`);
    }
  }

  logger.info(`[draft-pitch] Redraft complete: ${redrafted.length} new pitches, ${errors.length} errors`);
  return { deleted: pitches.length, redrafted: redrafted.length, errors };
}

/**
 * Lightweight URL scrape — fetches a prospect's website and extracts text for AI context.
 * Returns up to maxChars of clean text content.
 */
async function scrapeProspectUrl(url: string, maxChars = 2000): Promise<string> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OnesBot/1.0)',
        'Accept': 'text/html',
      },
    });
    if (!response.ok) return '';
    const html = await response.text();

    // Strip script/style tags, then all HTML tags, collapse whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.substring(0, maxChars);
  } catch {
    return '';
  }
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

  // Fetch enriched contacts for personalization
  const contacts = await agentRepository.getContactsByProspectId(pitch.prospectId);
  const primaryContact = contacts.find(c => c.isPrimary) || contacts[0];

  const profile = await getFounderProfile();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Live-scrape the prospect's website for fresh context
  let websiteContext = '';
  if (prospect.url) {
    const scraped = await scrapeProspectUrl(prospect.url);
    if (scraped) {
      websiteContext = `\nLIVE WEBSITE CONTENT (scraped just now from ${prospect.url}):\n${scraped}`;
      logger.info(`[draft-pitch] Scraped ${scraped.length} chars from ${prospect.url} for rewrite context`);
    }
  }

  // Build rich prospect context
  const prospectContext = [
    `Name: ${prospect.name}`,
    `Category: ${prospect.category}${prospect.subType ? ` (${prospect.subType})` : ''}`,
    prospect.url ? `Website: ${prospect.url}` : null,
    prospect.publicationName ? `Publication/Company: ${prospect.publicationName}` : null,
    prospect.hostName ? `Host/Contact: ${prospect.hostName}` : null,
    prospect.contactEmail ? `Email: ${prospect.contactEmail}` : null,
    prospect.audienceEstimate ? `Audience: ${prospect.audienceEstimate}` : null,
    prospect.topics?.length ? `Topics they cover: ${prospect.topics.join(', ')}` : null,
    prospect.notes ? `Notes: ${prospect.notes}` : null,
    prospect.relevanceScore ? `Relevance score: ${prospect.relevanceScore}/100` : null,
  ].filter(Boolean).join('\n');

  // Add enriched contact info
  const contactContext = primaryContact
    ? [
        `\nPRIMARY CONTACT:`,
        `Name: ${primaryContact.name}`,
        primaryContact.role ? `Role: ${primaryContact.role}` : null,
        primaryContact.email ? `Email: ${primaryContact.email}` : null,
        primaryContact.beat ? `Covers: ${primaryContact.beat}` : null,
        primaryContact.recentArticles?.length ? `Recent articles: ${primaryContact.recentArticles.join('; ')}` : null,
      ].filter(Boolean).join('\n')
    : '';

  // Add enrichment data if available
  const enrichmentContext = prospect.enrichmentData
    ? `\nENRICHMENT DATA:\n${JSON.stringify(prospect.enrichmentData, null, 0).substring(0, 800)}`
    : '';

  // Extract portfolio companies / known connections for investors
  const portfolioCompanies = prospect.enrichmentData && typeof prospect.enrichmentData === 'object' && 'socialLinks' in (prospect.enrichmentData as any)
    ? (prospect.enrichmentData as any).socialLinks?.filter((s: string) => s && !s.includes('linkedin.com') && !s.includes('twitter.com'))
    : [];

  const response = await openai.chat.completions.create({
    model: config.model,
    messages: [
      {
        role: 'system',
        content: `You help Pete (founder of Ones) rewrite pitch emails. You MUST produce a substantially different email — not a light rephrase.

=== USER INSTRUCTIONS (your #1 priority) ===
Do EXACTLY what the user asks. Their instructions override ALL rules below. If they ask to personalize, you MUST reference specific facts about this company from the research below — portfolio companies, investment thesis, recent news, team members, anything concrete.

=== PROSPECT RESEARCH ===
${prospectContext}${contactContext}${enrichmentContext}${websiteContext}

=== PERSONALIZATION MATERIAL ===
Use at least 2-3 of these specific details in the rewrite:
${prospect.notes ? `• Company description: ${prospect.notes}` : ''}
${portfolioCompanies.length ? `• Portfolio/partner companies: ${portfolioCompanies.join(', ')}` : ''}
${primaryContact?.beat ? `• Contact covers: ${primaryContact.beat}` : ''}
${primaryContact?.recentArticles?.length ? `• Recent articles: ${primaryContact.recentArticles.join('; ')}` : ''}
${prospect.topics?.length ? `• Focus topics: ${prospect.topics.join(', ')}` : ''}
${!prospect.notes && !portfolioCompanies.length ? `• No stored data — use the LIVE WEBSITE CONTENT above to find specific details about this company` : ''}

=== ABOUT ONES ===
AI that analyzes blood work + health data to design one custom supplement from 150+ ingredients. Pete is the founder.

=== WRITING RULES (secondary to user instructions) ===
- 100-200 words. Casual, like Pete typed it on his phone
- "Hi [Name]," opener. "Pete" sign-off
- No buzzwords (disrupt, revolutionize, game-changing), no em dashes, no emojis, no numbered lists
- The rewritten email MUST be noticeably different from the original — change the opening, the hook, the framing. Don't just swap synonyms.

OUTPUT: JSON with "subject" and "body" keys only.`,
      },
      {
        role: 'user',
        content: `Current pitch to rewrite:

SUBJECT: ${pitch.subject}
BODY:
${pitch.body}

---
MY INSTRUCTIONS: ${instructions}

IMPORTANT: I want this email to feel like it was written specifically for ${prospect.name}. Use the company research above. Mention their portfolio companies, their investment focus, recent news — anything that shows I actually know who they are. Do NOT just rephrase the same generic pitch with different words.`,
      },
    ],
    temperature: Math.max(config.temperature, 0.85),
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
