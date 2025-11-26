/**
 * API configuration and URL helpers
 * 
 * This file provides two main utilities:
 * 1. buildApiUrl - constructs full API URLs from endpoints
 * 2. apiRequest - fetch wrapper with proper headers and error handling
 * 
 * Note: This apiRequest uses fetch-style options (endpoint, RequestInit)
 * For mutations with TanStack Query, see queryClient.ts apiRequest which uses (method, url, data)
 */

import { getAuthHeaders } from './queryClient';

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
 * Make an API request with the correct base URL and auth headers
 * Uses fetch-style options: apiRequest(endpoint, { method, body, headers })
 */
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = buildApiUrl(endpoint);
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
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

