import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { buildApiUrl } from "@/lib/api";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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
    const res = await fetch(buildApiUrl(endpoint), {
      headers: getAuthHeaders(),
      credentials: "include",
    });

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
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
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
