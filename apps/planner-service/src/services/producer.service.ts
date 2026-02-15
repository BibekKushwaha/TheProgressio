import { Kafka, logLevel, CompressionTypes, Partitioners } from "kafkajs";
import type { Producer } from "kafkajs";

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

// ─── Kafka Configuration ────────────────────────────────────────────────────────
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || "planner-service";
const KAFKA_ENABLED = process.env.KAFKA_ENABLED === "true";

// ─── Topics ─────────────────────────────────────────────────────────────────────
export const TOPICS = {
    TASK_EVENTS: "planner.task.events",
    TASK_ANALYTICS: "planner.task.analytics",
    HABIT_TRIGGERS: "planner.habit.triggers",
} as const;

// ─── Real Kafka Producer ────────────────────────────────────────────────────────
class RealKafkaProducer {
    private kafka: Kafka;
    private producer: Producer;
    private isConnected: boolean = false;
    private connectionRetries: number = 0;
    private maxRetries: number = 5;

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

        this.producer = this.kafka.producer({
            allowAutoTopicCreation: true,
            createPartitioner: Partitioners.LegacyPartitioner,
            transactionTimeout: 30000,
        });

        console.log(`✅ Kafka Producer initialized (brokers: ${KAFKA_BROKERS.join(", ")})`);
    }

    async connect(): Promise<void> {
        if (this.isConnected) return;

        try {
            await this.producer.connect();
            this.isConnected = true;
            this.connectionRetries = 0;
            console.log("✅ Kafka Producer connected successfully");
        } catch (error) {
            this.connectionRetries++;
            console.error(`❌ Kafka connection failed (attempt ${this.connectionRetries}/${this.maxRetries}):`, error);

            if (this.connectionRetries < this.maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, this.connectionRetries), 30000);
                console.log(`⏳ Retrying in ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.connect();
            }
            throw error;
        }
    }

    async send(topic: string, messages: Array<{ key?: string; value: string }>): Promise<void> {
        if (!this.isConnected) {
            await this.connect();
        }

        try {
            await this.producer.send({
                topic,
                compression: CompressionTypes.GZIP,
                messages: messages.map((msg) => ({
                    key: msg.key || null,
                    value: msg.value,
                    timestamp: Date.now().toString(),
                })),
            });
        } catch (error) {
            console.error(`❌ Failed to send message to topic '${topic}':`, error);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (!this.isConnected) return;
        await this.producer.disconnect();
        this.isConnected = false;
        console.log("🔌 Kafka Producer disconnected");
    }
}

// ─── Mock Kafka Producer (for dev without a broker) ────────────────────────────
class MockKafkaProducer {
    private isConnected: boolean = false;

    constructor() {
        console.log("⚠️  Using MOCK Kafka Producer (set KAFKA_ENABLED=true and configure KAFKA_BROKERS for real Kafka)");
    }

    async connect(): Promise<void> {
        this.isConnected = true;
        console.log("[MockProducer] Connected (virtual)");
    }

    async send(topic: string, messages: Array<{ key?: string; value: string }>): Promise<void> {
        if (!this.isConnected) await this.connect();
        console.log(`[MockProducer] 📨 → ${topic} (${messages.length} message(s))`);
        messages.forEach((msg) => {
            try {
                const parsed = JSON.parse(msg.value);
                console.log(`  [${parsed.eventType}] taskId=${parsed.taskId}`);
            } catch {
                console.log(`  - ${msg.value.substring(0, 100)}`);
            }
        });
    }

    async disconnect(): Promise<void> {
        this.isConnected = false;
        console.log("[MockProducer] Disconnected");
    }
}

// ─── Producer Singleton ─────────────────────────────────────────────────────────
type KafkaProducerInterface = RealKafkaProducer | MockKafkaProducer;

export const producer: KafkaProducerInterface = KAFKA_ENABLED
    ? new RealKafkaProducer()
    : new MockKafkaProducer();

// ─── Helper: Emit a structured task event ───────────────────────────────────────
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

    const message = {
        key: userId,
        value: JSON.stringify(event),
    };

    try {
        await producer.send(TOPICS.TASK_EVENTS, [message]);

        // Route events to downstream consumers
        if (eventType === TaskEventType.TASK_COMPLETED) {
            await producer.send(TOPICS.HABIT_TRIGGERS, [message]);
            await producer.send(TOPICS.TASK_ANALYTICS, [message]);
        }

        if (eventType === TaskEventType.TASK_STATUS_CHANGED) {
            await producer.send(TOPICS.TASK_ANALYTICS, [message]);
        }

        if (eventType === TaskEventType.TASK_UPDATED) {
            await producer.send(TOPICS.HABIT_TRIGGERS, [message]);
            await producer.send(TOPICS.TASK_ANALYTICS, [message]);
        }

        if (eventType === TaskEventType.TASK_DELETED) {
            await producer.send(TOPICS.HABIT_TRIGGERS, [message]);
            await producer.send(TOPICS.TASK_ANALYTICS, [message]);
        }
    } catch (error) {
        // Non-blocking: log but don't fail the HTTP request
        console.error(`⚠️  Failed to emit ${eventType} for task ${taskId}:`, error);
    }
}

// ─── Graceful shutdown ──────────────────────────────────────────────────────────
async function shutdown() {
    console.log("🔄 Shutting down Kafka producer...");
    await producer.disconnect();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
