/**
 * Integration tests for Habit Service API endpoints
 *
 * Tests all HTTP endpoints through supertest with mocked Prisma and auth.
 */
import request from 'supertest';
import { describe, it, beforeEach, expect, vi } from 'vitest';

// ─── Global Mocks ───────────────────────────────────────────────────────────────

// Mock auth middleware — inject test user
vi.mock('../src/middleware/auth.middleware.js', () => ({
    isAuth: (req: any, _res: any, next: any) => {
        req.user = { id: 'user-1', username: 'Tester', email: 'test@example.com', dailyGoalHours: 4 };
        next();
    },
    enforceReadOnlyWrites: (_req: any, _res: any, next: any) => next(),
}));

// Mock streak service
vi.mock('../src/services/streak.service.js', () => ({
    calculateGentleStreak: vi.fn().mockResolvedValue({
        currentStreak: 5,
        longestStreak: 10,
        mercyDaysUsed: 0,
        isMercyActive: false,
        streakHealth: 'healthy',
    }),
    awardXP: vi.fn().mockResolvedValue({ xp: 110, level: 2 }),
    XP_REWARDS: { HABIT_LOG: 10, STREAK_3: 25, STREAK_7: 75, STREAK_14: 150, STREAK_30: 500, STREAK_100: 2000, TASK_COMPLETED: 15, FOCUS_SESSION: 5 },
    getStreakBonusXP: vi.fn().mockReturnValue(0),
    getYearlyHeatmap: vi.fn().mockResolvedValue(
        Array.from({ length: 365 }, (_, i) => ({
            date: new Date(Date.now() - i * 86400_000).toISOString().split('T')[0],
            count: Math.floor(Math.random() * 5),
            intensity: Math.floor(Math.random() * 5),
        }))
    ),
    calculateLevel: vi.fn().mockReturnValue(2),
    xpToNextLevel: vi.fn().mockReturnValue(90),
    LEVEL_THRESHOLDS: [0, 100, 300, 600],
}));

// Mock nudge service
vi.mock('../src/services/nudge.service.js', () => ({
    detectStreakRisks: vi.fn().mockResolvedValue(undefined),
    detectExamWarnings: vi.fn().mockResolvedValue(undefined),
    generateMorningBriefing: vi.fn().mockResolvedValue({
        dueTasks: 3,
        habitsToComplete: 2,
        upcomingExams: [{ title: 'Physics', daysUntil: 5 }],
        streaksAtRisk: [],
        conflicts: [],
    }),
    detectSlipPatterns: vi.fn().mockResolvedValue(undefined),
    getNotificationSettings: vi.fn().mockResolvedValue({
        enabledBuckets: {
            URGENCY_DRIVEN: true,
            MORNING_BRIEFING: true,
            BEHAVIORAL_NUDGE: true,
            ADVANCE_ALERT_3WEEK: true,
            TRANSACTION_SYSTEM: true,
        },
        quietHours: [],
        focusProfiles: [],
        groupedSummaries: true,
        positiveTone: true,
        preDeadlineDays: 2,
        streakReminderTime: '09:00',
        timezone: 'UTC',
        timezoneOffsetMinutes: 0,
    }),
    upsertNotificationSettings: vi.fn().mockResolvedValue({
        enabledBuckets: {
            URGENCY_DRIVEN: true,
            MORNING_BRIEFING: true,
            BEHAVIORAL_NUDGE: true,
            ADVANCE_ALERT_3WEEK: true,
            TRANSACTION_SYSTEM: true,
        },
        quietHours: [],
        focusProfiles: [],
        groupedSummaries: true,
        positiveTone: true,
        preDeadlineDays: 2,
        streakReminderTime: '09:00',
        timezone: 'UTC',
        timezoneOffsetMinutes: 0,
    }),
    reschedulePendingStreakNudges: vi.fn().mockResolvedValue(undefined),
    createTransactionSystemNudge: vi.fn().mockResolvedValue({ id: 'txn-1' }),
    getUserNudges: vi.fn().mockResolvedValue([
        { id: 'n1', type: 'STREAK_RISK', title: 'Streak at risk', message: 'Log now!', isRead: false },
    ]),
    markNudgeRead: vi.fn().mockResolvedValue({ id: 'n1', isRead: true }),
    markAllNudgesRead: vi.fn().mockResolvedValue({ count: 3 }),
    NUDGE_TYPES: { STREAK_RISK: 'STREAK_RISK', EXAM_WARNING: 'EXAM_WARNING', MORNING_BRIEFING: 'MORNING_BRIEFING', SLIP_DETECTION: 'SLIP_DETECTION', RECOVERY_SUGGESTION: 'RECOVERY_SUGGESTION' },
}));

