import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/auth.middleware.js', () => ({
    isAuth: (req: any, _res: any, next: any) => {
        req.user = { id: 'user-1', username: 'Tester', email: 'test@example.com', dailyGoalHours: 4 };
        next();
    },
    enforceReadOnlyWrites: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('@repo/db', () => ({
    SessionType: {
        DEEP_WORK: 'DEEP_WORK',
        POMODORO: 'POMODORO',
        BREAK: 'BREAK',
    },
    prisma: {
        task: {
            findFirst: vi.fn(),
        },
        activityLog: {
            create: vi.fn(),
        },
    },
}));

import { app } from '../src/index.js';
import { prisma } from '@repo/db';
import { __resetFocusLiveSessionRegistry } from '../src/services/focus-live.service.js';

describe('Activity API — Live Focus Contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        __resetFocusLiveSessionRegistry();

        (prisma.task.findFirst as any).mockResolvedValue({
            id: 'task-1',
            title: 'Physics Mock Test',
            userId: 'user-1',
        });

        (prisma.activityLog.create as any).mockResolvedValue({
            id: 'log-1',
            taskId: 'task-1',
            durationMinutes: 1,
            startTime: new Date('2026-01-01T10:00:00Z'),
            endTime: new Date('2026-01-01T10:01:00Z'),
            sessionType: 'DEEP_WORK',
        });
    });

    it('starts a live focus session and fetches active session', async () => {
        const startRes = await request(app)
            .post('/api/activity/live/start')
            .send({ taskId: 'task-1', plannedDurationMinutes: 25, sessionType: 'DEEP_WORK' });

        expect(startRes.status).toBe(201);
        expect(startRes.body.session).toHaveProperty('sessionId');
        expect(startRes.body.session).toHaveProperty('status', 'RUNNING');
        expect(startRes.body.session).toHaveProperty('remainingSeconds', 1500);

        const activeRes = await request(app).get('/api/activity/live/active');
        expect(activeRes.status).toBe(200);
        expect(activeRes.body.session).not.toBeNull();
        expect(activeRes.body.session).toHaveProperty('taskId', 'task-1');
    });

    it('pauses and resumes an active live session', async () => {
        const startRes = await request(app)
            .post('/api/activity/live/start')
            .send({ taskId: 'task-1', plannedDurationMinutes: 20 });

        const sessionId = startRes.body.session.sessionId;

        const pauseRes = await request(app)
            .patch('/api/activity/live/pause')
            .send({ sessionId });

        expect(pauseRes.status).toBe(200);
        expect(pauseRes.body.session).toHaveProperty('status', 'PAUSED');

        const resumeRes = await request(app)
            .patch('/api/activity/live/resume')
            .send({ sessionId });

        expect(resumeRes.status).toBe(200);
        expect(resumeRes.body.session).toHaveProperty('status', 'RUNNING');
    });

    it('accepts heartbeat updates', async () => {
        const startRes = await request(app)
            .post('/api/activity/live/start')
            .send({ taskId: 'task-1', plannedDurationMinutes: 30 });

        const sessionId = startRes.body.session.sessionId;

        const heartbeatRes = await request(app)
            .patch('/api/activity/live/heartbeat')
            .send({ sessionId, remainingSeconds: 1200, deviceId: 'iphone-15-pro' });

        expect(heartbeatRes.status).toBe(200);
        expect(heartbeatRes.body.session).toHaveProperty('sessionId', sessionId);
        expect(heartbeatRes.body.session).toHaveProperty('deviceId', 'iphone-15-pro');
    });

    it('stops a session and persists activity log when session is long enough', async () => {
        vi.useFakeTimers();
        const baseTime = new Date('2026-01-01T10:00:00Z');
        vi.setSystemTime(baseTime);

        const startRes = await request(app)
            .post('/api/activity/live/start')
            .send({ taskId: 'task-1', plannedDurationMinutes: 25, sessionType: 'DEEP_WORK' });

        const sessionId = startRes.body.session.sessionId;

        vi.setSystemTime(new Date(baseTime.getTime() + 45_000));

        const stopRes = await request(app)
            .patch('/api/activity/live/stop')
            .send({ sessionId, outcome: 'COMPLETED' });

        expect(stopRes.status).toBe(200);
        expect(stopRes.body.session).toHaveProperty('status', 'COMPLETED');
        expect(prisma.activityLog.create).toHaveBeenCalledTimes(1);
    });

    it('stops a short session without persisting a log entry', async () => {
        vi.useFakeTimers();
        const baseTime = new Date('2026-01-01T10:00:00Z');
        vi.setSystemTime(baseTime);

        const startRes = await request(app)
            .post('/api/activity/live/start')
            .send({ taskId: 'task-1', plannedDurationMinutes: 25 });

        const sessionId = startRes.body.session.sessionId;

        vi.setSystemTime(new Date(baseTime.getTime() + 10_000));

        const stopRes = await request(app)
            .patch('/api/activity/live/stop')
            .send({ sessionId, outcome: 'CANCELLED' });

        expect(stopRes.status).toBe(200);
        expect(stopRes.body.session).toHaveProperty('status', 'CANCELLED');
        expect(prisma.activityLog.create).not.toHaveBeenCalled();
    });

    it('returns 404 when pausing unknown session', async () => {
        const res = await request(app)
            .patch('/api/activity/live/pause')
            .send({ sessionId: randomUUID() });

        expect(res.status).toBe(404);
    });

    it('returns 400 when start payload is invalid', async () => {
        const res = await request(app)
            .post('/api/activity/live/start')
            .send({});

        expect(res.status).toBe(400);
    });
});
