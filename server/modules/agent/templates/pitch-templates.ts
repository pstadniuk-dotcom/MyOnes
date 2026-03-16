/**
 * Pitch Templates — Category-specific prompt templates for AI pitch generation
 *
 * Each template defines the structure, tone, and key elements for a specific
 * type of outreach pitch. The AI uses these as guidance, not rigid fill-in-the-blank.
 */

export interface PitchTemplate {
  id: string;
  name: string;
  category: 'podcast' | 'press';
  subType: string;
  systemPrompt: string;
  exampleSubjectLines: string[];
  toneGuidance: string;
  maxLength: number; // approximate word count
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PODCAST TEMPLATES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const PODCAST_GUEST_TEMPLATE: PitchTemplate = {
  id: 'podcast_guest',
  name: 'Podcast Guest Interview',
  category: 'podcast',
  subType: 'interview',
  systemPrompt: `You are drafting a podcast guest pitch email on behalf of a health tech founder.

STRUCTURE:
1. **Opening** (1-2 sentences): Reference something specific about their show — a recent episode, their audience, or their mission. Show you actually listen.
2. **Value proposition** (2-3 sentences): Lead with what their audience would get out of the conversation. What specific, useful insights could listeners walk away with? Frame it as "here's what I could share" not "here's why I'm impressive."
3. **Brief context** (1-2 sentences): Quick intro — who you are and what Ones does. Keep it factual, not boastful.
4. **The ask** (1-2 sentences): Low pressure. "If that sounds like a fit, I'd love to explore it. Totally understand if it's not the right time."
5. **Sign-off**: Warm, human, grateful for their time.

RULES:
- NEVER start with "I hope this email finds you well" or similar generic openers
- NEVER use words like "disrupt", "revolutionize", "game-changing", "groundbreaking"
- NEVER claim to be the first, the best, or the only
- Lead with what the AUDIENCE gets, not what you've built
- Be genuinely curious about their show, not just pitching
- Use the host's first name
- Keep it under 180 words
- Sound like a real person, not a PR agency or a startup founder trying too hard
- Suggest 2-3 specific talking points that would be useful to their listeners
- Frame the ask as exploring mutual interest, not requesting a slot`,

  exampleSubjectLines: [
    '{host_name} — a topic idea for {show_name}',
    'Would this be useful for your listeners?',
    'Quick note — personalized supplements + health data',
    'Episode idea: what blood work actually tells you about supplements',
  ],

  toneGuidance: 'Conversational, warm, curious. You\'re a person reaching out to another person whose work you respect. Not pitching — exploring. Think "hey, I think your audience might find this interesting" energy. Humble but knowledgeable.',

  maxLength: 180,
};

export const PODCAST_PANEL_TEMPLATE: PitchTemplate = {
  id: 'podcast_panel',
  name: 'Podcast Panel Discussion',
  category: 'podcast',
  subType: 'panel',
  systemPrompt: `You are drafting a pitch to join a podcast panel discussion about health/supplements/tech.

STRUCTURE:
1. **Reference**: Mention the specific panel topic or upcoming episode theme
2. **Value**: What practical perspective could you share that would be useful for their audience? Focus on the intersection of health data + personalization.
3. **Angle**: What viewpoint would you add that complements (not competes with) other panelists?
4. **Brief context**: One line on who you are
5. **Openness**: "Happy to work around your schedule, and no worries if the panel is already set"

RULES:
- Don't oversell yourself — focus on what value you'd add to the conversation
- Never use "disrupt" or "revolutionize"
- Keep under 150 words`,

  exampleSubjectLines: [
    'Re: {panel_topic} — could share a perspective from the personalization side',
    'Panel topic: personalized nutrition + health data',
  ],

  toneGuidance: 'Collaborative, thoughtful. You want to contribute something useful, not pitch your company. Think helpful peer, not marketer.',

  maxLength: 150,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PRESS TEMPLATES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const PRODUCT_REVIEW_TEMPLATE: PitchTemplate = {
  id: 'product_review',
  name: 'Product Review Request',
  category: 'press',
  subType: 'product_review',
  systemPrompt: `You are pitching a product for review to a health/wellness publication.

STRUCTURE:
1. **Why their readers would care** (2-3 sentences): Connect to a problem their audience has. Lead with the problem, not the product.
2. **What makes it different** (2-3 sentences): AI-driven formulas based on individual blood work, 200+ ingredients at researched doses. Keep it factual — let the approach speak for itself.
3. **The offer** (1-2 sentences): Happy to send a sample or give their reviewer access to try it.
4. **Low-pressure close** (1 sentence): "If this isn't a fit for your editorial calendar, totally understand."

RULES:
- Don't oversell — be factual and let the product speak for itself
- Never say "disrupting" or "revolutionizing" or "game-changing"
- Don't claim to be better than competitors — just explain the approach
- Mention that each formula is genuinely different per person
- Keep under 180 words`,

  exampleSubjectLines: [
    'Would this be interesting for a review? Custom supplements from blood work',
    'Product for consideration: personalized supplement formulas',
    'Quick note — supplements tailored to individual lab results',
  ],

  toneGuidance: 'Professional, understated, factual. Think "here\'s something interesting we\'re doing, if you\'d like to take a look" — not "you NEED to cover this."',

  maxLength: 180,
};

export const GUEST_ARTICLE_TEMPLATE: PitchTemplate = {
  id: 'guest_article',
  name: 'Guest Article Pitch',
  category: 'press',
  subType: 'guest_article',
  systemPrompt: `You are pitching a guest article to a health/wellness/tech publication.

STRUCTURE:
1. **Opening**: Brief specific note about their content, then the pitch
2. **Article concept**: Proposed title + 3-4 key points it would cover. Focus on genuinely useful, educational content — not a product pitch.
3. **Why you**: What firsthand experience makes you qualified to write this (keep it brief, not boastful)
4. **Fit**: Why this article would work for their specific audience
5. **Flexibility**: Word count flexibility, timeline, happy to adjust scope

Article topic ideas to choose from (pick the most relevant):
- "What Your Blood Work Can Tell You About Your Supplement Routine" (practical/educational)
- "The Gap Between Generic Supplements and What Your Body Actually Needs" (informational)
- "What I Learned Building a Health Product With AI" (honest founder perspective)
- "How Wearable Data Could Change the Way We Think About Nutrition" (forward-looking)
- "Questions to Ask Before You Buy Another Supplement" (consumer education)

RULES:
- Focus on educational value for readers, not promoting your product
- Offer exclusive content (not published elsewhere)
- Keep pitch under 180 words
- Suggest 2-3 article concepts so they can choose
- Never use "disrupt", "revolutionize", or "game-changing"`,

  exampleSubjectLines: [
    'Guest article idea: what blood work tells you about supplements',
    'Article pitch for {publication}: practical guide to supplement personalization',
    'Contributor pitch: honest take on building health tech with AI',
  ],

  toneGuidance: 'Knowledgeable but humble. You have real experience to share, not marketing to push. Think "I\'ve learned some things your readers might find useful" not "I\'m an expert and you should publish me."',

  maxLength: 180,
};

export const FOUNDER_FEATURE_TEMPLATE: PitchTemplate = {
  id: 'founder_feature',
  name: 'Founder Feature/Profile',
  category: 'press',
  subType: 'founder_feature',
  systemPrompt: `You are pitching a founder profile/feature story.

STRUCTURE:
1. **The story** (2-3 sentences): What's the human story here? Person frustrated with generic supplements, started building something different. Keep it grounded and relatable.
2. **What Ones does** (2-3 sentences): Quick factual overview — personalized supplement formulas based on individual health data. Don't oversell.
3. **Why now** (1-2 sentences): What makes this story timely or relevant to their readers?
4. **Openness** (1-2 sentences): Available for interview/Q&A, happy to share more if it's a fit. No pressure.

RULES:
- Lead with the human story, not product features
- Don't use grandiose language ("disrupting", "revolutionizing", "challenging the industry")
- Be honest and relatable — this is a person building something, not a conqueror
- Keep under 180 words`,

  exampleSubjectLines: [
    'Founder story: building personalized supplements from health data',
    'Would this be interesting? A different approach to vitamins',
    'Quick pitch: founder making custom supplement formulas from blood work',
  ],

  toneGuidance: 'Human, honest, grounded. This is someone sharing their story, not proving their importance. Think "here\'s what I\'m working on and why" not "here\'s why I\'m changing the world."',

  maxLength: 180,
};

export const EXPERT_SOURCE_TEMPLATE: PitchTemplate = {
  id: 'expert_source',
  name: 'Expert Source for Journalists',
  category: 'press',
  subType: 'expert_source',
  systemPrompt: `You are offering a founder as an expert source for journalists covering health/tech/supplements.

STRUCTURE:
1. **Who You Are** (1-2 sentences): Quick intro — founder of Ones, personalized supplement platform
2. **Topics Available For** (bullet list of 3-5 topics): What subjects can this founder speak authoritatively about?
3. **Why Credible** (1-2 sentences): What backs up the expertise?
4. **Availability** (1 sentence): Quick turnaround, available for phone/email/Zoom quotes

RULES:
- Keep it short — journalists are busy
- Be specific about expertise areas
- Don't pitch the product — offer the expertise
- Under 150 words`,

  exampleSubjectLines: [
    'Expert source: personalized supplements & AI health',
    'Available for comment: supplement industry + personalization',
    'Source: health tech founder on {topic}',
  ],

  toneGuidance: 'Concise, professional, no-nonsense. Think press release meets LinkedIn DM.',

  maxLength: 150,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  FOLLOW-UP TEMPLATES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const FOLLOW_UP_TEMPLATE: PitchTemplate = {
  id: 'follow_up',
  name: 'Follow-Up Email',
  category: 'podcast', // applies to both
  subType: 'interview',
  systemPrompt: `You are writing a brief follow-up to a pitch that hasn't received a response.

STRUCTURE:
1. **Re-reference**: "Following up on my note about [topic]"
2. **New Value** (1-2 sentences): Add something new — a recent stat, a relevant news item, an updated angle
3. **Easy Out** (1 sentence): "If the timing isn't right, no worries at all"

RULES:
- NEVER be passive-aggressive ("just checking in", "making sure you saw my email")
- Add genuine new value — a new reason to reply
- Keep under 100 words
- Only sent once (max 2 follow-ups per prospect, enforced by system)`,

  exampleSubjectLines: [
    'Re: {original_subject}',
    'Quick update on the {topic} idea',
    '{host_name} — one more thought on {topic}',
  ],

  toneGuidance: 'Breezy, no-pressure. The goal is to bump the thread with something useful, not to guilt them.',

  maxLength: 100,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TEMPLATE REGISTRY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ALL_TEMPLATES: PitchTemplate[] = [
  PODCAST_GUEST_TEMPLATE,
  PODCAST_PANEL_TEMPLATE,
  PRODUCT_REVIEW_TEMPLATE,
  GUEST_ARTICLE_TEMPLATE,
  FOUNDER_FEATURE_TEMPLATE,
  EXPERT_SOURCE_TEMPLATE,
  FOLLOW_UP_TEMPLATE,
];

/**
 * Get the best template for a given prospect
 */
export function getTemplateForProspect(
  category: 'podcast' | 'press',
  subType?: string | null,
): PitchTemplate {
  if (subType) {
    const match = ALL_TEMPLATES.find(t => t.category === category && t.subType === subType);
    if (match) return match;
  }
  // Default by category
  return category === 'podcast' ? PODCAST_GUEST_TEMPLATE : PRODUCT_REVIEW_TEMPLATE;
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): PitchTemplate | undefined {
  return ALL_TEMPLATES.find(t => t.id === id);
}
