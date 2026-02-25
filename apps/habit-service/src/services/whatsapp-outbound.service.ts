import crypto from "crypto";
import { prisma } from "@repo/db";
import { incrementMetric, logMetricEvent } from "./metrics.service.js";
import { dispatchWebPushNudge } from "./webpush-outbound.service.js";
import {
    enqueueWhatsAppFallbackJob,
    getWhatsAppFallbackDelayMs,
    isNudgeDispatchQueueEnabled,
} from "./nudge-dispatch.queue.js";

const prismaAny = prisma as any;

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION ?? process.env.WHATSAPP_GRAPH_VERSION ?? "v22.0";
const META_API_BASE = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}`;
const MAX_RETRIES = Number.parseInt(process.env.WHATSAPP_DISPATCH_MAX_RETRIES ?? "3", 10);
const WHATSAPP_NUDGE_TEMPLATE_NAME = process.env.WHATSAPP_NUDGE_TEMPLATE_NAME ?? "study_nudge";
const WHATSAPP_NUDGE_TEMPLATE_LANG = process.env.WHATSAPP_NUDGE_TEMPLATE_LANG ?? "en_US";
const WHATSAPP_OUTBOUND_URL = process.env.WHATSAPP_OUTBOUND_URL ?? "";
const WHATSAPP_OUTBOUND_TOKEN = process.env.WHATSAPP_OUTBOUND_TOKEN ?? "";
const WHATSAPP_ACTIVITY_WINDOW_MS = Math.max(
    1,
    Number.parseInt(process.env.WHATSAPP_RECENT_ACTIVITY_HOURS ?? "2", 10),
) * 60 * 60 * 1000;
const WHATSAPP_CONVERSATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const WHATSAPP_CONVERSATION_CATEGORY = "UTILITY";

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
    title: string;
    message: string;
    priority: string;
    metadata: string | null;
    scheduledAt: Date;
    expiresAt: Date | null;
    deliveredAt: Date | null;
    idempotencyKey?: string | null;
    user?: {
        whatsappNumber: string | null;
        whatsappVerified: boolean;
        plan: string;
        planStatus: string;
        lastActiveAt: Date | null;
    } | null;
}

type DispatchMetadata = Record<string, unknown>;

type ScheduleDecision =
    | { shouldSchedule: true }
    | { shouldSchedule: false; reason: string };

type FallbackDispatchMode = "queue" | "timer";

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

const asObject = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const getStringValue = (value: unknown): string | null =>
    typeof value === "string" && value.length > 0 ? value : null;

const getDateValue = (value: unknown): Date | null => {
    const text = getStringValue(value);
    if (!text) return null;
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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

const normalizePhone = (value: string | undefined | null): string | null => {
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

const isPremiumUser = (user: NudgeLike["user"]): boolean =>
    Boolean(user && user.plan !== "FREE" && user.planStatus === "ACTIVE");

const isRecentlyActive = (user: NudgeLike["user"], now: Date): boolean => {
    if (!user?.lastActiveAt) return false;
    return user.lastActiveAt.getTime() > now.getTime() - WHATSAPP_ACTIVITY_WINDOW_MS;
};

const resolveWhatsAppRecipient = (nudge: NudgeLike, userPhoneMap: Record<string, string>): string | null => {
    const recipientOverride = normalizePhone(userPhoneMap[nudge.userId]);
    const pairedRecipient =
        nudge.user?.whatsappVerified === true ? normalizePhone(nudge.user?.whatsappNumber ?? undefined) : null;
    return recipientOverride ?? pairedRecipient;
};

const getDispatchSection = (metadata: DispatchMetadata): Record<string, unknown> =>
    asObject(metadata.dispatch);

const getDispatchChannel = (metadata: DispatchMetadata, channel: "push" | "wa"): Record<string, unknown> =>
    asObject(getDispatchSection(metadata)[channel]);

const mergeDispatchMetadata = (params: {
    metadata: DispatchMetadata;
    pushPatch?: Record<string, unknown>;
    waPatch?: Record<string, unknown>;
    rootPatch?: Record<string, unknown>;
}): DispatchMetadata => {
    const { metadata, pushPatch, waPatch, rootPatch } = params;
    const dispatchSection = getDispatchSection(metadata);
    const nextDispatch: Record<string, unknown> = { ...dispatchSection };

    if (pushPatch) {
        nextDispatch.push = {
            ...asObject(dispatchSection.push),
            ...pushPatch,
        };
    }

    if (waPatch) {
        nextDispatch.wa = {
            ...asObject(dispatchSection.wa),
            ...waPatch,
        };
    }

    const merged: DispatchMetadata = {
        ...metadata,
        ...(rootPatch ?? {}),
    };

    if (Object.keys(nextDispatch).length > 0) {
        merged.dispatch = nextDispatch;
    }

    return merged;
};

const sendWhatsApp = async (params: { to: string; message: string; nudgeId: string; priority: string }) => {
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
                type: "template",
                template: {
                    name: WHATSAPP_NUDGE_TEMPLATE_NAME,
                    language: { code: WHATSAPP_NUDGE_TEMPLATE_LANG },
                    components: [
                        {
                            type: "body",
                            parameters: [{ type: "text", text: params.message }],
                        },
                    ],
                },
            }),
        });

        if (!response.ok) {
            const body = await response.text();
            const error = new Error(`Meta WhatsApp API error (${response.status}): ${body || "unknown"}`);
            (error as Error & { retryable?: boolean }).retryable = response.status >= 500 || response.status === 429;
            throw error;
        }

        return { ok: true, provider: "meta-cloud" as const };
    }

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
            (error as Error & { retryable?: boolean }).retryable = response.status >= 500 || response.status === 429;
            throw error;
        }

        return { ok: true, provider: "http" as const };
    }

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

const scheduleFallbackDispatch = async (params: {
    nudgeId: string;
    userId: string;
    pushSentAt: string;
}): Promise<{ mode: FallbackDispatchMode; delayMs: number; deduped: boolean }> => {
    const delayMs = getWhatsAppFallbackDelayMs();

    if (isNudgeDispatchQueueEnabled) {
        const queueResult = await enqueueWhatsAppFallbackJob({
            nudgeId: params.nudgeId,
            userId: params.userId,
            pushSentAt: params.pushSentAt,
        });
        return { mode: "queue", delayMs: queueResult.delayMs, deduped: queueResult.deduped };
    }

    const timer = setTimeout(() => {
        processWhatsAppFallbackNudgeById(params.nudgeId, { pushSentAt: params.pushSentAt }).catch((error) => {
            console.warn(`[WhatsAppFallbackTimer] nudge=${params.nudgeId} failed:`, error);
        });
    }, delayMs);

    if (typeof (timer as { unref?: () => void }).unref === "function") {
        (timer as { unref: () => void }).unref();
    }

    return { mode: "timer", delayMs, deduped: false };
};

const resolveFallbackDecision = (params: {
    nudge: NudgeLike;
    now: Date;
    recipient: string | null;
}): ScheduleDecision => {
    const { nudge, now, recipient } = params;
    if (!recipient) {
        return { shouldSchedule: false, reason: "recipient_not_paired" };
    }
    if (isRecentlyActive(nudge.user, now)) {
        return { shouldSchedule: false, reason: "active_recent" };
    }
    return { shouldSchedule: true };
};

const updateNudgeState = async (params: {
    nudgeId: string;
    metadata: DispatchMetadata;
    deliveredAt?: Date | null;
    skippedReason?: string | null;
}): Promise<void> => {
    await prisma.nudge.update({
        where: { id: params.nudgeId },
        data: {
            ...(params.deliveredAt !== undefined ? { deliveredAt: params.deliveredAt } : {}),
            ...(params.skippedReason !== undefined ? { skippedReason: params.skippedReason } : {}),
            metadata: JSON.stringify(params.metadata),
        },
    });
};

const resolveConversationWindow = async (userId: string, now: Date): Promise<{ withinWindow: boolean; windowStartedAt: Date }> => {
    if (typeof prismaAny.userConversation?.findUnique !== "function") {
        return { withinWindow: false, windowStartedAt: now };
    }

    try {
        const current = await prismaAny.userConversation.findUnique({
            where: {
                userId_category: {
                    userId,
                    category: WHATSAPP_CONVERSATION_CATEGORY,
                },
            },
            select: { windowStartedAt: true },
        });

        const withinWindow = Boolean(
            current && now.getTime() < new Date(current.windowStartedAt).getTime() + WHATSAPP_CONVERSATION_WINDOW_MS,
        );
        const windowStartedAt = withinWindow ? new Date(current.windowStartedAt) : now;

        await prismaAny.userConversation.upsert({
            where: {
                userId_category: {
                    userId,
                    category: WHATSAPP_CONVERSATION_CATEGORY,
                },
            },
            update: withinWindow ? {} : { windowStartedAt: now },
            create: {
                userId,
                category: WHATSAPP_CONVERSATION_CATEGORY,
                windowStartedAt: now,
            },
        });

        return { withinWindow, windowStartedAt };
    } catch (error) {
        console.warn("Failed to resolve WhatsApp conversation window:", error);
        return { withinWindow: false, windowStartedAt: now };
    }
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
    const holidayPauseCache = new Map<string, boolean>();

    const nudges = await prismaAny.nudge.findMany({
        where: {
            scheduledAt: { lte: now },
            deliveredAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        },
        orderBy: [{ scheduledAt: "asc" }],
        take: limit,
        include: {
            user: {
                select: {
                    whatsappNumber: true,
                    whatsappVerified: true,
                    plan: true,
                    planStatus: true,
                    lastActiveAt: true,
                },
            },
        },
    });

    const results: DispatchResult[] = [];
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const nudge of nudges as NudgeLike[]) {
        const outcome = await dispatchSingleNudge({
            nudge,
            now,
            dayStart,
            dayEnd,
            userPhoneMap,
            holidayPauseCache,
        });
        if (outcome.status === "sent") sent += 1;
        if (outcome.status === "skipped") skipped += 1;
        if (outcome.status === "failed") failed += 1;
        results.push(outcome.result);
    }

    return { sent, skipped, failed, results };
};

export const dispatchNudgePushById = async (nudgeId: string): Promise<DispatchResult> => {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    const userPhoneMap = getUserPhoneMapping();
    const holidayPauseCache = new Map<string, boolean>();

    const nudge = await prismaAny.nudge.findFirst({
        where: { id: nudgeId },
        include: {
            user: {
                select: {
                    whatsappNumber: true,
                    whatsappVerified: true,
                    plan: true,
                    planStatus: true,
                    lastActiveAt: true,
                },
            },
        },
    });

    if (!nudge) {
        return { nudgeId, status: "skipped", reason: "nudge_not_found" };
    }

    const outcome = await dispatchSingleNudge({
        nudge: nudge as NudgeLike,
        now,
        dayStart,
        dayEnd,
        userPhoneMap,
        holidayPauseCache,
    });
    return outcome.result;
};

export const dispatchWhatsAppNudgeById = dispatchNudgePushById;

const dispatchSingleNudge = async (params: {
    nudge: NudgeLike;
    now: Date;
    dayStart: Date;
    dayEnd: Date;
    userPhoneMap: Record<string, string>;
    holidayPauseCache: Map<string, boolean>;
}): Promise<{ status: DispatchResultStatus; result: DispatchResult }> => {
    const { nudge, now, dayStart, dayEnd, userPhoneMap, holidayPauseCache } = params;

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

    const metadata = parseJsonObject(nudge.metadata);
    if (metadata.suppressedDueToQuietHours === true) {
        incrementMetric("skipped_due_to_quiet_hours");
        await prisma.nudge.update({
            where: { id: nudge.id },
            data: { skippedReason: "quiet_hours" },
        });
        return { status: "skipped", result: { nudgeId: nudge.id, status: "skipped", reason: "quiet_hours" } };
    }

    const previousPushDispatch = getDispatchChannel(metadata, "push");
    const previouslySentAt = getStringValue(previousPushDispatch.sentAt);
    if (nudge.deliveredAt && previouslySentAt) {
        return { status: "skipped", result: { nudgeId: nudge.id, status: "skipped", reason: "deduped" } };
    }

    const deepLink =
        typeof metadata.deepLink === "string" && metadata.deepLink.trim().length > 0 ? metadata.deepLink : "/dashboard";
    const pushOutcome = await dispatchWebPushNudge(
        {
            id: nudge.id,
            userId: nudge.userId,
            title: nudge.title,
            message: nudge.message,
            priority: nudge.priority,
        },
        deepLink,
    );

    const pushSentAt = now.toISOString();
    const recipient = resolveWhatsAppRecipient(nudge, userPhoneMap);
    const fallbackDecision = resolveFallbackDecision({ nudge, now, recipient });

    let fallbackPatch: Record<string, unknown>;
    let fallbackScheduled = false;

    if (fallbackDecision.shouldSchedule) {
        const scheduled = await scheduleFallbackDispatch({
            nudgeId: nudge.id,
            userId: nudge.userId,
            pushSentAt,
        });
        fallbackScheduled = true;
        fallbackPatch = {
            status: "scheduled",
            scheduledAt: new Date(now.getTime() + scheduled.delayMs).toISOString(),
            mode: scheduled.mode,
            delayMs: scheduled.delayMs,
            pushSentAt,
            ...(scheduled.deduped ? { deduped: true } : {}),
        };
    } else {
        fallbackPatch = {
            status: "skipped",
            checkedAt: pushSentAt,
            skippedReason: fallbackDecision.reason,
        };
    }

    const pushPatch: Record<string, unknown> = {
        status: pushOutcome.status,
        attemptedAt: pushSentAt,
        ...(pushOutcome.status === "sent" ? { sentAt: pushSentAt } : {}),
        ...(typeof pushOutcome.reason === "string" ? { reason: pushOutcome.reason } : {}),
        ...(typeof pushOutcome.error === "string" ? { error: pushOutcome.error } : {}),
        ...(typeof pushOutcome.sentCount === "number" ? { sentCount: pushOutcome.sentCount } : {}),
        ...(typeof pushOutcome.removedCount === "number" ? { removedCount: pushOutcome.removedCount } : {}),
    };

    const metadataWithDispatch = mergeDispatchMetadata({
        metadata,
        pushPatch,
        waPatch: fallbackPatch,
        rootPatch: {
            ...(pushOutcome.status === "sent" ? { channel: "WEB_PUSH" } : {}),
        },
    });

    const pushDelivered = pushOutcome.status === "sent";
    const skippedReason =
        pushDelivered || fallbackScheduled
            ? null
            : fallbackDecision.shouldSchedule
                ? null
                : fallbackDecision.reason === "recipient_not_paired"
                    ? "recipient_not_paired"
                    : pushOutcome.status === "skipped" && pushOutcome.reason === "no_subscription"
                        ? "no_subscription"
                        : "delivery_failed";

    await updateNudgeState({
        nudgeId: nudge.id,
        metadata: metadataWithDispatch,
        ...(pushDelivered ? { deliveredAt: now } : {}),
        skippedReason,
    });

    if (pushDelivered || fallbackScheduled) {
        logMetricEvent("nudge_delivered", {
            nudgeId: nudge.id,
            scheduled_at_utc: nudge.scheduledAt.toISOString(),
            delivered_at_utc: pushDelivered ? pushSentAt : null,
            channels: {
                web_push: pushOutcome.status,
                whatsapp: fallbackScheduled ? "scheduled" : "skipped",
            },
        });
        return { status: "sent", result: { nudgeId: nudge.id, status: "sent" } };
    }

    if (pushOutcome.status === "failed") {
        return {
            status: "failed",
            result: {
                nudgeId: nudge.id,
                status: "failed",
                ...(typeof pushOutcome.error === "string" ? { reason: pushOutcome.error } : { reason: "delivery_failed" }),
            },
        };
    }

    return {
        status: "skipped",
        result: {
            nudgeId: nudge.id,
            status: "skipped",
            ...(skippedReason ? { reason: skippedReason } : {}),
        },
    };
};

const resolveFallbackPushSentAt = (params: {
    metadata: DispatchMetadata;
    optionsPushSentAt?: string;
    nudgeScheduledAt: Date;
}): Date => {
    const fromOptions = getDateValue(params.optionsPushSentAt);
    if (fromOptions) return fromOptions;
    const pushState = getDispatchChannel(params.metadata, "push");
    const fromPushState = getDateValue(pushState.sentAt);
    if (fromPushState) return fromPushState;
    return params.nudgeScheduledAt;
};

const finalizeFallbackSkip = async (params: {
    nudge: NudgeLike;
    metadata: DispatchMetadata;
    reason: string;
    checkedAt: string;
}): Promise<DispatchResult> => {
    const mergedMetadata = mergeDispatchMetadata({
        metadata: params.metadata,
        waPatch: {
            status: "skipped",
            skippedReason: params.reason,
            checkedAt: params.checkedAt,
        },
    });

    await updateNudgeState({
        nudgeId: params.nudge.id,
        metadata: mergedMetadata,
        skippedReason: params.nudge.deliveredAt ? null : params.reason,
    });

    return {
        nudgeId: params.nudge.id,
        status: "skipped",
        reason: params.reason,
    };
};

export const processWhatsAppFallbackNudgeById = async (
    nudgeId: string,
    options?: { pushSentAt?: string },
): Promise<DispatchResult> => {
    const now = new Date();
    const userPhoneMap = getUserPhoneMapping();

    const nudge = await prismaAny.nudge.findFirst({
        where: { id: nudgeId },
        include: {
            user: {
                select: {
                    whatsappNumber: true,
                    whatsappVerified: true,
                    plan: true,
                    planStatus: true,
                    lastActiveAt: true,
                },
            },
        },
    });

    if (!nudge) {
        return { nudgeId, status: "skipped", reason: "nudge_not_found" };
    }

    const typedNudge = nudge as NudgeLike;
    const metadata = parseJsonObject(typedNudge.metadata);
    const waState = getDispatchChannel(metadata, "wa");
    const alreadySentAt = getStringValue(waState.sentAt);
    if (alreadySentAt) {
        return { nudgeId, status: "skipped", reason: "deduped" };
    }

    const checkedAt = now.toISOString();
    const recipient = resolveWhatsAppRecipient(typedNudge, userPhoneMap);
    if (!recipient) {
        return finalizeFallbackSkip({
            nudge: typedNudge,
            metadata,
            reason: "recipient_not_paired",
            checkedAt,
        });
    }

    const pushSentAt = resolveFallbackPushSentAt({
        metadata,
        ...(options?.pushSentAt ? { optionsPushSentAt: options.pushSentAt } : {}),
        nudgeScheduledAt: typedNudge.scheduledAt,
    });

    if (typedNudge.user?.lastActiveAt && typedNudge.user.lastActiveAt.getTime() > pushSentAt.getTime()) {
        return finalizeFallbackSkip({
            nudge: typedNudge,
            metadata,
            reason: "user_active_after_push",
            checkedAt,
        });
    }

    if (!isPremiumUser(typedNudge.user)) {
        return finalizeFallbackSkip({
            nudge: typedNudge,
            metadata,
            reason: "non_premium",
            checkedAt,
        });
    }

    const dedupeHash = buildDispatchHash({
        nudgeId: typedNudge.id,
        recipient,
        message: typedNudge.message,
    });
    const lastHash = getStringValue(metadata.lastDispatchHash);
    if (lastHash === dedupeHash) {
        return finalizeFallbackSkip({
            nudge: typedNudge,
            metadata,
            reason: "deduped",
            checkedAt,
        });
    }

    const conversation = await resolveConversationWindow(typedNudge.userId, now);
    const delivery = await sendWithRetry({
        nudgeId: typedNudge.id,
        to: recipient,
        message: typedNudge.message,
        priority: typedNudge.priority,
    });

    if (!delivery.success) {
        const mergedMetadata = mergeDispatchMetadata({
            metadata: {
                ...metadata,
                lastDispatchHash: dedupeHash,
            },
            waPatch: {
                status: "failed",
                checkedAt,
                attempts: delivery.attempts,
                error: delivery.error ?? "delivery_failed",
                conversationCategory: WHATSAPP_CONVERSATION_CATEGORY,
                withinConversationWindow: conversation.withinWindow,
                conversationWindowStartedAt: conversation.windowStartedAt.toISOString(),
            },
        });
        await updateNudgeState({
            nudgeId: typedNudge.id,
            metadata: mergedMetadata,
            skippedReason: typedNudge.deliveredAt ? null : "delivery_failed",
        });
        return {
            nudgeId: typedNudge.id,
            status: "failed",
            attempts: delivery.attempts,
            reason: delivery.error ?? "delivery_failed",
        };
    }

    const sentAt = now.toISOString();
    const mergedMetadata = mergeDispatchMetadata({
        metadata: {
            ...metadata,
            lastDispatchHash: dedupeHash,
        },
        waPatch: {
            status: "sent",
            checkedAt,
            sentAt,
            attempts: delivery.attempts,
            conversationCategory: WHATSAPP_CONVERSATION_CATEGORY,
            withinConversationWindow: conversation.withinWindow,
            conversationWindowStartedAt: conversation.windowStartedAt.toISOString(),
        },
        rootPatch: {
            channel: typedNudge.deliveredAt ? "MULTI" : "WHATSAPP",
        },
    });

    await updateNudgeState({
        nudgeId: typedNudge.id,
        metadata: mergedMetadata,
        ...(typedNudge.deliveredAt ? {} : { deliveredAt: now }),
        skippedReason: null,
    });

    logMetricEvent("nudge_delivered", {
        nudgeId: typedNudge.id,
        scheduled_at_utc: typedNudge.scheduledAt.toISOString(),
        delivered_at_utc: sentAt,
        channels: {
            web_push: getStringValue(getDispatchChannel(metadata, "push").status) ?? "unknown",
            whatsapp: "sent",
        },
    });

    return {
        nudgeId: typedNudge.id,
        status: "sent",
        attempts: delivery.attempts,
    };
};
