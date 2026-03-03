import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES, type PushPayload } from "../services/queue.service.js";
import webpush from "web-push";
import { prisma } from "@repo/db";
import { getNotificationSettings, shouldSendNotification } from "../services/notificationPreferences.service.js";
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
const PUSH_DEBUG_PREFIX = "[PushDebug][Worker]";
const maskEndpoint = (endpoint: string) => `${endpoint.slice(0, 40)}...${endpoint.slice(-12)}`;

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    console.log("✅ Web Push VAPID keys loaded");
    console.info(`${PUSH_DEBUG_PREFIX} VAPID configured`, {
        publicKeyLength: vapidPublicKey.length,
        privateKeyLength: vapidPrivateKey.length,
        subject: vapidSubject,
    });
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
                const category = (job.data as any).category as string | undefined;
            console.info(`${PUSH_DEBUG_PREFIX} processing job`, {
                jobId: job.id,
                userId,
                title,
                deepLink: deepLink || "/dashboard",
            });
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

            console.info(`${PUSH_DEBUG_PREFIX} subscriptions loaded`, {
                userId,
                count: subscriptions.length,
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
                    badge: "/favicon.ico",
                    tag: category ? `push-${category}` : "push-general",
                    requireInteraction: false,
                    data: {
                        url: deepLink || "/dashboard",
                    },
                },
            });

            // 3. Check user's enabled buckets (skip sends when user disabled this bucket)
            // 3. Check user's enabled buckets, quiet-hours and focus profiles via shared helper
            if (category) {
                const settings = await getNotificationSettings(userId);
                if (settings) {
                    const decision = shouldSendNotification({ userSettings: settings, category, now: new Date() });
                    if (!decision.allow) {
                        console.info(`${PUSH_DEBUG_PREFIX} job skipped — user preferences/context prevent delivery`, { userId, category, reason: decision.reason });
                        return { status: "skipped", reason: decision.reason };
                    }
                }
            }
            

            // 4. Dispatch to all authenticated devices
            const pushPromises = subscriptions.map(async (sub) => {
                try {
                    const response = await webpush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.p256dh,
                                auth: sub.auth,
                            },
                        },
                        notificationPayload
                    );
                    console.info(`${PUSH_DEBUG_PREFIX} sendNotification success`, {
                        subscriptionId: sub.id,
                        endpoint: maskEndpoint(sub.endpoint),
                        statusCode: response?.statusCode,
                    });
                    return { endpoint: sub.endpoint, status: "success" };
                } catch (error: any) {
                    // 4. Auto-cleanup Strategy (410 Gone / 404 Not Found)
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        console.log(`🧹 Push subscription expired/invalid, cleaning up DB: ${sub.id}`);
                        await prisma.webPushSubscription.delete({ where: { id: sub.id } });
                        return { endpoint: sub.endpoint, status: "removed" };
                    }

                    console.error(`${PUSH_DEBUG_PREFIX} sendNotification failed`, {
                        subscriptionId: sub.id,
                        endpoint: maskEndpoint(sub.endpoint),
                        statusCode: error?.statusCode,
                        message: error?.message,
                        body: error?.body,
                    });
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
