import { randomUUID } from 'node:crypto';

export type FocusSessionType = 'DEEP_WORK' | 'POMODORO' | 'BREAK';
export type FocusSessionStatus = 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface FocusLiveSessionSnapshot {
    sessionId: string;
    userId: string;
    taskId: string;
    taskTitle: string;
    sessionType: FocusSessionType;
    status: FocusSessionStatus;
    plannedDurationMinutes: number;
    elapsedSeconds: number;
    remainingSeconds: number;
    startedAt: string;
    pausedAt?: string;
    resumedAt?: string;
    endedAt?: string;
    lastHeartbeatAt: string;
    deviceId?: string;
    source?: string;
    recommendedStart?: string;
    recommendedEnd?: string;
}

export interface StartFocusLiveSessionParams {
    userId: string;
    taskId: string;
    taskTitle: string;
    plannedDurationMinutes: number;
    sessionType: FocusSessionType;
    deviceId?: string;
    source?: string;
    recommendedStart?: string;
    recommendedEnd?: string;
}

interface FocusLiveSessionRuntime {
    sessionId: string;
    userId: string;
    taskId: string;
    taskTitle: string;
    sessionType: FocusSessionType;
    plannedDurationMinutes: number;
    status: 'RUNNING' | 'PAUSED';
    startedAt: Date;
    pausedAt?: Date;
    resumedAt?: Date;
    lastHeartbeatAt: Date;
    deviceId?: string;
    source?: string;
    recommendedStart?: string;
    recommendedEnd?: string;
    accumulatedSeconds: number;
    runningSince?: Date;
}

export class FocusSessionError extends Error {
    constructor(
        public readonly code: 'NOT_FOUND' | 'CONFLICT' | 'BAD_REQUEST',
        message: string
    ) {
        super(message);
    }
}

const MAX_IDLE_MS = 6 * 60 * 60 * 1000;

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

const secondsBetween = (start: Date, end: Date) =>
    Math.floor((end.getTime() - start.getTime()) / 1000);

const computeElapsedSeconds = (session: FocusLiveSessionRuntime, now = new Date()): number => {
    const runningSeconds =
        session.status === 'RUNNING' && session.runningSince
            ? Math.max(0, secondsBetween(session.runningSince, now))
            : 0;

    return Math.max(0, session.accumulatedSeconds + runningSeconds);
};

const toSnapshot = (
    session: FocusLiveSessionRuntime,
    now = new Date(),
    statusOverride?: FocusSessionStatus,
    endedAt?: Date
): FocusLiveSessionSnapshot => {
    const elapsedSeconds = computeElapsedSeconds(session, now);
    const plannedSeconds = session.plannedDurationMinutes * 60;

    const snapshot: FocusLiveSessionSnapshot = {
        sessionId: session.sessionId,
        userId: session.userId,
        taskId: session.taskId,
        taskTitle: session.taskTitle,
        sessionType: session.sessionType,
        status: statusOverride ?? session.status,
        plannedDurationMinutes: session.plannedDurationMinutes,
        elapsedSeconds,
        remainingSeconds: Math.max(plannedSeconds - elapsedSeconds, 0),
        startedAt: session.startedAt.toISOString(),
        lastHeartbeatAt: session.lastHeartbeatAt.toISOString(),
    };

    if (session.pausedAt) snapshot.pausedAt = session.pausedAt.toISOString();
    if (session.resumedAt) snapshot.resumedAt = session.resumedAt.toISOString();
    if (endedAt) snapshot.endedAt = endedAt.toISOString();
    if (session.deviceId) snapshot.deviceId = session.deviceId;
    if (session.source) snapshot.source = session.source;
    if (session.recommendedStart) snapshot.recommendedStart = session.recommendedStart;
    if (session.recommendedEnd) snapshot.recommendedEnd = session.recommendedEnd;

    return snapshot;
};

class FocusLiveSessionRegistry {
    private sessionsByUser = new Map<string, FocusLiveSessionRuntime>();

