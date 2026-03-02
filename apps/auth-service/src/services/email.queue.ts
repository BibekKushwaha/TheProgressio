import { Queue, type ConnectionOptions } from "bullmq";
import nodemailer from "nodemailer";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const QUEUE_ENABLED = process.env.QUEUE_ENABLED === "true";

// ─── SMTP config (shared with worker) ────────────────────────────────────────
const SMTP_HOST = process.env.SMTP_HOST || "smtp.resend.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER = process.env.SMTP_USER || "resend";
const SMTP_PASS = process.env.SMTP_PASS || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "no-reply@resend.dev";

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
          age: 24 * 3600,
        },
      },
    })
  : null;

/** Sends an email directly without going through BullMQ. Used as fallback when
 *  QUEUE_ENABLED is false (i.e. no Redis running in dev). */
const sendDirectEmail = async (data: EmailJobData): Promise<void> => {
  if (!SMTP_PASS) {
    console.warn(
      `[DirectEmail] ⚠️  SMTP_PASS not set – cannot send email to ${data.to}.\n` +
      `  Set SMTP_PASS (your Resend API key) in apps/auth-service/.env and restart.`
    );
    return;
  }
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    // port 465 = SSL (secure:true), port 587/25 = STARTTLS (secure:false)
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: {
      // Allow self-signed certs in dev
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });
  await transporter.sendMail({
    from: FROM_EMAIL,
    to: data.to,
    subject: data.subject,
    text: data.body,
    html: data.html || data.body,
  });
  console.log(`[DirectEmail] ✅ Email sent to ${data.to}`);
};

export const addEmailToQueue = async (data: EmailJobData) => {
  if (emailQueue) {
    await emailQueue.add(`send-email-${data.to}`, data);
    console.log(`[EmailQueue] Job added for ${data.to}`);
  } else {
    // No Redis – send synchronously so emails are never silently dropped in dev
    console.log(`[DirectEmail] Queue disabled – sending directly to ${data.to}`);
    await sendDirectEmail(data);
  }
};

export const closeEmailQueue = async () => {
  if (emailQueue) {
    await emailQueue.close();
  }
};
