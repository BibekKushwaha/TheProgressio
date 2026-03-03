import { Worker, type Job, type ConnectionOptions } from "bullmq";
import { prisma } from "@repo/db";
import { aggregateDailyStatsForUser, backfillDailyStats } from "./daily-stats-aggregator.service.js";

// ─── Event Shape (mirrors planner-service TaskEvent) ────────────────────────────
export interface TaskEvent {
    eventType: string;
    taskId: string;
    userId: string;
    timestamp: string;
    payload: Record<string, unknown>;
}

// ─── Redis & Queue Configuration ────────────────────────────────────────────────
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const QUEUE_ENABLED = process.env.QUEUE_ENABLED === "true";

const connection: ConnectionOptions = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
} as ConnectionOptions;

const QUEUE_NAME = "planner.task.analytics";

// ─── Real BullMQ Worker ────────────────────────────────────────────────────────
class RealAnalyticsWorker {
    private worker: Worker;

    constructor() {
        this.worker = new Worker(
            QUEUE_NAME,
            async (job: Job<TaskEvent>) => {
                await processEvent(job.data);
            },
            {
                connection,
                concurrency: 5,
                limiter: {
                    max: 100,
                    duration: 1000,
                },
            },
        );

        this.worker.on("completed", (job) => {
            console.log(`[AnalyticsWorker] ✅ Job ${job.id} completed (eventType=${job.data.eventType})`);
        });

        this.worker.on("failed", (job, err) => {
            console.error(`[AnalyticsWorker] ❌ Job ${job?.id} failed with ${err.message}`);
        });

        console.log(`✅ Analytics BullMQ Worker initialized (Queue: ${QUEUE_NAME})`);
    }

    async close(): Promise<void> {
        await this.worker.close();
        console.log("🔌 Analytics BullMQ Worker closed");
    }
}

// ─── Mock Worker (for dev without Redis) ───────────────────────────────────────
class MockAnalyticsWorker {
    constructor() {
        console.log("⚠️  Using MOCK Analytics Worker (set QUEUE_ENABLED=true for real Redis/BullMQ)");
    }

    async close(): Promise<void> {
        console.log("[MockWorker] Disconnected (virtual)");
    }
}

// ─── Event Processing ───────────────────────────────────────────────────────────
export async function processEvent(event: TaskEvent): Promise<void> {
    if (!event) {
        console.warn("[AnalyticsWorker] Received null/undefined event — skipping");
        return;
    }

    const { eventType, taskId, userId, payload } = event;

    if (!taskId || !userId) {
        console.warn(`[AnalyticsWorker] Event missing taskId or userId — skipping`);
        return;
    }

    try {
        switch (eventType) {
            case "task.completed":
                await handleTaskCompleted(taskId, userId);
                break;

            case "task.updated":
                await handleTaskUpdated(taskId, userId, payload);
                break;

            case "task.deleted":
                await handleTaskDeleted(taskId);
                break;

            case "task.status_changed":
                await handleTaskStatusChanged(taskId, userId, payload);
                break;

            default:
                console.log(`[AnalyticsWorker] Unknown event type "${eventType}" — skipping`);
        }
    } catch (err) {
        console.error(
            `[AnalyticsWorker] ❌ Failed to process ${eventType} for taskId=${taskId}:`,
            err,
        );
        throw err; // Re-throw to trigger BullMQ retry
    }
}

// ─── Event Handlers ─────────────────────────────────────────────────────────────

async function handleTaskCompleted(taskId: string, userId: string): Promise<void> {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { activityLogs: true },
    });

    if (!task) {
        console.warn(`[AnalyticsWorker] Task ${taskId} not found — skipping completion stat`);
        return;
    }

    const totalMinutes = task.activityLogs.reduce(
        (sum, log) => sum + (log.durationMinutes ?? 0),
        0,
    );

    await prisma.taskCompletionStat.upsert({
        where: { taskId },
        create: {
            taskId,
            userId,
            totalMinutes,
            completedAt: new Date(),
        },
        update: {
            totalMinutes,
            completedAt: new Date(),
        },
    });

    console.log(`[AnalyticsWorker] ✅ Recorded completion stat for taskId=${taskId} (${totalMinutes} min)`);

    // ── Pre-aggregate today's stats (write-time hook — Step 3/Blueprint) ──
    // Updating DailyUserStats immediately on task completion means the overview
    // dashboard reads from a pre-computed row (O(1)) instead of a live aggregation
    // across millions of activity-log rows (O(N) scans).
    try {
        await aggregateDailyStatsForUser(userId, new Date());
    } catch (aggErr) {
        // Non-fatal: the nightly backfill will catch any misses.
        console.warn(`[AnalyticsWorker] DailyStats aggregation failed for userId=${userId}:`, aggErr);
    }
}

