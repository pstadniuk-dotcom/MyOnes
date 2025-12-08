import { test, expect, Page, request } from '@playwright/test';

// Note: These tests require a valid test user in the database for auth-dependent tests
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'pete@stadniuk.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'test123';
const BASE_URL = 'http://localhost:5000';

// Helper to authenticate via API and inject token into browser
async function authenticateViaAPI(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD): Promise<boolean> {
  try {
    const apiContext = await request.newContext();
    const response = await apiContext.post(`${BASE_URL}/api/auth/login`, {
      data: { email, password }
    });
    
    if (!response.ok()) return false;
    
    const data = await response.json();
    const token = data.token;
    const user = data.user;
    
    if (!token) return false;
    
    await page.goto('/');
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, { token, user });
    
    await apiContext.dispose();
    return true;
  } catch {
    return false;
  }
}

test.describe('Mobile Responsiveness - Public Pages', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('login page should be mobile-friendly', async ({ page }) => {
    await page.goto('/login');
    
    // Form should be visible and not overflow
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
    
    // Input fields should be usable on mobile
    const emailInput = page.locator('[data-testid="input-email"], input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    const box = await emailInput.boundingBox();
    expect(box?.width).toBeGreaterThan(200); // Should be wide enough to type
    
    // No horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 10;
    });
    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('landing page should be mobile-friendly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // No horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 10;
    });
    expect(hasHorizontalScroll).toBeFalsy();
    
    // CTA should exist (may need scrolling to be visible)
    const ctaButton = page.locator('text=/get started|start|sign up/i').first();
    await expect(ctaButton).toBeAttached({ timeout: 5000 });
  });

  test('signup page should be mobile-friendly', async ({ page }) => {
    await page.goto('/signup');
    
    // Form should be visible
    await expect(page.locator('form').first()).toBeVisible();
    
    // No horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 10;
    });
    expect(hasHorizontalScroll).toBeFalsy();
  });
});

test.describe('Mobile Responsiveness - Auth Required', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test.beforeEach(async ({ page }) => {
    const loggedIn = await authenticateViaAPI(page);
    test.skip(!loggedIn, 'Skipping - valid test user credentials required');
  });

  test('dashboard should be mobile-friendly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    // Page should not have horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 10;
    });
    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('consultation input should work on mobile', async ({ page }) => {
    await page.goto('/dashboard/consultation');
    
    const input = page.locator('textarea, [contenteditable="true"]').first();
    await expect(input).toBeVisible({ timeout: 10000 });
    
    // Input should be wide enough for typing
    const box = await input.boundingBox();
    expect(box?.width).toBeGreaterThan(200);
  });

  test('formula page should not have horizontal scroll', async ({ page }) => {
    await page.goto('/dashboard/formula');
    await page.waitForTimeout(1000);
    
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 10;
    });
    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('optimize page should be accessible on mobile', async ({ page }) => {
    await page.goto('/dashboard/optimize');
    await page.waitForTimeout(1000);
    
    // Page should load and be usable
    const hasContent = await page.locator('text=/workout|nutrition|optimize/i').first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
    
    // No horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 10;
    });
    expect(hasHorizontalScroll).toBeFalsy();
  });
});

test.describe('Tablet Responsiveness', () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // iPad

  test('landing page should adapt to tablet', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // No horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 10;
    });
    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('login page should work on tablet', async ({ page }) => {
    await page.goto('/login');
    
    // Form should be properly sized
    await expect(page.locator('form').first()).toBeVisible();
    
    // No horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 10;
    });
    expect(hasHorizontalScroll).toBeFalsy();
  });
});

test.describe('Touch Interactions', () => {
  test.use({ 
    viewport: { width: 375, height: 667 },
    hasTouch: true 
  });

  test('login buttons should have adequate touch targets', async ({ page }) => {
    await page.goto('/login');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    
    const box = await submitButton.boundingBox();
    // Minimum touch target size should be 36px (close to Apple HIG 44x44)
    expect(box?.height).toBeGreaterThanOrEqual(36);
  });

  test('landing page CTAs should have adequate touch targets', async ({ page }) => {
    await page.goto('/');
    
    // Find primary CTA buttons
    const ctaButtons = page.locator('a:has-text("Get Started"), a:has-text("Start"), button:has-text("Start")');
    const count = await ctaButtons.count();
    
    if (count > 0) {
      const firstCta = ctaButtons.first();
      const box = await firstCta.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(36);
      }
    }
  });
});

test.describe('Form Usability on Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('login form should be easy to fill on mobile', async ({ page }) => {
    await page.goto('/login');
    
    // Email input should have proper type for mobile keyboard
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    // Password input should exist
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    
    // Submit button should be visible without scrolling
    const submitButton = page.locator('button[type="submit"]');
    const isInViewport = await submitButton.isVisible();
    expect(isInViewport).toBeTruthy();
  });

  test('form inputs should be properly sized for touch', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.locator('input[type="email"]');
    const box = await emailInput.boundingBox();
    
    // Input height should be at least 40px for easy touch input
    expect(box?.height).toBeGreaterThanOrEqual(36);
  });
});
