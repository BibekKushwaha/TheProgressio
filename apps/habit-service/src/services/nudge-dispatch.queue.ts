import { Queue, type ConnectionOptions } from "bullmq";
import { prisma } from "@repo/db";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number.parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const QUEUE_ENABLED = process.env.QUEUE_ENABLED === "true";

const connection: ConnectionOptions = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
} as ConnectionOptions;

export const NUDGE_DISPATCH_QUEUE_NAME = "habit.nudge.dispatch";

export interface NudgeDispatchJobData {
    nudgeId: string;
    idempotencyKey: string;
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
            "dispatch-whatsapp-nudge",
            { nudgeId: nudge.id, idempotencyKey: key },
            { jobId: key },
        );
        enqueued += 1;
    }
    return { enqueued, deduped };
};

export const closeNudgeDispatchQueue = async (): Promise<void> => {
    if (nudgeDispatchQueue) await nudgeDispatchQueue.close();
};
