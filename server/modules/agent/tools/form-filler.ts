/**
 * Form Filler — AI-powered form detection, mapping, and filling
 *
 * For prospects that use submission forms (podcast guest applications, etc.),
 * this module:
 * 1. Detects all form fields on the page (including iframes)
 * 2. Uses AI to map prospect/founder data to form fields
 * 3. Fills the form fields
 * 4. Auto-submits if no CAPTCHA detected (when autoSubmit=true)
 * 5. Takes screenshots at each stage for review
 * 6. Saves form answers to pitch record for audit trail
 */
import { type Page, type Frame } from 'playwright';
import OpenAI from 'openai';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import logger from '../../../infra/logging/logger';
import { acquireContext, releaseContext, closeBrowserPool } from './browser-pool';
import { getFounderProfile, type FounderProfile } from '../founder-context';
import { agentRepository } from '../agent.repository';
import type { OutreachProspect, OutreachPitch } from '@shared/schema';

// Dynamic playwright import — it's a devDependency and may not be available in production
type PlaywrightTypes = typeof import('playwright');
let playwrightModule: PlaywrightTypes | null = null;
async function getPlaywright(): Promise<PlaywrightTypes> {
  if (!playwrightModule) {
    try {
      playwrightModule = await import('playwright');
    } catch {
      throw new Error(
        'Playwright is not installed. Form filling requires Playwright. ' +
        'Install it with: npm install playwright && npx playwright install chromium'
      );
    }
  }
  return playwrightModule;
}

// Use 'any' for browser types since playwright may not be available at import time
type Browser = any;
type Page = any;
type Frame = any;

export interface FormField {
  id: string;
  label: string;
  type: string;
  name: string;
  required: boolean;
  options?: string[]; // For select/radio fields
}

export interface FormFillResult {
  url: string;
  fieldsDetected: number;
  fieldsFilled: number;
  hasCaptcha: boolean;
  hasIframe: boolean;
  submitted: boolean;
  submitButtonText: string | null;
  fieldMappings: Array<{
    fieldLabel: string;
    fieldId: string;
    value: string;
    filled: boolean;
  }>;
  screenshotPath: string | null;
  errors: string[];
}

/** @deprecated Use closeBrowserPool() from browser-pool.ts instead */
export async function closeBrowser(): Promise<void> {
  await closeBrowserPool();
}

const SCREENSHOTS_DIR = join(process.cwd(), 'data', 'form-screenshots');

/**
 * Detect and fill a form for a prospect.
 * When autoSubmit is true and no CAPTCHA is detected, the form will be submitted.
 */
