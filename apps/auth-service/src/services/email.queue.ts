import { Queue, type ConnectionOptions } from "bullmq";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const QUEUE_ENABLED = process.env.QUEUE_ENABLED === "true";

const connection: ConnectionOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
} as ConnectionOptions;

export const EMAIL_QUEUE_NAME = "email-queue";

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

const emailQueue = QUEUE_ENABLED
  ? new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: {
          age: 24 * 3600, // keep failed jobs for 24h
        },
      },
    })
  : null;

export const addEmailToQueue = async (data: EmailJobData) => {
  if (emailQueue) {
    await emailQueue.add(`send-email-${data.to}`, data);
    console.log(`[EmailQueue] Job added for ${data.to}`);
  } else {
    console.log(`[MockEmailQueue] 📨 Log email task for ${data.to}: ${data.subject}`);
  }
};

export const closeEmailQueue = async () => {
  if (emailQueue) {
    await emailQueue.close();
  }
};
