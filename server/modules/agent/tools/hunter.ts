/**
 * Hunter.io Integration — Domain search, email finder, and email verification
 *
 * Uses Hunter.io v2 API to:
 * 1. Domain Search — find all emails at a domain (e.g. wholelfodsmagazine.com)
 * 2. Email Finder — find a specific person's email by name + domain
 * 3. Email Verifier — verify an email address is deliverable
 *
 * Replaces the unreliable OpenAI web-search approach for email discovery.
 */
import logger from '../../../infra/logging/logger';

const HUNTER_BASE = 'https://api.hunter.io/v2';

function getApiKey(): string | null {
  return process.env.HUNTER_API_KEY || null;
}

export function isHunterConfigured(): boolean {
  return !!getApiKey();
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface HunterEmail {
  value: string;           // the email address
  type: 'personal' | 'generic';
  confidence: number;      // 0-100
  firstName: string | null;
  lastName: string | null;
  position: string | null; // "Editor", "Staff Writer", etc.
  department: string | null;
  linkedin: string | null;
  twitter: string | null;
  sources: Array<{ domain: string; uri: string }>;
}

export interface DomainSearchResult {
  domain: string;
  organization: string | null;
  emails: HunterEmail[];
  pattern: string | null;  // e.g. "{first}.{last}" — the email pattern at this domain
  total: number;           // total emails Hunter has for this domain
}

export interface EmailFinderResult {
  email: string;
  confidence: number;
  firstName: string;
  lastName: string;
  position: string | null;
  domain: string;
}

export interface EmailVerifyResult {
  email: string;
  result: 'deliverable' | 'undeliverable' | 'risky' | 'unknown';
  score: number;           // 0-100
  regexp: boolean;
  mx_records: boolean;
  smtp_server: boolean;
  smtp_check: boolean;
  accept_all: boolean;
  block: boolean;
  sources: number;
}

// ── API Helpers ──────────────────────────────────────────────────────────────

async function hunterFetch<T>(endpoint: string, params: Record<string, string>): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.warn('[hunter] HUNTER_API_KEY not configured');
    return null;
  }

  const url = new URL(`${HUNTER_BASE}/${endpoint}`);
  url.searchParams.set('api_key', apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15000),
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const body = await response.text();
      // Handle rate limits gracefully
      if (response.status === 429) {
        logger.warn(`[hunter] Rate limited on ${endpoint}`);
        return null;
      }
      // Handle quota exhaustion
      if (response.status === 402) {
        logger.warn(`[hunter] Quota exhausted on ${endpoint}`);
        return null;
      }
      logger.warn(`[hunter] ${endpoint} returned ${response.status}: ${body.substring(0, 200)}`);
      return null;
    }

    const json = await response.json() as { data: T; errors?: any[] };
    if (json.errors?.length) {
      logger.warn(`[hunter] ${endpoint} errors: ${JSON.stringify(json.errors)}`);
      return null;
    }
    return json.data;
  } catch (err: any) {
    logger.warn(`[hunter] ${endpoint} request failed: ${err.message}`);
    return null;
  }
}

// ── Domain Search ────────────────────────────────────────────────────────────

/**
 * Search for all known emails at a domain.
 * Returns personal emails first (editors, writers), then generic (info@, contact@).
 *
 * Hunter free tier: 25 requests/month. Use judiciously.
 */
export async function domainSearch(domain: string): Promise<DomainSearchResult | null> {
  logger.info(`[hunter] Domain search: ${domain}`);

  const raw = await hunterFetch<any>('domain-search', {
    domain,
    type: 'personal',  // prioritize personal emails over generic
    limit: '10',
  });

  if (!raw) return null;

  const emails: HunterEmail[] = (raw.emails || []).map((e: any) => ({
    value: e.value,
    type: e.type || 'generic',
    confidence: e.confidence || 0,
    firstName: e.first_name || null,
    lastName: e.last_name || null,
    position: e.position || null,
    department: e.department || null,
    linkedin: e.linkedin || null,
    twitter: e.twitter || null,
    sources: (e.sources || []).map((s: any) => ({ domain: s.domain, uri: s.uri })),
  }));

  // Sort: personal first, then by confidence desc
  emails.sort((a, b) => {
    if (a.type === 'personal' && b.type !== 'personal') return -1;
    if (a.type !== 'personal' && b.type === 'personal') return 1;
    return b.confidence - a.confidence;
  });

  return {
    domain,
    organization: raw.organization || null,
    emails,
    pattern: raw.pattern || null,
    total: raw.meta?.results ?? emails.length,
  };
}

// ── Email Finder ─────────────────────────────────────────────────────────────

/**
 * Find a specific person's email at a domain using their name.
 * Most accurate when you have first + last name from journalist discovery.
 */
