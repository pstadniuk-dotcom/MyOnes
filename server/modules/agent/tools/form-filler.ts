/**
 * Form Filler — AI-powered form detection, mapping, and filling
 *
 * For prospects that use submission forms (podcast guest applications, etc.),
 * this module:
 * 1. Detects all form fields on the page (including iframes)
 * 2. Uses AI to map prospect/founder data to form fields
 * 3. Fills the form fields
 * 4. Detects CAPTCHA and flags for manual completion
 * 5. Takes screenshots at each stage for review
 *
 * IMPORTANT: Forms are filled but NOT submitted automatically.
 * Submission happens only after human review + CAPTCHA solve if needed.
 */
import { chromium, type Browser, type Page, type Frame } from 'playwright';
import OpenAI from 'openai';
import logger from '../../../infra/logging/logger';
import { getFounderProfile, type FounderProfile } from '../founder-context';
import { agentRepository } from '../agent.repository';
import type { OutreachProspect, OutreachPitch } from '@shared/schema';

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

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Detect and fill a form for a prospect
 */
export async function detectAndFillForm(
  prospect: OutreachProspect,
  pitch: OutreachPitch,
  options: { autoSubmit?: boolean; screenshotDir?: string } = {},
): Promise<FormFillResult> {
  const formUrl = prospect.contactFormUrl || prospect.url;
  const profile = await getFounderProfile();
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const result: FormFillResult = {
    url: formUrl,
    fieldsDetected: 0,
    fieldsFilled: 0,
    hasCaptcha: false,
    hasIframe: false,
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

    logger.info(`[form-filler] Filled ${result.fieldsFilled}/${result.fieldsDetected} fields on ${formUrl}`);

  } catch (err: any) {
    logger.error(`[form-filler] Error on ${formUrl}: ${err.message}`);
    result.errors.push(err.message);
  } finally {
    await context.close();
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
 * Fill a single form field
 */
async function fillField(frame: Frame, fieldId: string, value: string, fieldType: string): Promise<boolean> {
  try {
    // Build selector — try ID first, then name
    const selector = fieldId.startsWith('field_')
      ? `input:nth-of-type(${parseInt(fieldId.replace('field_', '')) + 1}), textarea:nth-of-type(${parseInt(fieldId.replace('field_', '')) + 1})`
      : `[id="${fieldId}"], [name="${fieldId}"]`;

    const element = await frame.$(selector);
    if (!element) {
      // Try broader search
      const altElement = await frame.$(`[id*="${fieldId}"], [name*="${fieldId}"]`);
      if (!altElement) return false;
    }

    if (fieldType === 'select' || fieldType === 'select-one') {
      await frame.selectOption(selector, { label: value });
    } else if (fieldType === 'radio') {
      // Find the radio button with matching value/label
      const radios = await frame.$$(`input[name="${fieldId}"]`);
      for (const radio of radios) {
        const radioValue = await radio.getAttribute('value');
        const label = await radio.evaluate(el => el.nextElementSibling?.textContent?.trim() || el.parentElement?.textContent?.trim() || '');
        if (radioValue === value || label?.toLowerCase().includes(value.toLowerCase())) {
          await radio.click();
          return true;
        }
      }
      // Click first option as fallback
      if (radios.length > 0) {
        await radios[0].click();
        return true;
      }
      return false;
    } else if (fieldType === 'checkbox') {
      if (value.toLowerCase() === 'true' || value.toLowerCase() === 'yes') {
        const isChecked = await frame.$eval(selector, (el) => (el as HTMLInputElement).checked);
        if (!isChecked) {
          await frame.click(selector);
        }
      }
    } else {
      // Text/textarea — clear and type
      await frame.click(selector, { clickCount: 3 }); // Select all
      await frame.fill(selector, value);
    }

    return true;
  } catch (err: any) {
    logger.debug(`[form-filler] Could not fill field "${fieldId}": ${err.message}`);
    return false;
  }
}

/**
 * Detect CAPTCHA on the page
 */
async function detectCaptcha(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const html = document.documentElement.innerHTML.toLowerCase();
    return (
      html.includes('recaptcha') ||
      html.includes('hcaptcha') ||
      html.includes('captcha') ||
      html.includes('g-recaptcha') ||
      html.includes('cf-turnstile') ||
      !!document.querySelector('iframe[src*="recaptcha"]') ||
      !!document.querySelector('iframe[src*="hcaptcha"]') ||
      !!document.querySelector('.g-recaptcha') ||
      !!document.querySelector('[data-sitekey]')
    );
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
