/**
 * Kafka Consumer for Analytics Service
 *
 * Subscribes to `planner.task.analytics` topic and processes task lifecycle
 * events to keep analytics data (TaskCompletionStat, prediction cache, etc.)
 * in sync with the planner service.
 *
 * Uses the same config conventions as habit-service's consumer:
 *   KAFKA_BROKERS, KAFKA_ENABLED, KAFKA_CLIENT_ID
 */
import { Kafka, logLevel } from "kafkajs";
import type { Consumer, EachMessagePayload } from "kafkajs";
import { prisma } from "@repo/db";

// ─── Configuration ──────────────────────────────────────────────────────────────

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || "analytics-service";
const KAFKA_ENABLED = process.env.KAFKA_ENABLED === "true";
const CONSUMER_GROUP_ID = process.env.KAFKA_CONSUMER_GROUP || "analytics-service-consumer";

const TOPIC = "planner.task.analytics";

// ─── Event Shape (mirrors planner-service TaskEvent) ────────────────────────────

interface TaskEvent {
    eventType: string;
    taskId: string;
    userId: string;
    timestamp: string;
    payload: Record<string, unknown>;
}

// ─── Real Kafka Consumer ────────────────────────────────────────────────────────

class RealKafkaConsumer {
    private kafka: Kafka;
    private consumer: Consumer;
    private isConnected = false;

    constructor() {
        this.kafka = new Kafka({
            clientId: KAFKA_CLIENT_ID,
            brokers: KAFKA_BROKERS,
            logLevel: logLevel.WARN,
            retry: {
                initialRetryTime: 300,
                retries: 8,
            },
        });

        this.consumer = this.kafka.consumer({
            groupId: CONSUMER_GROUP_ID,
            sessionTimeout: 30000,
            heartbeatInterval: 3000,
        });

        console.log(
            `✅ Analytics Kafka Consumer initialized (brokers: ${KAFKA_BROKERS.join(", ")}, group: ${CONSUMER_GROUP_ID})`,
        );
    }

    async connect(): Promise<void> {
        if (this.isConnected) return;

        try {
            await this.consumer.connect();
            await this.consumer.subscribe({ topic: TOPIC, fromBeginning: false });
            this.isConnected = true;
            console.log(`✅ Analytics Kafka Consumer connected → subscribed to "${TOPIC}"`);
        } catch (error) {
            console.error("❌ Analytics Kafka Consumer connection failed:", error);
            throw error;
        }
    }

    async run(): Promise<void> {
        await this.consumer.run({
            eachMessage: async (messagePayload: EachMessagePayload) => {
                await processMessage(messagePayload);
            },
        });
        console.log("✅ Analytics Kafka Consumer running — processing messages");
    }

    async disconnect(): Promise<void> {
        if (!this.isConnected) return;
        await this.consumer.disconnect();
        this.isConnected = false;
        console.log("🔌 Analytics Kafka Consumer disconnected");
    }
}

// ─── Mock Consumer (for dev without a broker) ───────────────────────────────────

class MockKafkaConsumer {
    constructor() {
        console.log(
            "⚠️  Using MOCK Analytics Kafka Consumer (set KAFKA_ENABLED=true for real Kafka)",
        );
    }

    async connect(): Promise<void> {
        console.log("[MockAnalyticsConsumer] Connected (virtual)");
    }

    async run(): Promise<void> {
        console.log("[MockAnalyticsConsumer] Run called — no-op in mock mode. Use POST /api/stats/events/task-completed as HTTP fallback.");
    }

    async disconnect(): Promise<void> {
        console.log("[MockAnalyticsConsumer] Disconnected");
    }
}

// ─── Message Processing ─────────────────────────────────────────────────────────

export async function processMessage({ topic, partition, message }: EachMessagePayload): Promise<void> {
    const rawValue = message.value?.toString();
    if (!rawValue) {
        console.warn(`[AnalyticsConsumer] Empty message on ${topic}:${partition} — skipping`);
        return;
    }

    let event: TaskEvent;
    try {
        event = JSON.parse(rawValue) as TaskEvent;
    } catch (err) {
        console.error(`[AnalyticsConsumer] Failed to parse message on ${topic}:${partition}:`, err);
        return; // skip malformed messages
    }

    const { eventType, taskId, userId } = event;

    if (!taskId || !userId) {
        console.warn(`[AnalyticsConsumer] Event missing taskId or userId — skipping`);
        return;
    }

    try {
        switch (eventType) {
            case "task.completed":
                await handleTaskCompleted(taskId, userId);
                break;

            case "task.updated":
                await handleTaskUpdated(taskId, userId, event.payload);
                break;

            case "task.deleted":
                await handleTaskDeleted(taskId);
                break;

            case "task.status_changed":
                await handleTaskStatusChanged(taskId, userId, event.payload);
                break;

            default:
                console.log(`[AnalyticsConsumer] Unknown event type "${eventType}" — skipping`);
        }
    } catch (err) {
        console.error(
            `[AnalyticsConsumer] ❌ Failed to process ${eventType} for taskId=${taskId}:`,
            err,
        );
    }
}

// ─── Event Handlers ─────────────────────────────────────────────────────────────

async function handleTaskCompleted(taskId: string, userId: string): Promise<void> {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { activityLogs: true },
    });

    if (!task) {
        console.warn(`[AnalyticsConsumer] Task ${taskId} not found — skipping completion stat`);
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

    console.log(`[AnalyticsConsumer] ✅ Recorded completion stat for taskId=${taskId} (${totalMinutes} min)`);
}

async function handleTaskUpdated(taskId: string, userId: string, payload: Record<string, unknown>): Promise<void> {
    // If the task was previously completed, re-compute its completion stat
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

            console.log(`[AnalyticsConsumer] ✅ Updated completion stat for taskId=${taskId}`);
        }
    }

    const changedFields = payload.changedFields as Record<string, unknown> | undefined;
    if (changedFields) {
        console.log(
            `[AnalyticsConsumer] Task ${taskId} updated — changed fields: ${Object.keys(changedFields).join(", ")}`,
        );
    }
}

async function handleTaskDeleted(taskId: string): Promise<void> {
    await prisma.taskCompletionStat.deleteMany({
        where: { taskId },
    });

    console.log(`[AnalyticsConsumer] ✅ Cleaned up completion stats for deleted taskId=${taskId}`);
}

async function handleTaskStatusChanged(taskId: string, userId: string, payload: Record<string, unknown>): Promise<void> {
    const newStatus = payload.newStatus as string | undefined;
    const previousStatus = payload.previousStatus as string | undefined;

    console.log(
        `[AnalyticsConsumer] Task ${taskId} status changed: ${previousStatus} → ${newStatus}`,
    );

    // If status changed away from COMPLETED, remove the completion stat
    if (previousStatus === "COMPLETED" && newStatus !== "COMPLETED") {
        await prisma.taskCompletionStat.deleteMany({
            where: { taskId },
        });
        console.log(`[AnalyticsConsumer] ✅ Removed completion stat for un-completed taskId=${taskId}`);
    }
}

// ─── Consumer Singleton ─────────────────────────────────────────────────────────

type KafkaConsumerInterface = RealKafkaConsumer | MockKafkaConsumer;

export const analyticsConsumer: KafkaConsumerInterface = KAFKA_ENABLED
    ? new RealKafkaConsumer()
    : new MockKafkaConsumer();

// ─── Graceful Shutdown (exported for index.ts to wire) ──────────────────────────

export async function shutdownConsumer(): Promise<void> {
    console.log("🔄 Shutting down Analytics Kafka consumer...");
    await analyticsConsumer.disconnect();
}