    start(params: StartFocusLiveSessionParams): FocusLiveSessionSnapshot {
        const now = new Date();

        const session: FocusLiveSessionRuntime = {
            sessionId: randomUUID(),
            userId: params.userId,
            taskId: params.taskId,
            taskTitle: params.taskTitle,
            sessionType: params.sessionType,
            plannedDurationMinutes: clamp(params.plannedDurationMinutes, 1, 360),
            status: 'RUNNING',
            startedAt: now,
            lastHeartbeatAt: now,
            accumulatedSeconds: 0,
            runningSince: now,
            ...(params.deviceId && { deviceId: params.deviceId }),
            ...(params.source && { source: params.source }),
            ...(params.recommendedStart && { recommendedStart: params.recommendedStart }),
            ...(params.recommendedEnd && { recommendedEnd: params.recommendedEnd }),
        };

        this.sessionsByUser.set(params.userId, session);
        return toSnapshot(session, now);
    }

    getActive(userId: string): FocusLiveSessionSnapshot | null {
        const session = this.sessionsByUser.get(userId);
        if (!session) return null;

        const now = new Date();
        if (now.getTime() - session.lastHeartbeatAt.getTime() > MAX_IDLE_MS) {
            this.sessionsByUser.delete(userId);
            return null;
        }

        return toSnapshot(session, now);
    }

    pause(userId: string, sessionId: string, deviceId?: string): FocusLiveSessionSnapshot {
        const session = this.assertSession(userId, sessionId);
        const now = new Date();

        if (session.status === 'PAUSED') {
            return toSnapshot(session, now);
        }

        session.accumulatedSeconds = computeElapsedSeconds(session, now);
        delete session.runningSince;
        session.status = 'PAUSED';
        session.pausedAt = now;
        session.lastHeartbeatAt = now;
        if (deviceId) session.deviceId = deviceId;

        return toSnapshot(session, now);
    }

    resume(userId: string, sessionId: string, deviceId?: string): FocusLiveSessionSnapshot {
        const session = this.assertSession(userId, sessionId);
        const now = new Date();

        if (session.status === 'RUNNING') {
            return toSnapshot(session, now);
        }

        session.status = 'RUNNING';
        session.runningSince = now;
        session.resumedAt = now;
        session.lastHeartbeatAt = now;
        if (deviceId) session.deviceId = deviceId;

        return toSnapshot(session, now);
    }

    heartbeat(
        userId: string,
        sessionId: string,
        params?: { remainingSeconds?: number; deviceId?: string }
    ): FocusLiveSessionSnapshot {
        const session = this.assertSession(userId, sessionId);
        const now = new Date();

        session.lastHeartbeatAt = now;

        if (params?.deviceId) {
            session.deviceId = params.deviceId;
        }

        if (typeof params?.remainingSeconds === 'number' && params.remainingSeconds >= 0) {
            const elapsed = computeElapsedSeconds(session, now);
            const nextTotalSeconds = clamp(elapsed + params.remainingSeconds, 60, 360 * 60);
            session.plannedDurationMinutes = Math.ceil(nextTotalSeconds / 60);
        }

        return toSnapshot(session, now);
    }

    stop(
        userId: string,
        sessionId: string,
        outcome: 'COMPLETED' | 'CANCELLED'
    ): {
        session: FocusLiveSessionSnapshot;
        startTime: Date;
        endTime: Date;
        elapsedSeconds: number;
        durationMinutes: number;
    } {
        const session = this.assertSession(userId, sessionId);
        const endTime = new Date();
        const elapsedSeconds = computeElapsedSeconds(session, endTime);

        this.sessionsByUser.delete(userId);

        return {
            session: toSnapshot(session, endTime, outcome, endTime),
            startTime: session.startedAt,
            endTime,
            elapsedSeconds,
            durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
        };
    }

    reset(): void {
        this.sessionsByUser.clear();
    }

    getOperationalSnapshot(): { activeSessions: number; runningSessions: number; pausedSessions: number } {
        let runningSessions = 0;
        let pausedSessions = 0;

        for (const session of this.sessionsByUser.values()) {
            if (session.status === 'RUNNING') {
                runningSessions += 1;
            } else if (session.status === 'PAUSED') {
                pausedSessions += 1;
            }
        }

        return {
            activeSessions: this.sessionsByUser.size,
            runningSessions,
            pausedSessions,
        };
    }

    private assertSession(userId: string, sessionId: string): FocusLiveSessionRuntime {
        const session = this.sessionsByUser.get(userId);
        if (!session || session.sessionId !== sessionId) {
            throw new FocusSessionError('NOT_FOUND', 'No active focus session found for this user/sessionId');
        }

        return session;
    }
}

export const focusLiveSessionRegistry = new FocusLiveSessionRegistry();

export const __resetFocusLiveSessionRegistry = () => {
    focusLiveSessionRegistry.reset();
};
