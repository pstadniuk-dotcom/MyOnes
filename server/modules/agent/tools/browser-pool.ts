/**
 * Browser Pool — Shared Playwright browser instance manager
 *
 * Consolidates browser management from deep-scrape.ts and form-filler.ts
 * into a single pool with automatic cleanup on idle timeout.
 * Prevents browser instance leaks on errors.
 */
import { chromium, type Browser, type BrowserContext } from 'playwright';
import logger from '../../../infra/logging/logger';

const IDLE_TIMEOUT_MS = 60_000; // Close browser after 60s of inactivity
const MAX_CONTEXTS = 5; // Max concurrent browser contexts

let browserInstance: Browser | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let activeContexts = 0;

/**
 * Get a shared browser instance (creates one if needed)
 */
async function getBrowser(): Promise<Browser> {
  resetIdleTimer();
  if (!browserInstance || !browserInstance.isConnected()) {
    logger.info('[browser-pool] Launching new browser instance');
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    // Auto-cleanup if browser disconnects unexpectedly
    browserInstance.on('disconnected', () => {
      logger.warn('[browser-pool] Browser disconnected unexpectedly');
      browserInstance = null;
      activeContexts = 0;
    });
  }
  return browserInstance;
}

/**
 * Acquire a browser context from the pool.
 * Returns a context that MUST be released via releaseContext() when done.
 */
export async function acquireContext(options?: {
  userAgent?: string;
  viewport?: { width: number; height: number };
}): Promise<BrowserContext> {
  if (activeContexts >= MAX_CONTEXTS) {
    throw new Error(`Browser pool exhausted: ${activeContexts}/${MAX_CONTEXTS} contexts in use`);
  }

  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: options?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: options?.viewport,
  });

  activeContexts++;
  return context;
}

/**
 * Release a browser context back to the pool
 */
export async function releaseContext(context: BrowserContext): Promise<void> {
  try {
    await context.close();
  } catch {
    // Already closed
  }
  activeContexts = Math.max(0, activeContexts - 1);
  resetIdleTimer();
}

/**
 * Force close the browser instance and reset pool
 */
export async function closeBrowserPool(): Promise<void> {
  clearIdleTimer();
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch {
      // Already closed
    }
    browserInstance = null;
    activeContexts = 0;
    logger.info('[browser-pool] Browser pool closed');
  }
}

/**
 * Get pool status for monitoring
 */
export function getPoolStatus(): { active: boolean; contexts: number; maxContexts: number } {
  return {
    active: !!browserInstance?.isConnected(),
    contexts: activeContexts,
    maxContexts: MAX_CONTEXTS,
  };
}

function resetIdleTimer(): void {
  clearIdleTimer();
  if (activeContexts === 0) {
    idleTimer = setTimeout(async () => {
      if (activeContexts === 0) {
        logger.info('[browser-pool] Idle timeout — closing browser');
        await closeBrowserPool();
      }
    }, IDLE_TIMEOUT_MS);
  }
}

function clearIdleTimer(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}
