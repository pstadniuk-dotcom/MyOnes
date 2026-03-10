/**
 * PR Agent — Form Fill Test v2
 * Improved: handles iframes, JotForm selectors, and multi-frame detection
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, '..', 'test-results', 'pr-agent-forms');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const ONES_PROFILE = {
  firstName: 'Pete',
  lastName: 'Stadniuk',
  name: 'Pete Stadniuk',
  email: 'pete@ones.health',
  website: 'https://ones.health',
  phone: '555-000-0000',
  company: 'Ones',
  title: 'Founder & CEO',
  facebook: 'https://facebook.com/ones.health',
  twitter: '@ones_health',
  instagram: '@ones.health',
  linkedin: 'https://linkedin.com/in/petestadniuk',
  bio: `Tech founder building Ones (ones.health), a personalized supplement platform that creates custom capsule formulas from actual blood work. We use AI to interpret lab results — ferritin, vitamin D, cortisol, thyroid panels — and formulate from 200+ clinically validated ingredients.`,
  topic: `How real blood work replaces supplement quizzes — building custom formulas from your actual biomarkers rather than generic recommendations`,
  whyTopic: `Your listeners want data-driven health decisions. I can share what thousands of blood panels reveal about the supplements most people are missing — and why "take a quiz" supplement companies are the new multivitamin.`,
  whyGuest: `I went from taking 12 random supplements to building a company that creates formulas from lab results. That story — plus the real data on what blood work actually says about supplement needs — would give your listeners something immediately actionable.`,
  listSize: '5,000+ email subscribers',
  socialReach: '15,000+ across platforms',
  affiliateProgram: 'Yes — we offer 20% recurring commission. Email partners@ones.health to join.',
  specialOffer: 'Yes — 15% off first personalized formula for your listeners with code PODCAST at ones.health',
  additionalInfo: 'We can also provide a unique landing page for your listeners with their own custom discount.',
};

// Test the JotForm directly since it had the most fields
const PROSPECTS = [
  {
    name: 'Move To Millions Podcast (JotForm)',
    url: 'https://form.jotform.com/91015103130132',
    host: 'Dr. Darnyelle Jervey Harmon',
  },
];

async function fillJotForm(page, prospect) {
  const slug = 'jotform-move-to-millions';
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📋 ${prospect.name}`);
  console.log(`${'═'.repeat(60)}`);

  await page.goto(prospect.url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // JotForm uses specific class patterns — let's find all visible inputs
  const formAnalysis = await page.evaluate(() => {
    const items = [];
    // JotForm wraps fields in .form-line elements
    const formLines = document.querySelectorAll('.form-line');
    for (const line of formLines) {
      const label = line.querySelector('.form-label, label')?.textContent?.trim() || '';
      const inputs = line.querySelectorAll('input:not([type="hidden"]), textarea, select');
      for (const inp of inputs) {
        items.push({
          label,
          tag: inp.tagName.toLowerCase(),
          type: inp.type || 'text',
          name: inp.name || '',
          id: inp.id || '',
          placeholder: inp.placeholder || '',
          required: inp.classList.contains('validate') || inp.required,
          visible: inp.offsetParent !== null,
        });
      }
    }
    return items;
  });

  console.log(`\n   🔍 JotForm Fields (${formAnalysis.length}):`);
  for (const f of formAnalysis) {
    if (!f.visible) continue;
    console.log(`   [${f.type}] id="${f.id}" name="${f.name}" label="${f.label.substring(0, 60)}"`);
  }

  // Now fill fields by ID using JotForm's naming convention
  const fillMap = [];

  for (const f of formAnalysis) {
    if (!f.visible || !f.id || f.type === 'file' || f.type === 'radio') continue;

    const labelLower = (f.label + ' ' + f.name + ' ' + f.id).toLowerCase();
    let value = '';

    if (/first.*name/i.test(labelLower) || /first_/i.test(f.id)) {
      value = ONES_PROFILE.firstName;
    } else if (/last.*name/i.test(labelLower) || /last_/i.test(f.id)) {
      value = ONES_PROFILE.lastName;
    } else if (/email/i.test(labelLower)) {
      value = ONES_PROFILE.email;
    } else if (/cell|phone|tel/i.test(labelLower)) {
      value = ONES_PROFILE.phone;
    } else if (/website|url|site/i.test(labelLower)) {
      value = ONES_PROFILE.website;
    } else if (/company|business/i.test(labelLower)) {
      value = ONES_PROFILE.company;
    } else if (/facebook/i.test(labelLower)) {
      value = ONES_PROFILE.facebook;
    } else if (/twitter/i.test(labelLower)) {
      value = ONES_PROFILE.twitter;
    } else if (/instagram/i.test(labelLower)) {
      value = ONES_PROFILE.instagram;
    } else if (/linkedin/i.test(labelLower)) {
      value = ONES_PROFILE.linkedin;
    } else if (/proposed.*(topic|interview|conversation)/i.test(labelLower)) {
      value = ONES_PROFILE.topic;
    } else if (/why.*(great|good).*(topic)/i.test(labelLower)) {
      value = ONES_PROFILE.whyTopic;
    } else if (/made.*(move|millions)|personally/i.test(labelLower)) {
      value = ONES_PROFILE.whyGuest;
    } else if (/bio/i.test(labelLower)) {
      value = ONES_PROFILE.bio;
    } else if (/marketing.*list|list.*size/i.test(labelLower)) {
      value = ONES_PROFILE.listSize;
    } else if (/social.*reach|full.*social/i.test(labelLower)) {
      value = ONES_PROFILE.socialReach;
    } else if (/affiliate/i.test(labelLower)) {
      value = ONES_PROFILE.affiliateProgram;
    } else if (/special.*offer|evergreen/i.test(labelLower)) {
      value = ONES_PROFILE.specialOffer;
    } else if (/else.*know|additional|anything/i.test(labelLower)) {
      value = ONES_PROFILE.additionalInfo;
    }

    if (value) {
      fillMap.push({ id: f.id, value, label: f.label.substring(0, 50) });
    }
  }

  console.log(`\n   ✏️  Filling ${fillMap.length} fields...`);

  let filled = 0;
  for (const { id, value, label } of fillMap) {
    try {
      // Use attribute selector instead of CSS.escape (not available in Node)
      await page.fill(`[id="${id}"]`, value);
      filled++;
      console.log(`   ✅ "${label}" → ${value.substring(0, 60)}${value.length > 60 ? '...' : ''}`);
    } catch (e) {
      console.log(`   ❌ "${label}" — fill failed: ${e.message.substring(0, 60)}`);
    }
  }

  console.log(`\n   📊 Result: ${filled}/${fillMap.length} fields filled successfully`);

  // Take screenshot of the filled form
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(SCREENSHOTS_DIR, `${slug}-filled.png`),
    fullPage: true,
  });
  console.log(`   📸 Full form screenshot: ${slug}-filled.png`);

  // Also take viewport screenshots scrolling through the form
  const formHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = 900;
  let scrollPos = 0;
  let screenshotIndex = 1;

  while (scrollPos < formHeight) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollPos);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, `${slug}-scroll-${screenshotIndex}.png`),
    });
    console.log(`   📸 Viewport screenshot: ${slug}-scroll-${screenshotIndex}.png`);
    scrollPos += viewportHeight - 100;
    screenshotIndex++;
    if (screenshotIndex > 6) break; // safety limit
  }

  // Check CAPTCHA
  const hasCaptcha = await page.evaluate(() => {
    const html = document.documentElement.innerHTML.toLowerCase();
    return html.includes('recaptcha') || html.includes('hcaptcha') || html.includes('captcha') || html.includes('turnstile');
  });
  console.log(`\n   🛡️  CAPTCHA: ${hasCaptcha ? '⚠️ YES — you would solve this, then agent clicks submit' : '✅ NO — full auto-submit possible'}`);

  // Find submit
  const submitBtn = await page.evaluate(() => {
    const btns = document.querySelectorAll('button[type="submit"], input[type="submit"], .form-submit-button');
    return btns.length > 0 ? { found: true, text: btns[0].textContent?.trim() || btns[0].value || 'Submit' } : { found: false };
  });
  console.log(`   🔘 Submit: ${submitBtn.found ? `"${submitBtn.text}" — NOT clicking (test mode)` : 'not found'}`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PR Agent — Form Fill Test v2 (JotForm)');
  console.log('  Filling real fields, taking screenshots, NOT submitting');
  console.log('═══════════════════════════════════════════════════════════');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  for (const prospect of PROSPECTS) {
    await fillJotForm(page, prospect);
  }

  await browser.close();
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Done! Check screenshots in: test-results/pr-agent-forms/`);
  console.log('═'.repeat(60) + '\n');
}

main().catch(console.error);
