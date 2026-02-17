/**
 * Unit tests for WhatsApp Cloud API service
 */
import { describe, it, expect, beforeEach } from 'vitest'

// We test the module in mock mode (no credentials configured),
// so sendTextMessage / sendTemplateMessage return mock results.
// For the configured path, we mock globalThis.fetch.

describe('WhatsApp Cloud Service — mock mode (no credentials)', () => {
  let mod: typeof import('../src/services/whatsapp-cloud.service.js')

  beforeEach(async () => {
    // Ensure credentials are unset so functions operate in mock mode
    delete process.env.WHATSAPP_PHONE_NUMBER_ID
    delete process.env.WHATSAPP_ACCESS_TOKEN

    // Dynamic import to pick up env at module load time
    mod = await import('../src/services/whatsapp-cloud.service.js')
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
})
