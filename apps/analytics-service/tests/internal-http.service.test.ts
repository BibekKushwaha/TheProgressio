import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { postJsonRequest, requestJson } from '../src/services/internal-http.service.js';

describe('analytics internal-http.service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('posts JSON with default content-type headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await postJsonRequest({
      url: 'http://habit.local/internal/cancel',
      body: { userId: 'user-1' },
      headers: { 'x-internal-secret': 'secret' },
    });

    expect(result).toEqual({
      ok: true,
      status: 202,
      bodyText: null,
      reason: 'ok',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://habit.local/internal/cancel',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-internal-secret': 'secret',
        }),
      }),
    );
  });

  it('parses JSON for successful GET requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ activeDates: ['2026-03-06'] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestJson<{ activeDates: string[] }>({
      url: 'http://habit.local/internal/active-dates?userId=user-1',
      headers: { 'x-internal-secret': 'secret' },
    });

    expect(result).toEqual({
      ok: true,
      status: 200,
      bodyText: null,
      reason: 'ok',
      data: { activeDates: ['2026-03-06'] },
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

    const pending = requestJson<{ activeDates: string[] }>({
      url: 'http://habit.local/internal/active-dates?userId=user-1',
      timeoutMs: 25,
    });

    await vi.advanceTimersByTimeAsync(30);

    await expect(pending).resolves.toEqual({
      ok: false,
      status: 0,
      bodyText: null,
      reason: 'timeout',
      data: null,
    });
  });
});