export async function detectAndFillForm(
  prospect: OutreachProspect,
  pitch: OutreachPitch,
  options: { autoSubmit?: boolean; screenshotDir?: string } = {},
): Promise<FormFillResult> {
  const formUrl = prospect.contactFormUrl || prospect.url;
  const profile = await getFounderProfile();
  const context = await acquireContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const screenshotDir = options.screenshotDir || SCREENSHOTS_DIR;
  if (!existsSync(screenshotDir)) {
    mkdirSync(screenshotDir, { recursive: true });
  }

  const result: FormFillResult = {
    url: formUrl,
    fieldsDetected: 0,
    fieldsFilled: 0,
    hasCaptcha: false,
    hasIframe: false,
    submitted: false,
    submitButtonText: null,
    fieldMappings: [],
    screenshotPath: null,
    errors: [],
  };

  try {
    logger.info(`[form-filler] Loading form: ${formUrl}`);
    await page.goto(formUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000); // Let JS render

    // Detect CAPTCHA
    result.hasCaptcha = await detectCaptcha(page);

    // Try main page first, then iframes
    let fields = await extractFormFields(page.mainFrame());
    let targetFrame: Frame = page.mainFrame();

    if (fields.length === 0) {
      // Check iframes (JotForm, Typeform, etc.)
      for (const frame of page.frames()) {
        if (frame === page.mainFrame()) continue;
        try {
          const iframeFields = await extractFormFields(frame);
          if (iframeFields.length > 0) {
            fields = iframeFields;
            targetFrame = frame;
            result.hasIframe = true;
            break;
          }
        } catch {
          // Cross-origin iframe, skip
        }
      }
    }

    result.fieldsDetected = fields.length;

    if (fields.length === 0) {
      result.errors.push('No form fields detected on page');
      // Take screenshot of the empty page for debugging
      const slug = (prospect.name || 'unknown').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      try {
        const ssPath = join(screenshotDir, `${slug}-no-fields-${Date.now()}.png`);
        await page.screenshot({ path: ssPath, fullPage: true });
        result.screenshotPath = ssPath;
      } catch { /* screenshot is best-effort */ }
      await context.close();
      return result;
    }

    // Use AI to map fields to values
    const mappings = await mapFieldsWithAI(fields, prospect, pitch, profile);

    // Fill each field
    for (const mapping of mappings) {
      try {
        const filled = await fillField(targetFrame, mapping.fieldId, mapping.value, mapping.fieldType);
        result.fieldMappings.push({
          fieldLabel: mapping.fieldLabel,
          fieldId: mapping.fieldId,
          value: mapping.value.substring(0, 100),
          filled,
        });
        if (filled) result.fieldsFilled++;
      } catch (err: any) {
        result.fieldMappings.push({
          fieldLabel: mapping.fieldLabel,
          fieldId: mapping.fieldId,
          value: mapping.value.substring(0, 100),
          filled: false,
        });
        result.errors.push(`Failed to fill "${mapping.fieldLabel}": ${err.message}`);
      }
    }

    // Detect submit button
    result.submitButtonText = await detectSubmitButton(targetFrame);

    // Save form answers to pitch record
    const formAnswers: Record<string, string> = {};
    for (const m of mappings) {
      formAnswers[m.fieldLabel] = m.value;
    }
    await agentRepository.updatePitch(pitch.id, { formAnswers });

    // Take screenshot of filled form (before submit)
    const slug = (prospect.name || 'unknown').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    try {
      const ssPath = join(screenshotDir, `${slug}-filled-${Date.now()}.png`);
      await page.screenshot({ path: ssPath, fullPage: true });
      result.screenshotPath = ssPath;
      logger.info(`[form-filler] Screenshot saved: ${ssPath}`);
      // Save filled screenshot path to pitch record
      await agentRepository.updatePitch(pitch.id, { formScreenshotFilled: ssPath } as any);
    } catch { /* screenshot is best-effort */ }

    // Auto-submit if requested and no CAPTCHA
    if (options.autoSubmit && !result.hasCaptcha && result.submitButtonText && result.fieldsFilled > 0) {
      try {
        logger.info(`[form-filler] Auto-submitting form on ${formUrl}`);
        // Click submit button
        const submitted = await clickSubmitButton(targetFrame);
        if (submitted) {
          // Wait for navigation or confirmation
          await page.waitForTimeout(3000);
          result.submitted = true;
          logger.info(`[form-filler] Form submitted successfully on ${formUrl}`);

          // Take post-submit screenshot
          try {
            const postPath = join(screenshotDir, `${slug}-submitted-${Date.now()}.png`);
            await page.screenshot({ path: postPath, fullPage: true });
            result.screenshotPath = postPath; // Update to post-submit screenshot
            // Save submitted screenshot path to pitch record
            await agentRepository.updatePitch(pitch.id, { formScreenshotSubmitted: postPath } as any);
          } catch { /* best-effort */ }
        } else {
          result.errors.push('Submit button found but click failed');
        }
      } catch (err: any) {
        result.errors.push(`Auto-submit failed: ${err.message}`);
        logger.warn(`[form-filler] Auto-submit failed on ${formUrl}: ${err.message}`);
      }
    } else if (options.autoSubmit && result.hasCaptcha) {
      result.errors.push('CAPTCHA detected — form filled but not submitted. Submit manually.');
      logger.info(`[form-filler] CAPTCHA detected on ${formUrl}, skipping auto-submit`);
    }

    logger.info(`[form-filler] Filled ${result.fieldsFilled}/${result.fieldsDetected} fields on ${formUrl} (submitted: ${result.submitted})`);

  } catch (err: any) {
    logger.error(`[form-filler] Error on ${formUrl}: ${err.message}`);
    result.errors.push(err.message);
  } finally {
    await releaseContext(context);
  }

  return result;
}

