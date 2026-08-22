import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * An error from the API, carrying the HTTP status and any structured payload.
 *
 * The previous version threw `new Error("429: {\"message\":\"...\"}")`, which put
 * raw JSON in front of users and forced callers to regex the status back out.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly payload: any;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function throwIfResNotOk(res: Response): Promise<void> {
  if (res.ok) return;

  const body = await res.text();
  let payload: any;
  let message = res.statusText || `Request failed (${res.status})`;

  try {
    payload = JSON.parse(body);
    if (typeof payload?.message === "string") message = payload.message;
  } catch {
    if (body) message = body;
  }

  throw new ApiError(res.status, message, payload);
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data !== undefined ? { "Content-Type": "application/json" } : {},
    body: data !== undefined ? JSON.stringify(data) : undefined,
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
    // Query keys are [path, ...segments]; joining with "/" would turn a key like
    // ["/api/conquests", undefined] into a request for "/api/conquests/undefined".
    const [path, ...segments] = queryKey as [string, ...unknown[]];
    const url = [path, ...segments.filter((s) => s !== undefined && s !== null)]
      .map(String)
      .join("/");

    const res = await fetch(url, { credentials: "include" });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as any;
    }

    await throwIfResNotOk(res);
    return (await res.json()) as any;
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
