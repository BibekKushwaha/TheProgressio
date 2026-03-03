import request from "supertest";
import { describe, it, beforeEach, expect, vi } from "vitest";

// Mock auth middleware to inject a test user
vi.mock("../src/middleware/auth.middleware.js", () => ({
    isAuth: (req: any, _res: any, next: any) => {
        req.user = { id: "user-1", username: "Tester", email: "test@example.com", dailyGoalHours: 4, role: "ADMIN" };
        next();
    },
    isAdmin: (_req: any, _res: any, next: any) => next(),
    adminRateLimit: (_req: any, _res: any, next: any) => next(),
    requireAdminIp: (_req: any, _res: any, next: any) => next(),
    enforceReadOnlyWrites: () => (req: any, res: any, next: any) => next(),
}));

const emitPushEventMock = vi.fn().mockResolvedValue(undefined);
vi.mock("../src/services/queue.service.js", () => ({
    emitTaskEvent: vi.fn().mockResolvedValue(undefined),
    emitPushEvent: (...args: any[]) => emitPushEventMock(...args),
    QUEUE_NAMES: {
        TASK_EVENTS: "planner.task.events",
        TASK_ANALYTICS: "planner.task.analytics",
        HABIT_TRIGGERS: "planner.habit.triggers",
        WEB_PUSH: "planner.web.push",
    },
    TaskEventType: {
        TASK_CREATED: "task.created",
        TASK_UPDATED: "task.updated",
        TASK_COMPLETED: "task.completed",
        TASK_DELETED: "task.deleted",
        TASK_STATUS_CHANGED: "task.status_changed",
    },
    producer: { close: vi.fn() },
}));

const sendPushNotificationMock = vi.fn().mockResolvedValue(undefined);
vi.mock("../src/services/push.service.js", () => ({
    sendPushNotification: (...args: any[]) => sendPushNotificationMock(...args),
}));

// Avoid Redis/BullMQ worker startup in tests
vi.mock("../src/workers/push.worker.js", () => ({
    initPushWorker: () => null,
}));

const webPushCountMock = vi.fn();
vi.mock("@repo/db", () => ({
    prisma: {
        webPushSubscription: {
            count: (...args: any[]) => webPushCountMock(...args),
        },
    },
    Status: { PENDING: "PENDING", IN_PROGRESS: "IN_PROGRESS", COMPLETED: "COMPLETED" },
    Priority: { LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH" },
    AttendanceStatus: { PRESENT: "PRESENT", ABSENT: "ABSENT", LATE: "LATE" },
    AttendanceMethod: { QR: "QR", MANUAL: "MANUAL", GEOFENCE: "GEOFENCE" },
}));

import { app } from "../src/index.js";

describe("Push notification endpoints", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.QUEUE_ENABLED;
        delete process.env.VAPID_PUBLIC_KEY;
        delete process.env.VAPID_PRIVATE_KEY;
    });

    it("returns 200 and subscriptionCount=0 when no subscriptions exist", async () => {
        webPushCountMock.mockResolvedValueOnce(0);
        process.env.QUEUE_ENABLED = "true";

        const res = await request(app).post("/api/notifications/push/test").send({});
        expect(res.status).toBe(200);
        expect(res.body.subscriptionCount).toBe(0);
        expect(res.body.message).toMatch(/no push subscriptions/i);
        expect(emitPushEventMock).not.toHaveBeenCalled();
        expect(sendPushNotificationMock).not.toHaveBeenCalled();
    });

    it("queues a test push when QUEUE_ENABLED=true", async () => {
        webPushCountMock.mockResolvedValueOnce(1);
        process.env.QUEUE_ENABLED = "true";

        const res = await request(app).post("/api/notifications/push/test").send({});
        expect(res.status).toBe(200);
        expect(res.body.mode).toBe("queued");
        expect(res.body.subscriptionCount).toBe(1);
        expect(emitPushEventMock).toHaveBeenCalledTimes(1);
        expect(sendPushNotificationMock).not.toHaveBeenCalled();
    });

    it("sends a direct test push when QUEUE_ENABLED!=true", async () => {
        webPushCountMock.mockResolvedValueOnce(1);
        process.env.QUEUE_ENABLED = "false";

        const res = await request(app).post("/api/notifications/push/test").send({});
        expect(res.status).toBe(200);
        expect(res.body.mode).toBe("direct");
        expect(res.body.subscriptionCount).toBe(1);
        expect(sendPushNotificationMock).toHaveBeenCalledTimes(1);
        expect(emitPushEventMock).not.toHaveBeenCalled();
    });

    it("returns push status for the current user", async () => {
        webPushCountMock.mockResolvedValueOnce(2);
        process.env.QUEUE_ENABLED = "false";
        process.env.VAPID_PUBLIC_KEY = "pub";
        process.env.VAPID_PRIVATE_KEY = "priv";

        const res = await request(app).get("/api/notifications/push/status");
        expect(res.status).toBe(200);
        expect(res.body.queueEnabled).toBe(false);
        expect(res.body.vapidConfigured).toBe(true);
        expect(res.body.subscriptionCount).toBe(2);
    });
});
