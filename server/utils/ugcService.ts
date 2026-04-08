/**
 * UGC Ad Studio Service
 * AI-powered UGC video ad creation pipeline for ONES personalized supplements.
 * Uses GPT/Anthropic for research + scripts, fal.ai for image/video generation.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { fal } from '@fal-ai/client';
import { logger } from '../infra/logging/logger';
import { aiRuntimeSettings } from '../infra/ai/ai-config';
import { SYSTEM_SUPPORTS, INDIVIDUAL_INGREDIENTS } from '@shared/ingredients';

// ── ONES Product Context (baked-in, no manual entry needed) ──────────────────

export function getOnesProductContext(): string {
  const systemNames = SYSTEM_SUPPORTS.map(s => s.name).join(', ');
  const individualNames = INDIVIDUAL_INGREDIENTS.map(i => i.name).join(', ');
  const totalIngredients = SYSTEM_SUPPORTS.length + INDIVIDUAL_INGREDIENTS.length;

  return `PRODUCT: ONES — AI-Personalized Supplement Formula

WHAT IT IS:
ONES is a personalized supplement platform where users chat with an AI practitioner, optionally upload blood work and connect wearables, and receive a custom-blended supplement formula unique to their body. Every bottle is manufactured fresh — not pulled from a shelf. One capsule contains ALL of your ingredients blended together.

HOW IT WORKS:
1. Chat with the AI about your health goals, conditions, medications, and lifestyle
2. Optionally upload lab results (blood tests) for biomarker-driven recommendations
3. Connect wearables (Fitbit, Oura, Whoop) for biometric data integration
4. AI formulates your personalized blend from ${totalIngredients} available ingredients
5. Formula is manufactured fresh and shipped as a 2-month supply
6. Formula evolves with each refill as your health data updates

INGREDIENT CATALOG (${totalIngredients} total):
• ${SYSTEM_SUPPORTS.length} System Supports (proprietary blends, fixed dosages): ${systemNames}
• ${INDIVIDUAL_INGREDIENTS.length} Individual Ingredients (adjustable dosing): ${individualNames}

CAPSULE SYSTEM:
• 6 capsules/day (3,300mg) — generally healthy, wellness optimization
• 9 capsules/day (4,950mg) — 1-2 biomarker concerns, moderate health goals
• 12 capsules/day (6,600mg) — complex multi-system issues, multiple lab abnormalities
• Each capsule = 550mg capacity, all ingredients blended in every capsule

KEY DIFFERENTIATORS:
• NOT a generic multivitamin — every formula is unique to the individual
• AI analyzes blood work, health history, medications, and wearable data
• Custom manufactured per person (not mass-produced)
• Replaces the "cabinet full of 15 different supplement bottles" with ONE formula
• Formula evolves as your health changes — not a static product
• 2-month supply per order (custom manufacturing requires minimum batch size)

TARGET AUDIENCE:
• Health-conscious professionals (28-45), tech/finance/entrepreneurship
• People frustrated with generic supplements that don't work
• Biohackers and quantified-self enthusiasts
• Anyone with specific health concerns who wants personalized, data-driven nutrition
• Income $85K-$200K+, urban/suburban, college-educated

BRAND VOICE:
• Premium but approachable — not clinical, not bro-science
• Data-driven and transparent — show the science, explain why each ingredient
• Personal and empowering — "your body is unique, your supplements should be too"
• Never use: "game-changer", "holy grail", "trust me", "run don't walk"

COMPETITOR LANDSCAPE:
• Ritual, AG1, Huel — generic one-size-fits-all formulas
• Care/of, Persona — basic quiz → pre-packaged combos, NOT truly custom blended
• ONES advantage: actual AI practitioner + blood work analysis + single custom capsule`;
}

/** Pre-built ONES-specific script angle suggestions */
export function getOnesScriptAngles(): Array<{
  id: string;
  title: string;
  angle: string;
  scriptType: string;
  description: string;
}> {
  return [
    {
      id: 'cabinet_problem',
      title: 'Cabinet Full of Bottles',
      angle: 'Show the overwhelm of 10-15 supplement bottles → discover ONES → one simple formula',
      scriptType: 'problem_solution',
      description: 'The classic "I had a cabinet full of random supplements and none of them were working together" → ONES simplifies it into one personalized capsule.',
    },
    {
      id: 'bloodwork_reveal',
      title: 'My Bloodwork Changed',
      angle: 'Get blood work done → upload to ONES AI → custom formula → follow-up blood work shows improvement',
      scriptType: 'testimonial',
      description: '"I uploaded my blood work and the AI created a formula specifically for MY deficiencies. Three months later, my doctor asked what I changed."',
    },
    {
      id: 'unboxing_custom',
      title: 'What\'s Inside MY Custom Bottle',
      angle: 'Unbox the ONES package → show the personalized label → explain what each ingredient does for YOU specifically',
      scriptType: 'unboxing',
      description: 'The reveal moment — showing that YOUR bottle has completely different ingredients than anyone else\'s because it\'s based on YOUR health data.',
    },
    {
      id: 'ai_consultation',
      title: 'I Chatted With an AI Doctor',
      angle: 'Screen recording / reenactment of the AI consultation → surprise at how thorough it is → formula arrives',
      scriptType: 'day_in_life',
      description: '"I was skeptical but the AI asked about my medications, sleep, stress levels, even my wearable data. It knew more about my health than I did."',
    },
    {
      id: 'generic_bs',
      title: 'Stop Taking Generic Supplements',
      angle: 'Contrarian take on why mass-produced supplements are a waste → explain personalization → show ONES',
      scriptType: 'problem_solution',
      description: '"That multivitamin you\'re taking? It was made for nobody in particular. Here\'s why that\'s a problem."',
    },
    {
      id: 'wearable_data',
      title: 'My Watch Helped Pick My Supplements',
      angle: 'Show connecting Oura/Fitbit/Whoop → explain how biometric data influences the formula → mind-blown moment',
      scriptType: 'testimonial',
      description: '"I connected my Oura ring and the AI adjusted my formula based on my sleep and recovery data. That\'s insane."',
    },
    {
      id: 'evolution_refill',
      title: 'My Formula Changed With Me',
      angle: 'Show first bottle → life changes (new job, training, labs improve) → second bottle has different formula',
      scriptType: 'before_after',
      description: '"My first formula had heavy adrenal support because I was burned out. Six months later, my new formula shifted to performance because my blood work improved."',
    },
    {
      id: 'one_capsule',
      title: 'One Capsule Has Everything',
      angle: 'Show the overwhelming daily pill routine → ONES simplifies to just a few capsules with everything blended inside',
      scriptType: 'transformation',
      description: '"I used to take 12 different pills every morning. Now it\'s 6 capsules that have everything — custom blended for me."',
    },
  ];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ensureFalConfigured() {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY environment variable is required for image generation');
  fal.config({ credentials: process.env.FAL_KEY });
}

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

/** Multi-provider AI call with automatic fallback */
async function callAi(system: string, user: string, maxTokens = 8000): Promise<string> {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const preferAnthropic = aiRuntimeSettings.provider === 'anthropic' || (!aiRuntimeSettings.provider && hasAnthropic);
  const anthropicModel = (aiRuntimeSettings.provider === 'anthropic' && aiRuntimeSettings.model) || 'claude-sonnet-4-5';
  const openaiModel = (aiRuntimeSettings.provider === 'openai' && aiRuntimeSettings.model) || 'gpt-4o';

  async function tryAnthropic(): Promise<string> {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: anthropicModel,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    });
    return response.content.find(c => c.type === 'text')?.text ?? '';
  }

  async function tryOpenAI(): Promise<string> {
    const ai = getOpenAI();
    const response = await ai.chat.completions.create({
      model: openaiModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
    });
    return response.choices[0]?.message?.content ?? '';
  }

  if (preferAnthropic && hasAnthropic) {
    try { return await tryAnthropic(); } catch (err: any) {
      logger.warn(`[ugc] Anthropic failed: ${err.message}`);
      if (hasOpenAI) return await tryOpenAI();
      throw err;
    }
  }
  if (hasOpenAI) {
    try { return await tryOpenAI(); } catch (err: any) {
      logger.warn(`[ugc] OpenAI failed: ${err.message}`);
      if (hasAnthropic) return await tryAnthropic();
      throw err;
    }
  }
  throw new Error('No AI provider configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY)');
}

