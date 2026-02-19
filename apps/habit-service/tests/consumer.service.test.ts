/**
 * Unit tests for BullMQ worker event processing
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

import { processEvent } from '../src/services/worker.service.js'
import { autoLogHabitFromCategory } from '../src/services/streak.service.js'

describe('processEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('processes task.completed events with categoryId', async () => {
    await processEvent({
      eventType: 'task.completed',
      taskId: 'task-1',
      userId: 'user-1',
      timestamp: new Date().toISOString(),
      payload: { categoryId: 'cat-1' },
    } as any)

    expect(autoLogHabitFromCategory).toHaveBeenCalledWith('user-1', 'cat-1')
  })

  it('skips task.created events', async () => {
    await processEvent({
      eventType: 'task.created',
      taskId: 'task-1',
      userId: 'user-1',
      timestamp: new Date().toISOString(),
      payload: {},
    } as any)

    expect(autoLogHabitFromCategory).not.toHaveBeenCalled()
  })

  it('skips events without userId', async () => {
    await processEvent({
      eventType: 'task.completed',
      taskId: 'task-1',
      userId: '',
      timestamp: new Date().toISOString(),
      payload: { categoryId: 'cat-1' },
    } as any)

    expect(autoLogHabitFromCategory).not.toHaveBeenCalled()
  })

  it('skips events without categoryId', async () => {
    await processEvent({
      eventType: 'task.completed',
      taskId: 'task-1',
      userId: 'user-1',
      timestamp: new Date().toISOString(),
      payload: {},
    } as any)

    expect(autoLogHabitFromCategory).not.toHaveBeenCalled()
  })

  it('skips empty messages gracefully', async () => {
    await expect(processEvent(null as any)).resolves.toBeUndefined()
    expect(autoLogHabitFromCategory).not.toHaveBeenCalled()
  })

  it('handles invalid objects gracefully', async () => {
    const payload = {
      not_a_task_event: true,
    } as any

    await expect(processEvent(payload)).resolves.toBeUndefined()
    expect(autoLogHabitFromCategory).not.toHaveBeenCalled()
  })

  it('handles autoLogHabitFromCategory errors by re-throwing', async () => {
    vi.mocked(autoLogHabitFromCategory).mockRejectedValueOnce(new Error('DB error'))

    await expect(
      processEvent({
        eventType: 'task.completed',
        taskId: 'task-1',
        userId: 'user-1',
        timestamp: new Date().toISOString(),
        payload: { categoryId: 'cat-1' },
      } as any)
    ).rejects.toThrow('DB error')
  })

  // ── task.updated tests ────────────────────────────────────────────────

  it('task.updated — auto-logs habits when categoryId changes', async () => {
    await processEvent({
      eventType: 'task.updated',
      taskId: 'task-1',
      userId: 'user-1',
      timestamp: new Date().toISOString(),
      payload: { changedFields: { categoryId: 'cat-new' } },
    } as any)

    expect(autoLogHabitFromCategory).toHaveBeenCalledWith('user-1', 'cat-new')
  })

  it('task.updated — skips when no categoryId change', async () => {
    await processEvent({
      eventType: 'task.updated',
      taskId: 'task-1',
      userId: 'user-1',
      timestamp: new Date().toISOString(),
      payload: { changedFields: { title: 'New Title' } },
    } as any)

    expect(autoLogHabitFromCategory).not.toHaveBeenCalled()
  })

  it('task.updated — skips when categoryId is null', async () => {
    await processEvent({
      eventType: 'task.updated',
      taskId: 'task-1',
      userId: 'user-1',
      timestamp: new Date().toISOString(),
      payload: { changedFields: { categoryId: null } },
    } as any)

    expect(autoLogHabitFromCategory).not.toHaveBeenCalled()
  })

  // ── task.deleted tests ────────────────────────────────────────────────

  it('task.deleted — does not log habits (audit only)', async () => {
    await processEvent({
      eventType: 'task.deleted',
      taskId: 'task-1',
      userId: 'user-1',
      timestamp: new Date().toISOString(),
      payload: {},
    } as any)

    expect(autoLogHabitFromCategory).not.toHaveBeenCalled()
  })
})

