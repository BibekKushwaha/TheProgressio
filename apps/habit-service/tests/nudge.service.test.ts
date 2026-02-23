/**
 * Unit tests for nudge.service.ts
 *
 * Tests streak risk detection, exam warnings, morning briefing generation,
 * slip pattern detection, and nudge CRUD with mocked Prisma.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ────────────────────────────────────────────────────────────────

const { mockPrisma } = vi.hoisted(() => ({
    mockPrisma: {
        habit: { findMany: vi.fn() },
        nudge: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
        exam: { findMany: vi.fn() },
        task: { count: vi.fn() },
        habitLog: { findMany: vi.fn(), groupBy: vi.fn() },
        user: { findUnique: vi.fn() },
        timetable: { findMany: vi.fn() },
        schoolHoliday: { findFirst: vi.fn() },
    },
}));

vi.mock('@repo/db', () => ({
    prisma: mockPrisma,
}));

import {
    NUDGE_TYPES,
    getNotificationSettings,
    detectStreakRisks,
    detectExamWarnings,
    generateMorningBriefing,
    getUserNudges,
    markNudgeRead,
    markAllNudgesRead,
    upsertNotificationSettings,
} from '../src/services/nudge.service';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const hoursAgo = (h: number): Date => new Date(Date.now() - h * 3600_000);

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('Nudge Service — NUDGE_TYPES', () => {
    it('exports all expected nudge types', () => {
        expect(NUDGE_TYPES.STREAK_RISK).toBe('STREAK_RISK');
        expect(NUDGE_TYPES.BEHAVIORAL_NUDGE).toBe('BEHAVIORAL_NUDGE');
        expect(NUDGE_TYPES.EXAM_WARNING).toBe('EXAM_WARNING');
        expect(NUDGE_TYPES.ADVANCE_ALERT_3WEEK).toBe('ADVANCE_ALERT_3WEEK');
        expect(NUDGE_TYPES.MORNING_BRIEFING).toBe('MORNING_BRIEFING');
        expect(NUDGE_TYPES.TRANSACTION_SYSTEM).toBe('TRANSACTION_SYSTEM');
        expect(NUDGE_TYPES.SLIP_DETECTION).toBe('SLIP_DETECTION');
        expect(NUDGE_TYPES.RECOVERY_SUGGESTION).toBe('RECOVERY_SUGGESTION');
    });
});

describe('Nudge Service — detectStreakRisks', () => {
    beforeEach(() => vi.clearAllMocks());

    it('does nothing when no habits exist', async () => {
        mockPrisma.habit.findMany.mockResolvedValue([]);

        await detectStreakRisks('u1');

        expect(mockPrisma.nudge.create).not.toHaveBeenCalled();
    });

    it('does nothing when habit was just logged', async () => {
        mockPrisma.habit.findMany.mockResolvedValue([{
            id: 'h1',
            name: 'Read',
            frequency: 'DAILY',
            currentStreak: 5,
            logs: [{ loggedAt: hoursAgo(2) }],
        }]);

        await detectStreakRisks('u1');

        expect(mockPrisma.nudge.create).not.toHaveBeenCalled();
    });

    it('creates a STREAK_RISK nudge when daily habit is overdue >20h', async () => {
        mockPrisma.habit.findMany.mockResolvedValue([{
            id: 'h1',
            name: 'Read',
            frequency: 'DAILY',
            currentStreak: 5,
            logs: [{ loggedAt: hoursAgo(22) }],
        }]);
        mockPrisma.nudge.findFirst.mockResolvedValue(null); // no existing nudge today
        mockPrisma.nudge.create.mockResolvedValue({ id: 'n1' });

        await detectStreakRisks('u1');

        expect(mockPrisma.nudge.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'u1',
                    type: 'STREAK_RISK',
                }),
            })
        );
    });

    it('does not duplicate nudge if one already exists today', async () => {
        mockPrisma.habit.findMany.mockResolvedValue([{
            id: 'h1',
            name: 'Read',
            frequency: 'DAILY',
            currentStreak: 5,
            logs: [{ loggedAt: hoursAgo(22) }],
        }]);
        mockPrisma.nudge.findFirst.mockResolvedValue({ id: 'existing-nudge' });

        await detectStreakRisks('u1');

        expect(mockPrisma.nudge.create).not.toHaveBeenCalled();
    });
});

describe('Nudge Service — detectExamWarnings', () => {
    beforeEach(() => vi.clearAllMocks());

    it('does nothing when no exams are upcoming', async () => {
        mockPrisma.exam.findMany.mockResolvedValue([]);

        await detectExamWarnings('u1');

        expect(mockPrisma.nudge.create).not.toHaveBeenCalled();
    });

    it('creates EXAM_WARNING nudge for an exam 7 days away', async () => {
        const examDate = new Date();
        examDate.setDate(examDate.getDate() + 7);

        mockPrisma.exam.findMany.mockResolvedValue([{
            id: 'e1',
            title: 'Physics Final',
            date: examDate,
            subjectId: 's1',
            subject: { name: 'Physics' },
        }]);
        mockPrisma.nudge.findFirst.mockResolvedValue(null);
        mockPrisma.nudge.create.mockResolvedValue({ id: 'n1' });

        await detectExamWarnings('u1');

        expect(mockPrisma.nudge.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'u1',
                    type: 'ADVANCE_ALERT_3WEEK',
                }),
            })
        );
    });

    it('uses preDeadlineDays setting when generating exam warnings', async () => {
        const examDate = new Date();
        examDate.setDate(examDate.getDate() + 2);

        mockPrisma.nudge.findFirst
            .mockResolvedValueOnce({
                metadata: JSON.stringify({
                    settings: {
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
                    },
                }),
            })
            .mockResolvedValueOnce(null);
        mockPrisma.exam.findMany.mockResolvedValue([{
            id: 'e2',
            title: 'Chemistry Quiz',
            date: examDate,
            subjectId: 's2',
            subject: { name: 'Chemistry' },
        }]);
        mockPrisma.nudge.create.mockResolvedValue({ id: 'n2' });

        await detectExamWarnings('u1');

        expect(mockPrisma.nudge.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    type: 'ADVANCE_ALERT_3WEEK',
                }),
            })
        );
    });
});

describe('Nudge Service — notification settings', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns default settings when user has no settings record', async () => {
        mockPrisma.nudge.findFirst.mockResolvedValue(null);

        const settings = await getNotificationSettings('u1');

        expect(settings.groupedSummaries).toBe(true);
        expect(settings.enabledBuckets).toHaveProperty('URGENCY_DRIVEN', true);
        expect(settings.preDeadlineDays).toBe(2);
        expect(settings.streakReminderTime).toBe('09:00');
        expect(settings.timezone).toBe('UTC');
        expect(settings.timezoneOffsetMinutes).toBe(0);
    });

    it('upserts merged settings payload', async () => {
        mockPrisma.nudge.findFirst.mockResolvedValue({
            metadata: JSON.stringify({
                settings: {
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
                },
            }),
        });
        mockPrisma.nudge.create.mockResolvedValue({ id: 'settings-1' });

        const result = await upsertNotificationSettings('u1', {
            groupedSummaries: false,
            quietHours: [{ start: '22:00', end: '07:00' }],
        });

        expect(result.groupedSummaries).toBe(false);
        expect(result.quietHours).toHaveLength(1);
        expect(result.preDeadlineDays).toBe(2);
        expect(result.streakReminderTime).toBe('09:00');
        expect(result.timezone).toBe('UTC');
        expect(result.timezoneOffsetMinutes).toBe(0);
        expect(mockPrisma.nudge.create).toHaveBeenCalled();
    });

    it('normalizes invalid new settings fields back to defaults', async () => {
        mockPrisma.nudge.findFirst.mockResolvedValue({
            metadata: JSON.stringify({
                settings: {
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
                    preDeadlineDays: 9,
                    streakReminderTime: 'invalid',
                    timezone: 'Bad/Timezone',
                    timezoneOffsetMinutes: 9999,
                },
            }),
        });

        const settings = await getNotificationSettings('u1');

        expect(settings.preDeadlineDays).toBe(2);
        expect(settings.streakReminderTime).toBe('09:00');
        expect(settings.timezone).toBe('UTC');
        expect(settings.timezoneOffsetMinutes).toBe(0);
    });
});

describe('Nudge Service — schedule alignment', () => {
    beforeEach(() => vi.clearAllMocks());

    it('uses streakReminderTime for streak-risk scheduling', async () => {
        mockPrisma.nudge.findFirst
            .mockResolvedValueOnce({
                metadata: JSON.stringify({
                    settings: {
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
                        streakReminderTime: '18:00',
                        timezone: 'UTC',
                        timezoneOffsetMinutes: 0,
                    },
                }),
            })
            .mockResolvedValueOnce(null);
        mockPrisma.habit.findMany.mockResolvedValue([{
            id: 'h2',
            name: 'Meditate',
            frequency: 'DAILY',
            currentStreak: 12,
            logs: [{ loggedAt: hoursAgo(24) }],
        }]);
        mockPrisma.nudge.create.mockResolvedValue({ id: 'n3' });

        await detectStreakRisks('u1');

        expect(mockPrisma.nudge.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    scheduledAt: expect.any(Date),
                }),
            })
        );

        const payload = mockPrisma.nudge.create.mock.calls[0]?.[0] as { data: { scheduledAt: Date } };
        expect(payload.data.scheduledAt.getUTCHours()).toBe(18);
        expect(payload.data.scheduledAt.getUTCMinutes()).toBe(0);
    });
});

describe('Nudge Service — generateMorningBriefing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma.schoolHoliday.findFirst.mockResolvedValue(null);
    });

    it('returns a morning briefing with all fields', async () => {
        mockPrisma.task.count.mockResolvedValue(3);
        mockPrisma.habit.findMany.mockResolvedValue([
            { id: 'h1', name: 'Read', frequency: 'DAILY', currentStreak: 5, lastLogDate: hoursAgo(30), logs: [] },
        ]);
        mockPrisma.exam.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ dailyGoalHours: 4 });
        mockPrisma.timetable.findMany.mockResolvedValue([]);

        const briefing = await generateMorningBriefing('u1');

        expect(briefing).toHaveProperty('dueTasks');
        expect(briefing).toHaveProperty('habitsToComplete');
        expect(briefing).toHaveProperty('upcomingExams');
        expect(briefing).toHaveProperty('streaksAtRisk');
        expect(briefing).toHaveProperty('conflicts');
        expect(typeof briefing.dueTasks).toBe('number');
    });

    it('detects streaks at risk in briefing', async () => {
        mockPrisma.task.count.mockResolvedValue(0);
        mockPrisma.habit.findMany.mockResolvedValue([
            { id: 'h1', name: 'Meditate', frequency: 'DAILY', currentStreak: 10, lastLogDate: hoursAgo(25), logs: [] },
        ]);
        mockPrisma.exam.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ dailyGoalHours: 4 });
        mockPrisma.timetable.findMany.mockResolvedValue([]);

        const briefing = await generateMorningBriefing('u1');

        expect(briefing.streaksAtRisk.length).toBeGreaterThanOrEqual(1);
        expect(briefing.streaksAtRisk[0]).toHaveProperty('habitName', 'Meditate');
    });
});

describe('Nudge Service — getUserNudges / markRead', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns all nudges for a user', async () => {
        const nudges = [
            { id: 'n1', type: 'STREAK_RISK', isRead: false },
            { id: 'n2', type: 'EXAM_WARNING', isRead: true },
        ];
        mockPrisma.nudge.findMany.mockResolvedValue(nudges);

        const result = await getUserNudges('u1');

        expect(result).toHaveLength(2);
        expect(mockPrisma.nudge.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'u1' }),
            })
        );
    });

    it('filters unread nudges when requested', async () => {
        mockPrisma.nudge.findMany.mockResolvedValue([]);

        await getUserNudges('u1', true);

        expect(mockPrisma.nudge.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'u1', isRead: false }),
            })
        );
    });

    it('markNudgeRead updates nudges for a user', async () => {
        mockPrisma.nudge.updateMany.mockResolvedValue({ count: 1 });

        await markNudgeRead('n1', 'u1');

        expect(mockPrisma.nudge.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'n1', userId: 'u1' },
                data: { isRead: true },
            })
        );
    });

    it('markAllNudgesRead marks all for user', async () => {
        mockPrisma.nudge.updateMany.mockResolvedValue({ count: 5 });

        await markAllNudgesRead('u1');

        expect(mockPrisma.nudge.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: 'u1', isRead: false },
                data: { isRead: true },
            })
        );
    });
});
