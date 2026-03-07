import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('habit metrics.service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('flattens counters and latency snapshots for shared operational metrics', async () => {
    const mod = await import('../src/services/metrics.service.js');

    mod.incrementMetric('duplicate_prevention_hits', 2);
    mod.recordLatency('GET /api/habits/bootstrap', 12);
    mod.recordLatency('GET /api/habits/bootstrap', 30);

    const snapshot = mod.getOperationalMetricsSnapshot();

    expect(snapshot).toMatchObject({
      duplicate_prevention_hits: 2,
      latency_get_api_habits_bootstrap_count: 2,
      latency_get_api_habits_bootstrap_mean_ms: 21,
      latency_get_api_habits_bootstrap_p50_ms: expect.any(Number),
      latency_get_api_habits_bootstrap_p95_ms: expect.any(Number),
      latency_get_api_habits_bootstrap_p99_ms: expect.any(Number),
    });
  });
});