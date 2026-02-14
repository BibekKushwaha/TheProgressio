/**
 * Unit tests for Analytics Service Kafka consumer message processing
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

import { processMessage } from '../src/services/consumer.service.js'
import { prisma } from '@repo/db'

function makeMessage(value: Record<string, unknown> | null) {
    return {
        topic: 'planner.task.analytics',
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

describe('Analytics Consumer — processMessage', () => {
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

        await processMessage(makeMessage({
            eventType: 'task.completed',
            taskId: 'task-1',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: {},
        }))

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

        await processMessage(makeMessage({
            eventType: 'task.completed',
            taskId: 'task-missing',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: {},
        }))

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

        await processMessage(makeMessage({
            eventType: 'task.updated',
            taskId: 'task-1',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: { changedFields: { title: 'New Title' } },
        }))

        expect(prisma.taskCompletionStat.update).toHaveBeenCalledWith({
            where: { taskId: 'task-1' },
            data: { totalMinutes: 60 },
        })
    })

    it('task.updated — no-op if task was not previously completed', async () => {
        vi.mocked(prisma.taskCompletionStat.findUnique).mockResolvedValue(null)

        await processMessage(makeMessage({
            eventType: 'task.updated',
            taskId: 'task-1',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: { changedFields: { title: 'New Title' } },
        }))

        expect(prisma.taskCompletionStat.update).not.toHaveBeenCalled()
    })

    // ── task.deleted ────────────────────────────────────────────────────────

    it('task.deleted — cleans up TaskCompletionStat', async () => {
        vi.mocked(prisma.taskCompletionStat.deleteMany).mockResolvedValue({ count: 1 } as any)

        await processMessage(makeMessage({
            eventType: 'task.deleted',
            taskId: 'task-1',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: {},
        }))

        expect(prisma.taskCompletionStat.deleteMany).toHaveBeenCalledWith({
            where: { taskId: 'task-1' },
        })
    })

    // ── task.status_changed ─────────────────────────────────────────────────

    it('task.status_changed — removes stat when un-completing', async () => {
        vi.mocked(prisma.taskCompletionStat.deleteMany).mockResolvedValue({ count: 1 } as any)

        await processMessage(makeMessage({
            eventType: 'task.status_changed',
            taskId: 'task-1',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: { previousStatus: 'COMPLETED', newStatus: 'IN_PROGRESS' },
        }))

        expect(prisma.taskCompletionStat.deleteMany).toHaveBeenCalledWith({
            where: { taskId: 'task-1' },
        })
    })

    // ── Edge cases ──────────────────────────────────────────────────────────

    it('unknown event type — skips without error', async () => {
        await expect(processMessage(makeMessage({
            eventType: 'task.some_unknown',
            taskId: 'task-1',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: {},
        }))).resolves.toBeUndefined()
    })

    it('empty message — skips gracefully', async () => {
        await expect(processMessage(makeMessage(null))).resolves.toBeUndefined()
    })

    it('malformed JSON — skips gracefully', async () => {
        const payload = {
            topic: 'planner.task.analytics',
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
    })

    it('missing taskId — skips without error', async () => {
        await expect(processMessage(makeMessage({
            eventType: 'task.completed',
            taskId: '',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            payload: {},
        }))).resolves.toBeUndefined()

        expect(prisma.task.findUnique).not.toHaveBeenCalled()
    })
})
