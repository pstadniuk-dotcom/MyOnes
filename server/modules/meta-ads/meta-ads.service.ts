/**
 * Meta Ads Service — Manages ad creative generation, campaign creation,
 * and publishing to Meta Marketing API.
 *
 * Flow:
 *   1. Admin uploads creative images
 *   2. AI generates ad copy (primary text, headlines, descriptions)
 *   3. Admin reviews/edits, then publishes to Meta
 *   4. Service creates campaign → ad set → ad creative → ad in Meta
 */
import OpenAI from 'openai';
import { logger } from '../../infra/logging/logger';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdCopyVariant {
  primaryText: string;
  headline: string;
  description: string;
}

export interface MetaAdCreative {
  id: string;
  imageUrl: string;         // URL of the uploaded creative image
  imageBase64?: string;     // Temporary base64 for vision analysis
  variants: AdCopyVariant[];
  selectedVariant: number;  // Index of chosen variant
  status: 'draft' | 'ready' | 'published' | 'error';
  metaAdId?: string;        // Meta ad ID after publishing
  errorMessage?: string;
  createdAt: Date;
}

export interface MetaCampaignConfig {
  name: string;
  objective: 'OUTCOME_AWARENESS' | 'OUTCOME_TRAFFIC' | 'OUTCOME_ENGAGEMENT' | 'OUTCOME_LEADS' | 'OUTCOME_SALES';
  dailyBudgetCents: number;     // Budget in cents (e.g., 2000 = $20.00)
  startDate?: string;            // ISO date
  endDate?: string;              // ISO date
  targetUrl: string;             // Landing page URL
  callToAction: string;          // e.g., "LEARN_MORE", "SHOP_NOW", "SIGN_UP"
  /** Facebook Page ID to run ads under */
  pageId: string;
  /** Instagram Account ID (optional) */
  instagramAccountId?: string;
  /** Targeting */
  targeting: {
    ageMin: number;
    ageMax: number;
    genders: number[];            // 1=male, 2=female, 0=all
    countries: string[];          // e.g., ['US', 'CA']
    interests?: string[];         // Interest targeting keywords
  };
}

export interface MetaPublishResult {
  campaignId: string;
  adSetId: string;
  adCreativeId: string;
  adId: string;
}

// ── AI Ad Copy Generation ────────────────────────────────────────────────────

/**
 * Generate ad copy variants using GPT-4o's vision capabilities.
 * Analyzes the creative image and produces multiple copy options.
 */
export async function generateAdCopy(
  imageBase64: string,
  mimeType: string,
  brandContext?: string,
): Promise<AdCopyVariant[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for ad copy generation');

  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are an expert Meta Ads copywriter for ONES, a premium personalized supplement brand.
Your job is to analyze creative images and write compelling ad copy.

Brand voice: Clean, science-backed, personal, premium. Never use hype or clickbait.
Target audience: Health-conscious adults 25-55 who want personalized nutrition.

For each image, generate exactly 3 variants of ad copy. Each variant must include:
1. primaryText — The main ad body (1-3 sentences, max 125 characters for optimal display)
2. headline — Short punchy headline (max 40 characters)
3. description — Supporting description (max 30 characters)

${brandContext ? `Additional brand context: ${brandContext}` : ''}

Return ONLY valid JSON array with no markdown formatting:
[
  { "primaryText": "...", "headline": "...", "description": "..." },
  { "primaryText": "...", "headline": "...", "description": "..." },
  { "primaryText": "...", "headline": "...", "description": "..." }
]`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this ad creative image and generate 3 ad copy variants for Meta Ads.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    max_tokens: 1000,
    temperature: 0.8,
  });

  const content = response.choices[0]?.message?.content?.trim() || '[]';

  // Parse JSON — strip markdown fences if present
  const jsonStr = content.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
  const variants: AdCopyVariant[] = JSON.parse(jsonStr);

  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error('AI returned invalid ad copy format');
  }

  return variants;
}

// ── Meta Marketing API Integration ──────────────────────────────────────────

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

async function metaApiRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('META_ACCESS_TOKEN is not configured');

  const url = `${META_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };

  const fetchOptions: RequestInit = { method, headers };

  if (body && method === 'POST') {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);
  const data = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    const errorObj = data.error as Record<string, unknown> | undefined;
    const msg = errorObj?.message || JSON.stringify(data);
    logger.error('[meta-ads] API error', { endpoint, status: res.status, error: msg });
    throw new Error(`Meta API error: ${msg}`);
  }

  return data;
}

/**
 * Verify the Meta access token and return connected ad accounts.
 */
export async function verifyMetaConnection(): Promise<{
  connected: boolean;
  userName?: string;
  adAccounts?: Array<{ id: string; name: string; accountId: string }>;
}> {
  try {
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) return { connected: false };

    const me = await metaApiRequest('/me?fields=name') as { name?: string; id?: string };
    const adAccountsRes = await metaApiRequest('/me/adaccounts?fields=name,account_id') as {
      data?: Array<{ id: string; name: string; account_id: string }>;
    };

    return {
      connected: true,
      userName: me.name,
      adAccounts: adAccountsRes.data?.map((a) => ({
        id: a.id,
        name: a.name,
        accountId: a.account_id,
      })),
    };
  } catch (err: any) {
    logger.warn('[meta-ads] Connection verification failed', { error: err.message });
    return { connected: false };
  }
}

