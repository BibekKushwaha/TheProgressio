import { retry } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { resolveServiceUrl } from './runtime';

const AUTH_SERVICE_URL = resolveServiceUrl(
  process.env.EXPO_PUBLIC_AUTH_SERVICE_URL ?? process.env.NEXT_PUBLIC_AUTH_SERVICE_URL,
  'http://localhost:4000',
);

let refreshInFlight: Promise<boolean> | null = null;

async function ensureFreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
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
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
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
    if (urlString.includes('/auth/refresh') || urlString.includes('/auth/login') || urlString.includes('/auth/register')) {
      return result;
    }

    const refreshed = await ensureFreshSession();
    if (!refreshed) return result;

    return (baseQuery as any)(args, api, extraOptions);
  };

  return inner as unknown as BaseQuery;
}
