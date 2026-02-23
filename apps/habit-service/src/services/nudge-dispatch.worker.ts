import { Worker, type Job, type ConnectionOptions } from "bullmq";
import { dispatchWhatsAppNudgeById } from "./whatsapp-outbound.service.js";
import { NUDGE_DISPATCH_QUEUE_NAME, type NudgeDispatchJobData } from "./nudge-dispatch.queue.js";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number.parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const QUEUE_ENABLED = process.env.QUEUE_ENABLED === "true";

const connection: ConnectionOptions = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
} as ConnectionOptions;

let worker: Worker<NudgeDispatchJobData> | null = null;

export const initNudgeDispatchWorker = (): Worker<NudgeDispatchJobData> | null => {
    if (!QUEUE_ENABLED) {
        console.log("⚠️  Nudge dispatch worker running in direct mode (QUEUE_ENABLED=false)");
        return null;
    }
    if (worker) return worker;

    worker = new Worker<NudgeDispatchJobData>(
        NUDGE_DISPATCH_QUEUE_NAME,
        async (job: Job<NudgeDispatchJobData>) => {
            await dispatchWhatsAppNudgeById(job.data.nudgeId);
        },
        { connection, concurrency: 10 },
    );

    worker.on("completed", (job) => {
        console.log(`[NudgeDispatchWorker] ✅ Job ${job.id} completed`);
    });
    worker.on("failed", (job, err) => {
        console.error(`[NudgeDispatchWorker] ❌ Job ${job?.id} failed: ${err.message}`);
    });

    console.log(`✅ Nudge Dispatch BullMQ Worker initialized (Queue: ${NUDGE_DISPATCH_QUEUE_NAME})`);
    return worker;
};

export const closeNudgeDispatchWorker = async (): Promise<void> => {
    if (worker) {
        await worker.close();
        worker = null;
    }
};
