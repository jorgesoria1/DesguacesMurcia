import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  urlOrMethod: string,
  optionsOrUrl?: string | RequestInit,
  data?: unknown | undefined,
): Promise<Response> {
  let url: string;
  let options: RequestInit;

  // Support both old signature (method, url, data) and new signature (url, options)
  if (typeof optionsOrUrl === 'string') {
    // Old signature: apiRequest(method, url, data)
    const method = urlOrMethod;
    url = optionsOrUrl;
    options = {
      method,
      headers: data 
        ? { "Content-Type": "application/json", "Accept": "application/json" }
        : { "Accept": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    };
  } else {
    // New signature: apiRequest(url, options)
    url = urlOrMethod;
    options = {
      credentials: "include",
      headers: {
        "Accept": "application/json",
        ...(optionsOrUrl?.headers || {}),
      },
      ...optionsOrUrl,
    };
  }

  const res = await fetch(url, options);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: {
        "Accept": "application/json",
      },
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
      staleTime: 1800000, // 30 min global (optimización primera carga)
      gcTime: 3600000, // 1 hora global (optimización memoria)
      refetchOnWindowFocus: false, // No refetch al cambiar tab
      retry: 1, // Retry una vez para mejorar primera carga
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      retry: false,
    },
  },
});
