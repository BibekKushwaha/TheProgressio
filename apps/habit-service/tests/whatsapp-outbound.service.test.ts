/**
 * Unit tests for WhatsApp outbound nudge dispatch service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @repo/db
const mockNudgeFindMany = vi.fn()
const mockNudgeUpdate = vi.fn()
const mockSchoolHolidayFindFirst = vi.fn()

vi.mock('@repo/db', () => ({
  prisma: {
    nudge: {
      findMany: (...args: any[]) => mockNudgeFindMany(...args),
      update: (...args: any[]) => mockNudgeUpdate(...args),
    },
    schoolHoliday: {
      findFirst: (...args: any[]) => mockSchoolHolidayFindFirst(...args),
    },
  },
}))

// Mock global fetch (for sendWhatsApp)
const originalFetch = globalThis.fetch
beforeEach(() => {
  vi.clearAllMocks()
  // Reset env to avoid real API calls
  delete process.env.WHATSAPP_PHONE_NUMBER_ID
  delete process.env.WHATSAPP_ACCESS_TOKEN
  delete process.env.WHATSAPP_OUTBOUND_URL
  delete process.env.WHATSAPP_USER_PHONE_MAP

  mockSchoolHolidayFindFirst.mockResolvedValue(null)
  mockNudgeUpdate.mockResolvedValue({})
})

import { dispatchWhatsAppNudges } from '../src/services/whatsapp-outbound.service.js'

describe('dispatchWhatsAppNudges', () => {
  it('returns empty results when no nudges exist', async () => {
    mockNudgeFindMany.mockResolvedValue([])

    const result = await dispatchWhatsAppNudges()
    expect(result.sent).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.failed).toBe(0)
    expect(result.results).toEqual([])
  })

  it('skips nudges for users without phone mapping', async () => {
    process.env.WHATSAPP_USER_PHONE_MAP = '{}'
    mockNudgeFindMany.mockResolvedValue([
      {
        id: 'nudge-1',
        userId: 'user-1',
        message: 'Hey, keep your streak!',
        priority: 'medium',
        metadata: null,
        scheduledAt: new Date(),
        expiresAt: null,
        user: {
          id: 'user-1',
          whatsappOptIn: true,
          quietHoursStart: null,
          quietHoursEnd: null,
        },
      },
    ])

    const result = await dispatchWhatsAppNudges()
    expect(result.skipped).toBe(1)
    expect(result.results[0]!.reason).toBe('recipient_not_mapped')
  })

  it('skips nudges for users who opted out', async () => {
    process.env.WHATSAPP_USER_PHONE_MAP = JSON.stringify({ 'user-1': '919876543210' })
    mockNudgeFindMany.mockResolvedValue([
      {
        id: 'nudge-2',
        userId: 'user-1',
        message: 'Reminder!',
        priority: 'low',
        metadata: null,
        scheduledAt: new Date(),
        expiresAt: null,
        user: {
          id: 'user-1',
          whatsappOptIn: false,
          quietHoursStart: null,
          quietHoursEnd: null,
        },
      },
    ])

    const result = await dispatchWhatsAppNudges()
    expect(result.skipped).toBe(1)
    expect(result.results[0]!.reason).toBe('user_opted_out')
  })

  it('skips nudges during holiday pause', async () => {
    process.env.WHATSAPP_USER_PHONE_MAP = JSON.stringify({ 'user-1': '919876543210' })
    mockSchoolHolidayFindFirst.mockResolvedValue({ id: 'hol-1' })
    mockNudgeFindMany.mockResolvedValue([
      {
        id: 'nudge-3',
        userId: 'user-1',
        message: 'Study time!',
        priority: 'high',
        metadata: null,
        scheduledAt: new Date(),
        expiresAt: null,
        user: {
          id: 'user-1',
          whatsappOptIn: true,
          quietHoursStart: null,
          quietHoursEnd: null,
        },
      },
    ])

    const result = await dispatchWhatsAppNudges()
    expect(result.skipped).toBe(1)
    expect(result.results[0]!.reason).toBe('holiday_pause')
  })

  it('sends nudges via mock when no API credentials', async () => {
    process.env.WHATSAPP_USER_PHONE_MAP = JSON.stringify({ 'user-1': '919876543210' })
    mockNudgeFindMany.mockResolvedValue([
      {
        id: 'nudge-4',
        userId: 'user-1',
        message: 'Keep going!',
        priority: 'medium',
        metadata: null,
        scheduledAt: new Date(),
        expiresAt: null,
        user: {
          id: 'user-1',
          whatsappOptIn: true,
          quietHoursStart: null,
          quietHoursEnd: null,
        },
      },
    ])

    const result = await dispatchWhatsAppNudges()
    expect(result.sent).toBe(1)
    expect(result.results[0]!.status).toBe('sent')
  })

  it('respects the limit parameter', async () => {
    process.env.WHATSAPP_USER_PHONE_MAP = '{}'
    mockNudgeFindMany.mockResolvedValue([])

    await dispatchWhatsAppNudges({ limit: 5 })
    expect(mockNudgeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    )
  })
})
