/**
 * Unit tests for prediction.service.ts
 *
 * Tests PERT 3-point estimation and cycle time percentile calculations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ────────────────────────────────────────────────────────────────

const { mockPrisma } = vi.hoisted(() => ({
    mockPrisma: {
        task: { findMany: vi.fn() },
        taskCompletionStat: { findMany: vi.fn() },
    },
}));

vi.mock('@repo/db', () => ({
    prisma: mockPrisma,
}));

import { predictTaskDuration, getCycleTimePercentiles } from '../src/services/prediction.service';

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Create a task with activityLogs (for predictTaskDuration) */
const makeTask = (id: string, activityMinutes: number[]) => ({
    id,
    title: `Task ${id}`,
    status: 'COMPLETED',
    categoryId: 'c1',
    subjectId: 's1',
    category: { name: 'Study' },
    subject: { name: 'Math' },
    activityLogs: activityMinutes.map(m => ({ durationMinutes: m })),
    taskCompletionStat: null,
});

/** Create a completion stat (for getCycleTimePercentiles) */
const makeStat = (totalMinutes: number, daysAgo: number = 0) => ({
    totalMinutes,
    completedAt: new Date(Date.now() - daysAgo * 86400_000),
    task: { title: 'Task', categoryId: 'c1', subjectId: null, category: null, subject: null },
});

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('Prediction Service — predictTaskDuration', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns zero prediction when no completed tasks exist', async () => {
        mockPrisma.task.findMany.mockResolvedValue([]);

        const result = await predictTaskDuration('u1', {});

        expect(result.sampleSize).toBe(0);
        expect(result.expected).toBe(0);
        expect(result.confidence).toBe('low');
    });

    it('returns PERT estimate with sufficient data (≥5 samples)', async () => {
        const tasks = [
            makeTask('t1', [30]),
            makeTask('t2', [45]),
            makeTask('t3', [60]),
            makeTask('t4', [50]),
            makeTask('t5', [40]),
        ];
        mockPrisma.task.findMany.mockResolvedValue(tasks);

        const result = await predictTaskDuration('u1', {});

        expect(result).toHaveProperty('optimistic');
        expect(result).toHaveProperty('probable');
        expect(result).toHaveProperty('pessimistic');
        expect(result).toHaveProperty('expected');
        expect(result).toHaveProperty('standardDeviation');
        expect(result).toHaveProperty('confidence', 'medium');
        expect(result.sampleSize).toBe(5);

        // PERT: O ≤ P ≤ Pe
        expect(result.optimistic).toBeLessThanOrEqual(result.probable);
        expect(result.probable).toBeLessThanOrEqual(result.pessimistic);
        expect(result.expected).toBeGreaterThan(0);
    });

    it('filters by categoryId when provided', async () => {
        mockPrisma.task.findMany.mockResolvedValue([]);

        await predictTaskDuration('u1', { categoryId: 'c1' });

        expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ categoryId: 'c1' }),
            })
        );
    });

    it('filters by subjectId when provided', async () => {
        mockPrisma.task.findMany.mockResolvedValue([]);

        await predictTaskDuration('u1', { subjectId: 's1' });

        expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ subjectId: 's1' }),
            })
        );
    });
});

describe('Prediction Service — getCycleTimePercentiles', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns zeros when no completed tasks exist', async () => {
        mockPrisma.taskCompletionStat.findMany.mockResolvedValue([]);

        const result = await getCycleTimePercentiles('u1', {});

        expect(result.p50).toBe(0);
        expect(result.p85).toBe(0);
        expect(result.p95).toBe(0);
        expect(result.dataPoints).toEqual([]);
    });

    it('returns p50, p85, p95 percentiles with data', async () => {
        const stats = Array.from({ length: 20 }, (_, i) => makeStat(20 + i * 5, i));
        mockPrisma.taskCompletionStat.findMany.mockResolvedValue(stats);

        const result = await getCycleTimePercentiles('u1', {});

        expect(result).toHaveProperty('p50');
        expect(result).toHaveProperty('p85');
        expect(result).toHaveProperty('p95');
        expect(result).toHaveProperty('mean');
        expect(result).toHaveProperty('dataPoints');
        expect(result.p50).toBeLessThanOrEqual(result.p85);
        expect(result.p85).toBeLessThanOrEqual(result.p95);
        expect(Array.isArray(result.dataPoints)).toBe(true);
    });
});