function parseJsonFromAi(raw: string): any {
  // Extract JSON from possible markdown code fences
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : raw.trim();
  return JSON.parse(jsonStr);
}

// ── Product & Market Research ────────────────────────────────────────────────

export interface ProductResearchInput {
  productName?: string;
  productDescription?: string;
  productUrls?: string[];
  productBenefits?: string[];
  adGoal?: string;
}

export async function generateProductResearch(input: ProductResearchInput) {
  const onesContext = getOnesProductContext();
  const system = `You are an expert product marketing researcher. Your job is to deeply analyze a product and provide actionable marketing intelligence for UGC ad campaigns. Return your analysis as JSON.`;

  const user = `Analyze this product for a UGC ad campaign:

${onesContext}

${input.adGoal ? `Campaign goal: ${input.adGoal}` : ''}
${input.productUrls?.length ? `Product URLs (reference): ${input.productUrls.join(', ')}` : ''}

Provide a comprehensive product analysis as JSON with this exact structure:
{
  "summary": "2-3 paragraph product overview covering what it is, how it works, and what makes it different",
  "keyBenefits": ["benefit 1", "benefit 2", ...],
  "uniqueSellingPoints": ["USP 1", "USP 2", ...],
  "commonObjections": ["objection 1", "objection 2", ...],
  "pricePositioning": "how the product is positioned price-wise and why it's worth it",
  "competitorLandscape": "brief overview of alternatives and how this product stands out",
  "bestUseCases": ["use case 1", "use case 2", ...]
}`;

  const raw = await callAi(system, user);
  return parseJsonFromAi(raw);
}

