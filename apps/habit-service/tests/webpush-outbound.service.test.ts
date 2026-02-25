import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();
const mockDelete = vi.fn();

const mockSetVapidDetails = vi.fn();
const mockSendNotification = vi.fn();

vi.mock("@repo/db", () => ({
    prisma: {
        webPushSubscription: {
            findMany: (...args: any[]) => mockFindMany(...args),
            delete: (...args: any[]) => mockDelete(...args),
        },
    },
}));

vi.mock("web-push", () => ({
    default: {
        setVapidDetails: (...args: any[]) => mockSetVapidDetails(...args),
        sendNotification: (...args: any[]) => mockSendNotification(...args),
    },
}));

describe("dispatchWebPushNudge", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.VAPID_PUBLIC_KEY;
        delete process.env.VAPID_PRIVATE_KEY;
        delete process.env.VAPID_SUBJECT;
    });

    it("skips when VAPID is not configured", async () => {
        vi.resetModules();
        const mod = await import("../src/services/webpush-outbound.service.js");
        const res = await mod.dispatchWebPushNudge(
            { id: "n1", userId: "u1", title: "Hello", message: "World", priority: "HIGH" },
            "/dashboard",
        );

        expect(res.status).toBe("skipped");
        expect(res.reason).toBe("vapid_not_configured");
        expect(mockFindMany).not.toHaveBeenCalled();
    });

    it("skips when user has no subscriptions", async () => {
        process.env.VAPID_PUBLIC_KEY = "pub";
        process.env.VAPID_PRIVATE_KEY = "priv";
        process.env.VAPID_SUBJECT = "mailto:test@example.com";

        vi.resetModules();
        const mod = await import("../src/services/webpush-outbound.service.js");
        mockFindMany.mockResolvedValueOnce([]);

        const res = await mod.dispatchWebPushNudge(
            { id: "n1", userId: "u1", title: "Hello", message: "World", priority: "HIGH" },
            "/dashboard",
        );

        expect(res.status).toBe("skipped");
        expect(res.reason).toBe("no_subscription");
        expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it("removes invalid subscriptions on 410/404", async () => {
        process.env.VAPID_PUBLIC_KEY = "pub";
        process.env.VAPID_PRIVATE_KEY = "priv";
        process.env.VAPID_SUBJECT = "mailto:test@example.com";

        vi.resetModules();
        const mod = await import("../src/services/webpush-outbound.service.js");
        mockFindMany.mockResolvedValueOnce([
            { id: "sub-1", endpoint: "https://example.com/push", p256dh: "p", auth: "a" },
        ]);
        mockSendNotification.mockRejectedValueOnce({ statusCode: 410 });

        const res = await mod.dispatchWebPushNudge(
            { id: "n1", userId: "u1", title: "Hello", message: "World", priority: "HIGH" },
            "/dashboard",
        );

        expect(mockDelete).toHaveBeenCalledWith({ where: { id: "sub-1" } });
        expect(res.removedCount).toBe(1);
    });

    it("sends a push payload containing deep link data", async () => {
        process.env.VAPID_PUBLIC_KEY = "pub";
        process.env.VAPID_PRIVATE_KEY = "priv";
        process.env.VAPID_SUBJECT = "mailto:test@example.com";

        vi.resetModules();
        const mod = await import("../src/services/webpush-outbound.service.js");
        mockFindMany.mockResolvedValueOnce([
            { id: "sub-1", endpoint: "https://example.com/push", p256dh: "p", auth: "a" },
        ]);
        mockSendNotification.mockResolvedValueOnce(undefined);

        const deepLink = "/tasks/abc";
        const res = await mod.dispatchWebPushNudge(
            { id: "n1", userId: "u1", title: "Study", message: "Do one task", priority: "HIGH" },
            deepLink,
        );

        expect(res.status).toBe("sent");
        const payloadArg = mockSendNotification.mock.calls[0]?.[1] as string;
        const parsed = JSON.parse(payloadArg);
        expect(parsed.notification.data.url).toBe(deepLink);
        expect(parsed.notification.data.nudgeId).toBe("n1");
    });
});

