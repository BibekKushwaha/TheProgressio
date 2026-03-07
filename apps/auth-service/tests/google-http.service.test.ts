import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { exchangeGoogleCode, fetchGoogleCertsPayload } from '../src/services/google-http.service.js';

describe('google-http.service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_HTTP_TIMEOUT_MS;
  });

  it('fetches Google cert payloads with cache headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ kid1: 'cert' }), {
        status: 200,
        headers: { 'cache-control': 'public, max-age=1200', 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchGoogleCertsPayload('https://www.googleapis.com/oauth2/v1/certs');

    expect(result).toEqual({
      certs: { kid1: 'cert' },
      cacheControl: 'public, max-age=1200',
    });
  });

  it('logs and throws when the Google cert request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('bad gateway', { status: 502 }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchGoogleCertsPayload('https://www.googleapis.com/oauth2/v1/certs')).rejects.toMatchObject({
      statusCode: 502,
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('posts form-encoded payloads for OAuth code exchange', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id_token: 'token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const body = new URLSearchParams();
    body.set('code', 'abc');

    const result = await exchangeGoogleCode({
      url: 'https://oauth2.googleapis.com/token',
      body,
    });

    expect(result).toEqual({ id_token: 'token' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'code=abc',
      }),
    );
  });

  it('times out Google requests with a 504 error', async () => {
    vi.useFakeTimers();
    process.env.GOOGLE_HTTP_TIMEOUT_MS = '25';
    vi.resetModules();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const mod = await import('../src/services/google-http.service.js');
    const pending = mod.fetchGoogleCertsPayload('https://www.googleapis.com/oauth2/v1/certs');
    const assertion = expect(pending).rejects.toMatchObject({ statusCode: 504 });
    await vi.advanceTimersByTimeAsync(1000);

    await assertion;
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});