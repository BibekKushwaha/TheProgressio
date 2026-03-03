import webpush from "web-push";
import { prisma } from "@repo/db";
import { getNotificationSettings, shouldSendNotification } from "./notificationPreferences.service.js";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
const PUSH_DEBUG_PREFIX = "[PushDebug][Direct]";

const maskEndpoint = (endpoint: string) => `${endpoint.slice(0, 40)}...${endpoint.slice(-12)}`;

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    console.info(`${PUSH_DEBUG_PREFIX} VAPID configured`, {
        publicKeyLength: vapidPublicKey.length,
        privateKeyLength: vapidPrivateKey.length,
        subject: vapidSubject,
    });
} else {
    console.warn(`${PUSH_DEBUG_PREFIX} VAPID keys missing`, {
        hasPublicKey: Boolean(vapidPublicKey),
        hasPrivateKey: Boolean(vapidPrivateKey),
        subject: vapidSubject,
    });
}

export const sendPushNotification = async (
    userId: string,
    payload: { title: string; body: string; icon?: string; deepLink?: string; category?: string }
) => {
    // If a category is supplied, respect the user's enabledBuckets, quiet hours, and focus profiles
    if (payload.category) {
        const settings = await getNotificationSettings(userId);
        if (settings) {
            const decision = shouldSendNotification({ userSettings: settings, category: payload.category, now: new Date() });
            if (!decision.allow) {
                console.info(`${PUSH_DEBUG_PREFIX} skipping send — user preferences/context prevent delivery`, { userId, category: payload.category, reason: decision.reason });
                return;
            }
        }
    }
    console.info(`${PUSH_DEBUG_PREFIX} sendPushNotification called`, {
        userId,
        title: payload.title,
        hasIcon: Boolean(payload.icon),
        deepLink: payload.deepLink || "/dashboard",
        vapidConfigured: Boolean(vapidPublicKey && vapidPrivateKey),
    });

    const subscriptions = await prisma.webPushSubscription.findMany({
        where: { userId },
    });

    const uniqueEndpointCount = new Set(subscriptions.map((sub) => sub.endpoint)).size;
    if (uniqueEndpointCount !== subscriptions.length) {
        console.warn(`${PUSH_DEBUG_PREFIX} duplicate endpoints detected`, {
            userId,
            total: subscriptions.length,
            unique: uniqueEndpointCount,
        });
    }

    if (subscriptions.length === 0) {
        console.log(`${PUSH_DEBUG_PREFIX} no subscriptions found for user`, userId);
        return;
    }

    const notificationPayload = JSON.stringify({
        notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon || "/favicon.ico",
            badge: "/favicon.ico",
            tag: payload.category ? `push-${payload.category}` : "push-general",
            requireInteraction: false,
            data: {
                url: payload.deepLink || "/dashboard",
            },
        },
    });

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
                hasHeaders: Boolean(response?.headers),
            });
        } catch (error: any) {
            if (error.statusCode === 410 || error.statusCode === 404) {
                console.log(`${PUSH_DEBUG_PREFIX} expired subscription removed`, {
                    subscriptionId: sub.id,
                    endpoint: maskEndpoint(sub.endpoint),
                    statusCode: error.statusCode,
                });
                await prisma.webPushSubscription.delete({ where: { id: sub.id } });
            } else {
                console.error(`${PUSH_DEBUG_PREFIX} sendNotification failed`, {
                    subscriptionId: sub.id,
                    endpoint: maskEndpoint(sub.endpoint),
                    statusCode: error?.statusCode,
                    message: error?.message,
                    body: error?.body,
                });
            }
        }
    });

    await Promise.all(pushPromises);
};
