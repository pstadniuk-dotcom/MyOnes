/**
 * API configuration and helper
 */

// Get API base URL from environment variable, fallback to relative URL for dev
const API_BASE = import.meta.env.VITE_API_BASE || '';

/**
 * Make an API request with the correct base URL
 */
export async function apiRequest(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include', // Include cookies for CORS
  });

  return response;
}

/**
 * Get the API base URL (useful for debugging)
 */
export function getApiBase() {
  return API_BASE;
}
