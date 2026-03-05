import { Request } from 'express';

/**
 * Get the base URL of the application dynamically from the request.
 * This works for monorepo setups where frontend and backend share the same domain.
 *
 * @param req - Express Request object
 * @returns The base URL (e.g., 'https://myones.ai' or 'http://localhost:5000')
 */
export function getBaseUrl(req: Request): string {
  // Try to get from configured environment variable (for backward compatibility)
  const configured = process.env.FRONTEND_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  // Try to get from Origin header (most reliable for CORS requests)
  const originHeader = req.get('origin');
  if (originHeader) {
    return originHeader.replace(/\/$/, '');
  }

  // Try to get from Referer header
  const referer = req.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.origin;
    } catch {
      // ignore malformed referrer and fall through to host
    }
  }

  // Fall back to constructing from protocol and host
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
}

/**
 * Get the base URL for the frontend.
 * In a monorepo setup, this is the same as the backend URL.
 * This function is useful when you need the frontend URL but don't have a request object.
 *
 * @param req - Express Request object (optional)
 * @returns The base URL
 */
export function getFrontendUrl(req?: Request): string {
  if (req) {
    return getBaseUrl(req);
  }

  // If no request object, fall back to environment variable or construct from common defaults
  const configured = process.env.FRONTEND_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  // In production without explicit config, default to https://myones.ai
  if (process.env.NODE_ENV === 'production') {
    return 'https://myones.ai';
  }

  // Development fallback
  return 'http://localhost:5000';
}
