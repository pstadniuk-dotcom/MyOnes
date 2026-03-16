/**
 * Deep Scrape Tool — Visit a prospect's page with Playwright to extract
 * contact info, form fields, and additional context
 *
 * This is the second pass after web search finds a prospect URL.
 * It loads the actual page and extracts emails, forms, and metadata
 * that the web search summary might have missed.
 */
import { type Page } from 'playwright';
import logger from '../../../infra/logging/logger';
import { acquireContext, releaseContext, closeBrowserPool } from './browser-pool';
import type { AgentTool } from '../agent-runner';

export interface DeepScrapeResult {
  url: string;
  emails: string[];
  formUrl: string | null;
  formFields: Array<{
    id: string;
    label: string;
    type: string;
    name: string;
    required: boolean;
  }>;
  hostName: string | null;
  publicationName: string | null;
  audienceSignals: string | null;
  pageTitle: string;
  contactPages: string[];
  hasGuestForm: boolean;
  scrapedAt: string;
}

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const IGNORE_EMAILS = new Set([
  'example@example.com',
  'email@example.com',
  'your@email.com',
  'name@domain.com',
  'user@example.com',
  'test@test.com',
]);

/** @deprecated Use closeBrowserPool() from browser-pool.ts instead */
export async function closeBrowser(): Promise<void> {
  await closeBrowserPool();
}

/**
 * Create the deep scrape tool for the agent runner
 */
export function createDeepScrapeTool(): AgentTool {
  return {
    name: 'deep_scrape',
    description: 'Visit a prospect URL with a browser to extract contact emails, submission forms, and additional details not available from web search alone.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to visit and scrape',
        },
        lookForContactPage: {
          type: 'boolean',
          description: 'Whether to also check /contact and /about pages for emails (default: true)',
        },
      },
      required: ['url'],
    },
    execute: async (args: { url: string; lookForContactPage?: boolean }) => {
      return executeDeepScrape(args.url, args.lookForContactPage !== false);
    },
  };
}

/**
 * Deep scrape a single URL for contact info and form fields
 */
export async function executeDeepScrape(
  url: string,
  lookForContactPage: boolean = true,
): Promise<DeepScrapeResult> {
  const context = await acquireContext();
  const page = await context.newPage();

  const result: DeepScrapeResult = {
    url,
    emails: [],
    formUrl: null,
    formFields: [],
    hostName: null,
    publicationName: null,
    audienceSignals: null,
    pageTitle: '',
    contactPages: [],
    hasGuestForm: false,
    scrapedAt: new Date().toISOString(),
  };

  try {
    logger.info(`[deep-scrape] Visiting: ${url}`);

    // Visit the main page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000); // Let JS render

    result.pageTitle = await page.title();

    // Extract emails from page content
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    const bodyHtml = await page.evaluate(() => document.body?.innerHTML || '');
    const emailsFromText = extractEmails(bodyText);
    const emailsFromHtml = extractEmails(bodyHtml);
    const mailtoEmails = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href^="mailto:"]'))
        .map(a => a.getAttribute('href')?.replace('mailto:', '').split('?')[0] || '')
        .filter(Boolean);
    });
    result.emails = [...new Set([...emailsFromText, ...emailsFromHtml, ...mailtoEmails])];

    // Check for forms (main page + iframes)
    const formFields = await detectFormFields(page);
    if (formFields.length > 0) {
      result.hasGuestForm = true;
      result.formUrl = url;
      result.formFields = formFields;
    }

    // Check iframes for embedded forms (JotForm, Typeform, etc.)
    if (formFields.length === 0) {
      const iframeFields = await detectIframeFormFields(page);
      if (iframeFields.length > 0) {
        result.hasGuestForm = true;
        result.formUrl = url;
        result.formFields = iframeFields;
      }
    }

    // Look for contact page links
    if (lookForContactPage && result.emails.length === 0) {
      const contactLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .filter(a => {
            const href = (a.getAttribute('href') || '').toLowerCase();
            const text = (a.textContent || '').toLowerCase();
            return (
              href.includes('/contact') ||
              href.includes('/about') ||
              href.includes('/team') ||
              text.includes('contact') ||
              text.includes('get in touch')
            );
          })
          .map(a => a.href)
          .filter(h => h.startsWith('http'))
          .slice(0, 3); // max 3 contact pages
      });

      result.contactPages = contactLinks;

      // Visit contact pages to find emails
      for (const contactUrl of contactLinks) {
        try {
          await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForTimeout(1000);
          const contactText = await page.evaluate(() => document.body?.innerText || '');
          const contactEmails = extractEmails(contactText);
          const contactMailtos = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href^="mailto:"]'))
              .map(a => a.getAttribute('href')?.replace('mailto:', '').split('?')[0] || '')
              .filter(Boolean);
          });
          result.emails.push(...contactEmails, ...contactMailtos);
        } catch {
          // Contact page failed to load, skip
        }
      }

      result.emails = [...new Set(result.emails)];
    }

    logger.info(`[deep-scrape] Done: ${result.emails.length} emails, ${result.formFields.length} form fields from ${url}`);

  } catch (err: any) {
    logger.warn(`[deep-scrape] Failed to scrape ${url}: ${err.message}`);
  } finally {
    await releaseContext(context);
  }

  return result;
}