export interface MarketResearchInput {
  productName?: string;
  productDescription?: string;
  productBenefits?: string[];
  targetAudience?: string;
  adGoal?: string;
}

export async function generateMarketResearch(input: MarketResearchInput) {
  const onesContext = getOnesProductContext();
  const system = `You are an expert market researcher specializing in consumer behavior and social media marketing. You understand how real people talk about products online — Reddit, Amazon reviews, TikTok comments, forums. Return your analysis as JSON.`;

  const user = `Research the target market for this product and create a customer intelligence report:

${onesContext}

${input.adGoal ? `Campaign goal: ${input.adGoal}` : ''}
${input.targetAudience ? `Additional audience context: ${input.targetAudience}` : ''}

Build a detailed customer intelligence report as JSON:
{
  "customerPersona": {
    "demographics": "age range, gender split, income level, location tendencies",
    "lifestyle": "daily habits, values, interests relevant to this product",
    "painPoints": ["specific pain point they experience 1", "pain point 2", ...],
    "desires": ["what they wish they had 1", "desire 2", ...]
  },
  "customerLanguage": ["exact phrases real customers use when talking about this problem or product category — pull from how people actually talk on Reddit, reviews, TikTok"],
  "purchaseTriggers": ["what makes them finally buy — the moment of decision"],
  "objections": ["concern 1 — and how to address it", "concern 2", ...],
  "positiveReactions": ["what surprised or delighted buyers after purchase 1", "reaction 2", ...],
  "emotionalDrivers": ["underlying emotional need 1", "driver 2", ...],
  "bestPlatforms": ["which social platforms this audience lives on, ranked"],
  "contentPreferences": "what type of content resonates — long/short, funny/serious, educational/emotional"
}`;

  const raw = await callAi(system, user);
  return parseJsonFromAi(raw);
}

// ── Viral Hook Scanning ─────────────────────────────────────────────────────

export interface HookScanInput {
  productCategory?: string;
  targetPlatform?: string;
  count?: number;
  adGoal?: string;
}

