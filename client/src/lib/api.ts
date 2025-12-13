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
const rawApiBase = import.meta.env.VITE_API_BASE;
export const API_BASE = (rawApiBase || '').trim();

// Detect if we're in production (deployed on a domain other than localhost)
const isProduction = typeof window !== 'undefined' && 
  !window.location.hostname.includes('localhost') && 
  !window.location.hostname.includes('127.0.0.1');

// Validate API_BASE configuration
function validateApiBase() {
  // In production, VITE_API_BASE must be set and should be an absolute URL
  if (isProduction && !API_BASE) {
    console.error(
      '❌ CRITICAL ERROR: VITE_API_BASE environment variable is not set!\n\n' +
      'This means the frontend cannot communicate with the backend.\n' +
      'API calls will fail because they have no target server.\n\n' +
      'To fix this in Vercel:\n' +
      '1. Go to your project settings\n' +
      '2. Navigate to Environment Variables\n' +
      '3. Add VITE_API_BASE with your Railway backend URL\n' +
      '   Example: https://myones-production.up.railway.app\n' +
      '4. Redeploy your application\n\n' +
      'See DEPLOYMENT_GUIDE.md for detailed instructions.'
    );
    return false;
  }

  if (isProduction && API_BASE && !/^https?:\/\//i.test(API_BASE)) {
    console.error(
      `❌ INVALID API_BASE: "${API_BASE}"\n\n` +
      'VITE_API_BASE must be an absolute URL starting with http:// or https://\n' +
      'Example: https://myones-production.up.railway.app\n\n' +
      'Current value is a relative path, which will not work in production.'
    );
    return false;
  }

  // Success! Log configuration for debugging
  if (isProduction) {
    console.log(`✅ API configured: ${API_BASE}`);
  } else {
    console.log(
      `🔧 Development mode: API_BASE = "${API_BASE || '(relative URLs)'}"`
    );
  }

  return true;
}

// Run validation immediately when module loads
const isApiConfigValid = validateApiBase();

// Export validation status for components to check
export function isApiConfigurationValid(): boolean {
  return isApiConfigValid;
}

export function buildApiUrl(endpoint: string) {
  // If endpoint is already absolute, return as-is
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // In production with missing API_BASE, throw a clear error
  if (isProduction && !API_BASE) {
    throw new Error(
      'Cannot build API URL: VITE_API_BASE is not configured. ' +
      'Please set the VITE_API_BASE environment variable in your deployment settings.'
    );
  }

  const fullUrl = `${API_BASE}${normalized}`;
  
  // Log warning if we're building a relative URL in production
  if (isProduction && !fullUrl.startsWith('http')) {
    console.warn(
      `⚠️ Building relative API URL in production: ${fullUrl}\n` +
      'This will likely fail. Check VITE_API_BASE configuration.'
    );
  }

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