/**
 * Extract valid emails from text, filtering out common junk
 */
function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) || [];
  return matches.filter(email => {
    const lower = email.toLowerCase();
    return (
      !IGNORE_EMAILS.has(lower) &&
      !lower.endsWith('.png') &&
      !lower.endsWith('.jpg') &&
      !lower.endsWith('.svg') &&
      !lower.includes('sentry') &&
      !lower.includes('webpack') &&
      !lower.includes('wixpress')
    );
  });
}

/**
 * Detect form fields on a page
 */
async function detectFormFields(page: Page): Promise<DeepScrapeResult['formFields']> {
  return page.evaluate(() => {
    const fields: Array<{
      id: string;
      label: string;
      type: string;
      name: string;
      required: boolean;
    }> = [];

    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((el) => {
      const input = el as HTMLInputElement;
      const type = input.type || input.tagName.toLowerCase();
      if (['hidden', 'submit', 'button', 'search'].includes(type)) return;

      // Find label
      let label = '';
      if (input.id) {
        const labelEl = document.querySelector(`label[for="${input.id}"]`);
        if (labelEl) label = labelEl.textContent?.trim() || '';
      }
      if (!label) {
        const parent = input.closest('.form-group, .field, [class*="field"], [class*="form"]');
        if (parent) {
          const labelEl = parent.querySelector('label, .label, [class*="label"]');
          if (labelEl) label = labelEl.textContent?.trim() || '';
        }
      }
      if (!label) {
        label = input.placeholder || input.name || input.id || '';
      }

      fields.push({
        id: input.id || input.name || `field_${fields.length}`,
        label: label.substring(0, 100),
        type,
        name: input.name || '',
        required: input.required || input.getAttribute('aria-required') === 'true',
      });
    });

    return fields;
  });
}

/**
 * Detect form fields inside iframes (JotForm, Typeform, etc.)
 */
async function detectIframeFormFields(page: Page): Promise<DeepScrapeResult['formFields']> {
  const frames = page.frames();
  for (const frame of frames) {
    if (frame === page.mainFrame()) continue;
    try {
      const fields = await frame.evaluate(() => {
        const result: Array<{
          id: string;
          label: string;
          type: string;
          name: string;
          required: boolean;
        }> = [];

        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach((el) => {
          const input = el as HTMLInputElement;
          const type = input.type || input.tagName.toLowerCase();
          if (['hidden', 'submit', 'button', 'search'].includes(type)) return;

          let label = '';
          if (input.id) {
            const labelEl = document.querySelector(`label[for="${input.id}"]`);
            if (labelEl) label = labelEl.textContent?.trim() || '';
          }
          if (!label) label = input.placeholder || input.name || input.id || '';

          result.push({
            id: input.id || input.name || `field_${result.length}`,
            label: label.substring(0, 100),
            type,
            name: input.name || '',
            required: input.required,
          });
        });

        return result;
      });

      if (fields.length > 0) return fields;
    } catch {
      // Frame not accessible (cross-origin), skip
    }
  }
  return [];
}
