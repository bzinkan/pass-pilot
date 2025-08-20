import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function safeJSON(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.url} -> ${res.status} ${res.statusText}\n${text.slice(0,200)}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Expected JSON from ${res.url}, got:\n${text.slice(0,200)}`);
  }
  return res.json();
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    credentials: "include", // Session-based auth via cookies
  };

  if (data) {
    fetchOptions.body = JSON.stringify(data);
  }

  const res = await fetch(url, fetchOptions);

  // Handle 401 errors by triggering session expired event
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('session-expired', { 
      detail: { message: 'Session expired, please log in again' }
    }));
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
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include", // Session-based auth via cookies
    });

    // Handle 401 errors by triggering session refresh or logout
    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      
      // Dispatch a custom event to notify the auth system of session expiry
      window.dispatchEvent(new CustomEvent('session-expired', { 
        detail: { message: 'Session expired, please log in again' }
      }));
      
      throw new Error('Session expired');
    }

    return await safeJSON(res);
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
