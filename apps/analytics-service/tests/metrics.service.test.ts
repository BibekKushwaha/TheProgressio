import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('analytics metrics.service', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.QUEUE_ENABLED;
  });

  it('tracks analytics request counters and live-focus gauges', async () => {
    const focusMod = await import('../src/services/focus-live.service.js');
    const metricsMod = await import('../src/services/metrics.service.js');

    focusMod.focusLiveSessionRegistry.start({
      userId: 'user-1',
      taskId: 'task-1',
      taskTitle: 'Deep work',
      plannedDurationMinutes: 25,
      sessionType: 'POMODORO',
    });

    metricsMod.recordAnalyticsRequestMetric('GET', '/api/stats/weekly', 200);
    metricsMod.recordAnalyticsRequestMetric('GET', '/api/stats/weekly', 503);

    expect(metricsMod.getAnalyticsOperationalMetricsSnapshot()).toMatchObject({
      analytics_queue_enabled: 0,
      analytics_focus_live_active_sessions: 1,
      analytics_focus_live_running_sessions: 1,
      analytics_focus_live_paused_sessions: 0,
      analytics_requests_total: 2,
      analytics_requests_2xx_total: 1,
      analytics_requests_5xx_total: 1,
      analytics_request_get_api_stats_weekly_total: 2,
      analytics_request_get_api_stats_weekly_2xx_total: 1,
      analytics_request_get_api_stats_weekly_5xx_total: 1,
    });
  });
});