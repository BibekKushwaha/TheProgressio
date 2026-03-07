import { describe, it, expect, vi, beforeEach } from "vitest";

const mockNudgeFindMany = vi.fn();
const mockNudgeFindFirst = vi.fn();
const mockNudgeUpdate = vi.fn();
const mockSchoolHolidayFindFirst = vi.fn();
const mockUserConversationFindUnique = vi.fn();
const mockUserConversationUpsert = vi.fn();

const mockDispatchWebPushNudge = vi.fn();
const mockEnqueueWhatsAppFallbackJob = vi.fn();

vi.mock("@repo/db", () => ({
    prisma: {
        nudge: {
            findMany: (...args: any[]) => mockNudgeFindMany(...args),
            findFirst: (...args: any[]) => mockNudgeFindFirst(...args),
            update: (...args: any[]) => mockNudgeUpdate(...args),
        },
        schoolHoliday: {
            findFirst: (...args: any[]) => mockSchoolHolidayFindFirst(...args),
        },
        userConversation: {
            findUnique: (...args: any[]) => mockUserConversationFindUnique(...args),
            upsert: (...args: any[]) => mockUserConversationUpsert(...args),
        },
    },
}));

vi.mock("../src/services/webpush-outbound.service.js", () => ({
    dispatchWebPushNudge: (...args: any[]) => mockDispatchWebPushNudge(...args),
}));

vi.mock("../src/services/nudge-dispatch.queue.js", () => ({
    enqueueWhatsAppFallbackJob: (...args: any[]) => mockEnqueueWhatsAppFallbackJob(...args),
    getWhatsAppFallbackDelayMs: () => 15 * 60 * 1000,
    isNudgeDispatchQueueEnabled: true,
}));

beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_DISPATCH_TIMEOUT_MS;
    delete process.env.WHATSAPP_DISPATCH_MAX_RETRIES;
    delete process.env.WHATSAPP_OUTBOUND_URL;
    delete process.env.WHATSAPP_USER_PHONE_MAP;
    mockSchoolHolidayFindFirst.mockResolvedValue(null);
    mockNudgeUpdate.mockResolvedValue({});
    mockUserConversationFindUnique.mockResolvedValue(null);
    mockUserConversationUpsert.mockResolvedValue({});
    mockEnqueueWhatsAppFallbackJob.mockResolvedValue({ queued: true, delayMs: 15 * 60 * 1000, deduped: false });
});

import {
    dispatchWhatsAppNudges,
    processWhatsAppFallbackNudgeById,
} from "../src/services/whatsapp-outbound.service.js";

