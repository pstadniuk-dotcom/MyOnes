import posthog from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
// In production we route through the same-origin reverse proxy defined in
// vercel.json (/ingest/* → us.i.posthog.com) so ad-blockers don't drop events.
// In dev we hit PostHog directly because Vite's dev server has no rewrite.
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  (import.meta.env.DEV ? 'https://us.i.posthog.com' : '/ingest');
const UI_HOST = 'https://us.posthog.com';

let initialized = false;

export function initPostHog(): void {
  if (initialized) return;
  if (!KEY) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info('[posthog] VITE_POSTHOG_KEY not set — analytics disabled');
    }
    return;
  }

  posthog.init(KEY, {
    api_host: HOST,
    ui_host: UI_HOST,
    persistence: 'localStorage+cookie',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    // Session replay — must ALSO be enabled in PostHog UI:
    // Project Settings → Session Replay → toggle on.
    disable_session_recording: false,
    session_recording: {
      // Mask anything sensitive. Inputs are masked by default in posthog-js v1.x
      // when maskAllInputs is true; we extend with explicit selectors for our
      // checkout (Collect.js iframes, card fields) and any element marked
      // data-ph-mask="true" or .ph-mask.
      maskAllInputs: true,
      maskTextSelector:
        '.ph-mask, [data-ph-mask="true"], [data-sensitive], input[type="password"], input[name*="card"], input[name*="cvv"], input[name*="ssn"], iframe[src*="collectjs"], iframe[src*="basistheory"]',
      // Don't record on these URLs (admin panel + debug routes have noisy data)
      maskInputOptions: {
        password: true,
        email: false, // we want to see what email a user typed (with consent)
      },
    },
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.debug(false);
    },
  });

  initialized = true;
}

export function identifyUser(user: {
  id: string;
  email: string;
  name?: string;
  isAdmin?: boolean;
}): void {
  if (!initialized) return;
  posthog.identify(user.id, {
    email: user.email,
    name: user.name,
    is_admin: user.isAdmin ?? false,
  });
}

export function resetPostHog(): void {
  if (!initialized) return;
  posthog.reset();
}

export function capture(event: string, properties?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export { posthog };
