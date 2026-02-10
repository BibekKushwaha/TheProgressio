/**
 * Unit tests for streak.service.ts
 *
 * Tests the gentle-streak engine, XP calculations, level system, and heatmap
 * without hitting the real database (all Prisma calls are mocked).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ────────────────────────────────────────────────────────────────

const { mockPrisma } = vi.hoisted(() => ({
    mockPrisma: {
        habit: { findUnique: vi.fn(), update: vi.fn() },
        habitLog: { findMany: vi.fn() },
        user: { findUnique: vi.fn(), update: vi.fn() },
        activityLog: { findMany: vi.fn() },
        taskCompletionStat: { findMany: vi.fn() },
    },
}));

vi.mock('@repo/db', () => ({
    prisma: mockPrisma,
    Frequency: { DAILY: 'DAILY', WEEKLY: 'WEEKLY' },
}));

import {
    calculateGentleStreak,
    awardXP,
    XP_REWARDS,
    LEVEL_THRESHOLDS,
    calculateLevel,
    xpToNextLevel,
    getStreakBonusXP,
    getYearlyHeatmap,
} from '../src/services/streak.service';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const daysAgo = (n: number): Date => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(12, 0, 0, 0);
    return d;
};

const makeHabit = (overrides: Record<string, unknown> = {}) => ({
    id: 'h1',
    name: 'Study Math',
    frequency: 'DAILY',
    currentStreak: 0,
    longestStreak: 0,
    mercyDaysAllowed: 1,
    mercyDaysUsed: 0,
    targetValue: 1,
    ...overrides,
});

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('Streak Service — calculateGentleStreak', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns zero streak for a habit with no logs', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue({
            ...makeHabit(),
            logs: [],
        });

        const result = await calculateGentleStreak('h1');

        expect(result.currentStreak).toBe(0);
        expect(result.mercyDaysUsed).toBe(0);
        expect(result.isMercyActive).toBe(false);
    });

    it('counts consecutive days correctly', async () => {
        const logs = [
            { loggedAt: daysAgo(0) },
            { loggedAt: daysAgo(1) },
            { loggedAt: daysAgo(2) },
        ];
        mockPrisma.habit.findUnique.mockResolvedValue({
            ...makeHabit({ currentStreak: 3, longestStreak: 3 }),
            logs,
        });

        const result = await calculateGentleStreak('h1');

        expect(result.currentStreak).toBeGreaterThanOrEqual(3);
        expect(result.streakHealth).toBeDefined();
    });

    it('uses mercy days to bridge a gap', async () => {
        // Day 0 logged, day 1 skipped, day 2 logged — mercy should bridge
        const logs = [
            { loggedAt: daysAgo(0) },
            // day 1 skipped
            { loggedAt: daysAgo(2) },
        ];
        mockPrisma.habit.findUnique.mockResolvedValue({
            ...makeHabit({ mercyDaysAllowed: 1 }),
            logs,
        });

        const result = await calculateGentleStreak('h1');

        expect(result.currentStreak).toBeGreaterThanOrEqual(2);
        expect(result.mercyDaysUsed).toBeGreaterThanOrEqual(1);
        // isMercyActive is only true when the current period is NOT logged
        // Since daysAgo(0) IS logged, isMercyActive stays false
        expect(result.isMercyActive).toBe(false);
    });

    it('breaks streak when gap exceeds mercy allowance', async () => {
        // Day 0 logged, day 1-2 skipped, day 3 logged — mercy=1 can't bridge 2 gaps
        const logs = [
            { loggedAt: daysAgo(0) },
            // day 1 skipped
            // day 2 skipped
            { loggedAt: daysAgo(3) },
        ];
        mockPrisma.habit.findUnique.mockResolvedValue({
            ...makeHabit({ mercyDaysAllowed: 1 }),
            logs,
        });

        const result = await calculateGentleStreak('h1');

        // With only 1 mercy day, a 2-day gap breaks the streak
        expect(result.currentStreak).toBeLessThanOrEqual(1);
    });

    it('returns null for non-existent habit', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue(null);

        const result = await calculateGentleStreak('nonexistent');

        expect(result.currentStreak).toBe(0);
    });
});

describe('Streak Service — XP & Level System', () => {
    beforeEach(() => vi.clearAllMocks());

    it('XP_REWARDS are positive integers', () => {
        expect(XP_REWARDS.HABIT_LOG).toBe(10);
        expect(XP_REWARDS.STREAK_7).toBe(75);
        expect(XP_REWARDS.STREAK_30).toBe(500);
        expect(XP_REWARDS.TASK_COMPLETED).toBe(15);
    });

    it('LEVEL_THRESHOLDS are sorted ascending', () => {
        for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
            expect(LEVEL_THRESHOLDS[i]).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1]!);
        }
    });

    it('calculateLevel returns correct level for known XP values', () => {
        expect(calculateLevel(0)).toBe(1);
        expect(calculateLevel(100)).toBe(2);
        expect(calculateLevel(99)).toBe(1);
        expect(calculateLevel(600)).toBe(4);
        expect(calculateLevel(50000)).toBe(20);
    });

    it('xpToNextLevel returns remaining XP info', () => {
        const info = xpToNextLevel(50);
        // Level 1 is 0-99, next level at 100
        expect(info).toEqual({ current: 0, next: 100, progress: 50 });
    });

    it('getStreakBonusXP returns 0 for streaks below milestone 3', () => {
        expect(getStreakBonusXP(1)).toBe(0);
        expect(getStreakBonusXP(2)).toBe(0);
        // streak >= 3 earns STREAK_3 bonus (25)
        expect(getStreakBonusXP(5)).toBe(XP_REWARDS.STREAK_3);
    });

    it('getStreakBonusXP returns bonus at milestone streaks', () => {
        expect(getStreakBonusXP(3)).toBe(XP_REWARDS.STREAK_3);
        expect(getStreakBonusXP(7)).toBe(XP_REWARDS.STREAK_7);
        expect(getStreakBonusXP(14)).toBe(XP_REWARDS.STREAK_14);
        expect(getStreakBonusXP(30)).toBe(XP_REWARDS.STREAK_30);
        expect(getStreakBonusXP(100)).toBe(XP_REWARDS.STREAK_100);
    });

    it('awardXP updates user XP and level', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', xp: 90, level: 1 });
        mockPrisma.user.update.mockResolvedValue({ id: 'u1', xp: 100, level: 2 });

        const result = await awardXP('u1', 10);

        expect(mockPrisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'u1' },
                data: expect.objectContaining({ xp: 100 }),
            })
        );
        expect(result).toBeDefined();
    });

    it('awardXP throws when user not found', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        await expect(awardXP('nonexistent', 10)).rejects.toThrow('User not found');
    });
});

describe('Streak Service — Yearly Heatmap', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 365 days of heatmap data', async () => {
        mockPrisma.habitLog.findMany.mockResolvedValue([]);
        mockPrisma.taskCompletionStat.findMany.mockResolvedValue([]);
        mockPrisma.activityLog.findMany.mockResolvedValue([]);

        const heatmap = await getYearlyHeatmap('u1');

        expect(heatmap.length).toBeLessThanOrEqual(366);
        expect(heatmap.length).toBeGreaterThanOrEqual(365);
        heatmap.forEach(day => {
            expect(day).toHaveProperty('date');
            expect(day).toHaveProperty('count');
            expect(day).toHaveProperty('intensity');
            expect(day.intensity).toBeGreaterThanOrEqual(0);
            expect(day.intensity).toBeLessThanOrEqual(4);
        });
    });

    it('assigns correct intensity levels', async () => {
        // Create some logs for today
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        mockPrisma.habitLog.findMany.mockResolvedValue([
            { loggedAt: today, completedValue: 1 },
            { loggedAt: today, completedValue: 1 },
            { loggedAt: today, completedValue: 1 },
        ]);
        mockPrisma.taskCompletionStat.findMany.mockResolvedValue([]);
        mockPrisma.activityLog.findMany.mockResolvedValue([
            { startTime: today, durationMinutes: 60 },
            { startTime: today, durationMinutes: 30 },
        ]);

        const heatmap = await getYearlyHeatmap('u1');
        const todayEntry = heatmap.find(d => d.date === today.toISOString().split('T')[0]);

        expect(todayEntry).toBeDefined();
        expect(todayEntry!.count).toBeGreaterThan(0);
        expect(todayEntry!.intensity).toBeGreaterThanOrEqual(1);
    });
});
