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
    },
}));

vi.mock('@repo/db', () => ({
    prisma: mockPrisma,
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

const makeSession = (daysBack: number, minutes: number, hour: number = 10, sessionType: string = 'DEEP_WORK') => ({
    startTime: (() => {
        const d = daysAgo(daysBack);
        d.setHours(hour, 0, 0, 0);
        return d;
    })(),
    durationMinutes: minutes,
    sessionType,
});

// ─── Tests: Planned vs Actual ───────────────────────────────────────────────────

describe('Focus Service — getPlannedVsActual', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns leakage report with correct structure', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ dailyGoalHours: 4 });
        mockPrisma.activityLog.findMany.mockResolvedValue([
            makeSession(0, 120), // 2 hours today
            makeSession(1, 180), // 3 hours yesterday
        ]);

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
        mockPrisma.activityLog.findMany.mockResolvedValue([]);

        const report = await getPlannedVsActual('u1', 7);

        // 4 hours × 60 minutes × 7 days = 1680
        expect(report.totalPlannedMinutes).toBe(1680);
    });

    it('leakage = 0 when actual exceeds planned', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ dailyGoalHours: 1 });
        // 5 hours of actual study for 1 day
        mockPrisma.activityLog.findMany.mockResolvedValue([
            makeSession(0, 300),
        ]);

        const report = await getPlannedVsActual('u1', 1);

        // total leakage = max(0, planned - actual)
        expect(report.totalLeakageMinutes).toBe(0);
    });

    it('returns appropriate suggestion based on leakage percentage', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ dailyGoalHours: 4 });
        mockPrisma.activityLog.findMany.mockResolvedValue([]); // 0 actual → 100% leakage

        const report = await getPlannedVsActual('u1', 7);

        expect(report.leakagePercentage).toBe(100);
        expect(report.suggestion).toContain('Significant');
    });

    it('uses default 4h daily goal when user has none', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);
        mockPrisma.activityLog.findMany.mockResolvedValue([]);

        const report = await getPlannedVsActual('u1', 7);

        // Fallback: 4h/day * 60 * 7 = 1680
        expect(report.totalPlannedMinutes).toBe(1680);
    });
});

// ─── Tests: Peak Productivity Window ────────────────────────────────────────────

describe('Focus Service — detectPeakProductivity', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns peak window structure', async () => {
        const sessions = [
            makeSession(1, 45, 9),
            makeSession(2, 60, 9),
            makeSession(3, 50, 10),
            makeSession(4, 30, 14),
        ];
        mockPrisma.activityLog.findMany.mockResolvedValue(sessions);

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
        // Heavy 9-10 AM sessions to make 9-10 window clearly the best
        const sessions = [
            ...Array.from({ length: 10 }, (_, i) => makeSession(i, 90, 9, 'DEEP_WORK')),
            ...Array.from({ length: 5 }, (_, i) => makeSession(i + 10, 60, 10, 'DEEP_WORK')),
        ];
        mockPrisma.activityLog.findMany.mockResolvedValue(sessions);

        const result = await detectPeakProductivity('u1', 14);

        expect(result.peakWindow.startHour).toBe(9);
    });

    it('handles empty session data', async () => {
        mockPrisma.activityLog.findMany.mockResolvedValue([]);

        const result = await detectPeakProductivity('u1', 7);

        expect(result).toHaveProperty('peakWindow');
        expect(result.efficiencyByHour.every(e => e.sessionCount === 0)).toBe(true);
    });

    it('calculates focus ratio from DEEP_WORK sessions', async () => {
        const sessions = [
            makeSession(1, 60, 9, 'DEEP_WORK'),
            makeSession(2, 30, 9, 'POMODORO'),
            makeSession(3, 45, 9, 'DEEP_WORK'),
        ];
        mockPrisma.activityLog.findMany.mockResolvedValue(sessions);

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

        const result = await getPredictivePerformance('u1', 'JEE');

        expect(result.length).toBe(1);
        expect(result[0]).toHaveProperty('subjectName', 'Physics');
        expect(result[0]).toHaveProperty('pace');
        expect(result[0]).toHaveProperty('estimatedExamScore');
        expect(result[0]).toHaveProperty('estimatedPercentile');
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
});
