import { Queue, type ConnectionOptions, type Job } from "bullmq";
import { prisma } from "@repo/db";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number.parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const QUEUE_ENABLED = process.env.QUEUE_ENABLED === "true" && process.env.NODE_ENV !== "test";
const WHATSAPP_FALLBACK_DELAY_MS = Number.parseInt(process.env.WHATSAPP_FALLBACK_DELAY_MS ?? "900000", 10);

const connection: ConnectionOptions = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
} as ConnectionOptions;

export const NUDGE_DISPATCH_QUEUE_NAME = "habit.nudge.push";
export const WHATSAPP_FALLBACK_QUEUE_NAME = "habit.nudge.wa_fallback";
export const isNudgeDispatchQueueEnabled = QUEUE_ENABLED;
export const getWhatsAppFallbackDelayMs = (): number => Math.max(60_000, WHATSAPP_FALLBACK_DELAY_MS);

export interface NudgeDispatchJobData {
    nudgeId: string;
    idempotencyKey: string;
}

export interface WhatsAppFallbackJobData {
    nudgeId: string;
    userId: string;
    pushSentAt: string;
}

const nudgeDispatchQueue = QUEUE_ENABLED
    ? new Queue<NudgeDispatchJobData>(NUDGE_DISPATCH_QUEUE_NAME, {
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 1000 },
            removeOnComplete: true,
            removeOnFail: { age: 24 * 3600 },
        },
    })
    : null;

const whatsappFallbackQueue = QUEUE_ENABLED
    ? new Queue<WhatsAppFallbackJobData>(WHATSAPP_FALLBACK_QUEUE_NAME, {
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 1000 },
            removeOnComplete: true,
            removeOnFail: { age: 24 * 3600 },
        },
    })
    : null;

export const enqueueDueNudgeDispatchJobs = async (limit: number): Promise<{ enqueued: number; deduped: number }> => {
    const now = new Date();
    const dueNudges = await prisma.nudge.findMany({
        where: {
            scheduledAt: { lte: now },
            deliveredAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        },
        select: { id: true, idempotencyKey: true },
        orderBy: { scheduledAt: "asc" },
        take: Math.max(1, limit),
    });

    if (!nudgeDispatchQueue) {
        return { enqueued: dueNudges.length, deduped: 0 };
    }

    let enqueued = 0;
    let deduped = 0;
    for (const nudge of dueNudges) {
        const key = nudge.idempotencyKey ?? `nudge:${nudge.id}`;
        const existing = await nudgeDispatchQueue.getJob(key);
        if (existing) {
            deduped += 1;
            continue;
        }
        await nudgeDispatchQueue.add(
            "dispatch-push-nudge",
            { nudgeId: nudge.id, idempotencyKey: key },
            { jobId: key },
        );
        enqueued += 1;
    }
    return { enqueued, deduped };
};

export const enqueueWhatsAppFallbackJob = async (params: {
    nudgeId: string;
    userId: string;
    pushSentAt: string;
}): Promise<{ queued: boolean; delayMs: number; deduped: boolean }> => {
    const delayMs = getWhatsAppFallbackDelayMs();

    if (!whatsappFallbackQueue) {
        return { queued: false, delayMs, deduped: false };
    }

    const jobId = `wa-fallback:${params.nudgeId}`;
    const existing = await whatsappFallbackQueue.getJob(jobId);
    if (existing) {
        return { queued: false, delayMs, deduped: true };
    }

    await whatsappFallbackQueue.add(
        "dispatch-whatsapp-fallback",
        { nudgeId: params.nudgeId, userId: params.userId, pushSentAt: params.pushSentAt },
        { jobId, delay: delayMs },
    );

    return { queued: true, delayMs, deduped: false };
};

const listPendingFallbackJobs = async (): Promise<Array<Job<WhatsAppFallbackJobData>>> => {
    if (!whatsappFallbackQueue) return [];
    const [waiting, delayed, prioritized] = await Promise.all([
        whatsappFallbackQueue.getWaiting(),
        whatsappFallbackQueue.getDelayed(),
        whatsappFallbackQueue.getPrioritized(),
    ]);
    return [...waiting, ...delayed, ...prioritized];
};

export const cancelPendingWhatsAppFallbackJobsForUser = async (userId: string): Promise<{ cancelled: number }> => {
    if (!whatsappFallbackQueue) {
        return { cancelled: 0 };
    }

    const jobs = await listPendingFallbackJobs();
    const seenJobIds = new Set<string>();
    let cancelled = 0;

    for (const job of jobs) {
        if (!job?.id || seenJobIds.has(job.id)) continue;
        seenJobIds.add(job.id);

        if (job.data?.userId !== userId) continue;

        try {
            await job.remove();
            cancelled += 1;
        } catch (_error) {
            // ignore removal errors — continue cancelling remaining jobs
        }
    }

    return { cancelled };
};

export const closeNudgeDispatchQueue = async (): Promise<void> => {
    if (nudgeDispatchQueue) await nudgeDispatchQueue.close();
    if (whatsappFallbackQueue) await whatsappFallbackQueue.close();
};
