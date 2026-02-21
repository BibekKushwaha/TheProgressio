/**
 * Unit tests for focus.service.ts
 *
 * Tests planned vs actual time leakage, peak productivity detection,
 * and predictive performance analysis.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ────────────────────────────────────────────────────────────────

const { mockPrisma } = vi.hoisted(() => ({
    mockPrisma: {
        user: { findUnique: vi.fn() },
        activityLog: { findMany: vi.fn() },
        gradeEntry: { findMany: vi.fn() },
        $queryRaw: vi.fn(),
    },
}));

vi.mock('@repo/db', () => ({
    prisma: mockPrisma,
}));

// Prevent cache cross-contamination between tests — without this mock,
// a test writing 1-subject results to cache would cause the next test
// (multiple subjects) to read the stale 1-subject entry and fail.
vi.mock('@repo/cache', () => ({
    getAnalyticsCache: vi.fn().mockResolvedValue(null),
    setAnalyticsCache: vi.fn().mockResolvedValue(undefined),
    deleteAnalyticsCache: vi.fn().mockResolvedValue(undefined),
}));

import {
    getPlannedVsActual,
    detectPeakProductivity,
    getPredictivePerformance,
} from '../src/services/focus.service';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const daysAgo = (n: number): Date => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(10, 0, 0, 0);
    return d;
};

// ─── Tests: Planned vs Actual ───────────────────────────────────────────────────

describe('Focus Service — getPlannedVsActual', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns leakage report with correct structure', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ dailyGoalHours: 4 });
        // $queryRaw returns aggregated DailyRow[] — empty is fine for structure checks
        mockPrisma.$queryRaw.mockResolvedValue([]);

        const report = await getPlannedVsActual('u1', 7);

        expect(report).toHaveProperty('periodDays', 7);
        expect(report).toHaveProperty('totalPlannedMinutes');
        expect(report).toHaveProperty('totalActualMinutes');
        expect(report).toHaveProperty('totalLeakageMinutes');
        expect(report).toHaveProperty('leakagePercentage');
        expect(report).toHaveProperty('dailyBreakdown');
        expect(report).toHaveProperty('worstDays');
        expect(report).toHaveProperty('suggestion');
        expect(Array.isArray(report.dailyBreakdown)).toBe(true);
        expect(report.dailyBreakdown.length).toBeGreaterThanOrEqual(7);
    });

    it('calculates correct total planned minutes based on daily goal', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ dailyGoalHours: 4 });
        mockPrisma.$queryRaw.mockResolvedValue([]);

        const report = await getPlannedVsActual('u1', 7);

        // 4 hours × 60 minutes × 7 days = 1680
        expect(report.totalPlannedMinutes).toBe(1680);
    });

    it('leakage = 0 when actual exceeds planned', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ dailyGoalHours: 1 });
        // Build the same date key the service will seed into dailyMap
        const since = new Date();
        since.setDate(since.getDate() - 1);
        since.setHours(0, 0, 0, 0);
        // $queryRaw returns DailyRow[] — 5 hours of actual for 1 day
        mockPrisma.$queryRaw.mockResolvedValue([
            { date: since, actual_minutes: BigInt(300) },
        ]);

        const report = await getPlannedVsActual('u1', 1);

        // total leakage = max(0, planned - actual)
        expect(report.totalLeakageMinutes).toBe(0);
    });

    it('returns appropriate suggestion based on leakage percentage', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ dailyGoalHours: 4 });
        mockPrisma.$queryRaw.mockResolvedValue([]); // 0 actual → 100% leakage

        const report = await getPlannedVsActual('u1', 7);

        expect(report.leakagePercentage).toBe(100);
        expect(report.suggestion).toContain('Significant');
    });

    it('uses default 4h daily goal when user has none', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);
        mockPrisma.$queryRaw.mockResolvedValue([]);

        const report = await getPlannedVsActual('u1', 7);

        // Fallback: 4h/day * 60 * 7 = 1680
        expect(report.totalPlannedMinutes).toBe(1680);
    });
});

// ─── Tests: Peak Productivity Window ────────────────────────────────────────────

describe('Focus Service — detectPeakProductivity', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns peak window structure', async () => {
        // $queryRaw returns HourRow[] aggregated per hour
        mockPrisma.$queryRaw.mockResolvedValue([
            { hour: 9,  session_count: BigInt(2), total_mins: BigInt(105), deep_work_count: BigInt(2) },
            { hour: 10, session_count: BigInt(1), total_mins: BigInt(50),  deep_work_count: BigInt(1) },
            { hour: 14, session_count: BigInt(1), total_mins: BigInt(30),  deep_work_count: BigInt(1) },
        ]);

        const result = await detectPeakProductivity('u1', 7);

        expect(result).toHaveProperty('peakWindow');
        expect(result.peakWindow).toHaveProperty('startHour');
        expect(result.peakWindow).toHaveProperty('endHour');
        expect(result.peakWindow).toHaveProperty('label');
        expect(result).toHaveProperty('efficiencyByHour');
        expect(result.efficiencyByHour).toHaveLength(24);
        expect(result).toHaveProperty('recommendation');
        expect(result).toHaveProperty('efficiencyBoostPercent');
    });

    it('identifies correct peak window from session data', async () => {
        // Heavy 9 AM sessions make 9–11 window clearly the best
        mockPrisma.$queryRaw.mockResolvedValue([
            { hour: 9,  session_count: BigInt(10), total_mins: BigInt(900), deep_work_count: BigInt(10) },
            { hour: 10, session_count: BigInt(5),  total_mins: BigInt(300), deep_work_count: BigInt(5)  },
        ]);

        const result = await detectPeakProductivity('u1', 14);

        expect(result.peakWindow.startHour).toBe(9);
    });

    it('handles empty session data', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([]);

        const result = await detectPeakProductivity('u1', 7);

        expect(result).toHaveProperty('peakWindow');
        expect(result.efficiencyByHour.every(e => e.sessionCount === 0)).toBe(true);
    });

    it('calculates focus ratio from DEEP_WORK sessions', async () => {
        // 3 sessions at hour 9; 2 are DEEP_WORK, 1 is POMODORO
        mockPrisma.$queryRaw.mockResolvedValue([
            { hour: 9, session_count: BigInt(3), total_mins: BigInt(135), deep_work_count: BigInt(2) },
        ]);

        const result = await detectPeakProductivity('u1', 7);

        const hour9 = result.efficiencyByHour[9]!;
        expect(hour9.sessionCount).toBe(3);
        // 2 out of 3 are DEEP_WORK → 67% focus ratio
        expect(hour9.avgFocusRatio).toBeCloseTo(67, 0);
    });
});

// ─── Tests: Predictive Performance ──────────────────────────────────────────────

describe('Focus Service — getPredictivePerformance', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns empty array when no entries exist', async () => {
        mockPrisma.gradeEntry.findMany.mockResolvedValue([]);

        const result = await getPredictivePerformance('u1', 'JEE');

        expect(result).toEqual([]);
    });

    it('returns learning pace per subject', async () => {
        const entries = [
            { subjectName: 'Physics', totalMarks: 100, obtainedMarks: 60, examType: 'JEE', createdAt: daysAgo(30) },
            { subjectName: 'Physics', totalMarks: 100, obtainedMarks: 65, examType: 'JEE', createdAt: daysAgo(20) },
            { subjectName: 'Physics', totalMarks: 100, obtainedMarks: 75, examType: 'JEE', createdAt: daysAgo(10) },
            { subjectName: 'Physics', totalMarks: 100, obtainedMarks: 85, examType: 'JEE', createdAt: daysAgo(2) },
        ];
        mockPrisma.gradeEntry.findMany.mockResolvedValue(entries);

        const result = await getPredictivePerformance('u1', 'JEE', { runs: 1000, seed: 42 });

        expect(result.length).toBe(1);
        expect(result[0]).toHaveProperty('subjectName', 'Physics');
        expect(result[0]).toHaveProperty('pace');
        expect(result[0]).toHaveProperty('estimatedExamScore');
        expect(result[0]).toHaveProperty('estimatedPercentile');
        expect(result[0]).toHaveProperty('simulationRuns', 1000);
        expect(result[0]).toHaveProperty('scoreDistribution');
        expect(result[0]).toHaveProperty('rankBands');
        expect(result[0]).toHaveProperty('confidenceInterval');
        expect(result[0]).toHaveProperty('modelVersion', 'monte-carlo-v1');
        expect(result[0]!.pace).toBe('accelerating');
    });

    it('handles multiple subjects', async () => {
        const entries = [
            { subjectName: 'Physics', totalMarks: 100, obtainedMarks: 70, examType: 'JEE', createdAt: daysAgo(10) },
            { subjectName: 'Physics', totalMarks: 100, obtainedMarks: 75, examType: 'JEE', createdAt: daysAgo(2) },
            { subjectName: 'Chemistry', totalMarks: 100, obtainedMarks: 80, examType: 'JEE', createdAt: daysAgo(10) },
            { subjectName: 'Chemistry', totalMarks: 100, obtainedMarks: 60, examType: 'JEE', createdAt: daysAgo(2) },
        ];
        mockPrisma.gradeEntry.findMany.mockResolvedValue(entries);

        const result = await getPredictivePerformance('u1', 'JEE');

        expect(result.length).toBe(2);
        const physics = result.find(r => r.subjectName === 'Physics');
        const chemistry = result.find(r => r.subjectName === 'Chemistry');
        expect(physics).toBeDefined();
        expect(chemistry).toBeDefined();
        expect(chemistry!.pace).toBe('declining');
    });

    it('returns deterministic seeded simulation output', async () => {
        const entries = [
            { subjectName: 'Math', totalMarks: 100, obtainedMarks: 70, examType: 'JEE', createdAt: daysAgo(20) },
            { subjectName: 'Math', totalMarks: 100, obtainedMarks: 76, examType: 'JEE', createdAt: daysAgo(10) },
            { subjectName: 'Math', totalMarks: 100, obtainedMarks: 82, examType: 'JEE', createdAt: daysAgo(2) },
        ];
        mockPrisma.gradeEntry.findMany.mockResolvedValue(entries);

        const first = await getPredictivePerformance('u1', 'JEE', { runs: 500, seed: 7 });
        const second = await getPredictivePerformance('u1', 'JEE', { runs: 500, seed: 7 });

        expect(first[0]?.estimatedExamScore).toBe(second[0]?.estimatedExamScore);
        expect(first[0]?.estimatedPercentile).toBe(second[0]?.estimatedPercentile);
        expect(first[0]?.confidenceInterval).toEqual(second[0]?.confidenceInterval);
        expect(first[0]?.dataQuality).toBe('low');
    });
});