export async function generateViralHooks(input: HookScanInput) {
  const count = input.count || 10;
  const onesContext = getOnesProductContext();
  const system = `You are an expert on viral social media content, especially TikTok and Instagram Reels. You deeply understand what makes hooks stop the scroll — the psychology, the pacing, the exact words. You study viral product videos daily. Return your analysis as JSON.`;

  const user = `Generate ${count} viral hooks inspired by what's currently working on ${input.targetPlatform || 'TikTok'} for product promotion videos about this specific product:

${onesContext}

${input.adGoal ? `Campaign goal: ${input.adGoal}` : ''}

For each hook, study what makes top-performing UGC creators stop the scroll. Think about:
- The first 2-3 seconds that make someone pause scrolling
- The exact words, tone, and cadence that create curiosity
- Whether it's a question, statement, visual action, or pattern interrupt

Return as JSON array:
[
  {
    "hookText": "the exact opening line/action (first 2-3 seconds)",
    "style": "curiosity | problem_solution | storytelling | shock | transformation | social_proof | contrarian | confession",
    "speakingTone": "casual | excited | skeptical_then_convinced | deadpan | confessional | urgent_whisper | friend_to_friend",
    "whyItWorks": "1-2 sentence explanation of the psychology",
    "exampleStructure": "brief outline of how the full video would flow after this hook",
    "bestFor": "what type of product or message this hook works best with"
  }
]

Make each hook feel like something a real person would say — not a copywriter. Avoid overused influencer language like "game-changer", "obsessed", "trust me", "run don't walk", "holy grail". Study how real viral creators speak.`;

  const raw = await callAi(system, user);
  return parseJsonFromAi(raw);
}

// ── Script Generation ────────────────────────────────────────────────────────

export interface ScriptGenerationInput {
  campaignId: string;
  productName?: string;
  productBenefits?: string[];
  research?: any; // product + market research data
  selectedHooks?: Array<{ hookText: string; style: string; speakingTone: string }>;
  scriptType?: string; // testimonial, problem_solution, before_after, day_in_life
  count?: number;
  additionalDirection?: string;
  adGoal?: string;
  angleId?: string;
}

export async function generateScripts(input: ScriptGenerationInput) {
  const count = input.count || 3;
  const onesContext = getOnesProductContext();

  // If an angle was selected, inject its direction
  const angleContext = input.angleId
    ? getOnesScriptAngles().find(a => a.id === input.angleId)
    : null;

  const system = `You are a top-tier UGC script writer who creates authentic, conversion-focused video scripts for ONES personalized supplements. Your scripts sound like real people talking to camera — never corporate, never AI-sounding. Every script is broken into scenes for Kling 3.0 video generation, where each scene is 4-5 seconds with one short line of dialogue.

CRITICAL RULES:
- Each scene has ONE short line of dialogue that can be naturally spoken in 4-5 seconds
- Write in first person as if a real customer is talking to camera
- NEVER use: "game-changer", "lifesaver", "the best part?", "I can't live without it", "you need this", "trust me", "literally obsessed", "holy grail", "changed my life", "run don't walk", "before it sells out"
- NEVER mention TikTok, TikTok Shop, cart icons, flash sales, "selling out," or urgency/scarcity tactics
- CTA should be casual — just pointing people to a link like a normal person would
- The product is ONES — an AI-personalized supplement. Scripts should authentically convey the personalization angle.
- Return as JSON`;

  const hookContext = input.selectedHooks?.length
    ? `\n\nHook inspiration (use these styles/tones, adapt to ONES):\n${input.selectedHooks.map((h, i) => `${i + 1}. "${h.hookText}" (${h.style}, ${h.speakingTone})`).join('\n')}`
    : '';

  const researchContext = input.research
    ? `\n\nResearch insights:\n${JSON.stringify(input.research, null, 2).slice(0, 3000)}`
    : '';

  const angleDirection = angleContext
    ? `\n\nScript angle: "${angleContext.title}" — ${angleContext.angle}\nDescription: ${angleContext.description}`
    : '';

  const user = `Create ${count} UGC video scripts for this product:

${onesContext}

${input.adGoal ? `Campaign goal: ${input.adGoal}` : ''}
${input.scriptType ? `Script style: ${input.scriptType}` : 'Choose the best styles based on research'}
${input.additionalDirection ? `Additional direction: ${input.additionalDirection}` : ''}
${angleDirection}
${hookContext}
${researchContext}

Return as JSON:
{
  "scripts": [
    {
      "title": "short descriptive title",
      "scriptType": "testimonial | problem_solution | before_after | day_in_life | unboxing",
      "scenes": [
        {
          "sceneNumber": 1,
          "visualDescription": "what's happening visually in this scene",
          "dialogue": "the exact line spoken (must fit in 4-5 seconds)",
          "durationSeconds": 5,
          "cameraAngle": "medium shot / close-up / wide shot / etc.",
          "action": "one physical action the person does"
        }
      ],
      "totalDurationSeconds": 30,
      "totalScenes": 6,
      "rationale": "why you developed this script and what research/hooks inspired it",
      "toneNotes": "speaking style guidance for the actor/AI character"
    }
  ]
}`;

  const raw = await callAi(system, user, 12000);
  return parseJsonFromAi(raw);
}