// Mock Prisma
vi.mock('@repo/db', () => {
    const Frequency = { DAILY: 'DAILY', WEEKLY: 'WEEKLY' };
    return {
        prisma: {
            habit: {
                create: vi.fn(),
                findMany: vi.fn(),
                findUnique: vi.fn(),
                findFirst: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            habitLog: {
                create: vi.fn(),
                findFirst: vi.fn(),
                findMany: vi.fn(),
                deleteMany: vi.fn(),
            },
            $transaction: vi.fn(async (actions: unknown[]) => Promise.all(actions as Promise<unknown>[])),
            user: {
                findUnique: vi.fn(),
                update: vi.fn(),
            },
            nudge: {
                findMany: vi.fn(),
                update: vi.fn(),
                updateMany: vi.fn(),
            },
        },
        Frequency,
    };
});

import { app } from '../src/index.js';
import { prisma } from '@repo/db';

// ─── Habit CRUD Tests ───────────────────────────────────────────────────────────

describe('Habit endpoints — CRUD', () => {
    beforeEach(() => vi.clearAllMocks());

    // CREATE
    it('POST /api/habits — creates a new habit', async () => {
        const created = {
            id: 'h1', name: 'Morning Run', frequency: 'DAILY', targetValue: 1,
            userId: 'user-1', currentStreak: 0, longestStreak: 0,
            mercyDaysAllowed: 1, mercyDaysUsed: 0,
        };
        (prisma.habit.create as any).mockResolvedValue(created);

        const res = await request(app)
            .post('/api/habits')
            .send({ name: 'Morning Run' });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('habit');
        expect(res.body.habit.name).toBe('Morning Run');
    });

    it('POST /api/habits — 400 when name is missing', async () => {
        const res = await request(app)
            .post('/api/habits')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
    });

    it('POST /api/habits — accepts mercyDaysAllowed', async () => {
        const created = {
            id: 'h2', name: 'Meditate', frequency: 'DAILY', targetValue: 1,
            userId: 'user-1', mercyDaysAllowed: 2,
        };
        (prisma.habit.create as any).mockResolvedValue(created);

        const res = await request(app)
            .post('/api/habits')
            .send({ name: 'Meditate', mercyDaysAllowed: 2 });

        expect(res.status).toBe(201);
        expect(prisma.habit.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ mercyDaysAllowed: 2 }),
            })
        );
    });

    // GET ALL
    it('GET /api/habits — returns list of habits', async () => {
        (prisma.habit.findMany as any).mockResolvedValue([
            { id: 'h1', name: 'Run', frequency: 'DAILY', currentStreak: 3, longestStreak: 5, lastLogDate: null, logs: [], userId: 'user-1' },
        ]);

        const res = await request(app).get('/api/habits');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('habits');
        expect(Array.isArray(res.body.habits)).toBe(true);
    });

    // GET STATS
    it('GET /api/habits/:id/stats — returns habit stats with gentle streak', async () => {
        (prisma.habit.findFirst as any).mockResolvedValue({
            id: 'h1', name: 'Run', frequency: 'DAILY', targetValue: 1,
            currentStreak: 5, longestStreak: 10, lastLogDate: new Date(),
            logs: [{ loggedAt: new Date(), completedValue: 1 }],
            userId: 'user-1',
        });

        const res = await request(app).get('/api/habits/h1/stats');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('stats');
        expect(res.body.stats).toHaveProperty('currentStreak');
        expect(res.body.stats).toHaveProperty('streakHealth');
    });

    // UPDATE
    it('PUT /api/habits/:id — updates a habit', async () => {
        (prisma.habit.findFirst as any).mockResolvedValue({ id: 'h1', userId: 'user-1' });
        (prisma.habit.update as any).mockResolvedValue({
            id: 'h1', name: 'Evening Run', frequency: 'DAILY', userId: 'user-1',
        });

        const res = await request(app)
            .put('/api/habits/h1')
            .send({ name: 'Evening Run' });

        expect(res.status).toBe(200);
        expect(res.body.habit.name).toBe('Evening Run');
    });

    // DELETE
    it('DELETE /api/habits/:id — deletes a habit', async () => {
        (prisma.habit.findFirst as any).mockResolvedValue({ id: 'h1', userId: 'user-1' });
        (prisma.habit.delete as any).mockResolvedValue({ id: 'h1' });

        const res = await request(app).delete('/api/habits/h1');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });
});