/**
 * Extract all visible form fields from a frame
 */
async function extractFormFields(frame: Frame): Promise<FormField[]> {
  return frame.evaluate(() => {
    const fields: Array<{
      id: string;
      label: string;
      type: string;
      name: string;
      required: boolean;
      options?: string[];
    }> = [];

    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((el) => {
      const input = el as HTMLInputElement;
      const type = input.type || input.tagName.toLowerCase();
      if (['hidden', 'submit', 'button', 'search', 'password'].includes(type)) return;

      // Skip invisible fields (hidden signup forms, duplicate fields, etc.)
      const style = window.getComputedStyle(input);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        input.offsetWidth === 0 ||
        input.offsetHeight === 0
      ) return;

      // Find the best label
      let label = '';

      // Method 1: label[for] attribute
      if (input.id) {
        const labelEl = document.querySelector(`label[for="${input.id}"]`);
        if (labelEl) label = labelEl.textContent?.trim() || '';
      }

      // Method 2: Parent container label
      if (!label) {
        const parent = input.closest('.form-group, .field, [class*="field"], [class*="form-line"], li');
        if (parent) {
          const labelEl = parent.querySelector('label, .label, [class*="label"], .form-label, .form-sub-label');
          if (labelEl) label = labelEl.textContent?.trim() || '';
        }
      }

      // Method 3: aria-label
      if (!label) {
        label = input.getAttribute('aria-label') || '';
      }

      // Method 4: placeholder
      if (!label) {
        label = input.placeholder || '';
      }

      // Method 5: name/id fallback
      if (!label) {
        label = input.name || input.id || '';
      }

      // For select elements, get options
      let options: string[] | undefined;
      if (input.tagName.toLowerCase() === 'select') {
        options = Array.from((input as unknown as HTMLSelectElement).options)
          .map(o => o.text)
          .filter(t => t && t !== '---');
      }

      // For radio buttons, collect group options
      if (type === 'radio' && input.name) {
        const existing = fields.find(f => f.name === input.name);
        if (existing) {
          // Add this option to the existing radio group
          if (!existing.options) existing.options = [];
          const radioLabel = input.nextElementSibling?.textContent?.trim() ||
            input.parentElement?.textContent?.trim() || input.value;
          if (radioLabel) existing.options.push(radioLabel);
          return; // Don't add duplicate
        }
        options = [input.nextElementSibling?.textContent?.trim() || input.value];
      }

      fields.push({
        id: input.id || input.name || `field_${fields.length}`,
        label: label.substring(0, 200),
        type,
        name: input.name || '',
        required: input.required || input.getAttribute('aria-required') === 'true',
        options,
      });
    });

    return fields;
  });
}

/**
 * Use AI to map form fields to appropriate values
 */
async function mapFieldsWithAI(
  fields: FormField[],
  prospect: OutreachProspect,
  pitch: OutreachPitch,
  profile: FounderProfile,
): Promise<Array<{
  fieldId: string;
  fieldLabel: string;
  value: string;
  fieldType: string;
}>> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const fieldDescriptions = fields.map(f =>
    `- ID: "${f.id}", Label: "${f.label}", Type: ${f.type}${f.required ? ' (REQUIRED)' : ''}${f.options ? `, Options: [${f.options.join(', ')}]` : ''}`
  ).join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are filling out a ${prospect.category === 'podcast' ? 'podcast guest application' : 'press/media submission'} form.

