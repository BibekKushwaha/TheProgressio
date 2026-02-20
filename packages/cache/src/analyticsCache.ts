import { deleteCache, getCache, setCache } from './cache.js';

const ANALYTICS_PREFIX = 'analytics';

/** Default TTL for analytics reports (10 minutes). */
const DEFAULT_TTL_SECONDS = 600;

/**
 * Build a deterministic cache key for an analytics report.
 *
 * @param userId    – The authenticated user's id.
 * @param reportType – e.g. "swot", "predictive", "leakage", "peak", "dashboard".
 * @param params    – Optional extra discriminator (e.g. examType, days).
 */
export function getAnalyticsCacheKey(
  userId: string,
  reportType: string,
  params?: string,
): string {
  const base = `${ANALYTICS_PREFIX}:${userId}:${reportType}`;
  return params ? `${base}:${params}` : base;
}

/** Read a cached analytics report. Returns `null` on a cache miss. */
export async function getAnalyticsCache<T>(
  userId: string,
  reportType: string,
  params?: string,
): Promise<T | null> {
  return getCache<T>(getAnalyticsCacheKey(userId, reportType, params));
}

/** Write an analytics report to the cache. */
export async function setAnalyticsCache<T>(
  userId: string,
  reportType: string,
  payload: T,
  params?: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<void> {
  await setCache<T>(
    getAnalyticsCacheKey(userId, reportType, params),
    payload,
    { ttlSeconds },
  );
}

/**
 * Invalidate a cached analytics report.
 * Call this whenever the underlying data changes (e.g. new grade entry added).
 */
export async function deleteAnalyticsCache(
  userId: string,
  reportType: string,
  params?: string,
): Promise<boolean> {
  return deleteCache(getAnalyticsCacheKey(userId, reportType, params));
}