/**
 * Upload an image to Meta and get an image hash for ad creative.
 */
export async function uploadImageToMeta(
  adAccountId: string,
  imageBase64: string,
): Promise<string> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('META_ACCESS_TOKEN is not configured');

  const url = `${META_BASE_URL}/${adAccountId}/adimages`;

  // Meta expects multipart form data with the image bytes
  const formData = new FormData();
  formData.append('access_token', token);

  // Convert base64 to blob for upload
  const binaryStr = atob(imageBase64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'image/png' });
  formData.append('filename', blob, 'creative.png');

  const res = await fetch(url, { method: 'POST', body: formData });
  const data = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    const errorObj = data.error as Record<string, unknown> | undefined;
    throw new Error(`Image upload failed: ${errorObj?.message || JSON.stringify(data)}`);
  }

  // Response contains: { images: { "creative.png": { hash: "..." } } }
  const images = data.images as Record<string, { hash: string }> | undefined;
  const firstImage = images ? Object.values(images)[0] : undefined;
  if (!firstImage?.hash) {
    throw new Error('No image hash returned from Meta');
  }

  logger.info('[meta-ads] Image uploaded', { adAccountId, hash: firstImage.hash });
  return firstImage.hash;
}

/**
 * Create a full campaign with ad set and ad in Meta.
 * This is the main publish function that orchestrates the entire flow.
 */
export async function publishCampaign(
  adAccountId: string,
  config: MetaCampaignConfig,
  imageHash: string,
  copy: AdCopyVariant,
): Promise<MetaPublishResult> {
  logger.info('[meta-ads] Creating campaign', { name: config.name, adAccountId });

  // 1. Create Campaign
  const campaign = await metaApiRequest(`/${adAccountId}/campaigns`, 'POST', {
    name: config.name,
    objective: config.objective,
    status: 'PAUSED',   // Start paused so admin can review in Meta
    special_ad_categories: [],
  }) as { id: string };

  logger.info('[meta-ads] Campaign created', { campaignId: campaign.id });

  // 2. Create Ad Set
  const adSetPayload: Record<string, unknown> = {
    name: `${config.name} - Ad Set`,
    campaign_id: campaign.id,
    daily_budget: config.dailyBudgetCents,
    billing_event: 'IMPRESSIONS',
    optimization_goal: config.objective === 'OUTCOME_TRAFFIC' ? 'LINK_CLICKS' : 'IMPRESSIONS',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    status: 'PAUSED',
    targeting: {
      age_min: config.targeting.ageMin,
      age_max: config.targeting.ageMax,
      genders: config.targeting.genders,
      geo_locations: {
        countries: config.targeting.countries,
      },
      ...(config.targeting.interests?.length ? {
        flexible_spec: [{
          interests: config.targeting.interests.map((name) => ({ name })),
        }],
      } : {}),
    },
  };

  if (config.startDate) adSetPayload.start_time = config.startDate;
  if (config.endDate) adSetPayload.end_time = config.endDate;

  const adSet = await metaApiRequest(`/${adAccountId}/adsets`, 'POST', adSetPayload) as { id: string };

  logger.info('[meta-ads] Ad Set created', { adSetId: adSet.id });

  // 3. Create Ad Creative
  const adCreative = await metaApiRequest(`/${adAccountId}/adcreatives`, 'POST', {
    name: `${config.name} - Creative`,
    object_story_spec: {
      page_id: config.pageId,
      link_data: {
        image_hash: imageHash,
        link: config.targetUrl,
        message: copy.primaryText,
        name: copy.headline,
        description: copy.description,
        call_to_action: {
          type: config.callToAction,
          value: { link: config.targetUrl },
        },
      },
    },
  }) as { id: string };

  logger.info('[meta-ads] Ad Creative created', { adCreativeId: adCreative.id });

  // 4. Create Ad
  const ad = await metaApiRequest(`/${adAccountId}/ads`, 'POST', {
    name: `${config.name} - Ad`,
    adset_id: adSet.id,
    creative: { creative_id: adCreative.id },
    status: 'PAUSED',
  }) as { id: string };

  logger.info('[meta-ads] Ad created', { adId: ad.id });

  return {
    campaignId: campaign.id,
    adSetId: adSet.id,
    adCreativeId: adCreative.id,
    adId: ad.id,
  };
}

/**
 * Get campaigns list from Meta for the ad account.
 */
export async function listMetaCampaigns(
  adAccountId: string,
): Promise<Array<{ id: string; name: string; status: string; objective: string }>> {
  const data = await metaApiRequest(
    `/${adAccountId}/campaigns?fields=name,status,objective&limit=25`,
  ) as { data?: Array<{ id: string; name: string; status: string; objective: string }> };
  return data.data || [];
}
