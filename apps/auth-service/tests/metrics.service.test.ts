import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('auth metrics.service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('tracks auth request totals by route and status class', async () => {
    const mod = await import('../src/services/metrics.service.js');

    mod.recordAuthRequestMetric('POST', '/api/auth/login', 200);
    mod.recordAuthRequestMetric('POST', '/api/auth/login', 401);
    mod.recordAuthRequestMetric('POST', '/api/auth/refresh', 503);

    expect(mod.getAuthOperationalMetricsSnapshot()).toMatchObject({
      auth_requests_total: 3,
      auth_requests_2xx_total: 1,
      auth_requests_4xx_total: 1,
      auth_requests_5xx_total: 1,
      auth_request_post_api_auth_login_total: 2,
      auth_request_post_api_auth_login_2xx_total: 1,
      auth_request_post_api_auth_login_4xx_total: 1,
      auth_request_post_api_auth_refresh_5xx_total: 1,
    });
  });
});