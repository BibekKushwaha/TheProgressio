import { fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
export type { BaseQueryFn };
import { isNativeRuntime, resolveServiceUrl, getFamilyShareToken } from './runtime';
import { clearTokens, getRefreshTokenSync, setTokens, getAccessTokenSync } from './mobile-token-store';
import { hydrateAuth, logout } from './slices/authSlice';

const AUTH_SERVICE_URL = resolveServiceUrl(
  process.env.EXPO_PUBLIC_AUTH_SERVICE_URL ?? process.env.NEXT_PUBLIC_AUTH_SERVICE_URL,
  'http://localhost:4000',
);

let refreshInFlightWeb: Promise<boolean> | null = null;
let refreshInFlightMobile: Promise<boolean> | null = null;

async function ensureFreshWebSession(): Promise<boolean> {
  if (refreshInFlightWeb) return refreshInFlightWeb;

  refreshInFlightWeb = (async () => {
    try {
      const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshInFlightWeb = null;
    }
  })();

  return refreshInFlightWeb;
}

async function ensureFreshMobileSession(api: any): Promise<boolean> {
  if (refreshInFlightMobile) return refreshInFlightMobile;

  refreshInFlightMobile = (async () => {
    try {
      const refreshToken = getRefreshTokenSync();
      if (!refreshToken) return false;

      const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/mobile/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as {
        user?: any;
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: string;
      };

      if (data?.accessToken && data?.refreshToken) {
        await setTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
        });
      }
      if (data?.user) {
        api?.dispatch?.(hydrateAuth({ user: data.user }));
      }
      return Boolean(data?.accessToken && data?.refreshToken);
    } catch {
      return false;
    } finally {
      refreshInFlightMobile = null;
    }
  })();

  return refreshInFlightMobile;
}

/**
 * Creates a fully-configured RTK Query base query for an internal micro-service.
 *
 * Encapsulates the standard `prepareHeaders` logic (Bearer token for native clients,
 * family-share-token forwarding, credentials: 'include' for web) and wraps the
 * result with `withAuthRefresh` + `withRetry` so every consumer gets refresh /
 * retry behaviour for free.
 *
 * Usage:
 *   baseQuery: createServiceBaseQuery(PLANNER_SERVICE_URL)
 *
 * @param serviceBaseUrl - root URL of the service (e.g. `http://localhost:4001`)
 */
/**
 * Wraps a baseQuery to handle 429 Too Many Requests responses gracefully.
 * Enriches the error object with `isRateLimit: true` and a `userMessage` so
 * components and the RTK error logger can distinguish rate-limit errors.
 *
 * Note: `withRetry` already calls `retry.fail()` on all 4xx responses — the
 * request will NOT be retried when rate-limited.
 */
export function withRateLimit<BaseQuery extends BaseQueryFn<any, any, any, any, any>>(
  baseQuery: BaseQuery,
): BaseQuery {
  const inner: BaseQueryFn<any, any, any, any, any> = async (args, api, extraOptions) => {
    const result = await (baseQuery as any)(args, api, extraOptions);
    const status = (result?.error as { status?: unknown } | undefined)?.status;
    if (status !== 429) return result;

    const retryAfter = (result.error as any)?.data?.retryAfter ?? 60;
    return {
      ...result,
      error: {
        ...result.error,
        data: {
          ...(result.error as any)?.data,
          isRateLimit: true,
          userMessage: `Too many requests — please wait ${retryAfter}s before retrying.`,
        },
      },
    };
  };
  return inner as unknown as BaseQuery;
}

export function createServiceBaseQuery(serviceBaseUrl: string) {
  const base = fetchBaseQuery({
    baseUrl: `${serviceBaseUrl}/api`,
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      const accessToken = isNativeRuntime() ? getAccessTokenSync() : null;
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      const shareToken = getFamilyShareToken();
      if (shareToken) {
        headers.set('x-family-share-token', shareToken);
      }
      return headers;
    },
  });
  return withRateLimit(withAuthRefresh(withRetry(base)));
}

/**
 * Wraps any RTK Query base query with automatic retry on network errors / 5xx.
 * Client errors (4xx) call retry.fail() to exit immediately without more retries.
 *
 * Usage:
 *   baseQuery: withRetry(fetchBaseQuery({ baseUrl: '...', credentials: 'include' }))
 *
 * @param baseQuery  - an already-configured RTK Query base query
 * @param maxRetries - retries before giving up (default: 3)
 */
export function withRetry<BaseQuery extends BaseQueryFn<any, any, any, any, any>>(
  baseQuery: BaseQuery,
  maxRetries = 3,
): BaseQuery {
  // Create a wrapped base query that calls retry.fail() for 4xx client errors.
  // The `as any` casts are required because RTK Query's internal generics are
  // overly restricted for custom wrapper functions.
  const inner: BaseQueryFn<any, any, any, any, any> = async (args, api, extraOptions) => {
    const result = await (baseQuery as any)(args, api, extraOptions);
    if (result.error) {
      const status = (result.error as { status?: unknown }).status;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        retry.fail(result.error);
      }
    }
    return result;
  };
  return retry(inner, { maxRetries }) as unknown as BaseQuery;
}

/**
 * Wraps a baseQuery so that a 401 triggers a single cookie-based refresh attempt
 * against the auth service, then retries the original request once.
 */
export function withAuthRefresh<BaseQuery extends BaseQueryFn<any, any, any, any, any>>(
  baseQuery: BaseQuery,
): BaseQuery {
  const inner: BaseQueryFn<any, any, any, any, any> = async (args, api, extraOptions) => {
    const result = await (baseQuery as any)(args, api, extraOptions);
    const status = (result?.error as { status?: unknown } | undefined)?.status;
    if (status !== 401) return result;

    const url = typeof args === 'string' ? args : (args as { url?: unknown })?.url;
    const urlString = typeof url === 'string' ? url : '';
    if (
      urlString.includes('/auth/refresh') ||
      urlString.includes('/auth/login') ||
      urlString.includes('/auth/register') ||
      urlString.includes('/auth/mobile/refresh') ||
      urlString.includes('/auth/mobile/login') ||
      urlString.includes('/auth/mobile/google')
    ) {
      return result;
    }

    if (isNativeRuntime()) {
      const refreshed = await ensureFreshMobileSession(api);
      if (!refreshed) {
        await clearTokens();
        api?.dispatch?.(logout());
        return result;
      }
      return (baseQuery as any)(args, api, extraOptions);
    }

    const refreshed = await ensureFreshWebSession();
    if (!refreshed) {
      // Refresh failed — no valid session remains. Clear Redux auth state so
      // the UI reacts (AuthGuard will redirect to /login) rather than staying
      // in a broken "authenticated" limbo.
      api?.dispatch?.(logout());
      return result;
    }

    return (baseQuery as any)(args, api, extraOptions);
  };

  return inner as unknown as BaseQuery;
}
