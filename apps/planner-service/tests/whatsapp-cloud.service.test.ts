/**
 * Unit tests for WhatsApp Cloud API service
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// We test the module in mock mode (no credentials configured),
// so sendTextMessage / sendTemplateMessage return mock results.
// For the configured path, we mock globalThis.fetch.

describe('WhatsApp Cloud Service — mock mode (no credentials)', () => {
  let mod: typeof import('../src/services/whatsapp-cloud.service.js')

  beforeEach(async () => {
    vi.resetModules()
    vi.unstubAllGlobals()
    // Ensure credentials are unset so functions operate in mock mode
    delete process.env.WHATSAPP_PHONE_NUMBER_ID
    delete process.env.WHATSAPP_ACCESS_TOKEN

    // Dynamic import to pick up env at module load time
    mod = await import('../src/services/whatsapp-cloud.service.js')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('isWhatsAppCloudConfigured returns false without credentials', () => {
    expect(mod.isWhatsAppCloudConfigured()).toBe(false)
  })

  it('sendTextMessage returns mock result', async () => {
    const result = await mod.sendTextMessage('919876543210', 'Hello!')
    expect(result.ok).toBe(true)
    expect(result.attempts).toBe(1)
    expect(result.messageId).toMatch(/^mock-/)
  })

  it('sendTemplateMessage returns mock result', async () => {
    const result = await mod.sendTemplateMessage('919876543210', 'nudge_reminder', 'en_US', ['arg1'])
    expect(result.ok).toBe(true)
    expect(result.attempts).toBe(1)
    expect(result.messageId).toMatch(/^mock-tmpl-/)
  })

  it('markMessageRead runs without errors in mock mode', async () => {
    await expect(mod.markMessageRead('wamid.abc123')).resolves.toBeUndefined()
  })

  it('retries configured cloud calls after a timeout', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id'
    process.env.WHATSAPP_ACCESS_TOKEN = 'token'
    process.env.WHATSAPP_CLOUD_TIMEOUT_MS = '25'
    vi.useFakeTimers()
    vi.resetModules()

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = vi
      .fn()
      .mockImplementationOnce((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          })
        })
      })
      .mockResolvedValueOnce(new Response(JSON.stringify({ messaging_product: 'whatsapp', contacts: [], messages: [{ id: 'wamid.1' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    vi.stubGlobal('fetch', fetchMock)

    mod = await import('../src/services/whatsapp-cloud.service.js')
    const pending = mod.sendTextMessage('919876543210', 'Hello!')

    await vi.advanceTimersByTimeAsync(1500)

    await expect(pending).resolves.toMatchObject({ ok: true, attempts: 2, messageId: 'wamid.1' })
    expect(warnSpy).toHaveBeenCalled()
  })
})
