import { beforeEach, describe, expect, it, vi } from 'vitest';

const { hgetallMock, hincrbyMock, zaddMock, zremrangebyscoreMock, expireMock } = vi.hoisted(() => ({
  hgetallMock: vi.fn(),
  hincrbyMock: vi.fn().mockResolvedValue(undefined),
  zaddMock: vi.fn().mockResolvedValue(undefined),
  zremrangebyscoreMock: vi.fn().mockResolvedValue(undefined),
  expireMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@repo/cache', () => ({
  getRedisClient: () => ({
    hgetall: hgetallMock,
    hincrby: hincrbyMock,
    zadd: zaddMock,
    zremrangebyscore: zremrangebyscoreMock,
    expire: expireMock,
  }),
}));

describe('planner whatsapp-audit.service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('flattens whatsapp counters and intent latency metrics for shared operational metrics', async () => {
    hgetallMock
      .mockResolvedValueOnce({ wa_total: '4', wa_outbound_success: '3' })
      .mockResolvedValueOnce({ cnt: '2', sum: '90' });

    const mod = await import('../src/services/whatsapp-audit.service.js');

    mod.recordIntentLatency('create task', 40);
    mod.recordIntentLatency('create task', 50);

    const snapshot = await mod.getOperationalMetricsSnapshot();

    expect(snapshot).toMatchObject({
      wa_total: 4,
      wa_outbound_success: 3,
      wa_intent_create_task_count: 2,
      wa_intent_create_task_avg_ms: 45,
      wa_intent_create_task_min_ms: 40,
      wa_intent_create_task_max_ms: 50,
    });
  });
});