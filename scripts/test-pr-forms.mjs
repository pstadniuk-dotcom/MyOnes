/**
 * PR Agent — Form Detection & Fill Test
 * Visits real podcast guest application pages, detects form fields,
 * fills them with test data, takes screenshots — but does NOT submit.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, '..', 'test-results', 'pr-agent-forms');

// Ensure screenshots dir exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Test data — what the agent would fill in after your approval
const ONES_PROFILE = {
  name: 'Pete Stadniuk',
  email: 'pete@ones.health',
  website: 'https://ones.health',
  phone: '',
  company: 'Ones',
  title: 'Founder & CEO',
  bio: `I'm the founder of Ones (ones.health), a personalized supplement platform that builds custom capsule formulas from actual blood work — not quizzes. We use AI to interpret lab results (ferritin, vitamin D, cortisol, thyroid panels) and formulate from 200+ clinically validated ingredients. Before Ones, I was taking 12 random supplements with no idea if they were right for me. That frustration became a company.`,
  topic: `How real blood work replaces supplement quizzes — why personalized formulas based on your actual biomarkers are the future of supplementation`,
  whyFit: `Your audience is exactly who we built Ones for — health-conscious people who want data-driven decisions, not generic recommendations. I can share real insights on what blood panels reveal about supplement needs and why most people are taking the wrong doses.`,
  socialMedia: 'https://linkedin.com/in/petestadniuk',
};

// Prospect form pages to test
const PROSPECTS = [
  {
    name: 'Mastery Unleashed Podcast',
    url: 'https://masteryunleashedpodcast.com/guest-pitch/',
    host: 'Christie Ruffino',
  },
  {
    name: 'Amber De La Garza - Guest Request',
    url: 'https://amberdelagarza.com/guestrequest/',
    host: 'Amber De La Garza',
  },
  {
    name: 'Move To Millions Podcast',
    url: 'https://form.jotform.com/91015103130132',
    host: 'Dr. Darnyelle Jervey Harmon',
  },
];

async function detectAndFillForm(page, prospect) {
  const slug = prospect.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📋 ${prospect.name}`);
  console.log(`   URL: ${prospect.url}`);
  console.log(`${'═'.repeat(60)}`);

  try {
    // Navigate to the form page
    await page.goto(prospect.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000); // Let JS render

    // Take initial screenshot
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, `${slug}-01-initial.png`),
      fullPage: true,
    });
    console.log(`   📸 Screenshot saved: ${slug}-01-initial.png`);

    // Detect all form fields
    const fields = await page.evaluate(() => {
      const results = [];
      
      // Find all input, textarea, and select elements
      const inputs = document.querySelectorAll('input, textarea, select');
      
      for (const el of inputs) {
        const type = el.tagName.toLowerCase() === 'select' ? 'select' :
                     el.tagName.toLowerCase() === 'textarea' ? 'textarea' :
                     (el.type || 'text');
        
        // Skip hidden, submit, and button types
        if (['hidden', 'submit', 'button', 'image'].includes(type)) continue;
        if (el.style?.display === 'none' || el.offsetParent === null) continue;
        
        // Try to find the label
        let label = '';
        if (el.id) {
          const labelEl = document.querySelector(`label[for="${el.id}"]`);
          if (labelEl) label = labelEl.textContent.trim();
        }
        if (!label && el.placeholder) label = el.placeholder;
        if (!label && el.name) label = el.name;
        if (!label && el.getAttribute('aria-label')) label = el.getAttribute('aria-label');
        
        // For select elements, get options
        let options = [];
        if (el.tagName.toLowerCase() === 'select') {
          options = Array.from(el.options).map(o => ({ value: o.value, text: o.textContent.trim() }));
        }
        
        results.push({
          tag: el.tagName.toLowerCase(),
          type,
          name: el.name || '',
          id: el.id || '',
          label: label.substring(0, 100),
          placeholder: el.placeholder || '',
          required: el.required || false,
          options: options.length > 0 ? options : undefined,
        });
      }
      
      return results;
    });

    console.log(`\n   🔍 Form Fields Detected (${fields.length}):`);
    console.log('   ' + '─'.repeat(55));
    
    for (const f of fields) {
      const req = f.required ? ' *REQUIRED*' : '';
      const typeStr = f.type === 'textarea' ? 'textarea' : f.type;
      console.log(`   [${typeStr}] "${f.label || f.name || '(unlabeled)'}"${req}`);
      if (f.options) {
        console.log(`      Options: ${f.options.map(o => o.text).join(', ')}`);
      }
    }

    // Check for CAPTCHA
    const hasCaptcha = await page.evaluate(() => {
      const html = document.documentElement.innerHTML.toLowerCase();
      return html.includes('recaptcha') || 
             html.includes('hcaptcha') || 
             html.includes('captcha') ||
             html.includes('g-recaptcha') ||
             html.includes('cf-turnstile');
    });
    console.log(`\n   🛡️  CAPTCHA detected: ${hasCaptcha ? '⚠️ YES — would need manual solve' : '✅ NO — auto-submit possible'}`);

    // Now try to fill the fields (without submitting)
    console.log(`\n   ✏️  Attempting to fill fields...`);
    let filledCount = 0;
    
    for (const f of fields) {
      const labelLower = (f.label + ' ' + f.name + ' ' + f.placeholder).toLowerCase();
      let value = '';
      
      // Smart field mapping based on label text
      if (/\b(first.?name|your.?name|full.?name|^name)\b/.test(labelLower) && !/last/.test(labelLower)) {
        value = labelLower.includes('first') ? 'Pete' : ONES_PROFILE.name;
      } else if (/last.?name|surname/.test(labelLower)) {
        value = 'Stadniuk';
      } else if (/e.?mail/.test(labelLower)) {
        value = ONES_PROFILE.email;
      } else if (/phone|tel/.test(labelLower)) {
        value = ONES_PROFILE.phone || '(skip)';
      } else if (/website|url|site/.test(labelLower)) {
        value = ONES_PROFILE.website;
      } else if (/company|business|brand|organization/.test(labelLower)) {
        value = ONES_PROFILE.company;
      } else if (/title|position|role/.test(labelLower)) {
        value = ONES_PROFILE.title;
      } else if (/bio|about.?(you|yourself)|tell.?us|describe/.test(labelLower)) {
        value = ONES_PROFILE.bio;
      } else if (/topic|subject|what.*(talk|discuss|speak)|episode.?idea/.test(labelLower)) {
        value = ONES_PROFILE.topic;
      } else if (/why|fit|good.?guest|reason|interest/.test(labelLower)) {
        value = ONES_PROFILE.whyFit;
      } else if (/social|twitter|instagram|linkedin|facebook/.test(labelLower)) {
        value = ONES_PROFILE.socialMedia;
      } else if (/message|comment|anything.?else|additional/.test(labelLower)) {
        value = ONES_PROFILE.whyFit;
      }

      if (value && value !== '(skip)') {
        try {
          const selector = f.id ? `#${CSS.escape(f.id)}` :
                          f.name ? `[name="${f.name}"]` :
                          null;
          if (selector) {
            if (f.tag === 'select') {
              // For selects, try to pick a relevant option
              await page.selectOption(selector, { index: 1 }).catch(() => {});
              filledCount++;
            } else if (f.tag === 'textarea' || f.type === 'text' || f.type === 'email' || f.type === 'url' || f.type === 'tel') {
              await page.fill(selector, value).catch(() => {});
              filledCount++;
            }
          }
        } catch (e) {
          // Field fill failed — not critical
        }
      }
    }

    console.log(`   ✅ Filled ${filledCount}/${fields.length} fields`);

    // Take screenshot of filled form
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, `${slug}-02-filled.png`),
      fullPage: true,
    });
    console.log(`   📸 Screenshot saved: ${slug}-02-filled.png`);

    // Find submit button but DO NOT click
    const submitButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"]'));
      for (const b of buttons) {
        const text = (b.textContent || b.value || '').toLowerCase();
        if (text.includes('submit') || text.includes('send') || text.includes('apply') || text.includes('pitch')) {
          return { text: b.textContent?.trim() || b.value, found: true };
        }
      }
      return { found: false };
    });

    if (submitButton.found) {
      console.log(`   🔘 Submit button found: "${submitButton.text}" — NOT clicking (test mode)`);
    } else {
      console.log(`   🔘 Submit button: not clearly identified — would need manual review`);
    }

    return { success: true, fields: fields.length, filled: filledCount, captcha: hasCaptcha };

  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, `${slug}-error.png`),
      fullPage: true,
    }).catch(() => {});
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ONES PR Agent — Form Detection & Fill Test');
  console.log('  Testing real podcast guest application forms');
  console.log(`  Screenshots → test-results/pr-agent-forms/`);
  console.log('═══════════════════════════════════════════════════════════');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });

  const results = [];

  for (const prospect of PROSPECTS) {
    const page = await context.newPage();
    const result = await detectAndFillForm(page, prospect);
    results.push({ ...prospect, ...result });
    await page.close();
  }

  await browser.close();

  // Summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  SUMMARY');
  console.log('═'.repeat(60));
  for (const r of results) {
    const status = r.success ? '✅' : '❌';
    const captcha = r.captcha ? '⚠️ CAPTCHA' : '🟢 No CAPTCHA';
    console.log(`  ${status} ${r.name}: ${r.fields || 0} fields detected, ${r.filled || 0} filled | ${captcha}`);
  }
  console.log(`\n  Screenshots saved to: test-results/pr-agent-forms/`);
  console.log('  Open them to see exactly what the agent would fill.\n');
}

main().catch(console.error);
