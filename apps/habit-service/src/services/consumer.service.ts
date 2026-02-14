/**
 * Kafka Consumer for Habit Service
 *
 * Subscribes to `planner.habit.triggers` topic and automatically logs
 * linked habits when tasks are completed (Asynchronous Habit Automation).
 *
 * Uses the same config conventions as planner-service's producer:
 *   KAFKA_BROKERS, KAFKA_ENABLED, KAFKA_CLIENT_ID
 */
import { Kafka, logLevel } from "kafkajs";
import type { Consumer, EachMessagePayload } from "kafkajs";
import { autoLogHabitFromCategory } from "./streak.service.js";

// ─── Configuration ──────────────────────────────────────────────────────────────

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || "habit-service";
const KAFKA_ENABLED = process.env.KAFKA_ENABLED === "true";
const CONSUMER_GROUP_ID = process.env.KAFKA_CONSUMER_GROUP || "habit-service-consumer";

const TOPIC = "planner.habit.triggers";

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
            `✅ Kafka Consumer initialized (brokers: ${KAFKA_BROKERS.join(", ")}, group: ${CONSUMER_GROUP_ID})`,
        );
    }

    async connect(): Promise<void> {
        if (this.isConnected) return;

        try {
            await this.consumer.connect();
            await this.consumer.subscribe({ topic: TOPIC, fromBeginning: false });
            this.isConnected = true;
            console.log(`✅ Kafka Consumer connected → subscribed to "${TOPIC}"`);
        } catch (error) {
            console.error("❌ Kafka Consumer connection failed:", error);
            throw error;
        }
    }

    async run(): Promise<void> {
        await this.consumer.run({
            eachMessage: async (messagePayload: EachMessagePayload) => {
                await processMessage(messagePayload);
            },
        });
        console.log("✅ Kafka Consumer running — processing messages");
    }

    async disconnect(): Promise<void> {
        if (!this.isConnected) return;
        await this.consumer.disconnect();
        this.isConnected = false;
        console.log("🔌 Kafka Consumer disconnected");
    }
}

// ─── Mock Consumer (for dev without a broker) ───────────────────────────────────

class MockKafkaConsumer {
    constructor() {
        console.log(
            "⚠️  Using MOCK Kafka Consumer (set KAFKA_ENABLED=true and configure KAFKA_BROKERS for real Kafka)",
        );
    }

    async connect(): Promise<void> {
        console.log("[MockConsumer] Connected (virtual)");
    }

    async run(): Promise<void> {
        console.log("[MockConsumer] Run called — no-op in mock mode. Use POST /api/habits/events as HTTP fallback.");
    }

    async disconnect(): Promise<void> {
        console.log("[MockConsumer] Disconnected");
    }
}

// ─── Message Processing ─────────────────────────────────────────────────────────

export async function processMessage({ topic, partition, message }: EachMessagePayload): Promise<void> {
    const rawValue = message.value?.toString();
    if (!rawValue) {
        console.warn(`[Consumer] Empty message on ${topic}:${partition} — skipping`);
        return;
    }

    let event: TaskEvent;
    try {
        event = JSON.parse(rawValue) as TaskEvent;
    } catch (err) {
        console.error(`[Consumer] Failed to parse message on ${topic}:${partition}:`, err);
        return; // skip malformed messages
    }

    const { userId, payload } = event;

    if (!userId) {
        console.warn(`[Consumer] Event missing userId — skipping (taskId=${event.taskId})`);
        return;
    }

    // ── Handle task.completed ────────────────────────────────────────────────
    if (event.eventType === "task.completed") {
        const categoryId = typeof payload.categoryId === "string" ? payload.categoryId : null;

        if (!categoryId) {
            // Task has no category — no linked habits to auto-log
            return;
        }

        try {
            await autoLogHabitFromCategory(userId, categoryId);
            console.log(
                `[Consumer] ✅ Auto-logged habits for userId=${userId}, categoryId=${categoryId} (taskId=${event.taskId})`,
            );
        } catch (err) {
            console.error(
                `[Consumer] ❌ Failed to auto-log habits for userId=${userId}, categoryId=${categoryId}:`,
                err,
            );
        }
        return;
    }

    // ── Handle task.updated (re-evaluate linked habits on category change) ──
    if (event.eventType === "task.updated") {
        const changedFields = payload.changedFields as Record<string, unknown> | undefined;

        if (changedFields && "categoryId" in changedFields) {
            const newCategoryId = typeof changedFields.categoryId === "string"
                ? changedFields.categoryId
                : null;

            if (newCategoryId) {
                try {
                    await autoLogHabitFromCategory(userId, newCategoryId);
                    console.log(
                        `[Consumer] ✅ Re-evaluated habits after category change for userId=${userId}, newCategoryId=${newCategoryId} (taskId=${event.taskId})`,
                    );
                } catch (err) {
                    console.error(
                        `[Consumer] ❌ Failed to re-evaluate habits for userId=${userId}, categoryId=${newCategoryId}:`,
                        err,
                    );
                }
            }
        }
        return;
    }

    // ── Handle task.deleted (audit log only — habits are independent) ────────
    if (event.eventType === "task.deleted") {
        console.log(
            `[Consumer] Task deleted — no habit action needed (taskId=${event.taskId}, userId=${userId})`,
        );
        return;
    }

    // Unknown event type — skip silently
}

// ─── Consumer Singleton ─────────────────────────────────────────────────────────

type KafkaConsumerInterface = RealKafkaConsumer | MockKafkaConsumer;

export const habitConsumer: KafkaConsumerInterface = KAFKA_ENABLED
    ? new RealKafkaConsumer()
    : new MockKafkaConsumer();

// ─── Graceful Shutdown (exported for index.ts to wire) ──────────────────────────

export async function shutdownConsumer(): Promise<void> {
    console.log("🔄 Shutting down Kafka consumer...");
    await habitConsumer.disconnect();
}
