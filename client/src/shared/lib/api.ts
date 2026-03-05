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

// In a monorepo setup where frontend and backend are served from the same origin,
// we can use relative URLs. The API base is simply '/api'.
const API_BASE = '';

// Detect if we're in production (deployed on a domain other than localhost)
const isProduction = typeof window !== 'undefined' && 
  !window.location.hostname.includes('localhost') && 
  !window.location.hostname.includes('127.0.0.1');

// Export validation status for components to check
export function isApiConfigurationValid(): boolean {
  // In a monorepo with relative URLs, API configuration is always valid
  return true;
}

export function buildApiUrl(endpoint: string) {
  // If endpoint is already absolute, return as-is
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // In a monorepo, we use relative URLs
  const fullUrl = `${API_BASE}${normalized}`;
  
  return fullUrl;
}

/**
 * Make an API request with the correct base URL and auth headers
 * Uses fetch-style options: apiRequest(endpoint, { method, body, headers })
 */
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  // Check configuration before making request
  if (!isApiConfigurationValid()) {
    throw new Error(
      'API is not configured correctly. Cannot make request. ' +
      'Check browser console for configuration errors.'
    );
  }

  const url = buildApiUrl(endpoint);
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  } satisfies HeadersInit;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: options.credentials ?? 'include', // Include cookies for CORS
    });

    return response;
  } catch (error: any) {
    // Enhance error messages for common issues
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      console.error(
        '❌ Network request failed. Possible causes:\n' +
        `   - Target URL: ${url}\n` +
        `   - API_BASE: "${API_BASE}"\n` +
        '   - Backend server may be down\n' +
        '   - CORS configuration issue\n' +
        '   - Invalid API_BASE URL\n' +
        'Original error:', error
      );
      throw new Error(
        'Unable to connect to the server. Please check your internet connection and try again. ' +
        'If the problem persists, the service may be temporarily unavailable.'
      );
    }
    throw error;
  }
}

/**
 * Get the API base URL (useful for debugging)
 */
export function getApiBase() {
  return API_BASE;
}
