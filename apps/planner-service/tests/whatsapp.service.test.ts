/**
 * Unit tests for WhatsApp service — inbound parsing, user resolution, command detection
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractWhatsAppInbound,
  resolveWhatsAppUserId,
  detectCommand,
  isWhatsAppCaptureAuthorized,
  isWhatsAppVerificationValid,
} from '../src/services/whatsapp.service.js'

describe('extractWhatsAppInbound', () => {
  it('extracts from direct payload mode', () => {
    const result = extractWhatsAppInbound({
      text: 'Buy groceries',
      userId: 'user-1',
      from: '919876543210',
    })
    expect(result.text).toBe('Buy groceries')
    expect(result.explicitUserId).toBe('user-1')
    expect(result.sender).toBe('919876543210')
    expect(result.messageId).toBeNull()
  })

  it('extracts from Meta webhook shape', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: '919876543210',
                    id: 'wamid.abc123',
                    text: { body: 'Complete homework' },
                  },
                ],
              },
            },
          ],
        },
      ],
    }
    const result = extractWhatsAppInbound(payload)
    expect(result.text).toBe('Complete homework')
    expect(result.sender).toBe('919876543210')
    expect(result.messageId).toBe('wamid.abc123')
  })

  it('returns nulls for empty/invalid payload', () => {
    const result = extractWhatsAppInbound(null)
    expect(result.text).toBeNull()
    expect(result.sender).toBeNull()
    expect(result.explicitUserId).toBeNull()
    expect(result.messageId).toBeNull()
  })

  it('returns nulls for non-object payload', () => {
    const result = extractWhatsAppInbound('just a string')
    expect(result.text).toBeNull()
  })

  it('returns nulls for empty object', () => {
    const result = extractWhatsAppInbound({})
    expect(result.text).toBeNull()
  })

  it('handles Meta payload with missing messages array', () => {
    const result = extractWhatsAppInbound({
      entry: [{ changes: [{ value: {} }] }],
    })
    expect(result.text).toBeNull()
  })
})

describe('resolveWhatsAppUserId', () => {
  it('returns explicit userId if provided', async () => {
    const result = await resolveWhatsAppUserId({
      explicitUserId: 'user-1',
      sender: '919876543210',
    })
    expect(result).toBe('user-1')
  })

  it('resolves via DB lookup when prisma is provided', async () => {
    const mockPrisma = {
      whatsAppUser: {
        findFirst: vi.fn().mockResolvedValue({ userId: 'user-db' }),
      },
    }
    const result = await resolveWhatsAppUserId({
      explicitUserId: null,
      sender: '919876543210',
      prisma: mockPrisma,
    })
    expect(result).toBe('user-db')
    expect(mockPrisma.whatsAppUser.findFirst).toHaveBeenCalledWith({
      where: { phoneNumber: '919876543210', verified: true, optedIn: true },
      select: { userId: true },
    })
  })

  it('falls back to env mapping when DB has no match', async () => {
    process.env.WHATSAPP_NUMBER_USER_MAP = JSON.stringify({ '919876543210': 'user-env' })
    const mockPrisma = {
      whatsAppUser: { findFirst: vi.fn().mockResolvedValue(null) },
    }
    const result = await resolveWhatsAppUserId({
      explicitUserId: null,
      sender: '919876543210',
      prisma: mockPrisma,
    })
    expect(result).toBe('user-env')
    delete process.env.WHATSAPP_NUMBER_USER_MAP
  })

  it('returns null when sender is null and no explicit userId', async () => {
    const result = await resolveWhatsAppUserId({
      explicitUserId: null,
      sender: null,
    })
    expect(result).toBeNull()
  })

  it('handles prisma error gracefully', async () => {
    const mockPrisma = {
      whatsAppUser: { findFirst: vi.fn().mockRejectedValue(new Error('DB down')) },
    }
    // Should fall back to env mapping without throwing
    const result = await resolveWhatsAppUserId({
      explicitUserId: null,
      sender: '000',
      prisma: mockPrisma,
    })
    // No env mapping for '000', so null
    expect(result).toBeNull()
  })
})

describe('detectCommand', () => {
  it('detects /status', () => {
    expect(detectCommand('/status')).toBe('status')
  })

  it('detects bare "status"', () => {
    expect(detectCommand('status')).toBe('status')
  })

  it('detects /today', () => {
    expect(detectCommand('/today')).toBe('today')
  })

  it('detects /help', () => {
    expect(detectCommand('/help')).toBe('help')
  })

  it('returns null for regular text', () => {
    expect(detectCommand('Buy groceries')).toBeNull()
  })

  it('returns null for null input', () => {
    expect(detectCommand(null)).toBeNull()
  })

  it('is case insensitive', () => {
    expect(detectCommand('/STATUS')).toBe('status')
    expect(detectCommand('TODAY')).toBe('today')
  })
})

describe('isWhatsAppCaptureAuthorized', () => {
  it('returns true when no secret is set', () => {
    delete process.env.WHATSAPP_WEBHOOK_SECRET
    expect(isWhatsAppCaptureAuthorized('anything')).toBe(true)
  })

  it('returns true when secret matches', () => {
    process.env.WHATSAPP_WEBHOOK_SECRET = 'mysecret'
    expect(isWhatsAppCaptureAuthorized('mysecret')).toBe(true)
    delete process.env.WHATSAPP_WEBHOOK_SECRET
  })

  it('returns false when secret does not match', () => {
    process.env.WHATSAPP_WEBHOOK_SECRET = 'mysecret'
    expect(isWhatsAppCaptureAuthorized('wrong')).toBe(false)
    delete process.env.WHATSAPP_WEBHOOK_SECRET
  })
})

describe('isWhatsAppVerificationValid', () => {
  it('returns false when no verify token is set', () => {
    delete process.env.WHATSAPP_VERIFY_TOKEN
    expect(isWhatsAppVerificationValid('anything')).toBe(false)
  })

  it('returns true when token matches', () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'mytoken'
    expect(isWhatsAppVerificationValid('mytoken')).toBe(true)
    delete process.env.WHATSAPP_VERIFY_TOKEN
  })

  it('returns false when token does not match', () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'mytoken'
    expect(isWhatsAppVerificationValid('wrong')).toBe(false)
    delete process.env.WHATSAPP_VERIFY_TOKEN
  })
})