AVAILABLE INFORMATION:
- Founder name: ${profile.name}
- Title: ${profile.title}
- Company: ${profile.company} (${profile.companyUrl})
- Email: ${profile.email}
- Bio (short): ${profile.bioShort}
- Bio (medium): ${profile.bioMedium}
- Expertise: ${profile.topicExpertise.join(', ')}
- Talking points: ${profile.talkingPoints.slice(0, 5).join('; ')}
- Unique angles: ${profile.uniqueAngles.slice(0, 3).join('; ')}
- Pitch subject: ${pitch.subject}
- Pitch body: ${pitch.body.substring(0, 500)}

For each form field below, provide the best value to fill in. Be specific and relevant.
For select fields, pick the most appropriate option from the available choices.
For radio fields, pick the best matching option.
For text fields with character limits, keep answers concise.
For textarea fields about topics/bio, use the founder info above.

Return a JSON array of objects: [{ "fieldId": "...", "value": "..." }]`,
      },
      {
        role: 'user',
        content: `Map values for these form fields:\n${fieldDescriptions}`,
      },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content || '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    logger.warn('[form-filler] Failed to parse AI mapping response');
    return [];
  }

  const mappings = Array.isArray(parsed) ? parsed : parsed.mappings || parsed.fields || [];
  return mappings.map((m: any) => {
    const field = fields.find(f => f.id === m.fieldId);
    return {
      fieldId: m.fieldId,
      fieldLabel: field?.label || m.fieldId,
      value: m.value || '',
      fieldType: field?.type || 'text',
    };
  });
}

/**
 * Fill a single form field — only targets visible elements.
 * Uses Playwright's isVisible() API instead of frame.evaluate() to avoid
 * esbuild __name() injection breaking in browser context.
 */
async function fillField(frame: Frame, fieldId: string, value: string, fieldType: string): Promise<boolean> {
  try {
    // Build selector — try ID first, then name
    const baseSelector = fieldId.startsWith('field_')
      ? `input:nth-of-type(${parseInt(fieldId.replace('field_', '')) + 1}), textarea:nth-of-type(${parseInt(fieldId.replace('field_', '')) + 1})`
      : `[id="${fieldId}"], [name="${fieldId}"]`;

    // Find the first VISIBLE matching element using Playwright's locator API
    let visibleElement: any = null;

    // Try exact match first
    const locator = frame.locator(baseSelector);
    const count = await locator.count();
    logger.info(`[form-filler] Field "${fieldId}" (${fieldType}): selector "${baseSelector}" found ${count} elements`);

    for (let i = 0; i < count; i++) {
      const el = locator.nth(i);
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        visibleElement = el;
        break;
      }
    }

    if (!visibleElement) {
      // Try broader search
      const altSelector = `[id*="${fieldId}"], [name*="${fieldId}"]`;
      const altLocator = frame.locator(altSelector);
      const altCount = await altLocator.count();
      logger.info(`[form-filler] Field "${fieldId}": alt selector "${altSelector}" found ${altCount} elements`);

      for (let i = 0; i < altCount; i++) {
        const el = altLocator.nth(i);
        if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
          visibleElement = el;
          break;
        }
      }
      if (!visibleElement) {
        logger.warn(`[form-filler] No visible element for field "${fieldId}"`);
        return false;
      }
    }

    if (fieldType === 'select' || fieldType === 'select-one') {
      await visibleElement.selectOption({ label: value });
    } else if (fieldType === 'radio') {
      // Find the radio button with matching value/label
      const radioLocator = frame.locator(`input[name="${fieldId}"]`);
      const radioCount = await radioLocator.count();
      for (let i = 0; i < radioCount; i++) {
        const radio = radioLocator.nth(i);
        const radioValue = await radio.getAttribute('value');
        const labelText = await radio.evaluate((el: HTMLElement) => el.nextElementSibling?.textContent?.trim() || el.parentElement?.textContent?.trim() || '');
        if (radioValue === value || labelText?.toLowerCase().includes(value.toLowerCase())) {
          await radio.click({ timeout: 5000 });
          return true;
        }
      }
      if (radioCount > 0) {
        await radioLocator.first().click({ timeout: 5000 });
        return true;
      }
      return false;
    } else if (fieldType === 'checkbox') {
      if (value.toLowerCase() === 'true' || value.toLowerCase() === 'yes') {
        const isChecked = await visibleElement.isChecked().catch(() => false);
        if (!isChecked) {
          await visibleElement.click({ timeout: 5000 });
        }
      }
    } else {
      // Text/textarea — clear and fill
      await visibleElement.click({ clickCount: 3, timeout: 5000 }); // Select all
      await visibleElement.fill(value);
    }

    logger.info(`[form-filler] Filled field "${fieldId}" with "${value.substring(0, 50)}..."`);
    return true;
  } catch (err: any) {
    logger.warn(`[form-filler] Could not fill field "${fieldId}": ${err.message}`);
    return false;
  }
}

/**
 * Click the submit button on the form — uses Playwright locator API
 * instead of frame.evaluate() to avoid esbuild __name() injection issues.
 */
async function clickSubmitButton(frame: Frame): Promise<boolean> {
  // Priority 1: actual submit buttons (visible)
  for (const selector of ['button[type="submit"]', 'input[type="submit"]']) {
    const els = frame.locator(selector);
    const count = await els.count();
    for (let i = 0; i < count; i++) {
      const el = els.nth(i);
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.click({ timeout: 5000 });
        return true;
      }
    }
  }

  // Priority 2: buttons with submit-like text (visible)
  for (const text of ['Submit', 'Send', 'Apply', 'Request', 'Pitch me']) {
    const btn = frame.locator(`button:has-text("${text}"), [role="button"]:has-text("${text}")`).first();
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click({ timeout: 5000 });
      return true;
    }
  }

  // Priority 3: JotForm-specific submit
  for (const selector of ['.form-submit-button', '#input_2']) {
    const el = frame.locator(selector).first();
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      await el.click({ timeout: 5000 });
      return true;
    }
  }

  return false;
}

/**
 * Detect CAPTCHA on the page — checks for actual CAPTCHA widgets, not just
 * the word "captcha" in scripts/comments which causes false positives.
 */
async function detectCaptcha(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    // Check for actual CAPTCHA widget elements (not HTML string includes)
    const hasCaptchaWidget = (
      !!document.querySelector('iframe[src*="recaptcha"]') ||
      !!document.querySelector('iframe[src*="hcaptcha"]') ||
      !!document.querySelector('iframe[src*="turnstile"]') ||
      !!document.querySelector('.g-recaptcha') ||
      !!document.querySelector('.h-captcha') ||
      !!document.querySelector('[data-sitekey]') ||
      !!document.querySelector('#cf-turnstile') ||
      !!document.querySelector('[data-hcaptcha-widget-id]') ||
      !!document.querySelector('.cf-turnstile')
    );
    return hasCaptchaWidget;
  });
}

/**
 * Detect the submit button text
 */
async function detectSubmitButton(frame: Frame): Promise<string | null> {
  return frame.evaluate(() => {
    const candidates = [
      ...Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"]')),
      ...Array.from(document.querySelectorAll('button')).filter(b =>
        (b.textContent || '').toLowerCase().match(/submit|send|apply|request/),
      ),
    ];
    if (candidates.length > 0) {
      return (candidates[0] as HTMLElement).textContent?.trim() ||
        (candidates[0] as HTMLInputElement).value ||
        'Submit';
    }
    return null;
  });
}