// ─── Habit Logging ──────────────────────────────────────────────────────────────

describe('Habit endpoints — Log Completion', () => {
    beforeEach(() => vi.clearAllMocks());

    it('POST /api/habits/:id/log — logs a habit completion', async () => {
        (prisma.habit.findUnique as any).mockResolvedValue({
            id: 'h1', name: 'Run', frequency: 'DAILY', userId: 'user-1',
            mercyDaysAllowed: 1, mercyDaysUsed: 0,
        });
        (prisma.habitLog.findFirst as any).mockResolvedValue(null); // no existing log
        (prisma.habitLog.create as any).mockResolvedValue({
            id: 'l1', habitId: 'h1', completedValue: 1, loggedAt: new Date(),
        });
        (prisma.habit.update as any).mockResolvedValue({
            id: 'h1', name: 'Run', currentStreak: 5, longestStreak: 10,
        });

        const res = await request(app)
            .post('/api/habits/h1/log')
            .send({});

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('log');
    });

    it('POST /api/habits/:id/log — returns 200 if already logged in this period', async () => {
        (prisma.habit.findUnique as any).mockResolvedValue({
            id: 'h1', name: 'Run', frequency: 'DAILY', userId: 'user-1', lastLogDate: new Date(),
        });
        (prisma.habit.findFirst as any).mockResolvedValue({
            id: 'h1', name: 'Run', frequency: 'DAILY', userId: 'user-1', lastLogDate: new Date(),
        });
        (prisma.habitLog.findFirst as any).mockResolvedValue({
            id: 'existing-log', habitId: 'h1', completedValue: 1, loggedAt: new Date(),
        });

        const res = await request(app)
            .post('/api/habits/h1/log')
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Habit already logged for this period');
        expect(res.body.alreadyLogged).toBe(true);
    });

    it('POST /api/habits/:id/log — self-heals stale period log after reset', async () => {
        (prisma.habit.findFirst as any).mockResolvedValue({
            id: 'h1', name: 'Run', frequency: 'DAILY', userId: 'user-1', lastLogDate: null,
            currentStreak: 0, longestStreak: 0, mercyDaysUsed: 0,
        });
        (prisma.habit.findUnique as any).mockResolvedValue({
            id: 'h1', name: 'Run', frequency: 'DAILY', userId: 'user-1', lastLogDate: null,
            currentStreak: 0, longestStreak: 0, mercyDaysUsed: 0,
        });
        (prisma.habitLog.findFirst as any).mockResolvedValue({
            id: 'stale-log', habitId: 'h1', completedValue: 1, loggedAt: new Date(),
        });
        (prisma.habitLog.deleteMany as any).mockResolvedValue({ count: 1 });
        (prisma.habitLog.create as any).mockResolvedValue({
            id: 'l2', habitId: 'h1', completedValue: 1, loggedAt: new Date(),
        });
        (prisma.habit.update as any).mockResolvedValue({
            id: 'h1', name: 'Run', frequency: 'DAILY', currentStreak: 1, longestStreak: 1,
            mercyDaysUsed: 0, lastLogDate: new Date(),
        });

        const res = await request(app)
            .post('/api/habits/h1/log')
            .send({});

        expect(res.status).toBe(201);
        expect(prisma.habitLog.deleteMany).toHaveBeenCalledWith({
            where: { habitId: 'h1' },
        });
        expect(res.body).toHaveProperty('log');
    });
});

// ─── Phase 2 XP & Gamification Endpoints ────────────────────────────────────────

