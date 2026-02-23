import crypto from "crypto";
import { prisma } from "@repo/db";
import { incrementMetric, logMetricEvent } from "./metrics.service.js";

const prismaAny = prisma as any;

// ─── Meta WhatsApp Cloud API Configuration ──────────────────────────────────────
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v21.0";
const META_API_BASE = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}`;

const MAX_RETRIES = Number.parseInt(process.env.WHATSAPP_DISPATCH_MAX_RETRIES ?? "3", 10);

// Legacy fallback (remove once Meta Cloud API is fully configured)
const WHATSAPP_OUTBOUND_URL = process.env.WHATSAPP_OUTBOUND_URL ?? "";
const WHATSAPP_OUTBOUND_TOKEN = process.env.WHATSAPP_OUTBOUND_TOKEN ?? "";

type DispatchResultStatus = "sent" | "skipped" | "failed";

export interface DispatchResult {
    nudgeId: string;
    status: DispatchResultStatus;
    reason?: string;
    attempts?: number;
}

interface NudgeLike {
    id: string;
    userId: string;
    message: string;
    priority: string;
    metadata: string | null;
    scheduledAt: Date;
    expiresAt: Date | null;
    idempotencyKey?: string | null;
    user?: { whatsappOptIn?: boolean } | null;
}

const parseJsonObject = (raw: string | null | undefined): Record<string, unknown> => {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
        return parsed as Record<string, unknown>;
    } catch {
        return {};
    }
};

const getUserPhoneMapping = (): Record<string, string> => {
    const raw = process.env.WHATSAPP_USER_PHONE_MAP;
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
        return parsed as Record<string, string>;
    } catch {
        console.warn("Invalid WHATSAPP_USER_PHONE_MAP JSON; outbound dispatch disabled for mapped users.");
        return {};
    }
};

const normalizePhone = (value: string | undefined): string | null => {
    if (!value) return null;
    const digits = value.replace(/[^\d]/g, "");
    return digits.length > 0 ? digits : null;
};

const buildDispatchHash = (payload: { nudgeId: string; recipient: string; message: string }): string =>
    crypto
        .createHash("sha256")
        .update(`${payload.nudgeId}.${payload.recipient}.${payload.message}`)
        .digest("hex");

const delay = async (ms: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

const sendWhatsApp = async (params: { to: string; message: string; nudgeId: string; priority: string }) => {
    // Priority 1: Meta WhatsApp Cloud API (direct)
    if (WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN) {
        const response = await fetch(`${META_API_BASE}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: params.to,
                type: "text",
                text: { preview_url: false, body: params.message },
            }),
        });

        if (!response.ok) {
            const body = await response.text();
            const error = new Error(`Meta WhatsApp API error (${response.status}): ${body || "unknown"}`);
            // @ts-expect-error attach retry metadata
            error.retryable = response.status >= 500 || response.status === 429;
            throw error;
        }

        return { ok: true, provider: "meta-cloud" as const };
    }

    // Priority 2: Legacy outbound URL
    if (WHATSAPP_OUTBOUND_URL) {
        const response = await fetch(WHATSAPP_OUTBOUND_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(WHATSAPP_OUTBOUND_TOKEN ? { Authorization: `Bearer ${WHATSAPP_OUTBOUND_TOKEN}` } : {}),
            },
            body: JSON.stringify({
                to: params.to,
                body: params.message,
                nudgeId: params.nudgeId,
                priority: params.priority,
            }),
        });

        if (!response.ok) {
            const body = await response.text();
            const error = new Error(`WhatsApp outbound failed (${response.status}): ${body || "unknown"}`);
            // @ts-expect-error attach retry metadata
            error.retryable = response.status >= 500 || response.status === 429;
            throw error;
        }

        return { ok: true, provider: "http" as const };
    }

    // Fallback: mock logging
    console.info(
        `[WhatsApp Mock] nudge=${params.nudgeId} to=${params.to} priority=${params.priority} message=${params.message}`,
    );
    return { ok: true, provider: "mock" as const };
};

const sendWithRetry = async (params: {
    nudgeId: string;
    to: string;
    message: string;
    priority: string;
}): Promise<{ success: boolean; attempts: number; error?: string }> => {
    for (let attempt = 1; attempt <= Math.max(1, MAX_RETRIES); attempt += 1) {
        try {
            await sendWhatsApp(params);
            return { success: true, attempts: attempt };
        } catch (error) {
            const retryable = Boolean((error as { retryable?: boolean }).retryable);
            if (!retryable || attempt >= MAX_RETRIES) {
                return {
                    success: false,
                    attempts: attempt,
                    error: error instanceof Error ? error.message : "Unknown dispatch error",
                };
            }
            await delay(attempt * 350);
        }
    }
    return { success: false, attempts: MAX_RETRIES, error: "Dispatch retries exhausted" };
};

export const dispatchWhatsAppNudges = async (params?: { limit?: number }): Promise<{
    sent: number;
    skipped: number;
    failed: number;
    results: DispatchResult[];
}> => {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    const userPhoneMap = getUserPhoneMapping();
    const limit = Math.max(1, params?.limit ?? 50);
    const dedupeCache = new Set<string>();
    const holidayPauseCache = new Map<string, boolean>();

    const nudges = await prisma.nudge.findMany({
        where: {
            scheduledAt: { lte: now },
            OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        },
        orderBy: [{ scheduledAt: "asc" }],
        take: limit,
    });

    const results: DispatchResult[] = [];
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const nudge of nudges as unknown as NudgeLike[]) {
        const outcome = await dispatchSingleNudge({
            nudge,
            now,
            dayStart,
            dayEnd,
            userPhoneMap,
            dedupeCache,
            holidayPauseCache,
        });
        if (outcome.status === "sent") sent += 1;
        if (outcome.status === "skipped") skipped += 1;
        if (outcome.status === "failed") failed += 1;
        results.push(outcome.result);
    }

    return { sent, skipped, failed, results };
};

