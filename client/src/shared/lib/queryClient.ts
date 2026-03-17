import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { buildApiUrl } from "@/shared/lib/api";

// Session expired event - components can listen for this
export const SESSION_EXPIRED_EVENT = 'session-expired';

function handleSessionExpired() {
  // Dispatch event for AuthContext to handle
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

// Track whether a refresh is already in-flight to avoid parallel refresh calls
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns true if refresh succeeded, false otherwise.
 */
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const res = await fetch(buildApiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    });

    if (!res.ok) {
      localStorage.removeItem('refreshToken');
      return false;
    }

    const data = await res.json();
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle 401 errors globally - session expired
    if (res.status === 401) {
      handleSessionExpired();
      throw new Error('Session expired. Please log in again.');
    }
    const text = (await res.text()) || res.statusText;
    let errorMessage = text;
    try {
      errorMessage = JSON.parse(text).error;
    } catch (error) {
      // Ignore JSON parse errors, fall back to default error
    }
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = buildApiUrl(url);
  const headers = {
    ...getAuthHeaders(),
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // On 401, try to refresh the token and retry once
  if (res.status === 401 && localStorage.getItem('refreshToken')) {
    if (!refreshPromise) {
      refreshPromise = tryRefreshToken().finally(() => { refreshPromise = null; });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      // Retry original request with new token
      const retryRes = await fetch(fullUrl, {
        method,
        headers: {
          ...getAuthHeaders(),
          ...(data ? { "Content-Type": "application/json" } : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
      await throwIfResNotOk(retryRes);
      return retryRes;
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const endpoint = buildEndpointFromQueryKey(queryKey);
      const fetchOptions: RequestInit = {
        headers: {
          ...getAuthHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        credentials: "include",
        cache: 'no-store',
      };
      let res = await fetch(buildApiUrl(endpoint), fetchOptions);

      // On 401, try to refresh the token and retry once
      if (res.status === 401 && localStorage.getItem('refreshToken')) {
        if (!refreshPromise) {
          refreshPromise = tryRefreshToken().finally(() => { refreshPromise = null; });
        }
        const refreshed = await refreshPromise;
        if (refreshed) {
          res = await fetch(buildApiUrl(endpoint), {
            ...fetchOptions,
            headers: {
              ...getAuthHeaders(),
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            },
          });
        }
      }

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 min
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});

function buildEndpointFromQueryKey(queryKey: readonly unknown[]): string {
  if (!queryKey.length) {
    throw new Error('Query key must not be empty');
  }

  const [first, ...rest] = queryKey;
  if (typeof first !== 'string') {
    throw new Error('First query key entry must be a string endpoint');
  }

  const suffixParts = rest
    .filter((part) => part !== undefined && part !== null)
    .map((part) => encodeURIComponent(String(part)));

  if (!suffixParts.length) {
    return first;
  }

  const separator = first.endsWith('/') ? '' : '/';
  return `${first}${separator}${suffixParts.join('/')}`;
}
