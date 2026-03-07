import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { postJsonRequest, requestJson } from '../src/services/internal-http.service.js';

describe('internal-http.service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('posts JSON with the default content-type header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await postJsonRequest({
      url: 'http://analytics.local/events',
      body: { type: 'TASK_COMPLETED', taskId: 'task-1' },
      headers: { 'x-internal-secret': 'secret' },
    });

    expect(result).toEqual({
      ok: true,
      status: 202,
      bodyText: null,
      reason: 'ok',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://analytics.local/events',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-internal-secret': 'secret',
        }),
        body: JSON.stringify({ type: 'TASK_COMPLETED', taskId: 'task-1' }),
      }),
    );
  });

  it('returns non-ok responses with the response body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('service unavailable', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await postJsonRequest({
      url: 'http://habit.local/events',
      body: { type: 'TaskCompleted' },
    });

    expect(result).toEqual({
      ok: false,
      status: 503,
      bodyText: 'service unavailable',
      reason: 'http_503',
    });
  });

  it('aborts requests that exceed the timeout', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const pending = postJsonRequest({
      url: 'http://habit.local/events',
      body: { type: 'TaskCompleted' },
      timeoutMs: 25,
    });

    await vi.advanceTimersByTimeAsync(30);

    await expect(pending).resolves.toEqual({
      ok: false,
      status: 0,
      bodyText: null,
      reason: 'timeout',
    });
  });

  it('parses JSON for successful GET requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ consistencyScore: 48 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestJson<{ consistencyScore: number }>({
      url: 'http://analytics.local/internal/consistency?userId=user-1',
    });

    expect(result).toEqual({
      ok: true,
      status: 200,
      bodyText: null,
      reason: 'ok',
      data: { consistencyScore: 48 },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://analytics.local/internal/consistency?userId=user-1',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('emits a structured warning log when a dependency request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('upstream unavailable', { status: 503 }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', fetchMock);

    await postJsonRequest({
      url: 'http://analytics.local/events',
      body: { type: 'TASK_COMPLETED' },
      logContext: {
        service: 'planner-service',
        subsystem: 'sync',
        dependency: 'analytics-service',
        operation: 'sync_task_event',
      },
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(warnSpy.mock.calls[0]?.[0] ?? '{}')) as Record<string, unknown>;
    expect(payload).toMatchObject({
      service: 'planner-service',
      subsystem: 'sync',
      dependency: 'analytics-service',
      operation: 'sync_task_event',
      event: 'dependency_request_failed',
      level: 'warn',
      method: 'POST',
      status: 503,
      reason: 'http_503',
      target: 'http://analytics.local',
    });
  });
});