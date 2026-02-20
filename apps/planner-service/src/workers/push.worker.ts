import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES, type PushPayload } from "../services/queue.service.js";
import webpush from "web-push";
import { prisma } from "@repo/db";
import { Redis } from "ioredis";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const connection = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
    maxRetriesPerRequest: null,
});

// Configure Web Push Keys if available
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    console.log("✅ Web Push VAPID keys loaded");
} else {
    console.warn("⚠️  Web Push VAPID keys missing. Push notification worker will fail.");
}

const DAILY_PUSH_LIMIT = 5;

// Helper to get today's date string for rate limiting (e.g. "2024-03-15")
const getTodayStr = () => new Date().toISOString().split("T")[0];

export const initPushWorker = () => {
    if (process.env.QUEUE_ENABLED !== "true") {
        console.log("⏭️  Push BullMQ Worker skipped (QUEUE_ENABLED=false)");
        return null;
    }

    console.log(`✅ Push BullMQ Worker initialized (Queue: ${QUEUE_NAMES.WEB_PUSH})`);

    const worker = new Worker<PushPayload>(
        QUEUE_NAMES.WEB_PUSH,
        async (job: Job<PushPayload>) => {
            const { userId, title, body, icon, deepLink } = job.data;
            const todayStr = getTodayStr();
            const rateLimitKey = `push:limit:${userId}:${todayStr}`;

            // 1. Fatigue Protection: Check Rate Limit
            const todaysPushesStr = await connection.get(rateLimitKey);
            const todaysPushes = todaysPushesStr ? parseInt(todaysPushesStr, 10) : 0;

            if (todaysPushes >= DAILY_PUSH_LIMIT) {
                console.log(`🛑 [Fatigue Protection] Dropping push for ${userId}. Daily limit (${DAILY_PUSH_LIMIT}) reached.`);
                return { status: "skipped", reason: "rate_limit_exceeded" };
            }

            // 2. Fetch User Subscriptions
            const subscriptions = await prisma.webPushSubscription.findMany({
                where: { userId },
            });

            if (subscriptions.length === 0) {
                console.log(`⏭️  No push subscriptions found for user ${userId}`);
                return { status: "skipped", reason: "no_subscription" };
            }

            const notificationPayload = JSON.stringify({
                notification: {
                    title,
                    body,
                    icon: icon || "/favicon.ico",
                    data: {
                        url: deepLink || "/dashboard",
                    },
                },
            });

            // 3. Dispatch to all authenticated devices
            const pushPromises = subscriptions.map(async (sub) => {
                try {
                    await webpush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.p256dh,
                                auth: sub.auth,
                            },
                        },
                        notificationPayload
                    );
                    return { endpoint: sub.endpoint, status: "success" };
                } catch (error: any) {
                    // 4. Auto-cleanup Strategy (410 Gone / 404 Not Found)
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        console.log(`🧹 Push subscription expired/invalid, cleaning up DB: ${sub.id}`);
                        await prisma.webPushSubscription.delete({ where: { id: sub.id } });
                        return { endpoint: sub.endpoint, status: "removed" };
                    }

                    console.error(`❌ Error sending push to ${sub.id}:`, error.message);
                    throw error; // Let BullMQ retry for 5xx errors
                }
            });

            const results = await Promise.allSettled(pushPromises);

            // Increment rate limit counter if at least one device was successfully pushed to
            const hasSuccess = results.some(
                res => res.status === "fulfilled" && (res.value as { status: string }).status === "success"
            );

            if (hasSuccess) {
                await connection.incr(rateLimitKey);
                await connection.expire(rateLimitKey, 60 * 60 * 48); // expire after 48h to prevent Redis bloat
            }

            return { status: "processed", devices: results.length, success: hasSuccess };
        },
        { connection: connection as any } // cast to bypass BullMQ/ioredis type mismatch
    );

    worker.on("failed", (job, err) => {
        console.error(`🚨 Push Job ${job?.id} failed:`, err.message);
    });

    return worker;
};
