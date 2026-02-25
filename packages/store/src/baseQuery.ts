import { retry } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';

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
