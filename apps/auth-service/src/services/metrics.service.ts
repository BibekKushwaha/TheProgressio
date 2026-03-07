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

export const recordAuthRequestMetric = (method: string, route: string, statusCode: number): void => {
  const routeKey = normalizeMetricKey(`${method} ${route}`);
  incrementCounter('auth_requests_total');
  incrementCounter(`auth_request_${routeKey}_total`);

  const bucket = toStatusBucket(statusCode);
  if (!bucket) return;

  incrementCounter(`auth_requests_${bucket}_total`);
  incrementCounter(`auth_request_${routeKey}_${bucket}_total`);
};

export const getAuthOperationalMetricsSnapshot = (): Record<string, number> => {
  const snapshot: Record<string, number> = {};
  for (const [key, value] of requestCounters.entries()) {
    snapshot[key] = value;
  }
  return snapshot;
};