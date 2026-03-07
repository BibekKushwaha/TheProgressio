import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const incrementWhatsAppMetric = vi.fn();

vi.mock('../src/services/whatsapp-audit.service.js', () => ({
  incrementWhatsAppMetric,
}));

describe('meta-whatsapp.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env.WHATSAPP_ACCESS_TOKEN = 'token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id';
    process.env.WHATSAPP_GRAPH_VERSION = 'v22.0';
    process.env.WHATSAPP_CLOUD_TIMEOUT_MS = '25';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_GRAPH_VERSION;
    delete process.env.WHATSAPP_CLOUD_TIMEOUT_MS;
  });

  it('sends a text message through the configured Meta endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { sendWhatsAppText } = await import('../src/services/meta-whatsapp.service.js');
    const result = await sendWhatsAppText('919876543210', 'Hello from test');

    expect(result).toEqual({ messages: [{ id: 'wamid.1' }] });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.facebook.com/v22.0/phone-id/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
        signal: expect.any(AbortSignal),
      }),
    );
    expect(incrementWhatsAppMetric).toHaveBeenCalledWith('wa_outbound_text');
    expect(incrementWhatsAppMetric).toHaveBeenCalledWith('wa_outbound_success');
  });

  it('retries a timed out cloud request and eventually succeeds', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        });
      })
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ messages: [{ id: 'wamid.2' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { sendWhatsAppText } = await import('../src/services/meta-whatsapp.service.js');
    const pending = sendWhatsAppText('919876543210', 'Retry me');

    await vi.advanceTimersByTimeAsync(1_500);

    await expect(pending).resolves.toEqual({ messages: [{ id: 'wamid.2' }] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(incrementWhatsAppMetric).toHaveBeenCalledWith('wa_outbound_failure');
    expect(incrementWhatsAppMetric).toHaveBeenCalledWith('wa_outbound_success');
  });
});