describe("whatsapp-outbound push-first flow", () => {
    it("sends web push and schedules WhatsApp fallback for inactive paired users", async () => {
        mockNudgeFindMany.mockResolvedValue([
            {
                id: "nudge-1",
                userId: "user-1",
                title: "Study Reminder",
                message: "Complete one practice set",
                priority: "HIGH",
                metadata: JSON.stringify({ deepLink: "/dashboard" }),
                scheduledAt: new Date(),
                expiresAt: null,
                deliveredAt: null,
                user: {
                    whatsappVerified: true,
                    whatsappNumber: "919876543210",
                    plan: "PRO",
                    planStatus: "ACTIVE",
                    lastActiveAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
                },
            },
        ]);
        mockDispatchWebPushNudge.mockResolvedValue({
            status: "sent",
            sentCount: 1,
            removedCount: 0,
        });

        const result = await dispatchWhatsAppNudges();

        expect(result.sent).toBe(1);
        expect(mockEnqueueWhatsAppFallbackJob).toHaveBeenCalledWith(
            expect.objectContaining({ nudgeId: "nudge-1", pushSentAt: expect.any(String) }),
        );
        const updateCall = mockNudgeUpdate.mock.calls[0]?.[0];
        expect(updateCall.data.deliveredAt).toBeDefined();
        const parsedMetadata = JSON.parse(updateCall.data.metadata);
        expect(parsedMetadata.dispatch.wa.status).toBe("scheduled");
    });

    it("skips when no push and user is not paired", async () => {
        mockNudgeFindMany.mockResolvedValue([
            {
                id: "nudge-2",
                userId: "user-2",
                title: "Reminder",
                message: "Study now",
                priority: "MEDIUM",
                metadata: null,
                scheduledAt: new Date(),
                expiresAt: null,
                deliveredAt: null,
                user: {
                    whatsappVerified: false,
                    whatsappNumber: null,
                    plan: "PRO",
                    planStatus: "ACTIVE",
                    lastActiveAt: null,
                },
            },
        ]);
        mockDispatchWebPushNudge.mockResolvedValue({
            status: "skipped",
            reason: "no_subscription",
            sentCount: 0,
            removedCount: 0,
        });

        const result = await dispatchWhatsAppNudges();

        expect(result.skipped).toBe(1);
        expect(result.results[0]?.reason).toBe("recipient_not_paired");
    });

    it("cancels fallback when user becomes active after push", async () => {
        const pushSentAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        mockNudgeFindFirst.mockResolvedValue({
            id: "nudge-3",
            userId: "user-3",
            title: "Reminder",
            message: "Practice test",
            priority: "HIGH",
            metadata: JSON.stringify({
                dispatch: {
                    push: { sentAt: pushSentAt, status: "sent" },
                    wa: { status: "scheduled" },
                },
            }),
            scheduledAt: new Date(Date.now() - 40 * 60 * 1000),
            expiresAt: null,
            deliveredAt: new Date(Date.now() - 30 * 60 * 1000),
            user: {
                whatsappVerified: true,
                whatsappNumber: "919876543210",
                plan: "PRO",
                planStatus: "ACTIVE",
                lastActiveAt: new Date(Date.now() - 10 * 60 * 1000),
            },
        });

        const result = await processWhatsAppFallbackNudgeById("nudge-3");

        expect(result.status).toBe("skipped");
        expect(result.reason).toBe("user_active_after_push");
        const updateCall = mockNudgeUpdate.mock.calls[0]?.[0];
        const parsedMetadata = JSON.parse(updateCall.data.metadata);
        expect(parsedMetadata.dispatch.wa.skippedReason).toBe("user_active_after_push");
    });

    it("sends fallback WhatsApp for inactive premium users", async () => {
        const pushSentAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        mockNudgeFindFirst.mockResolvedValue({
            id: "nudge-4",
            userId: "user-4",
            title: "Reminder",
            message: "Review chemistry notes",
            priority: "MEDIUM",
            metadata: JSON.stringify({
                dispatch: {
                    push: { sentAt: pushSentAt, status: "sent" },
                    wa: { status: "scheduled" },
                },
            }),
            scheduledAt: new Date(Date.now() - 50 * 60 * 1000),
            expiresAt: null,
            deliveredAt: new Date(Date.now() - 30 * 60 * 1000),
            user: {
                whatsappVerified: true,
                whatsappNumber: "919800000000",
                plan: "PRO",
                planStatus: "ACTIVE",
                lastActiveAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
            },
        });
        mockUserConversationFindUnique.mockResolvedValue({
            windowStartedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        });

        const result = await processWhatsAppFallbackNudgeById("nudge-4");

        expect(result.status).toBe("sent");
        expect(mockUserConversationUpsert).toHaveBeenCalled();
        const updateCall = mockNudgeUpdate.mock.calls[0]?.[0];
        const parsedMetadata = JSON.parse(updateCall.data.metadata);
        expect(parsedMetadata.dispatch.wa.status).toBe("sent");
        expect(updateCall.data.skippedReason).toBeNull();
    });

    it("retries outbound relay delivery after a timeout and eventually sends", async () => {
        vi.useFakeTimers();
        process.env.WHATSAPP_OUTBOUND_URL = "https://wa-relay.example.com/send";
        process.env.WHATSAPP_DISPATCH_TIMEOUT_MS = "25";
        process.env.WHATSAPP_DISPATCH_MAX_RETRIES = "2";
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        const pushSentAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        mockNudgeFindFirst.mockResolvedValue({
            id: "nudge-5",
            userId: "user-5",
            title: "Reminder",
            message: "Finish the revision set",
            priority: "HIGH",
            metadata: JSON.stringify({
                dispatch: {
                    push: { sentAt: pushSentAt, status: "sent" },
                    wa: { status: "scheduled" },
                },
            }),
            scheduledAt: new Date(Date.now() - 50 * 60 * 1000),
            expiresAt: null,
            deliveredAt: new Date(Date.now() - 30 * 60 * 1000),
            user: {
                whatsappVerified: true,
                whatsappNumber: "919800000001",
                plan: "PRO",
                planStatus: "ACTIVE",
                lastActiveAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
            },
        });
        mockUserConversationFindUnique.mockResolvedValue({
            windowStartedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        });

        const fetchMock = vi
            .fn()
            .mockImplementationOnce((_url: string, init?: RequestInit) => {
                return new Promise((_resolve, reject) => {
                    init?.signal?.addEventListener("abort", () => {
                        reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
                    });
                });
            })
            .mockResolvedValueOnce(new Response(null, { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);

        const pending = processWhatsAppFallbackNudgeById("nudge-5");

        await vi.advanceTimersByTimeAsync(1_000);

        const result = await pending;

        expect(result.status).toBe("sent");
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(warnSpy).toHaveBeenCalled();
        const updateCall = mockNudgeUpdate.mock.calls[0]?.[0];
        const parsedMetadata = JSON.parse(updateCall.data.metadata);
        expect(parsedMetadata.dispatch.wa.attempts).toBe(2);
    });
});
