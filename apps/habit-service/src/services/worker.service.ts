import { Worker, type Job, type ConnectionOptions } from "bullmq";
import { autoLogHabitFromCategory } from "./streak.service.js";

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

const QUEUE_NAME = "planner.habit.triggers";

// ─── Real BullMQ Worker ────────────────────────────────────────────────────────
class RealHabitWorker {
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
            console.log(`[HabitWorker] ✅ Job ${job.id} completed (eventType=${job.data.eventType})`);
        });

        this.worker.on("failed", (job, err) => {
            console.error(`[HabitWorker] ❌ Job ${job?.id} failed with ${err.message}`);
        });

        console.log(`✅ Habit BullMQ Worker initialized (Queue: ${QUEUE_NAME})`);
    }

    async close(): Promise<void> {
        await this.worker.close();
        console.log("🔌 Habit BullMQ Worker closed");
    }
}

// ─── Mock Worker (for dev without Redis) ───────────────────────────────────────
class MockHabitWorker {
    constructor() {
        console.log("⚠️  Using MOCK Habit Worker (set QUEUE_ENABLED=true for real Redis/BullMQ)");
    }

    async close(): Promise<void> {
        console.log("[MockWorker] Disconnected (virtual)");
    }
}

// ─── Event Processing ───────────────────────────────────────────────────────────
export async function processEvent(event: TaskEvent): Promise<void> {
    if (!event) {
        console.warn("[HabitWorker] Received null/undefined event — skipping");
        return;
    }

    const { userId, payload, eventType, taskId } = event;

    if (!userId) {
        console.warn(`[HabitWorker] Event missing userId — skipping (taskId=${taskId})`);
        return;
    }

    // ── Handle task.completed ────────────────────────────────────────────────
    if (eventType === "task.completed") {
        const categoryId = typeof payload.categoryId === "string" ? payload.categoryId : null;

        if (!categoryId) return;

        try {
            await autoLogHabitFromCategory(userId, categoryId);
            console.log(
                `[HabitWorker] ✅ Auto-logged habits for userId=${userId}, categoryId=${categoryId} (taskId=${taskId})`,
            );
        } catch (err) {
            console.error(
                `[HabitWorker] ❌ Failed to auto-log habits for userId=${userId}, categoryId=${categoryId}:`,
                err,
            );
            throw err; // Re-throw to trigger BullMQ retry
        }
    }

    // ── Handle task.updated (re-evaluate linked habits on category change) ──
    if (eventType === "task.updated") {
        const changedFields = payload.changedFields as Record<string, unknown> | undefined;

        if (changedFields && "categoryId" in changedFields) {
            const newCategoryId = typeof changedFields.categoryId === "string"
                ? changedFields.categoryId
                : null;

            if (newCategoryId) {
                try {
                    await autoLogHabitFromCategory(userId, newCategoryId);
                    console.log(
                        `[HabitWorker] ✅ Re-evaluated habits after category change for userId=${userId}, newCategoryId=${newCategoryId} (taskId=${taskId})`,
                    );
                } catch (err) {
                    console.error(
                        `[HabitWorker] ❌ Failed to re-evaluate habits for userId=${userId}, categoryId=${newCategoryId}:`,
                        err,
                    );
                    throw err;
                }
            }
        }
    }
}

// ─── Worker Singleton ──────────────────────────────────────────────────────────
type HabitWorkerInterface = RealHabitWorker | MockHabitWorker;

export const habitWorker: HabitWorkerInterface = QUEUE_ENABLED
    ? new RealHabitWorker()
    : new MockHabitWorker();

// ─── Graceful shutdown ──────────────────────────────────────────────────────────
export async function shutdownWorker() {
    console.log("🔄 Shutting down Habit BullMQ worker...");
    await habitWorker.close();
}