// ── AI Character Suggestions ────────────────────────────────────────────────

export interface CharacterSuggestionInput {
  research?: any[];         // product + market research data
  hooks?: Array<{ hookText: string; style: string; speakingTone?: string }>;
  scripts?: Array<{ scriptType: string; toneNotes?: string; title?: string }>;
  targetAudience?: string;
  adGoal?: string;
  existingCharacters?: Array<{ name: string; demographics: string }>;
  count?: number;
}

export async function suggestCharacters(input: CharacterSuggestionInput) {
  const count = input.count || 3;
  const onesContext = getOnesProductContext();

  const system = `You are an expert UGC casting director. You design creator personas for product ad campaigns — real people your audience would trust and relate to. You understand that the character IS the ad: the wrong face, vibe, or setting kills credibility.

Return characters as JSON.`;

  const researchContext = input.research?.length
    ? `\n\nResearch insights:\n${JSON.stringify(input.research, null, 2).slice(0, 4000)}`
    : '';

  const hookContext = input.hooks?.length
    ? `\n\nHook styles being used:\n${input.hooks.map(h => `- "${h.hookText}" (${h.style}, ${h.speakingTone || 'casual'})`).join('\n')}`
    : '';

  const scriptContext = input.scripts?.length
    ? `\n\nScript types in use:\n${input.scripts.map(s => `- ${s.title || s.scriptType}${s.toneNotes ? ` (tone: ${s.toneNotes})` : ''}`).join('\n')}`
    : '';

  const existingContext = input.existingCharacters?.length
    ? `\n\nCharacters already created (avoid duplicating these):\n${input.existingCharacters.map(c => `- ${c.name}: ${c.demographics}`).join('\n')}`
    : '';

  const user = `Design ${count} distinct UGC creator characters for this product campaign:

${onesContext}

${input.adGoal ? `Campaign goal: ${input.adGoal}` : ''}
${input.targetAudience ? `Target audience: ${input.targetAudience}` : ''}
${researchContext}
${hookContext}
${scriptContext}
${existingContext}

For each character, think about:
- WHO would the target audience trust to recommend this product?
- What demographic makes the testimonial believable and relatable?
- What setting feels authentic (not staged, not studio)?
- What style says "I'm a real person sharing something I actually use"?
- Each character should appeal to a different segment of the target audience

Return as JSON:
{
  "characters": [
    {
      "name": "a realistic first name",
      "demographics": "age, gender, ethnicity, body type, occupation — specific and visual",
      "styleDescription": "clothing style, hair, overall visual vibe — describe what you'd see in a real TikTok",
      "settingDescription": "where they're filming — be specific and authentic (not 'modern apartment' but 'cluttered home office with a standing desk and half-empty coffee mug')",
      "personalityNotes": "how they speak, their energy, what makes them relatable — think actual creator archetypes",
      "whyThisCharacter": "1-2 sentences on why this person is credible for THIS product and THIS audience"
    }
  ]
}`;

  const raw = await callAi(system, user, 6000);
  return parseJsonFromAi(raw);
}

// ── Character Image Generation ───────────────────────────────────────────────

export interface CharacterImageInput {
  characterName: string;
  demographics: string;
  styleDescription: string;
  settingDescription: string;
  imageType: 'front_view' | 'side_view' | 'usage_view' | 'product_closeup' | 'lifestyle';
  productDescription?: string;
  brandAssetUrls?: string[];
  customPromptOverride?: string;
  referenceImageUrl?: string; // Face reference for identity-consistent generation (PuLID)
  imageModelId?: string; // optional model override for Priority 3 (fresh generation)
}

