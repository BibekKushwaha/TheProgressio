import { Queue, type ConnectionOptions } from "bullmq";

// ─── Event Types ────────────────────────────────────────────────────────────────
export enum TaskEventType {
    TASK_CREATED = "task.created",
    TASK_UPDATED = "task.updated",
    TASK_COMPLETED = "task.completed",
    TASK_DELETED = "task.deleted",
    TASK_STATUS_CHANGED = "task.status_changed",
}

export interface TaskEvent {
    eventType: TaskEventType;
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

// ─── Queue Names ────────────────────────────────────────────────────────────────
export const QUEUE_NAMES = {
    TASK_EVENTS: "planner.task.events",
    TASK_ANALYTICS: "planner.task.analytics",
    HABIT_TRIGGERS: "planner.habit.triggers",
    WEB_PUSH: "planner.web.push",
} as const;

// ─── Real BullMQ Producer ───────────────────────────────────────────────────────
class RealQueueProducer {
    private queues: Map<string, Queue> = new Map();

    constructor() {
        console.log(`✅ BullMQ Producer initialized (Redis: ${REDIS_HOST}:${REDIS_PORT})`);
    }

    private getQueue(queueName: string): Queue {
        if (!this.queues.has(queueName)) {
            const queue = new Queue(queueName, { connection });
            this.queues.set(queueName, queue);
        }
        return this.queues.get(queueName)!;
    }

    async add(queueName: string, name: string, data: any, jobId?: string): Promise<void> {
        const queue = this.getQueue(queueName);
        const options: any = {
            removeOnComplete: true,
            removeOnFail: false, // Keep failed jobs for debugging
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 1000,
            },
        };
        if (jobId) {
            options.jobId = jobId;
        }
        await queue.add(name, data, options);
    }

    async close(): Promise<void> {
        for (const queue of this.queues.values()) {
            await queue.close();
        }
        this.queues.clear();
        console.log("🔌 BullMQ Queues closed");
    }
}

// ─── Mock Queue Producer (for dev without Redis) ────────────────────────────────
class MockQueueProducer {
    constructor() {
        console.log("⚠️  Using MOCK Queue Producer (set QUEUE_ENABLED=true for real Redis/BullMQ)");
    }

    async add(queueName: string, name: string, data: any, jobId?: string): Promise<void> {
        console.log(`[MockQueue] 📨 Add job to '${queueName}': [${name}] taskId=${data.taskId} jobId=${jobId}`);
    }

    async close(): Promise<void> {
        console.log("[MockQueue] Disconnected (virtual)");
    }
}

// ─── Producer Singleton ─────────────────────────────────────────────────────────
type QueueProducerInterface = RealQueueProducer | MockQueueProducer;

export const producer: QueueProducerInterface = QUEUE_ENABLED
    ? new RealQueueProducer()
    : new MockQueueProducer();

// ─── Helper: Emit a structured task event into BullMQ ───────────────────────────
export async function emitTaskEvent(
    eventType: TaskEventType,
    taskId: string,
    userId: string,
    payload: Record<string, unknown> = {}
): Promise<void> {
    const event: TaskEvent = {
        eventType,
        taskId,
        userId,
        timestamp: new Date().toISOString(),
        payload,
    };

    try {
        // Dispatches to generic task events queue
        await producer.add(QUEUE_NAMES.TASK_EVENTS, eventType, event);

        // Specific routing based on internal logic to match expected service event routing
        if (eventType === TaskEventType.TASK_COMPLETED) {
            await producer.add(QUEUE_NAMES.HABIT_TRIGGERS, eventType, event);
            await producer.add(QUEUE_NAMES.TASK_ANALYTICS, eventType, event);
        }

        if (eventType === TaskEventType.TASK_STATUS_CHANGED) {
            await producer.add(QUEUE_NAMES.TASK_ANALYTICS, eventType, event);
        }

        if (eventType === TaskEventType.TASK_UPDATED) {
            await producer.add(QUEUE_NAMES.HABIT_TRIGGERS, eventType, event);
            await producer.add(QUEUE_NAMES.TASK_ANALYTICS, eventType, event);
        }

        if (eventType === TaskEventType.TASK_DELETED) {
            await producer.add(QUEUE_NAMES.HABIT_TRIGGERS, eventType, event);
            await producer.add(QUEUE_NAMES.TASK_ANALYTICS, eventType, event);
        }
    } catch (error) {
        console.error(`⚠️  Failed to queue ${eventType} for task ${taskId}:`, error);
    }
}

// ─── Helper: Emit a push event into BullMQ with deduplication ─────────────────
export interface PushPayload {
    userId: string;
    title: string;
    body: string;
    icon?: string;
    deepLink?: string;
    category?: string;
    dedupeKey?: string; // e.g., "daily-summary-user123"
}

export async function emitPushEvent(payload: PushPayload): Promise<void> {
    try {
        await producer.add(
            QUEUE_NAMES.WEB_PUSH,
            "sendPush",
            payload,
            payload.dedupeKey // BullMQ automatically drops jobs with matching active/waiting jobIds
        );
    } catch (error) {
        console.error(`⚠️  Failed to queue push notification for user ${payload.userId}:`, error);
    }
}

// ─── Graceful shutdown ──────────────────────────────────────────────────────────
export async function shutdownProducer() {
    console.log("🔄 Shutting down BullMQ producer...");
    await producer.close();
}
