/**
 * Unit tests for Kafka consumer message processing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock autoLogHabitFromCategory
vi.mock('../src/services/streak.service.js', () => ({
  autoLogHabitFromCategory: vi.fn().mockResolvedValue(undefined),
  calculateGentleStreak: vi.fn(),
  awardXP: vi.fn(),
  getStreakBonusXP: vi.fn(),
  getYearlyHeatmap: vi.fn(),
  XP_REWARDS: {},
  LEVEL_THRESHOLDS: [],
  calculateLevel: vi.fn(),
  xpToNextLevel: vi.fn(),
}))

import { processMessage } from '../src/services/consumer.service.js'
import { autoLogHabitFromCategory } from '../src/services/streak.service.js'

function makeMessage(value: Record<string, unknown> | null) {
  return {
    topic: 'planner.habit.triggers',
    partition: 0,
    message: {
      key: null,
      value: value ? Buffer.from(JSON.stringify(value)) : null,
      timestamp: Date.now().toString(),
      attributes: 0,
      offset: '0',
      size: 0,
      headers: {},
    },
    heartbeat: vi.fn(),
    pause: vi.fn(),
  } as any
}

describe('processMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('processes task.completed events with categoryId', async () => {
    await processMessage(makeMessage({
      eventType: 'task.completed',
      taskId: 'task-1',
      userId: 'user-1',
      timestamp: new Date().toISOString(),
      payload: { categoryId: 'cat-1' },
    }))

    expect(autoLogHabitFromCategory).toHaveBeenCalledWith('user-1', 'cat-1')
  })

  it('skips non-completed event types', async () => {
    await processMessage(makeMessage({
      eventType: 'task.created',
      taskId: 'task-1',
      userId: 'user-1',
      timestamp: new Date().toISOString(),
      payload: {},
    }))

    expect(autoLogHabitFromCategory).not.toHaveBeenCalled()
  })

  it('skips events without userId', async () => {
    await processMessage(makeMessage({
      eventType: 'task.completed',
      taskId: 'task-1',
      userId: '',
      timestamp: new Date().toISOString(),
      payload: { categoryId: 'cat-1' },
    }))

    expect(autoLogHabitFromCategory).not.toHaveBeenCalled()
  })

  it('skips events without categoryId', async () => {
    await processMessage(makeMessage({
      eventType: 'task.completed',
      taskId: 'task-1',
      userId: 'user-1',
      timestamp: new Date().toISOString(),
      payload: {},
    }))

    expect(autoLogHabitFromCategory).not.toHaveBeenCalled()
  })

  it('skips empty messages gracefully', async () => {
    await expect(processMessage(makeMessage(null))).resolves.toBeUndefined()
    expect(autoLogHabitFromCategory).not.toHaveBeenCalled()
  })

  it('handles malformed JSON gracefully', async () => {
    const payload = {
      topic: 'planner.habit.triggers',
      partition: 0,
      message: {
        key: null,
        value: Buffer.from('NOT VALID JSON'),
        timestamp: Date.now().toString(),
        attributes: 0,
        offset: '0',
        size: 0,
        headers: {},
      },
      heartbeat: vi.fn(),
      pause: vi.fn(),
    } as any

    await expect(processMessage(payload)).resolves.toBeUndefined()
    expect(autoLogHabitFromCategory).not.toHaveBeenCalled()
  })

  it('handles autoLogHabitFromCategory errors without throwing', async () => {
    vi.mocked(autoLogHabitFromCategory).mockRejectedValueOnce(new Error('DB error'))

    await expect(
      processMessage(makeMessage({
        eventType: 'task.completed',
        taskId: 'task-1',
        userId: 'user-1',
        timestamp: new Date().toISOString(),
        payload: { categoryId: 'cat-1' },
      }))
    ).resolves.toBeUndefined() // should not throw
  })
})
