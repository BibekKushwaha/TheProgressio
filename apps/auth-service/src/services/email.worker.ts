import { Worker, type Job, type ConnectionOptions } from "bullmq";
import nodemailer from "nodemailer";
import { EMAIL_QUEUE_NAME, type EmailJobData } from "./email.queue.js";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const QUEUE_ENABLED = process.env.QUEUE_ENABLED === "true";

const connection: ConnectionOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
} as ConnectionOptions;

// ─── SMTP Config (Use placeholders) ──────────────────────────────────────────
const SMTP_HOST = process.env.SMTP_HOST || "smtp.mailtrap.io";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "2525", 10);
const SMTP_USER = process.env.SMTP_USER || "user";
const SMTP_PASS = process.env.SMTP_PASS || "pass";
const FROM_EMAIL = process.env.FROM_EMAIL || "no-reply@transition.com";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  // port 465 = SSL (secure:true), port 587/25 = STARTTLS (secure:false)
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === "production",
  },
});

export const emailWorker = QUEUE_ENABLED
  ? new Worker<EmailJobData>(
      EMAIL_QUEUE_NAME,
      async (job: Job<EmailJobData>) => {
        const { to, subject, body, html } = job.data;
        console.log(`[EmailWorker] Processing email to ${to} (Subject: ${subject})`);

        await transporter.sendMail({
          from: FROM_EMAIL,
          to,
          subject,
          text: body,
          html: html || body,
        });
      },
      {
        connection,
        concurrency: 5,
      }
    )
  : null;

if (emailWorker) {
  console.log(`✅ Email BullMQ Worker initialized (Queue: ${EMAIL_QUEUE_NAME})`);
  emailWorker.on("completed", (job) => {
    console.log(`[EmailWorker] ✅ Job ${job.id} completed (Recipient: ${job.data.to})`);
  });

  emailWorker.on("failed", (job, err) => {
    console.error(`[EmailWorker] ❌ Job ${job?.id} failed for ${job?.data.to}: ${err.message}`);
  });
} else {
  console.log("⚠️  Using MOCK Email Worker (set QUEUE_ENABLED=true for real Redis/BullMQ)");
}

export const closeEmailWorker = async () => {
  if (emailWorker) {
    await emailWorker.close();
  }
};
