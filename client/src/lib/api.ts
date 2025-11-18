/**
 * API configuration and helper
 */

// Get API base URL from environment variable, fallback to relative URL for dev
export const API_BASE = (import.meta.env.VITE_API_BASE || '').trim();

export function buildApiUrl(endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${normalized}`;
}

/**
 * Make an API request with the correct base URL
 */
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = buildApiUrl(endpoint);
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  } satisfies HeadersInit;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: options.credentials ?? 'include', // Include cookies for CORS
  });

  return response;
}

/**
 * Get the API base URL (useful for debugging)
 */
export function getApiBase() {
  return API_BASE;
}
