import crypto from "crypto";
import { prisma } from "@repo/db";

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

const parseMinuteOfDay = (value: string | null | undefined): number | null => {
    if (!value) return null;
    const [h, m] = value.split(":");
    const hours = Number.parseInt(h ?? "", 10);
    const minutes = Number.parseInt(m ?? "", 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
    }
    return hours * 60 + minutes;
};

const isWithinQuietHours = (now: Date, start: string | null | undefined, end: string | null | undefined): boolean => {
    const startMinute = parseMinuteOfDay(start);
    const endMinute = parseMinuteOfDay(end);
    if (startMinute === null || endMinute === null) return false;

    const currentMinute = now.getHours() * 60 + now.getMinutes();
    // Same-day quiet window: 13:00 -> 15:00
    if (startMinute < endMinute) {
        return currentMinute >= startMinute && currentMinute < endMinute;
    }
    // Overnight quiet window: 22:00 -> 07:00
    return currentMinute >= startMinute || currentMinute < endMinute;
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
        include: {
            user: {
                select: {
                    id: true,
                    whatsappOptIn: true,
                    quietHoursStart: true,
                    quietHoursEnd: true,
                },
            },
        },
        orderBy: [{ scheduledAt: "asc" }],
        take: limit,
    });

    const results: DispatchResult[] = [];
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const nudge of nudges) {
        if (!holidayPauseCache.has(nudge.userId)) {
            const holiday = await prisma.schoolHoliday.findFirst({
                where: {
                    userId: nudge.userId,
                    startDate: { lte: dayEnd },
                    endDate: { gte: dayStart },
                    pauseNotifications: true,
                },
                select: { id: true },
            });
            holidayPauseCache.set(nudge.userId, Boolean(holiday));
        }

        if (holidayPauseCache.get(nudge.userId)) {
            skipped += 1;
            results.push({ nudgeId: nudge.id, status: "skipped", reason: "holiday_pause" });
            continue;
        }

        const recipient = normalizePhone(userPhoneMap[nudge.userId]);
        if (!recipient) {
            skipped += 1;
            results.push({ nudgeId: nudge.id, status: "skipped", reason: "recipient_not_mapped" });
            continue;
        }

        if (!nudge.user.whatsappOptIn) {
            skipped += 1;
            results.push({ nudgeId: nudge.id, status: "skipped", reason: "user_opted_out" });
            continue;
        }

        if (isWithinQuietHours(now, nudge.user.quietHoursStart, nudge.user.quietHoursEnd)) {
            skipped += 1;
            results.push({ nudgeId: nudge.id, status: "skipped", reason: "quiet_hours" });
            continue;
        }

        const metadata = parseJsonObject(nudge.metadata);
        const dedupeHash = buildDispatchHash({
            nudgeId: nudge.id,
            recipient,
            message: nudge.message,
        });
        const lastHash = typeof metadata.lastDispatchHash === "string" ? metadata.lastDispatchHash : null;

        if (lastHash === dedupeHash || dedupeCache.has(dedupeHash)) {
            skipped += 1;
            results.push({ nudgeId: nudge.id, status: "skipped", reason: "deduped" });
            continue;
        }

        const delivery = await sendWithRetry({
            nudgeId: nudge.id,
            to: recipient,
            message: nudge.message,
            priority: nudge.priority,
        });

        if (delivery.success) {
            dedupeCache.add(dedupeHash);
            sent += 1;
            results.push({ nudgeId: nudge.id, status: "sent", attempts: delivery.attempts });

            await prisma.nudge.update({
                where: { id: nudge.id },
                data: {
                    metadata: JSON.stringify({
                        ...metadata,
                        channel: "WHATSAPP",
                        lastDispatchHash: dedupeHash,
                        dispatchedAt: now.toISOString(),
                        dispatchAttempts: delivery.attempts,
                    }),
                },
            });
            continue;
        }

        failed += 1;
        results.push({
            nudgeId: nudge.id,
            status: "failed",
            attempts: delivery.attempts,
            ...(delivery.error ? { reason: delivery.error } : {}),
        });

        await prisma.nudge.update({
            where: { id: nudge.id },
            data: {
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
    }

    return { sent, skipped, failed, results };
};