export async function generateCharacterImage(input: CharacterImageInput): Promise<{
  imageUrl: string;
  promptUsed: string;
  modelUsed: string;
}> {
  ensureFalConfigured();

  const viewPrompts: Record<string, string> = {
    front_view: `Full body front view portrait. Character facing camera directly, standing naturally, relaxed posture. ${input.productDescription ? `Holding/wearing ${input.productDescription}.` : ''}`,
    side_view: `Full body side profile view. Same character viewed from the side, natural standing pose. ${input.productDescription ? `Product visible in profile: ${input.productDescription}.` : ''}`,
    usage_view: `Character actively using the product in a natural, candid moment. ${input.productDescription ? `Demonstrating: ${input.productDescription}.` : ''}`,
    product_closeup: `Close-up shot focusing on the product in the character's hands. ${input.productDescription ? `Product: ${input.productDescription}.` : ''} Hands and product fill most of the frame.`,
    lifestyle: `Casual lifestyle moment. Character in a relaxed, authentic setting doing something natural. ${input.productDescription ? `Product subtly visible: ${input.productDescription}.` : ''}`,
  };

  const basePrompt = input.customPromptOverride || [
    `Realistic casual photo taken on a standard iPhone.`,
    `${input.demographics}. ${input.styleDescription}.`,
    viewPrompts[input.imageType] || viewPrompts.front_view,
    `Setting: ${input.settingDescription || 'cozy lived-in apartment, warm afternoon window light'}.`,
    `Visible skin texture, pores, natural imperfections.`,
    `No AI gloss, no smoothing, no airbrushed look.`,
    `No bokeh or background blur — everything in focus like a normal phone photo.`,
    `No dramatic studio lighting or rim lights.`,
    `Casual, organic, slightly imperfect — like a photo posted on TikTok or Instagram stories.`,
  ].join(' ');

  const negativePrompt = 'phone in hand, holding phone, selfie, professional photography, studio lighting, bokeh, background blur, airbrushed, smooth skin, illustration, cartoon, 3d render, digital art, painting, watermark, text, logo, deformed hands, extra fingers';

  let imageUrl: string;
  let modelUsed: string;

  // ── Priority 1: Face-consistent generation via PuLID ───────────────────
  // When a character has a reference image, use PuLID to preserve facial identity
  // across all subsequent generations (different angles, scenes, poses).
  if (input.referenceImageUrl) {
    modelUsed = 'fal-ai/pulid';
    logger.info(`[ugc] Using PuLID for face-consistent generation (ref: ${input.referenceImageUrl.slice(-30)})`);

    const result = await fal.subscribe('fal-ai/pulid', {
      input: {
        prompt: `${basePrompt} Avoid: ${negativePrompt}`,
        reference_images: [{ image_url: input.referenceImageUrl }],
        num_images: 1,
        negative_prompt: negativePrompt,
        guidance_scale: 1.2,
        id_scale: 0.8, // identity preservation strength (0-1, higher = closer to reference face)
        mode: 'fidelity',
        num_inference_steps: 12,
      },
    });
    imageUrl = (result.data as any)?.images?.[0]?.url;
    if (!imageUrl) throw new Error('PuLID face-consistent generation returned no URL');

  // ── Priority 2: Brand asset reference via nano-banana-2 ────────────────
  } else if (input.brandAssetUrls?.length) {
    // Validate that brand asset URLs are actually accessible and are real images
    const validUrls: string[] = [];
    for (const url of input.brandAssetUrls.slice(0, 5)) {
      try {
        const head = await fetch(url, { method: 'HEAD' });
        const ct = head.headers.get('content-type') || '';
        const cl = parseInt(head.headers.get('content-length') || '0', 10);
        if (head.ok && ct.startsWith('image/') && cl > 1000) {
          validUrls.push(url);
        } else {
          logger.warn(`[ugc] Skipping invalid brand asset: ${url} (status=${head.status}, type=${ct}, size=${cl})`);
        }
      } catch {
        logger.warn(`[ugc] Skipping unreachable brand asset: ${url}`);
      }
    }

    if (validUrls.length > 0) {
    modelUsed = 'fal-ai/nano-banana-2/edit';
    const result = await fal.subscribe('fal-ai/nano-banana-2/edit', {
      input: {
        prompt: basePrompt,
        image_urls: validUrls,
        aspect_ratio: '9:16',
        num_images: 1,
        output_format: 'png',
        resolution: '2K',
      },
    });
    imageUrl = (result.data as any)?.images?.[0]?.url;
    if (!imageUrl) throw new Error('Image generation returned no URL');
    } else {
      // All brand assets were invalid — fall through to FLUX/dev
      logger.warn('[ugc] All brand assets invalid, falling back to FLUX/dev');
      modelUsed = 'fal-ai/flux/dev';
      const result = await fal.subscribe('fal-ai/flux/dev', {
        input: {
          prompt: `${basePrompt} Avoid: ${negativePrompt}`,
          image_size: 'portrait_16_9',
          num_images: 1,
          num_inference_steps: 28,
          guidance_scale: 7,
        },
      });
      imageUrl = (result.data as any)?.images?.[0]?.url;
      if (!imageUrl) throw new Error('Image generation returned no URL');
    }

  // ── Priority 3: Fresh generation via FLUX/dev (or model override) ─────
  } else {
    modelUsed = input.imageModelId || 'fal-ai/flux/dev';
    const result = await fal.subscribe(modelUsed, {
      input: {
        prompt: `${basePrompt} Avoid: ${negativePrompt}`,
        image_size: 'portrait_16_9',
        num_images: 1,
        num_inference_steps: 28,
        guidance_scale: 7,
      },
    });
    imageUrl = (result.data as any)?.images?.[0]?.url;
    if (!imageUrl) throw new Error('Image generation returned no URL');
  }

  // Upload to Supabase for permanent storage
  const permanentUrl = await uploadToSupabase(imageUrl, 'ugc-character');

  return {
    imageUrl: permanentUrl,
    promptUsed: basePrompt,
    modelUsed,
  };
}

