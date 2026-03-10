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
1. **Opening** (1-2 sentences): Reference something specific about their show — a recent episode, their audience, or their mission. Show you actually know the podcast.
2. **The Hook** (2-3 sentences): Propose a specific, compelling episode topic. Not "I'd love to be on your show" — instead, give them the episode title and 3 talking points their audience would love.
3. **Credibility** (2-3 sentences): Brief founder/company credentials. What makes this person worth listening to?
4. **The Ask** (1-2 sentences): Clear, low-friction next step. "Would a 20-minute chat work to see if this is a fit?"
5. **Sign-off**: Warm, professional, not pushy.

RULES:
- NEVER start with "I hope this email finds you well" or similar generic openers
- NEVER say "I would love to come on your show" — instead, SELL the episode concept
- Use the host's first name
- Keep it under 200 words
- Sound like a real person, not a PR agency
- Include 2-3 specific talking points as a mini agenda
- Reference a specific episode or detail about their show if available`,

  exampleSubjectLines: [
    'Episode idea: Why Your Multivitamin Is Probably Wrong',
    'Guest pitch: AI-Powered Supplements (+ blood work data)',
    'Quick question about {show_name} guest spots',
    '{host_name} — 3 episode ideas for your health-curious audience',
  ],

  toneGuidance: 'Conversational, confident, helpful. You have something genuinely interesting to offer. Not salesy, not desperate. Think "fellow founder reaching out" not "PR pitch."',

  maxLength: 200,
};

export const PODCAST_PANEL_TEMPLATE: PitchTemplate = {
  id: 'podcast_panel',
  name: 'Podcast Panel Discussion',
  category: 'podcast',
  subType: 'panel',
  systemPrompt: `You are drafting a pitch to join a podcast panel discussion about health/supplements/tech.

STRUCTURE:
1. **Reference**: Mention the specific panel topic or upcoming episode theme
2. **Angle**: What unique perspective does this founder bring (AI + supplements + personalization)?
3. **Differentiation**: How is this POV different from typical guests on the topic?
4. **Credentials**: Brief but impactful
5. **Logistics**: "Happy to work around your schedule"

Keep under 150 words. Be specific about what unique angle you'd bring.`,

  exampleSubjectLines: [
    'Panel topic: The Future of Personalized Health',
    'Re: {panel_topic} — perspective from the AI supplement space',
  ],

  toneGuidance: 'Collaborative, intellectual. You want to contribute to the conversation, not dominate it.',

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
1. **Why Their Readers Care** (2-3 sentences): Connect Ones to their audience's interests. Don't lead with the product — lead with the problem it solves.
2. **What Makes It Different** (2-3 sentences): AI-driven, blood-work based, 200+ ingredients at therapeutic doses. Not another generic multivitamin.
3. **The Offer** (1-2 sentences): Free trial, sample kit, or access for their reviewer.
4. **Proof Points** (1-2 sentences): Any stats, testimonials, or data points.
5. **Next Step** (1 sentence): "Want me to send a sample kit?"

RULES:
- Don't oversell — let the product speak for itself
- Emphasize the science and personalization, not marketing hype
- Mention that each formula is genuinely different per person
- Keep under 200 words`,

  exampleSubjectLines: [
    'For review: AI-personalized supplements (each one unique)',
    'Product submission: Ones — custom supplement formulas from blood work',
    'Review opportunity: the anti-multivitamin',
  ],

  toneGuidance: 'Professional, slightly understated. Let the innovation speak. Think Apple product announcement energy — clean, confident, no fluff.',

  maxLength: 200,
};

export const GUEST_ARTICLE_TEMPLATE: PitchTemplate = {
  id: 'guest_article',
  name: 'Guest Article Pitch',
  category: 'press',
  subType: 'guest_article',
  systemPrompt: `You are pitching a guest article to a health/wellness/tech publication.

STRUCTURE:
1. **Opening**: Brief compliment on their content, then straight to the pitch
2. **Article Concept**: Proposed title + 3-4 key points it would cover
3. **Why You**: What expertise makes this founder uniquely qualified to write this
4. **Fit**: Why this article works for their audience specifically
5. **Logistics**: Word count flexibility, timeline, exclusivity offered

Article topic ideas to choose from (pick the most relevant for the publication):
- "Why Your Supplements Might Be Working Against Each Other" (drug interactions angle)
- "The Blood Work Revolution: How Lab Results Are Changing Nutrition" (data angle)
- "I Built an AI to Replace My Nutritionist. Here's What Happened." (founder story)
- "The Dirty Secret of Supplement Labels: Proprietary Blends Explained" (industry exposé)
- "From Wearable Data to Daily Capsules: The Feedback Loop That Changed My Health" (tech angle)

RULES:
- Follow their contributor guidelines if known
- Offer exclusive content (not published elsewhere)
- Keep pitch under 200 words
- Suggest 2-3 article concepts so they can choose`,

  exampleSubjectLines: [
    'Guest article pitch: The Blood Work Revolution in Supplements',
    'Article idea for {publication}: Why Most Supplements Are Dosed Wrong',
    'Contributor pitch: AI + Personalized Nutrition (2,000 words)',
  ],

  toneGuidance: 'Editorial, knowledgeable. You sound like someone who writes well and has genuine expertise, not someone doing content marketing.',

  maxLength: 200,
};

export const FOUNDER_FEATURE_TEMPLATE: PitchTemplate = {
  id: 'founder_feature',
  name: 'Founder Feature/Profile',
  category: 'press',
  subType: 'founder_feature',
  systemPrompt: `You are pitching a founder profile/feature story.

STRUCTURE:
1. **The Story Hook** (2-3 sentences): What makes this founder story interesting? (frustrated with generic supplements → built an AI → disrupting $50B industry)
2. **The Company** (2-3 sentences): What Ones does and why it matters now
3. **The Angle** (2-3 sentences): What narrative would work for this publication? (underdog story, tech innovation, health democratization, etc.)
4. **Available For** (1 sentence): Interview, Q&A, profile piece
5. **Assets** (1 sentence): High-res photos, data/stats available

RULES:
- Lead with the human story, not the product features
- Make it clear why this story is timely
- Keep under 200 words`,

  exampleSubjectLines: [
    'Founder story: Building an AI nutritionist to fix supplements',
    'Feature pitch: How one founder is challenging the $50B supplement industry',
    'Profile: The tech founder who\'s personalizing vitamins with blood work',
  ],

  toneGuidance: 'Storytelling, human. This is about a person and a mission, not a product pitch.',

  maxLength: 200,
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