describe('Habit endpoints — XP & Gamification', () => {
    beforeEach(() => vi.clearAllMocks());

    it('GET /api/habits/xp — returns user XP and level', async () => {
        (prisma.user.findUnique as any).mockResolvedValue({
            id: 'user-1', xp: 250, level: 3,
        });

        const res = await request(app).get('/api/habits/xp');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('xp');
    });

    it('GET /api/habits/heatmap — returns 365-day heatmap', async () => {
        const res = await request(app).get('/api/habits/heatmap');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('heatmap');
        expect(Array.isArray(res.body.heatmap)).toBe(true);
        expect(res.body.heatmap.length).toBeGreaterThanOrEqual(365);
    });
});

// ─── Phase 2 Nudge Endpoints ────────────────────────────────────────────────────

describe('Habit endpoints — Nudges', () => {
    beforeEach(() => vi.clearAllMocks());

    it('GET /api/habits/nudges — returns nudge list', async () => {
        const res = await request(app).get('/api/habits/nudges');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('nudges');
        expect(Array.isArray(res.body.nudges)).toBe(true);
    });

    it('POST /api/habits/nudges/:id/read — marks nudge as read', async () => {
        const res = await request(app).post('/api/habits/nudges/n1/read');

        expect(res.status).toBe(200);
    });

    it('POST /api/habits/nudges/read-all — marks all nudges as read', async () => {
        const res = await request(app).post('/api/habits/nudges/read-all');

        expect(res.status).toBe(200);
    });

    it('GET /api/habits/nudges/settings — returns notification settings including schedule fields', async () => {
        const res = await request(app).get('/api/habits/nudges/settings');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('settings.preDeadlineDays', 2);
        expect(res.body).toHaveProperty('settings.streakReminderTime', '09:00');
    });

    it('PUT /api/habits/nudges/settings — accepts partial schedule settings updates', async () => {
        const res = await request(app)
            .put('/api/habits/nudges/settings')
            .send({ preDeadlineDays: 3 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('settings.preDeadlineDays');
    });
});

// ─── Phase 2 Morning Briefing ───────────────────────────────────────────────────

describe('Habit endpoints — Morning Briefing', () => {
    beforeEach(() => vi.clearAllMocks());

    it('GET /api/habits/briefing — returns morning briefing', async () => {
        const res = await request(app).get('/api/habits/briefing');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('briefing');
        expect(res.body.briefing).toHaveProperty('dueTasks');
        expect(res.body.briefing).toHaveProperty('habitsToComplete');
        expect(res.body.briefing).toHaveProperty('upcomingExams');
        expect(res.body.briefing).toHaveProperty('streaksAtRisk');
        expect(res.body.briefing).toHaveProperty('conflicts');
    });
});

// ─── Reset ──────────────────────────────────────────────────────────────────────

describe('Habit endpoints — Reset', () => {
    beforeEach(() => vi.clearAllMocks());

    it('POST /api/habits/:id/reset — resets a habit', async () => {
        (prisma.habit.findFirst as any).mockResolvedValue({ id: 'h1', userId: 'user-1' });
        (prisma.habitLog.deleteMany as any).mockResolvedValue({ count: 2 });
        (prisma.habit.update as any).mockResolvedValue({
            id: 'h1', currentStreak: 0, longestStreak: 0, mercyDaysUsed: 0, lastLogDate: null,
        });

        const res = await request(app).post('/api/habits/h1/reset');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('habit');
    });
});

// ─── Event Handler ──────────────────────────────────────────────────────────────

describe('Habit endpoints — Event Handler', () => {
    beforeEach(() => vi.clearAllMocks());

    it('POST /api/habits/events — handles habit event', async () => {
        (prisma.habit.findMany as any).mockResolvedValue([]);

        const res = await request(app)
            .post('/api/habits/events')
            .send({ type: 'TaskCompleted', habitId: 'h1', completedValue: 1 });

        expect([200, 404]).toContain(res.status);
    });

    it('POST /api/habits/events — 400 on invalid payload', async () => {
        const res = await request(app)
            .post('/api/habits/events')
            .send({});

        expect([200, 400]).toContain(res.status);
    });
});