// ── Video Prompt Generation ──────────────────────────────────────────────────

export interface VideoPromptInput {
  script: {
    scenes: Array<{
      sceneNumber: number;
      visualDescription: string;
      dialogue: string;
      durationSeconds: number;
      cameraAngle?: string;
      action?: string;
    }>;
  };
  characterDescription?: string;
}

export async function generateVideoPrompts(input: VideoPromptInput) {
  const system = `You are an expert at writing Kling image-to-video prompts. You understand exactly how Kling works:

CRITICAL KLING RULES:
- Kling is an IMAGE-TO-VIDEO model. It generates SILENT video from a still image. It does NOT produce audio.
- Each generation takes ONE start frame image → produces a 5-10 second silent video clip.
- Dialogue will be added SEPARATELY via TTS + AI lip-sync in post-processing. Do NOT include spoken words in the prompt.
- Kling already sees the character, product, clothing, and setting from the start frame.
- Do NOT describe what's already visible in the image (no character descriptions, no room descriptions).
- Each prompt: 30-50 words MAXIMUM.
- Focus prompts on MOTION and EXPRESSION only — what the person physically does.
- For dialogue scenes: describe mouth moving, facial expressions, and gestures as if speaking. Example: "opens mouth and speaks animatedly, gestures with right hand, earnest expression"
- For non-dialogue scenes: describe the physical action clearly.
- Vary shot types between adjacent scenes.
- Do NOT use the word "same" (prevents scene transitions).
- Do NOT mention "iPhone", "selfie", "phone", "handheld".
- ONE action per shot maximum.
- No prop interactions (coffee mugs, books) — high hallucination risk in Kling.

GOOD prompt example: "Medium shot, cozy living room, warm window light. She looks at camera with earnest expression, opens mouth and speaks animatedly, gestures with one hand emphasizing a point. Subtle camera sway."

BAD prompt example (includes dialogue text): "She says: 'stop taking generic supplements'" — Kling cannot generate speech audio.

Return as JSON.`;

  const user = `Convert this script into individual Kling generation scenes. Each scene produces one 5-second silent video clip.

IMPORTANT: The dialogue listed below will be added via TTS voiceover + AI lip-sync AFTER video generation.
Your prompts should describe the CHARACTER'S PHYSICAL MOTION (speaking gestures, mouth movement, expressions) but must NOT include the actual dialogue words.

Script scenes:
${input.script.scenes.map(s => `Scene ${s.sceneNumber}: [${s.cameraAngle || 'medium shot'}] ${s.visualDescription} — Action: ${s.action || 'speaking to camera'} — Dialogue (for reference only, NOT for prompt): "${s.dialogue}"`).join('\n')}

Each scene gets its own 5-second video generation. Group scenes into batches of 3 for organizational purposes.

Return as JSON:
{
  "batches": [
    {
      "batchNumber": 1,
      "scenes": [
        {
          "sceneNumber": 1,
          "prompt": "30-50 word Kling prompt describing MOTION and EXPRESSION only — no dialogue text",
          "dialogue": "the exact dialogue text (will be added via TTS post-processing)",
          "shotType": "medium_shot | close_up | wide_shot | tight_closeup | low_angle",
          "cameraMotion": "static | slow_push_in | subtle_sway | pan_left | pull_back",
          "cameraMotionScale": 3,
          "durationSeconds": 5
        }
      ]
    }
  ],
  "negativePrompt": "suggested negative prompt for all shots (must include 'phone in hand, holding phone')",
  "cfgScale": 0.5,
  "resolution": "9:16 vertical",
  "technicalNotes": "any additional generation tips"
}`;

  const raw = await callAi(system, user, 8000);
  return parseJsonFromAi(raw);
}