export async function findEmail(
  domain: string,
  firstName: string,
  lastName: string,
): Promise<EmailFinderResult | null> {
  logger.info(`[hunter] Email finder: ${firstName} ${lastName} @ ${domain}`);

  const raw = await hunterFetch<any>('email-finder', {
    domain,
    first_name: firstName,
    last_name: lastName,
  });

  if (!raw?.email) return null;

  return {
    email: raw.email,
    confidence: raw.confidence || 0,
    firstName: raw.first_name || firstName,
    lastName: raw.last_name || lastName,
    position: raw.position || null,
    domain,
  };
}

// ── Email Verifier ───────────────────────────────────────────────────────────

/**
 * Verify whether an email address is real and deliverable.
 * Use this as a final gate before saving any email to the DB.
 *
 * Returns null if verification fails (treat as "don't trust it").
 */
export async function verifyEmail(email: string): Promise<EmailVerifyResult | null> {
  logger.info(`[hunter] Verifying: ${email}`);

  const raw = await hunterFetch<any>('email-verifier', { email });
  if (!raw) return null;

  return {
    email: raw.email || email,
    result: raw.result || 'unknown',
    score: raw.score ?? 0,
    regexp: raw.regexp ?? false,
    mx_records: raw.mx_records ?? false,
    smtp_server: raw.smtp_server ?? false,
    smtp_check: raw.smtp_check ?? false,
    accept_all: raw.accept_all ?? false,
    block: raw.block ?? false,
    sources: raw.sources ?? 0,
  };
}

// ── High-Level Helpers ───────────────────────────────────────────────────────

/**
 * Best-effort email discovery for a prospect domain.
 *
 * Strategy:
 * 1. Domain search for personal emails (editors, health writers)
 * 2. Pick the best match by relevance to health/supplements/nutrition
 * 3. Verify the email before returning
 *
 * Returns the best verified email, or null.
 */
export async function findBestEmail(
  domain: string,
  preferredRoles?: string[],
): Promise<{ email: string; name: string | null; position: string | null; confidence: number } | null> {
  const result = await domainSearch(domain);
  if (!result || result.emails.length === 0) return null;

  const healthKeywords = /health|wellness|nutrition|supplement|fitness|editorial|editor|writer|content|reporter|journalist/i;
  const defaultRoles = preferredRoles || [];

  // Score each email for relevance to our outreach
  const scored = result.emails
    .filter(e => e.confidence >= 30)
    .map(e => {
      let relevance = e.confidence;

      // Boost personal over generic
      if (e.type === 'personal') relevance += 20;

      // Boost health/editorial roles
      if (e.position && healthKeywords.test(e.position)) relevance += 30;
      if (e.department && healthKeywords.test(e.department)) relevance += 15;

      // Boost if position matches preferred roles
      if (e.position && defaultRoles.some(r => e.position!.toLowerCase().includes(r.toLowerCase()))) {
        relevance += 25;
      }

      return { ...e, relevance };
    })
    .sort((a, b) => b.relevance - a.relevance);

  // Try top candidates and verify
  for (const candidate of scored.slice(0, 3)) {
    const verification = await verifyEmail(candidate.value);

    if (verification && (verification.result === 'deliverable' || verification.result === 'risky' && verification.score >= 60)) {
      const name = [candidate.firstName, candidate.lastName].filter(Boolean).join(' ') || null;
      logger.info(`[hunter] Best email for ${domain}: ${candidate.value} (${candidate.type}, confidence: ${candidate.confidence}, verified: ${verification.result})`);
      return {
        email: candidate.value,
        name,
        position: candidate.position,
        confidence: candidate.confidence,
      };
    } else {
      logger.info(`[hunter] Skipping ${candidate.value} — verification: ${verification?.result || 'failed'} (score: ${verification?.score || 0})`);
    }
  }

  // Fallback: return highest-confidence unverified email if verification API is exhausted
  // but only if it's personal and high confidence
  const fallback = scored.find(e => e.type === 'personal' && e.confidence >= 80);
  if (fallback) {
    const name = [fallback.firstName, fallback.lastName].filter(Boolean).join(' ') || null;
    logger.info(`[hunter] Fallback email for ${domain}: ${fallback.value} (unverified, confidence: ${fallback.confidence})`);
    return {
      email: fallback.value,
      name,
      position: fallback.position,
      confidence: fallback.confidence,
    };
  }

  return null;
}

/**
 * Find a specific person's email and verify it.
 * Use when you already have a journalist's name from discovery.
 */
export async function findAndVerifyPersonEmail(
  domain: string,
  firstName: string,
  lastName: string,
): Promise<{ email: string; confidence: number; verified: boolean } | null> {
  const found = await findEmail(domain, firstName, lastName);
  if (!found || found.confidence < 30) return null;

  const verification = await verifyEmail(found.email);
  const isGood = verification
    ? (verification.result === 'deliverable' || (verification.result === 'risky' && verification.score >= 60))
    : false;

  if (!isGood && found.confidence < 70) {
    logger.info(`[hunter] Rejecting ${found.email} — low confidence (${found.confidence}) and verification failed`);
    return null;
  }

  return {
    email: found.email,
    confidence: found.confidence,
    verified: isGood,
  };
}