async function handleTaskUpdated(taskId: string, userId: string, payload: Record<string, unknown>): Promise<void> {
    const existingStat = await prisma.taskCompletionStat.findUnique({
        where: { taskId },
    });

    if (existingStat) {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { activityLogs: true },
        });

        if (task) {
            const totalMinutes = task.activityLogs.reduce(
                (sum, log) => sum + (log.durationMinutes ?? 0),
                0,
            );

            await prisma.taskCompletionStat.update({
                where: { taskId },
                data: { totalMinutes },
            });

            console.log(`[AnalyticsWorker] ✅ Updated completion stat for taskId=${taskId}`);
        }
    }

    const changedFields = payload.changedFields as Record<string, unknown> | undefined;
    if (changedFields) {
        console.log(
            `[AnalyticsWorker] Task ${taskId} updated — changed fields: ${Object.keys(changedFields).join(", ")}`,
        );
    }
}

async function handleTaskDeleted(taskId: string): Promise<void> {
    await prisma.taskCompletionStat.deleteMany({
        where: { taskId },
    });

    console.log(`[AnalyticsWorker] ✅ Cleaned up completion stats for deleted taskId=${taskId}`);
}

async function handleTaskStatusChanged(taskId: string, userId: string, payload: Record<string, unknown>): Promise<void> {
    const newStatus = payload.newStatus as string | undefined;
    const previousStatus = payload.previousStatus as string | undefined;

    console.log(
        `[AnalyticsWorker] Task ${taskId} status changed: ${previousStatus} → ${newStatus}`,
    );

    if (previousStatus === "COMPLETED" && newStatus !== "COMPLETED") {
        await prisma.taskCompletionStat.deleteMany({
            where: { taskId },
        });
        console.log(`[AnalyticsWorker] ✅ Removed completion stat for un-completed taskId=${taskId}`);
    }
}

// ─── Worker Singleton ──────────────────────────────────────────────────────────
type AnalyticsWorkerInterface = RealAnalyticsWorker | MockAnalyticsWorker;

export const analyticsWorker: AnalyticsWorkerInterface = QUEUE_ENABLED
    ? new RealAnalyticsWorker()
    : new MockAnalyticsWorker();

// ─── Graceful shutdown ──────────────────────────────────────────────────────────
export async function shutdownWorker() {
    console.log("🔄 Shutting down Analytics BullMQ worker...");
    await analyticsWorker.close();
}

// ─── Nightly Backfill Cron ──────────────────────────────────────────────────────
// Scheduled to run daily at 00:05 UTC so any missed write-time aggregation events
// are caught within 24 hours. Uses a simple setTimeout loop — no external cron
// dependency required. In a multi-instance deployment, use a distributed lock
// (e.g., Redis SETNX) to prevent multiple workers from running this concurrently.
function scheduleNightlyBackfill(): void {
    const scheduleNext = () => {
        const now = new Date();
        const nextRun = new Date(now);
        // Target: next 00:05 UTC
        nextRun.setUTCHours(0, 5, 0, 0);
        if (nextRun <= now) {
            nextRun.setUTCDate(nextRun.getUTCDate() + 1);
        }
        const msUntilRun = nextRun.getTime() - now.getTime();

        setTimeout(async () => {
            try {
                console.log("[AnalyticsWorker] 🌙 Starting nightly DailyUserStats backfill...");
                await backfillDailyStats(7);
            } catch (err) {
                console.error("[AnalyticsWorker] Nightly backfill failed:", err);
            } finally {
                scheduleNext(); // Schedule next run regardless of success/failure
            }
        }, msUntilRun);

        console.log(`[AnalyticsWorker] 📅 Nightly backfill scheduled for ${nextRun.toISOString()}`);
    };

    scheduleNext();
}

// Start the nightly backfill in non-test environments
if (process.env.NODE_ENV !== "test") {
    scheduleNightlyBackfill();
}