// ── Kling Video Generation via fal.ai ────────────────────────────────────────

export interface KlingVideoInput {
  startFrameImageUrl: string;
  prompt: string;
  negativePrompt?: string;
  durationSeconds?: number;
  cfgScale?: number;
  aspectRatio?: string;
  videoModelId?: string; // optional model override
}

export async function generateKlingVideo(input: KlingVideoInput): Promise<{
  videoUrl: string;
  modelUsed: string;
}> {
  ensureFalConfigured();

  // Use Kling 2.1 master via fal.ai for best quality image-to-video generation.
  // This produces SILENT video — dialogue is added via TTS + lip-sync in post-processing.
  const modelId = input.videoModelId || 'fal-ai/kling-video/v2.1/master/image-to-video';

  logger.info(`[ugc] Generating Kling video: model=${modelId}, duration=${input.durationSeconds}s`);

  const result = await fal.subscribe(modelId, {
    input: {
      prompt: input.prompt,
      image_url: input.startFrameImageUrl,
      negative_prompt: input.negativePrompt || 'phone in hand, holding phone, blurry, out of focus, soft focus, motion blur, low quality, deformed, pixelated, grainy, overexposed',
      duration: input.durationSeconds === 10 ? '10' : '5',
      cfg_scale: Math.min(input.cfgScale || 0.7, 1),
    },
  });

  const videoUrl = (result.data as any)?.video?.url;
  if (!videoUrl) throw new Error('Kling video generation returned no URL');

  const permanentUrl = await uploadToSupabase(videoUrl, 'ugc-video');
  return { videoUrl: permanentUrl, modelUsed: modelId };
}

// ── Supabase Upload Helper ───────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'brand-assets';

async function ensureBucket() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
    });
  } catch { /* bucket may already exist */ }
}

export async function uploadBufferToSupabase(buf: Buffer, prefix: string, mimeType: string): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('Supabase not configured');
  await ensureBucket();

  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const isAudio = mimeType.includes('audio') || mimeType.includes('mpeg');
  const ext = isAudio ? 'mp3' : mimeType.includes('mp4') ? 'mp4' : isPng ? 'png' : 'jpg';
  const contentType = mimeType || (ext === 'mp3' ? 'audio/mpeg' : ext === 'mp4' ? 'video/mp4' : ext === 'png' ? 'image/png' : 'image/jpeg');
  const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: buf,
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Supabase upload failed: ${uploadRes.status} ${text}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
}

export async function uploadToSupabase(sourceUrl: string, prefix: string): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return sourceUrl;

  try {
    await ensureBucket();
    const resp = await fetch(sourceUrl);
    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());

    // Detect format from magic bytes
    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
    const ext = isPng ? 'png' : sourceUrl.includes('.mp4') || sourceUrl.includes('video') ? 'mp4' : 'jpg';
    const contentType = ext === 'mp4' ? 'video/mp4' : ext === 'png' ? 'image/png' : 'image/jpeg';

    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: new Uint8Array(buf),
    });

    if (uploadRes.ok) {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
      logger.info(`[ugc] Uploaded to Supabase: ${publicUrl}`);
      return publicUrl;
    }
    logger.warn(`[ugc] Supabase upload failed, returning source URL`);
  } catch (err: any) {
    logger.warn(`[ugc] Supabase upload error: ${err.message}`);
  }
  return sourceUrl;
}
