import "server-only";

// Server Components and route handlers use the loopback API so builds and
// runtime requests do not hairpin through Cloudflare. Browser-facing calls
// continue to use NEXT_PUBLIC_API_URL in the client-specific modules.
const API_URL =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
  ) {
    super(`API ${status} on ${path}`);
    this.name = "ApiError";
  }
}

export interface ApiGetOptions {
  /** Cache tags for on-demand revalidation (revalidateTag). */
  tags?: string[];
  /** ISR revalidate seconds, or false to opt out of caching. Default 60. */
  revalidate?: number | false;
  /**
   * Forward the incoming request cookies (auth). Only for member/authenticated
   * calls — it opts the route into dynamic rendering, so never use it on
   * SSG/ISR public pages.
   */
  auth?: boolean;
}

async function doFetch(path: string, options: ApiGetOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  const noStore = options.auth || options.revalidate === false;

  if (options.auth) {
    // Lazily import to avoid pulling request-scoped APIs into static renders.
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const cookie = cookieStore.toString();
    if (cookie) {
      headers.cookie = cookie;
    }
  }

  return fetch(`${API_URL}${path}`, {
    headers,
    next: {
      tags: options.tags,
      revalidate: noStore ? undefined : (options.revalidate ?? 60),
    },
    cache: noStore ? "no-store" : undefined,
  });
}

/** GET returning the parsed body; throws ApiError on non-2xx. 204 → null. */
export async function apiGet<T>(path: string, options: ApiGetOptions = {}): Promise<T> {
  const res = await doFetch(path, options);
  if (res.status === 204) {
    return null as T;
  }
  if (!res.ok) {
    throw new ApiError(res.status, path);
  }
  return (await res.json()) as T;
}

/** GET that treats 404/204 as an absent resource (null) instead of throwing. */
export async function apiGetOrNull<T>(
  path: string,
  options: ApiGetOptions = {},
): Promise<T | null> {
  const res = await doFetch(path, options);
  if (res.status === 204 || res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new ApiError(res.status, path);
  }
  return (await res.json()) as T;
}
