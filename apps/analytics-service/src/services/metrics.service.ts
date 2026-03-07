import { focusLiveSessionRegistry } from './focus-live.service.js';

type StatusBucket = '2xx' | '4xx' | '5xx';

const requestCounters = new Map<string, number>();

const normalizeMetricKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');

const toStatusBucket = (statusCode: number): StatusBucket | null => {
  if (statusCode >= 200 && statusCode < 300) return '2xx';
  if (statusCode >= 400 && statusCode < 500) return '4xx';
  if (statusCode >= 500) return '5xx';
  return null;
};

const incrementCounter = (key: string): void => {
  requestCounters.set(key, (requestCounters.get(key) ?? 0) + 1);
};

export const recordAnalyticsRequestMetric = (method: string, route: string, statusCode: number): void => {
  const routeKey = normalizeMetricKey(`${method} ${route}`);
  incrementCounter('analytics_requests_total');
  incrementCounter(`analytics_request_${routeKey}_total`);

  const bucket = toStatusBucket(statusCode);
  if (!bucket) return;

  incrementCounter(`analytics_requests_${bucket}_total`);
  incrementCounter(`analytics_request_${routeKey}_${bucket}_total`);
};

export const getAnalyticsOperationalMetricsSnapshot = (): Record<string, number> => {
  const focusSnapshot = focusLiveSessionRegistry.getOperationalSnapshot();
  const snapshot: Record<string, number> = {
    analytics_queue_enabled: process.env.QUEUE_ENABLED === 'true' ? 1 : 0,
    analytics_focus_live_active_sessions: focusSnapshot.activeSessions,
    analytics_focus_live_running_sessions: focusSnapshot.runningSessions,
    analytics_focus_live_paused_sessions: focusSnapshot.pausedSessions,
  };

  for (const [key, value] of requestCounters.entries()) {
    snapshot[key] = value;
  }

  return snapshot;
};