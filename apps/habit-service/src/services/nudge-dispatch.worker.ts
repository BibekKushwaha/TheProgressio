import { Worker, type Job, type ConnectionOptions } from "bullmq";
import {
    dispatchNudgePushById,
    processWhatsAppFallbackNudgeById,
} from "./whatsapp-outbound.service.js";
import {
    NUDGE_DISPATCH_QUEUE_NAME,
    WHATSAPP_FALLBACK_QUEUE_NAME,
    type NudgeDispatchJobData,
    type WhatsAppFallbackJobData,
} from "./nudge-dispatch.queue.js";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number.parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const QUEUE_ENABLED = process.env.QUEUE_ENABLED === "true" && process.env.NODE_ENV !== "test";

const connection: ConnectionOptions = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
} as ConnectionOptions;

let worker: Worker<NudgeDispatchJobData> | null = null;
let waFallbackWorker: Worker<WhatsAppFallbackJobData> | null = null;

export const initNudgeDispatchWorker = (): Worker<NudgeDispatchJobData> | null => {
    if (!QUEUE_ENABLED) {
        console.log("⚠️  Nudge dispatch worker running in direct mode (QUEUE_ENABLED=false)");
        return null;
    }
    if (worker && waFallbackWorker) return worker;

    worker = new Worker<NudgeDispatchJobData>(
        NUDGE_DISPATCH_QUEUE_NAME,
        async (job: Job<NudgeDispatchJobData>) => {
            await dispatchNudgePushById(job.data.nudgeId);
        },
        { connection, concurrency: 10 },
    );

    worker.on("completed", (job) => {
        console.log(`[NudgeDispatchWorker] ✅ Job ${job.id} completed`);
    });
    worker.on("failed", (job, err) => {
        console.error(`[NudgeDispatchWorker] ❌ Job ${job?.id} failed: ${err.message}`);
    });

    waFallbackWorker = new Worker<WhatsAppFallbackJobData>(
        WHATSAPP_FALLBACK_QUEUE_NAME,
        async (job: Job<WhatsAppFallbackJobData>) => {
            await processWhatsAppFallbackNudgeById(job.data.nudgeId, { pushSentAt: job.data.pushSentAt });
        },
        { connection, concurrency: 10 },
    );

    waFallbackWorker.on("completed", (job) => {
        console.log(`[WaFallbackWorker] ✅ Job ${job.id} completed`);
    });
    waFallbackWorker.on("failed", (job, err) => {
        console.error(`[WaFallbackWorker] ❌ Job ${job?.id} failed: ${err.message}`);
    });

    console.log(
        `✅ Nudge dispatch workers initialized (Queues: ${NUDGE_DISPATCH_QUEUE_NAME}, ${WHATSAPP_FALLBACK_QUEUE_NAME})`,
    );
    return worker;
};

export const closeNudgeDispatchWorker = async (): Promise<void> => {
    if (worker) {
        await worker.close();
        worker = null;
    }
    if (waFallbackWorker) {
        await waFallbackWorker.close();
        waFallbackWorker = null;
    }
};