export const dispatchWhatsAppNudgeById = async (nudgeId: string): Promise<DispatchResult> => {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    const userPhoneMap = getUserPhoneMapping();
    const dedupeCache = new Set<string>();
    const holidayPauseCache = new Map<string, boolean>();

    const nudge = await prisma.nudge.findFirst({
        where: { id: nudgeId },
    });

    if (!nudge) {
        return { nudgeId, status: "skipped", reason: "nudge_not_found" };
    }

    const outcome = await dispatchSingleNudge({
        nudge: nudge as unknown as NudgeLike,
        now,
        dayStart,
        dayEnd,
        userPhoneMap,
        dedupeCache,
        holidayPauseCache,
    });
    return outcome.result;
};

const dispatchSingleNudge = async (params: {
    nudge: NudgeLike;
    now: Date;
    dayStart: Date;
    dayEnd: Date;
    userPhoneMap: Record<string, string>;
    dedupeCache: Set<string>;
    holidayPauseCache: Map<string, boolean>;
}): Promise<{ status: DispatchResultStatus; result: DispatchResult }> => {
    const { nudge, now, dayStart, dayEnd, userPhoneMap, dedupeCache, holidayPauseCache } = params;
        if (!holidayPauseCache.has(nudge.userId)) {
            if (typeof prismaAny.schoolHoliday?.findFirst === "function") {
                const holiday = await prismaAny.schoolHoliday.findFirst({
                    where: {
                        userId: nudge.userId,
                        startDate: { lte: dayEnd },
                        endDate: { gte: dayStart },
                        pauseNotifications: true,
                    },
                    select: { id: true },
                });
                holidayPauseCache.set(nudge.userId, Boolean(holiday));
            } else {
                holidayPauseCache.set(nudge.userId, false);
            }
        }

        if (holidayPauseCache.get(nudge.userId)) {
            await prisma.nudge.update({
                where: { id: nudge.id },
                data: { skippedReason: "holiday_pause" },
            });
            return { status: "skipped", result: { nudgeId: nudge.id, status: "skipped", reason: "holiday_pause" } };
        }

        const recipient = normalizePhone(userPhoneMap[nudge.userId]);
        if (!recipient) {
            await prisma.nudge.update({
                where: { id: nudge.id },
                data: { skippedReason: "recipient_not_mapped" },
            });
            return { status: "skipped", result: { nudgeId: nudge.id, status: "skipped", reason: "recipient_not_mapped" } };
        }

        const userPreferences = (nudge as any).user;
        if (userPreferences?.whatsappOptIn === false) {
            await prisma.nudge.update({
                where: { id: nudge.id },
                data: { skippedReason: "user_opted_out" },
            });
            return { status: "skipped", result: { nudgeId: nudge.id, status: "skipped", reason: "user_opted_out" } };
        }

        const metadata = parseJsonObject(nudge.metadata);
        if (metadata.suppressedDueToQuietHours === true) {
            incrementMetric("skipped_due_to_quiet_hours");
            await prisma.nudge.update({
                where: { id: nudge.id },
                data: { skippedReason: "quiet_hours" },
            });
            return { status: "skipped", result: { nudgeId: nudge.id, status: "skipped", reason: "quiet_hours" } };
        }
        const dedupeHash = buildDispatchHash({
            nudgeId: nudge.id,
            recipient,
            message: nudge.message,
        });
        const lastHash = typeof metadata.lastDispatchHash === "string" ? metadata.lastDispatchHash : null;

        if (lastHash === dedupeHash || dedupeCache.has(dedupeHash)) {
            incrementMetric("deduplicated_count");
            await prisma.nudge.update({
                where: { id: nudge.id },
                data: { skippedReason: "deduped" },
            });
            return { status: "skipped", result: { nudgeId: nudge.id, status: "skipped", reason: "deduped" } };
        }

        const delivery = await sendWithRetry({
            nudgeId: nudge.id,
            to: recipient,
            message: nudge.message,
            priority: nudge.priority,
        });

        if (delivery.success) {
            dedupeCache.add(dedupeHash);
            logMetricEvent("nudge_delivered", {
                nudgeId: nudge.id,
                scheduled_at_utc: nudge.scheduledAt.toISOString(),
                delivered_at_utc: now.toISOString(),
            });

            await prisma.nudge.update({
                where: { id: nudge.id },
                data: {
                    deliveredAt: now,
                    skippedReason: null,
                    metadata: JSON.stringify({
                        ...metadata,
                        channel: "WHATSAPP",
                        lastDispatchHash: dedupeHash,
                        dispatchedAt: now.toISOString(),
                        dispatchAttempts: delivery.attempts,
                    }),
                },
            });
            return { status: "sent", result: { nudgeId: nudge.id, status: "sent", attempts: delivery.attempts } };
        }

        await prisma.nudge.update({
            where: { id: nudge.id },
            data: {
                skippedReason: "delivery_failed",
                metadata: JSON.stringify({
                    ...metadata,
                    channel: "WHATSAPP",
                    lastDispatchHash: dedupeHash,
                    dispatchFailedAt: now.toISOString(),
                    dispatchAttempts: delivery.attempts,
                    dispatchError: delivery.error,
                }),
            },
        });
        return {
            status: "failed",
            result: {
                nudgeId: nudge.id,
                status: "failed",
                attempts: delivery.attempts,
                ...(delivery.error ? { reason: delivery.error } : {}),
            },
        };
};
