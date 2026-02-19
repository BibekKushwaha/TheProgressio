/**
 * Unit tests for Analytics Service BullMQ worker event processing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
vi.mock('@repo/db', () => ({
    prisma: {
        task: {
            findUnique: vi.fn(),
        },
        taskCompletionStat: {
            upsert: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            deleteMany: vi.fn(),
        },
    },
}))

import { processEvent } from '../src/services/worker.service.js'
import { prisma } from '@repo/db'

describe('Analytics Worker — processEvent', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ── task.completed ──────────────────────────────────────────────────────

    it('task.completed — upserts TaskCompletionStat', async () => {
        vi.mocked(prisma.task.findUnique).mockResolvedValue({
            id: 'task-1',
            userId: 'user-1',
            activityLogs: [
                { durationMinutes: 30 },
                { durationMinutes: 45 },
            ],
        } as any)

        vi.mocked(prisma.taskCompletionStat.upsert).mockResolvedValue({} as any)

        await processEvent({
            eventType: 'task.completed',
            taskId: 'task-1',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: {},
        } as any)

        expect(prisma.task.findUnique).toHaveBeenCalledWith({
            where: { id: 'task-1' },
            include: { activityLogs: true },
        })

        expect(prisma.taskCompletionStat.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { taskId: 'task-1' },
                create: expect.objectContaining({
                    taskId: 'task-1',
                    userId: 'user-1',
                    totalMinutes: 75,
                }),
            }),
        )
    })

    it('task.completed — skips if task not found', async () => {
        vi.mocked(prisma.task.findUnique).mockResolvedValue(null)

        await processEvent({
            eventType: 'task.completed',
            taskId: 'task-missing',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: {},
        } as any)

        expect(prisma.taskCompletionStat.upsert).not.toHaveBeenCalled()
    })

    // ── task.updated ────────────────────────────────────────────────────────

    it('task.updated — re-computes stat if previously completed', async () => {
        vi.mocked(prisma.taskCompletionStat.findUnique).mockResolvedValue({
            taskId: 'task-1',
        } as any)

        vi.mocked(prisma.task.findUnique).mockResolvedValue({
            id: 'task-1',
            activityLogs: [{ durationMinutes: 60 }],
        } as any)

        vi.mocked(prisma.taskCompletionStat.update).mockResolvedValue({} as any)

        await processEvent({
            eventType: 'task.updated',
            taskId: 'task-1',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: { changedFields: { title: 'New Title' } },
        } as any)

        expect(prisma.taskCompletionStat.update).toHaveBeenCalledWith({
            where: { taskId: 'task-1' },
            data: { totalMinutes: 60 },
        })
    })

    it('task.updated — no-op if task was not previously completed', async () => {
        vi.mocked(prisma.taskCompletionStat.findUnique).mockResolvedValue(null)

        await processEvent({
            eventType: 'task.updated',
            taskId: 'task-1',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: { changedFields: { title: 'New Title' } },
        } as any)

        expect(prisma.taskCompletionStat.update).not.toHaveBeenCalled()
    })

    // ── task.deleted ────────────────────────────────────────────────────────

    it('task.deleted — cleans up TaskCompletionStat', async () => {
        vi.mocked(prisma.taskCompletionStat.deleteMany).mockResolvedValue({ count: 1 } as any)

        await processEvent({
            eventType: 'task.deleted',
            taskId: 'task-1',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: {},
        } as any)

        expect(prisma.taskCompletionStat.deleteMany).toHaveBeenCalledWith({
            where: { taskId: 'task-1' },
        })
    })

    // ── task.status_changed ─────────────────────────────────────────────────

    it('task.status_changed — removes stat when un-completing', async () => {
        vi.mocked(prisma.taskCompletionStat.deleteMany).mockResolvedValue({ count: 1 } as any)

        await processEvent({
            eventType: 'task.status_changed',
            taskId: 'task-1',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: { previousStatus: 'COMPLETED', newStatus: 'IN_PROGRESS' },
        } as any)

        expect(prisma.taskCompletionStat.deleteMany).toHaveBeenCalledWith({
            where: { taskId: 'task-1' },
        })
    })

    // ── Edge cases ──────────────────────────────────────────────────────────

    it('unknown event type — skips without error', async () => {
        await expect(processEvent({
            eventType: 'task.some_unknown',
            taskId: 'task-1',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: {},
        } as any)).resolves.toBeUndefined()
    })

    it('empty message — skips gracefully', async () => {
        await expect(processEvent(null)).resolves.toBeUndefined()
    })

    it('invalid object shape — skips gracefully', async () => {
        const payload = {
            some_garbage: true
        } as any

        await expect(processEvent(payload)).resolves.toBeUndefined()
    })

    it('missing taskId — skips without error', async () => {
        await expect(processEvent({
            eventType: 'task.completed',
            taskId: '',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: {},
        } as any)).resolves.toBeUndefined()

        expect(prisma.task.findUnique).not.toHaveBeenCalled()
    })
})
