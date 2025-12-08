import { test, expect, Page, request } from '@playwright/test';

// Note: These tests require a valid test user in the database
// For CI, either seed test data or skip auth-dependent tests
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'pete@stadniuk.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'test123';
const BASE_URL = 'http://localhost:5000';

// Helper to authenticate via API and inject token into browser
async function authenticateViaAPI(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD): Promise<boolean> {
  try {
    // Get token from API
    const apiContext = await request.newContext();
    const response = await apiContext.post(`${BASE_URL}/api/auth/login`, {
      data: { email, password }
    });
    
    if (!response.ok()) {
      console.log('API login failed:', response.status());
      return false;
    }
    
    const data = await response.json();
    const token = data.token;
    const user = data.user;
    
    if (!token) {
      console.log('No token in response');
      return false;
    }
    
    // Navigate to app first (needed to set localStorage on correct domain)
    await page.goto('/');
    
    // Inject auth data into localStorage (matching AuthContext storage)
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, { token, user });
    
    await apiContext.dispose();
    return true;
  } catch (error) {
    console.log('Auth error:', error);
    return false;
  }
}

// Helper to attempt login via UI - returns true if successful
async function tryLoginUI(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD): Promise<boolean> {
  await page.goto('/login');
  await page.fill('[data-testid="input-email"], input[type="email"]', email);
  await page.fill('[data-testid="input-password"], input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

test.describe('Authentication UI', () => {
  test('should show login page with proper form elements', async ({ page }) => {
    await page.goto('/login');
    
    // Check form elements exist with proper types
    await expect(page.locator('[data-testid="input-email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check for back link
    await expect(page.locator('[data-testid="link-back-home"], a:has-text("Back")').first()).toBeVisible();
  });

  test('should show validation error for empty form', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Wait for validation messages
    await page.waitForTimeout(500);
    
    // Form should still be on login page (validation prevented submit)
    expect(page.url()).toContain('/login');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="input-email"], input[type="email"]', 'invalid@notareal.email');
    await page.fill('[data-testid="input-password"], input[type="password"]', 'wrongpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Should show error message or stay on login page
    const isOnLogin = page.url().includes('/login');
    expect(isOnLogin).toBeTruthy();
  });

  test('should navigate back to home', async ({ page }) => {
    await page.goto('/login');
    
    // Click back link
    const backLink = page.locator('[data-testid="link-back-home"], a:has-text("Back")').first();
    await backLink.click();
    
    // Should be on home page
    await expect(page).toHaveURL('/');
  });
});

test.describe('Signup Page UI', () => {
  test('should show signup page with proper form elements', async ({ page }) => {
    await page.goto('/signup');
    
    // Check for signup form elements
    await expect(page.locator('input[type="email"], [data-testid="input-email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

test.describe('Public Pages', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ONES|Supplement|Health/i);
    // Check for CTA buttons
    await expect(page.locator('text=/get started|start|sign up/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should load science page', async ({ page }) => {
    await page.goto('/science');
    await expect(page.locator('text=/science|research|clinical/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should load about page', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('text=/about|mission|team/i').first()).toBeVisible({ timeout: 5000 });
  });
});

// Tests that require authentication - use API auth to inject token
test.describe('Authenticated Features', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await authenticateViaAPI(page);
    test.skip(!loggedIn, 'Skipping - valid test user credentials required');
  });

  test('should display dashboard after login', async ({ page }) => {
    // Navigate to dashboard (already authenticated via localStorage)
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    // Dashboard should have main content
    const hasContent = await page.locator('main, [role="main"], .dashboard').first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('should navigate to consultation', async ({ page }) => {
    await page.goto('/dashboard/consultation');
    
    // Should show chat/consultation interface
    await expect(page.locator('textarea, [contenteditable="true"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to formula page', async ({ page }) => {
    await page.goto('/dashboard/formula');
    await page.waitForTimeout(1000);
    
    // Should show formula or empty state
    const hasContent = await page.locator('text=/formula|supplement|ingredient|create/i').first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('should navigate to optimize page', async ({ page }) => {
    await page.goto('/dashboard/optimize');
    await page.waitForTimeout(1000);
    
    // Should show optimize content
    await expect(page.locator('text=/workout|nutrition|optimize|plan/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to orders page', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForTimeout(1000);
    
    // Should show orders content
    await expect(page.locator('text=/order|subscription|purchase|history/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForTimeout(1000);
    
    // Should show settings content
    await expect(page.locator('text=/settings|profile|account|preferences/i').first()).toBeVisible({ timeout: 10000 });
  });
});
